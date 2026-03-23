// BILL-01 + BILL-02 unit tests for Stripe billing routes
// Replaces Wave 0 todo stubs with real implementation tests.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';

// ─── Mock Stripe ─────────────────────────────────────────────────────────────
// vi.mock is hoisted — no top-level variable references allowed inside factory

vi.mock('stripe', () => {
  const checkoutCreate = vi.fn();
  const constructEventAsync = vi.fn();
  const portalCreate = vi.fn();
  const subscriptionRetrieve = vi.fn();

  const MockStripe = vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: checkoutCreate } },
    webhooks: { constructEventAsync },
    billingPortal: { sessions: { create: portalCreate } },
    subscriptions: { retrieve: subscriptionRetrieve },
  }));
  // Store fns on constructor so tests can access via MockStripe._fns
  Object.assign(MockStripe, {
    createFetchHttpClient: vi.fn().mockReturnValue({}),
    createSubtleCryptoProvider: vi.fn().mockReturnValue({}),
    _checkoutCreate: checkoutCreate,
    _constructEventAsync: constructEventAsync,
    _portalCreate: portalCreate,
    _subscriptionRetrieve: subscriptionRetrieve,
  });
  return { default: MockStripe };
});

// ─── Mock tierUpgrade ─────────────────────────────────────────────────────────

vi.mock('../billing/tierUpgrade.js', () => ({
  handleTierUpgrade: vi.fn().mockResolvedValue(undefined),
  checkIdempotency: vi.fn().mockResolvedValue(false),
}));

// ─── Mock Supabase ────────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// ─── Imports (after mocks are registered) ────────────────────────────────────

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { handleTierUpgrade, checkIdempotency } from '../billing/tierUpgrade.js';
import { billingRouter } from '../routes/billing.js';

// Access Stripe mock fns through the constructor object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeMock = Stripe as unknown as Record<string, any>;

// ─── Test env ────────────────────────────────────────────────────────────────

const testEnv = {
  API_KEYS: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  },
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
  TINYBIRD_TOKEN: 'tb-token',
  STRIPE_SECRET_KEY: 'sk_test_secret',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  STRIPE_PRICE_STARTER: 'price_starter',
  STRIPE_PRICE_PRO: 'price_pro',
  STRIPE_PRICE_BUSINESS: 'price_business',
  MOMO_PARTNER_CODE: 'momo-code',
  MOMO_ACCESS_KEY: 'momo-access',
  MOMO_SECRET_KEY: 'momo-secret',
} as unknown as GatewayEnv['Bindings'];

// ─── App builders ─────────────────────────────────────────────────────────────

const defaultAuth: AuthContext = { userId: 'user-123', tier: 'free', keyId: 'key-abc' };

/** App that mimics index.ts: JWT on checkout/portal, none on webhook */
function makeFullApp(auth: AuthContext | null = defaultAuth) {
  const app = new Hono<GatewayEnv>();

  app.use('/billing/create-checkout', async (c, next) => {
    if (!auth) return c.json({ error: 'Missing Authorization header' }, 401);
    c.set('auth', auth);
    await next();
  });
  app.use('/billing/portal', async (c, next) => {
    if (!auth) return c.json({ error: 'Missing Authorization header' }, 401);
    c.set('auth', auth);
    await next();
  });

  app.route('/billing', billingRouter);

  const fetchWithEnv = (req: Request) => app.fetch(req, testEnv);
  return { fetchWithEnv };
}

/** App without auth (for webhook tests) */
function makeWebhookApp() {
  const app = new Hono<GatewayEnv>();
  app.route('/billing', billingRouter);
  const fetchWithEnv = (req: Request) => app.fetch(req, testEnv);
  return { fetchWithEnv };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mock defaults
  vi.mocked(checkIdempotency).mockResolvedValue(false);
  vi.mocked(handleTierUpgrade).mockResolvedValue(undefined);
});

// ─── BILL-01: Stripe Checkout ─────────────────────────────────────────────────

