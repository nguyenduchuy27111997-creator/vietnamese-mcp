import { describe, it } from 'vitest';

describe('BILL-01: Stripe Checkout', () => {
  it.todo('POST /billing/create-checkout with provider=stripe returns Stripe session URL');
  it.todo('POST /billing/create-checkout with invalid tier returns 400');
  it.todo('POST /billing/create-checkout without JWT auth returns 401');
});

describe('BILL-02: Stripe Webhook', () => {
  it.todo('POST /billing/stripe-webhook with valid signature processes checkout.session.completed');
  it.todo('POST /billing/stripe-webhook with invalid signature returns 400');
  it.todo('POST /billing/stripe-webhook with duplicate event_id returns 200 without processing');
  it.todo('customer.subscription.deleted downgrades user to free tier');
  it.todo('invoice.paid re-confirms tier on subscription renewal');
});

describe('Stripe Customer Portal', () => {
  it.todo('GET /billing/portal returns Stripe portal session URL');
  it.todo('GET /billing/portal without JWT auth returns 401');
});
