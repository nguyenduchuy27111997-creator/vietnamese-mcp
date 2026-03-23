import { Hono } from 'hono';
import type Stripe from 'stripe';
import type { GatewayEnv } from '../types.js';
import type { BillingTier } from '../billing/provider.js';
import { StripeProvider, verifyStripeWebhook, createPortalSession, createStripeClient } from '../billing/stripe.js';
import { handleTierUpgrade, checkIdempotency } from '../billing/tierUpgrade.js';
import { getServiceRoleClient } from '../lib/supabase.js';

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

  // MoMo provider will be added in Plan 03
  if (provider === 'momo') {
    return c.json({ error: 'MoMo provider not yet implemented' }, 501);
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

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const tier = session.metadata?.tier ?? 'starter';
      if (!userId) break;

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
        await handleTierUpgrade(keyRow.user_id, 'free', c.env);
      }
      break;
    }
  }

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