describe('BILL-01: Stripe Checkout', () => {
  it('POST /billing/create-checkout with provider=stripe returns Stripe session URL', async () => {
    StripeMock._checkoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/cs_test_123' });

    const { fetchWithEnv } = makeFullApp(defaultAuth);
    const res = await fetchWithEnv(new Request('http://localhost/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-token' },
      body: JSON.stringify({ provider: 'stripe', tier: 'starter' }),
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as { url: string };
    expect(body.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
    expect(StripeMock._checkoutCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      client_reference_id: 'user-123',
      metadata: { tier: 'starter' },
    }));
  });

  it('POST /billing/create-checkout with invalid tier returns 400', async () => {
    const { fetchWithEnv } = makeFullApp(defaultAuth);
    const res = await fetchWithEnv(new Request('http://localhost/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-token' },
      body: JSON.stringify({ provider: 'stripe', tier: 'enterprise' }),
    }));

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Invalid tier');
    expect(StripeMock._checkoutCreate).not.toHaveBeenCalled();
  });

  it('POST /billing/create-checkout without JWT auth returns 401', async () => {
    const { fetchWithEnv } = makeFullApp(null);
    const res = await fetchWithEnv(new Request('http://localhost/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'stripe', tier: 'starter' }),
    }));

    expect(res.status).toBe(401);
  });
});

// ─── BILL-02: Stripe Webhook ──────────────────────────────────────────────────

describe('BILL-02: Stripe Webhook', () => {
  it('POST /billing/stripe-webhook with valid signature processes checkout.session.completed', async () => {
    const checkoutEvent = {
      id: 'evt_checkout_001',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user-123',
          customer: 'cus_test_001',
          metadata: { tier: 'pro' },
        },
      },
    };

    StripeMock._constructEventAsync.mockResolvedValue(checkoutEvent);

    // Supabase: update returns ok
    const mockIs = vi.fn().mockResolvedValue({ error: null });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = makeWebhookApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=123,v1=abc', 'Content-Type': 'text/plain' },
      body: JSON.stringify(checkoutEvent),
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as { received: boolean };
    expect(body.received).toBe(true);
    expect(handleTierUpgrade).toHaveBeenCalledWith('user-123', 'pro', testEnv);
    expect(checkIdempotency).toHaveBeenCalledWith('evt_checkout_001', 'stripe', testEnv);
  });

  it('POST /billing/stripe-webhook with invalid signature returns 400', async () => {
    StripeMock._constructEventAsync.mockRejectedValue(
      new Error('No signatures found matching the expected signature for payload'),
    );

    const { fetchWithEnv } = makeWebhookApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'invalid-sig', 'Content-Type': 'text/plain' },
      body: '{"type":"checkout.session.completed"}',
    }));

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Invalid signature');
    expect(handleTierUpgrade).not.toHaveBeenCalled();
  });

  it('POST /billing/stripe-webhook with duplicate event_id returns 200 without processing', async () => {
    const checkoutEvent = {
      id: 'evt_duplicate_001',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'user-123',
          customer: 'cus_test_001',
          metadata: { tier: 'starter' },
        },
      },
    };

    StripeMock._constructEventAsync.mockResolvedValue(checkoutEvent);
    vi.mocked(checkIdempotency).mockResolvedValue(true); // Duplicate!

    const { fetchWithEnv } = makeWebhookApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=123,v1=abc', 'Content-Type': 'text/plain' },
      body: JSON.stringify(checkoutEvent),
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as { received: boolean };
    expect(body.received).toBe(true);
    expect(handleTierUpgrade).not.toHaveBeenCalled();
  });

  it('customer.subscription.deleted downgrades user to free tier', async () => {
    const deleteEvent = {
      id: 'evt_sub_deleted_001',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: 'cus_test_001',
        },
      },
    };

    StripeMock._constructEventAsync.mockResolvedValue(deleteEvent);

    // Supabase: select returns user_id
    const mockSingle = vi.fn().mockResolvedValue({ data: { user_id: 'user-123' }, error: null });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockIs = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = makeWebhookApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=123,v1=abc', 'Content-Type': 'text/plain' },
      body: JSON.stringify(deleteEvent),
    }));

    expect(res.status).toBe(200);
    expect(handleTierUpgrade).toHaveBeenCalledWith('user-123', 'free', testEnv);
  });

  it('invoice.paid re-confirms tier on subscription renewal using subscription_details metadata', async () => {
    const invoiceEvent = {
      id: 'evt_invoice_paid_001',
      type: 'invoice.paid',
      data: {
        object: {
          customer: 'cus_test_001',
          parent: {
            type: 'subscription_details',
            subscription_details: {
              metadata: { tier: 'pro' },
              subscription: 'sub_test_001',
            },
          },
        },
      },
    };

    StripeMock._constructEventAsync.mockResolvedValue(invoiceEvent);

    // Supabase: select returns user_id by stripe_customer_id
    const mockSingle = vi.fn().mockResolvedValue({ data: { user_id: 'user-123' }, error: null });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockIs = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = makeWebhookApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=123,v1=abc', 'Content-Type': 'text/plain' },
      body: JSON.stringify(invoiceEvent),
    }));

    expect(res.status).toBe(200);
    expect(handleTierUpgrade).toHaveBeenCalledWith('user-123', 'pro', testEnv);
    // No extra Stripe API call when metadata has tier
    expect(StripeMock._subscriptionRetrieve).not.toHaveBeenCalled();
  });

  it('invoice.paid falls back to subscription retrieve when metadata missing', async () => {
    const invoiceEvent = {
      id: 'evt_invoice_paid_002',
      type: 'invoice.paid',
      data: {
        object: {
          customer: 'cus_test_002',
          parent: {
            type: 'subscription_details',
            subscription_details: {
              metadata: null, // No metadata — must retrieve subscription
              subscription: 'sub_test_002',
            },
          },
        },
      },
    };

    StripeMock._constructEventAsync.mockResolvedValue(invoiceEvent);
    StripeMock._subscriptionRetrieve.mockResolvedValue({ metadata: { tier: 'business' } });

    // Supabase: select returns user_id
    const mockSingle = vi.fn().mockResolvedValue({ data: { user_id: 'user-456' }, error: null });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockIs = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = makeWebhookApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 't=123,v1=abc', 'Content-Type': 'text/plain' },
      body: JSON.stringify(invoiceEvent),
    }));

    expect(res.status).toBe(200);
    expect(StripeMock._subscriptionRetrieve).toHaveBeenCalledWith('sub_test_002');
    expect(handleTierUpgrade).toHaveBeenCalledWith('user-456', 'business', testEnv);
  });
});

