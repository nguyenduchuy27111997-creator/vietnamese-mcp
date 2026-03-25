import Stripe from 'stripe';
import type { PaymentProvider, CheckoutParams } from './provider.js';
import type { GatewayEnv } from '../types.js';

// Map tier to env-var price ID
function getPriceId(tier: string, env: GatewayEnv['Bindings']): string {
  const map: Record<string, string> = {
    starter: env.STRIPE_PRICE_STARTER,
    pro: env.STRIPE_PRICE_PRO,
    business: env.STRIPE_PRICE_BUSINESS,
  };
  const id = map[tier];
  if (!id) throw new Error(`No Stripe price for tier: ${tier}`);
  return id;
}

// Create Stripe client per-request (CF Workers: env only available in handler)
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export class StripeProvider implements PaymentProvider {
  constructor(private env: GatewayEnv['Bindings']) {}

  async createCheckoutUrl(params: CheckoutParams): Promise<string> {
    const stripe = createStripeClient(this.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: getPriceId(params.tier, this.env), quantity: 1 }],
      customer_email: params.userEmail || undefined,
      client_reference_id: params.userId,
      metadata: { tier: params.tier },
      subscription_data: { metadata: { tier: params.tier } },
      success_url: `${params.returnUrl}?upgraded=1`,
      cancel_url: params.returnUrl,
    });
    return session.url!;
  }
}

// Verify Stripe webhook signature using async WebCrypto (CF Workers)
export async function verifyStripeWebhook(
  body: string,
  signature: string,
  env: GatewayEnv['Bindings'],
): Promise<Stripe.Event> {
  const stripe = createStripeClient(env.STRIPE_SECRET_KEY);
  const webCrypto = Stripe.createSubtleCryptoProvider();
  return stripe.webhooks.constructEventAsync(
    body, signature, env.STRIPE_WEBHOOK_SECRET, undefined, webCrypto,
  );
}

// Create Stripe Customer Portal session
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string,
  env: GatewayEnv['Bindings'],
): Promise<string> {
  const stripe = createStripeClient(env.STRIPE_SECRET_KEY);
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}
