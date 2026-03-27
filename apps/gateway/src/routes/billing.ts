import { Hono } from 'hono';
import type Stripe from 'stripe';
import type { GatewayEnv } from '../types.js';
import type { BillingTier } from '../billing/provider.js';
import { StripeProvider, verifyStripeWebhook, createPortalSession, createStripeClient } from '../billing/stripe.js';
import { handleTierUpgrade, checkIdempotency } from '../billing/tierUpgrade.js';
import { getServiceRoleClient } from '../lib/supabase.js';
import { verifyMomoIpn } from '../billing/momo.js';
import type { MomoIpnPayload } from '../billing/momo.js';
import { logWebhookEvent } from '../lib/webhookLogger.js';

export const billingRouter = new Hono<GatewayEnv>();

// POST /billing/create-checkout — creates Stripe or MoMo checkout URL
// Requires JWT auth (applied in index.ts)
billingRouter.post('/create-checkout', async (c) => {
  const body = await c.req.json<{ provider: string; tier: string; returnUrl?: string }>();
  const { provider, tier } = body;
  const auth = c.get('auth');

  const validTiers: BillingTier[] = ['starter', 'pro', 'business'];
  if (!validTiers.includes(tier as BillingTier)) {
    return c.json({ error: `Invalid tier: ${tier}. Must be starter, pro, or business` }, 400);
  }

  const returnUrl = body.returnUrl ?? 'https://dash.mcpvn.dev';

  if (provider === 'stripe') {
    const stripe = new StripeProvider(c.env);
    const url = await stripe.createCheckoutUrl({
      userId: auth.userId,
      tier: tier as BillingTier,
      userEmail: '', // Stripe will use existing customer email or ask
      returnUrl,
    });
    return c.json({ url });
  }

  if (provider === 'momo') {
    const { MoMoProvider } = await import('../billing/momo.js');
    const momo = new MoMoProvider(c.env);
    const url = await momo.createCheckoutUrl({
      userId: auth.userId,
      tier: tier as BillingTier,
      userEmail: '',
      returnUrl,
    });
    return c.json({ url });
  }

  return c.json({ error: `Unknown provider: ${provider}` }, 400);
});

// POST /billing/stripe-webhook — Stripe sends events here
// NO auth middleware — Stripe signs with webhook secret
billingRouter.post('/stripe-webhook', async (c) => {
  const body = await c.req.text(); // MUST be text() not json() — Pitfall 2
  const sig = c.req.header('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = await verifyStripeWebhook(body, sig, c.env);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  // Idempotency check FIRST — before any processing
  const isDuplicate = await checkIdempotency(event.id, 'stripe', c.env);
  if (isDuplicate) return c.json({ received: true });

  const supabase = getServiceRoleClient(c.env);

  let stripeStatus: 'success' | 'failed' = 'success';
  let stripeUserId: string | undefined;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const tier = session.metadata?.tier ?? 'starter';
        if (!userId) break;

        stripeUserId = userId;

        // Store stripe_customer_id on user's active keys for future portal/subscription events
        // NOTE: stripe_customer_id column added in Plan 01 migration 002_webhook_events.sql
        if (session.customer) {
          await supabase
            .from('api_keys')
            .update({ stripe_customer_id: session.customer as string })
            .eq('user_id', userId)
            .is('revoked_at', null);
        }

        await handleTierUpgrade(userId, tier, c.env);
        break;
      }

      case 'invoice.paid': {
        // Subscription renewal — re-confirm tier (Pitfall 4 from RESEARCH.md).
        // Without this, renewals would succeed in Stripe but the tier wouldn't
        // be re-applied if it was somehow reset or if a race condition occurred.
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : String(invoice.customer);
        if (!customerId) break;

        // Try to get tier from invoice.parent.subscription_details.metadata first (no extra API call)
        // Fall back to retrieving the subscription if metadata not available
        const subscriptionDetails = invoice.parent?.subscription_details;
        let tier: string | undefined = subscriptionDetails?.metadata?.['tier'];

        if (!tier) {
          // Retrieve subscription to get tier from its metadata
          const subscriptionId = subscriptionDetails?.subscription;
          const subscriptionIdStr = typeof subscriptionId === 'string'
            ? subscriptionId
            : subscriptionId?.id;
          if (!subscriptionIdStr) break;

          const stripe = createStripeClient(c.env.STRIPE_SECRET_KEY);
          const subscription = await stripe.subscriptions.retrieve(subscriptionIdStr);
          tier = subscription.metadata?.['tier'];
        }

        if (!tier) break;

        // Find user by stripe_customer_id
        const { data: keyRow } = await supabase
          .from('api_keys')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .is('revoked_at', null)
          .limit(1)
          .single();

        if (keyRow?.user_id) {
          stripeUserId = keyRow.user_id;
          await handleTierUpgrade(keyRow.user_id, tier, c.env);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : String(sub.customer);
        // Look up user by stripe_customer_id
        const { data: keyRow } = await supabase
          .from('api_keys')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .is('revoked_at', null)
          .limit(1)
          .single();

        if (keyRow?.user_id) {
          stripeUserId = keyRow.user_id;
          await handleTierUpgrade(keyRow.user_id, 'free', c.env);
        }
        break;
      }
    }
  } catch {
    stripeStatus = 'failed';
  }

  // Fire-and-forget log — must not break webhook processing
  c.executionCtx.waitUntil(
    logWebhookEvent(c.env, {
      eventId: event.id,
      provider: 'stripe',
      eventType: event.type,
      status: stripeStatus,
      payload: event,
      userId: stripeUserId,
    }),
  );

  return c.json({ received: true });
});

