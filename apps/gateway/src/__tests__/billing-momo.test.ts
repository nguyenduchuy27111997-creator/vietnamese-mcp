// BILL-03 + BILL-04: MoMo billing tests
// Replaces Wave 0 todo stubs with real implementation tests.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';
import { verifyMomoIpn } from '../billing/momo.js';

// ─── Mock tierUpgrade ─────────────────────────────────────────────────────────

vi.mock('../billing/tierUpgrade.js', () => ({
  handleTierUpgrade: vi.fn().mockResolvedValue(undefined),
  checkIdempotency: vi.fn().mockResolvedValue(false),
}));

// ─── Mock Supabase ────────────────────────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

// ─── Mock Stripe (required by billingRouter which imports stripe.ts) ──────────

vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: vi.fn() } },
    webhooks: { constructEventAsync: vi.fn() },
    billingPortal: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn() },
  }));
  Object.assign(MockStripe, {
    createFetchHttpClient: vi.fn().mockReturnValue({}),
    createSubtleCryptoProvider: vi.fn().mockReturnValue({}),
  });
  return { default: MockStripe };
});

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { handleTierUpgrade, checkIdempotency } from '../billing/tierUpgrade.js';
import { billingRouter } from '../routes/billing.js';

// ─── Test env ────────────────────────────────────────────────────────────────

const MOMO_SECRET = 'test-secret-key';

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
  MOMO_SECRET_KEY: MOMO_SECRET,
} as unknown as GatewayEnv['Bindings'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function computeHmac(raw: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(raw));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function buildRawString(payload: {
  accessKey: string; amount: number; extraData: string; message: string; orderId: string;
  orderInfo: string; orderType: string; partnerCode: string; payType: string;
  requestId: string; responseTime: number; resultCode: number; transId: number;
}): string {
  return `accessKey=${payload.accessKey}&amount=${payload.amount}&extraData=${payload.extraData}&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}&requestId=${payload.requestId}&responseTime=${payload.responseTime}&resultCode=${payload.resultCode}&transId=${payload.transId}`;
}

const defaultAuth: AuthContext = { userId: 'user-123', tier: 'free', keyId: 'key-abc' };

function makeFullApp(auth: AuthContext | null = defaultAuth) {
  const app = new Hono<GatewayEnv>();
  app.use('/billing/create-checkout', async (c, next) => {
    if (!auth) return c.json({ error: 'Missing Authorization header' }, 401);
    c.set('auth', auth);
    await next();
  });
  app.route('/billing', billingRouter);
  const fetchWithEnv = (req: Request) => app.fetch(req, testEnv);
  return { fetchWithEnv };
}

function makeIpnApp() {
  const app = new Hono<GatewayEnv>();
  app.route('/billing', billingRouter);
  const fetchWithEnv = (req: Request) => app.fetch(req, testEnv);
  return { fetchWithEnv };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(checkIdempotency).mockResolvedValue(false);
  vi.mocked(handleTierUpgrade).mockResolvedValue(undefined);
});

// ─── BILL-04: verifyMomoIpn unit tests ───────────────────────────────────────

describe('BILL-04: verifyMomoIpn', () => {
  it('returns true for correctly signed IPN payload', async () => {
    const payload = {
      accessKey: 'ak',
      amount: 449000,
      extraData: btoa('{"userId":"u1","tier":"starter"}'),
      message: 'Success',
      orderId: 'ORD_1',
      orderInfo: 'Upgrade',
      orderType: 'momo_wallet',
      partnerCode: 'PC',
      payType: 'qr',
      requestId: 'REQ_1',
      responseTime: 1700000000,
      resultCode: 0,
      transId: 12345,
      signature: '',
    };

    const raw = buildRawString(payload);
    payload.signature = await computeHmac(raw, MOMO_SECRET);

    const result = await verifyMomoIpn(payload, MOMO_SECRET);
    expect(result).toBe(true);
  });

  it('returns false for tampered signature', async () => {
    const payload = {
      accessKey: 'ak',
      amount: 449000,
      extraData: '',
      message: '',
      orderId: 'ORD_2',
      orderInfo: '',
      orderType: '',
      partnerCode: 'PC',
      payType: '',
      requestId: 'REQ_2',
      responseTime: 1700000000,
      resultCode: 0,
      transId: 99999,
      signature: 'deadbeef0000000000000000000000000000000000000000000000000000000000',
    };
    const result = await verifyMomoIpn(payload, MOMO_SECRET);
    expect(result).toBe(false);
  });
});

