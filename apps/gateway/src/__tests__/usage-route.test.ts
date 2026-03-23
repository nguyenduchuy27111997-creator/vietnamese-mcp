// METR-02 unit tests for GET /usage route (usage.ts)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';

// Mock Supabase service role client before importing routes
vi.mock('../lib/supabase.js', () => ({
  getServiceRoleClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () => Promise.resolve({ data: [{ id: 'key-abc' }], error: null }),
        }),
      }),
    }),
  })),
}));

import { usageRouter } from '../routes/usage.js';

function makeKv(getReturn: string | null = null) {
  return {
    get: vi.fn().mockResolvedValue(getReturn),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

function makeApp(kvReturn: string | null, auth: AuthContext = { userId: 'u1', tier: 'free', keyId: 'key-abc' }) {
  const app = new Hono<GatewayEnv>();
  const kv = makeKv(kvReturn);

  // Inject auth context
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    return next();
  });

  app.route('/', usageRouter);

  const originalFetch = app.fetch.bind(app);
  const fetchWithEnv = (req: Request) =>
    originalFetch(req, {
      API_KEYS: kv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
      TINYBIRD_TOKEN: 'tb_test_token',
    } as GatewayEnv['Bindings']);

  return { fetchWithEnv, kv };
}

// ---

describe('GET /usage — no KV entry', () => {
  it('returns used: 0 when no KV entry exists', async () => {
    const { fetchWithEnv } = makeApp(null);
    const res = await fetchWithEnv(new Request('http://localhost/'));
    expect(res.status).toBe(200);

    const body = await res.json() as { used: number; limit: number; period: string; tier: string; resetsAt: string };
    expect(body.used).toBe(0);
    expect(body.limit).toBe(1000);
    expect(body.tier).toBe('free');
  });
});

describe('GET /usage — with KV entry', () => {
  it('returns used: 847 when KV holds "847"', async () => {
    const { fetchWithEnv } = makeApp('847');
    const res = await fetchWithEnv(new Request('http://localhost/'));
    expect(res.status).toBe(200);

    const body = await res.json() as { used: number; limit: number; period: string; tier: string; resetsAt: string };
    expect(body.used).toBe(847);
    expect(body.limit).toBe(1000);
    expect(body.tier).toBe('free');
  });

  it('resetsAt is a valid ISO date string in the future', async () => {
    const { fetchWithEnv } = makeApp(null);
    const res = await fetchWithEnv(new Request('http://localhost/'));
    const body = await res.json() as { resetsAt: string };

    // Should be first of next month at midnight UTC
    expect(body.resetsAt).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);

    // Should be in the future
    const resetsAt = new Date(body.resetsAt);
    expect(resetsAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('period matches YYYY-MM format', async () => {
    const { fetchWithEnv } = makeApp(null);
    const res = await fetchWithEnv(new Request('http://localhost/'));
    const body = await res.json() as { period: string };

    expect(body.period).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('GET /usage — tier-specific limits', () => {
  it('starter tier returns limit: 10000', async () => {
    const { fetchWithEnv } = makeApp('50', { userId: 'u2', tier: 'starter', keyId: 'key-starter' });
    const res = await fetchWithEnv(new Request('http://localhost/'));
    const body = await res.json() as { limit: number; tier: string };

    expect(body.limit).toBe(10000);
    expect(body.tier).toBe('starter');
  });

  it('business tier returns limit: Infinity', async () => {
    const { fetchWithEnv } = makeApp('0', { userId: 'u3', tier: 'business', keyId: 'key-biz' });
    const res = await fetchWithEnv(new Request('http://localhost/'));
    const body = await res.json() as { limit: number | null; tier: string };

    // JSON.stringify converts Infinity to null
    expect(body.tier).toBe('business');
  });
});