// GET /billing/portal — returns Stripe Customer Portal URL
// Requires JWT auth (applied in index.ts)
billingRouter.get('/portal', async (c) => {
  const auth = c.get('auth');
  const supabase = getServiceRoleClient(c.env);

  // Look up stripe_customer_id from user's active keys
  const { data: keyRow } = await supabase
    .from('api_keys')
    .select('stripe_customer_id')
    .eq('user_id', auth.userId)
    .is('revoked_at', null)
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .single();

  if (!keyRow?.stripe_customer_id) {
    return c.json({ error: 'No Stripe subscription found' }, 404);
  }

  const url = await createPortalSession(
    keyRow.stripe_customer_id,
    'https://dash.mcpvn.dev',
    c.env,
  );
  return c.json({ url });
});

// POST /billing/momo-ipn — MoMo sends IPN callbacks here
// NO auth middleware — MoMo authenticates via HMAC signature
billingRouter.post('/momo-ipn', async (c) => {
  const body = await c.req.json<MomoIpnPayload>();

  // 1. Verify HMAC signature (crypto.subtle — CF Workers compatible)
  const valid = await verifyMomoIpn(body, c.env.MOMO_SECRET_KEY);
  if (!valid) {
    c.executionCtx.waitUntil(
      logWebhookEvent(c.env, {
        eventId: body.orderId ?? 'unknown',
        provider: 'momo',
        eventType: 'ipn',
        status: 'failed',
        payload: body,
      }),
    );
    return c.json({ error: 'Invalid signature' }, 400);
  }

  // 2. Only process success (resultCode === 0)
  if (body.resultCode !== 0) return c.body(null, 204);

  // 3. Idempotency check
  const isDuplicate = await checkIdempotency(body.orderId, 'momo', c.env);
  if (isDuplicate) return c.body(null, 204);

  // 4. Decode extraData to get userId and tier
  let userId: string;
  let tier: string;
  try {
    const decoded = JSON.parse(atob(body.extraData));
    userId = decoded.userId;
    tier = decoded.tier;
  } catch {
    c.executionCtx.waitUntil(
      logWebhookEvent(c.env, {
        eventId: body.orderId,
        provider: 'momo',
        eventType: 'ipn',
        status: 'failed',
        payload: body,
      }),
    );
    return c.json({ error: 'Invalid extraData' }, 400);
  }

  // 5. Upgrade tier + set momo_expires_at (30 days from now)
  await handleTierUpgrade(userId, tier, c.env);

  const supabase = getServiceRoleClient(c.env);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('api_keys')
    .update({ momo_expires_at: expiresAt })
    .eq('user_id', userId)
    .is('revoked_at', null);

  // Fire-and-forget log — success path
  c.executionCtx.waitUntil(
    logWebhookEvent(c.env, {
      eventId: body.orderId,
      provider: 'momo',
      eventType: 'ipn',
      status: 'success',
      payload: body,
      userId,
    }),
  );

  // MoMo REQUIRES 204 No Content (not 200) — Pitfall 5
  return c.body(null, 204);
});