// ─── Stripe Customer Portal ───────────────────────────────────────────────────

describe('Stripe Customer Portal', () => {
  it('GET /billing/portal returns Stripe portal session URL', async () => {
    StripeMock._portalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/session/bps_test_123' });

    // Supabase: returns stripe_customer_id
    const mockSingle = vi.fn().mockResolvedValue({ data: { stripe_customer_id: 'cus_test_001' }, error: null });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockNot = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockIs = vi.fn().mockReturnValue({ not: mockNot });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = makeFullApp(defaultAuth);
    const res = await fetchWithEnv(new Request('http://localhost/billing/portal', {
      headers: { Authorization: 'Bearer jwt-token' },
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as { url: string };
    expect(body.url).toBe('https://billing.stripe.com/session/bps_test_123');
    expect(StripeMock._portalCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_test_001',
    }));
  });

  it('GET /billing/portal without JWT auth returns 401', async () => {
    const { fetchWithEnv } = makeFullApp(null);
    const res = await fetchWithEnv(new Request('http://localhost/billing/portal'));

    expect(res.status).toBe(401);
  });

  it('GET /billing/portal returns 404 when no Stripe customer found', async () => {
    // Supabase: returns null (no stripe_customer_id)
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'No rows' } });
    const mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    const mockNot = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockIs = vi.fn().mockReturnValue({ not: mockNot });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = makeFullApp(defaultAuth);
    const res = await fetchWithEnv(new Request('http://localhost/billing/portal', {
      headers: { Authorization: 'Bearer jwt-token' },
    }));

    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('No Stripe subscription found');
  });
});