// ─── BILL-04: MoMo IPN route tests ───────────────────────────────────────────

describe('BILL-04: MoMo IPN route', () => {
  async function makeValidIpnBody(overrides: Partial<{
    resultCode: number; orderId: string; extraData: string;
  }> = {}) {
    const base = {
      accessKey: 'momo-access',
      amount: 449000,
      extraData: btoa('{"userId":"user-123","tier":"starter"}'),
      message: 'Success',
      orderId: 'ORD_VALID_1',
      orderInfo: 'Upgrade to starter',
      orderType: 'momo_wallet',
      partnerCode: 'momo-code',
      payType: 'qr',
      requestId: 'REQ_VALID_1',
      responseTime: 1700000000,
      resultCode: 0,
      transId: 54321,
      ...overrides,
      signature: '',
    };
    const raw = buildRawString(base);
    base.signature = await computeHmac(raw, MOMO_SECRET);
    return base;
  }

  it('POST /billing/momo-ipn with valid HMAC and resultCode=0 upgrades tier (returns 204)', async () => {
    // Supabase: update returns ok
    const mockIs = vi.fn().mockResolvedValue({ error: null });
    const mockEq = vi.fn().mockReturnValue({ is: mockIs });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createClient>);

    const body = await makeValidIpnBody();
    const { fetchWithEnv } = makeIpnApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/momo-ipn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));

    expect(res.status).toBe(204);
    expect(handleTierUpgrade).toHaveBeenCalledWith('user-123', 'starter', testEnv);
    expect(checkIdempotency).toHaveBeenCalledWith('ORD_VALID_1', 'momo', testEnv);
  });

  it('POST /billing/momo-ipn with tampered HMAC returns 400', async () => {
    const body = {
      accessKey: 'momo-access',
      amount: 449000,
      extraData: '',
      message: '',
      orderId: 'ORD_BAD',
      orderInfo: '',
      orderType: '',
      partnerCode: 'momo-code',
      payType: '',
      requestId: 'REQ_BAD',
      responseTime: 1700000000,
      resultCode: 0,
      transId: 0,
      signature: 'tampered-signature-that-will-not-verify',
    };

    const { fetchWithEnv } = makeIpnApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/momo-ipn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));

    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe('Invalid signature');
    expect(handleTierUpgrade).not.toHaveBeenCalled();
  });

  it('POST /billing/momo-ipn with resultCode!=0 returns 204 without upgrade', async () => {
    const body = await makeValidIpnBody({ resultCode: 1006, orderId: 'ORD_FAILED' });

    const { fetchWithEnv } = makeIpnApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/momo-ipn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));

    expect(res.status).toBe(204);
    expect(handleTierUpgrade).not.toHaveBeenCalled();
  });

  it('POST /billing/momo-ipn with duplicate orderId returns 204 without re-processing', async () => {
    vi.mocked(checkIdempotency).mockResolvedValue(true); // Duplicate!

    const body = await makeValidIpnBody({ orderId: 'ORD_DUPLICATE' });

    const { fetchWithEnv } = makeIpnApp();
    const res = await fetchWithEnv(new Request('http://localhost/billing/momo-ipn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));

    expect(res.status).toBe(204);
    expect(handleTierUpgrade).not.toHaveBeenCalled();
  });
});

// ─── BILL-03: MoMo Create Checkout ───────────────────────────────────────────

describe('BILL-03: MoMo Create Checkout', () => {
  it('POST /billing/create-checkout with provider=momo returns MoMo payment URL', async () => {
    const { fetchWithEnv } = makeFullApp(defaultAuth);
    const res = await fetchWithEnv(new Request('http://localhost/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-token' },
      body: JSON.stringify({ provider: 'momo', tier: 'starter', returnUrl: 'https://dash.mcpvn.dev' }),
    }));

    expect(res.status).toBe(200);
    const body = await res.json() as { url: string };
    expect(body.url).toContain('test-payment.momo.vn');
    expect(body.url).toContain('449000'); // VND amount for starter
    expect(body.url).toContain('orderId=');
  });

  it('POST /billing/create-checkout with invalid tier returns 400', async () => {
    const { fetchWithEnv } = makeFullApp(defaultAuth);
    const res = await fetchWithEnv(new Request('http://localhost/billing/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-token' },
      body: JSON.stringify({ provider: 'momo', tier: 'ultra' }),
    }));

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Invalid tier');
  });
});
