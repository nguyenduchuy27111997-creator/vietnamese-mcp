// AUTH-03 + AUTH-04 unit tests for authMiddleware
// Replaces Wave 0 todo stubs with real implementation tests.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { authMiddleware, sha256hex } from '../middleware/auth.js';
import type { GatewayEnv, AuthContext } from '../types.js';

// Mock @supabase/supabase-js — no real network calls
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';

// Mock KV namespace factory
function makeKv(cached: AuthContext | null) {
  return {
    get: vi.fn().mockResolvedValue(cached),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

// Create test Hono app with auth middleware applied
function makeApp(
  kvResult: AuthContext | null,
  supabaseData: unknown,
  supabaseError: unknown = null,
) {
  const app = new Hono<GatewayEnv>();

  // Mock Supabase chain
  const mockSingle = vi.fn().mockResolvedValue({ data: supabaseData, error: supabaseError });
  const mockIs = vi.fn().mockReturnValue({ single: mockSingle });
  const mockEq = vi.fn().mockReturnValue({ is: mockIs });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

  const kv = makeKv(kvResult);

  // Apply middleware and test route
  app.use('*', authMiddleware);
  app.get('/test', (c) => c.json({ tier: c.get('auth').tier, userId: c.get('auth').userId }));

  // Override fetch to inject bindings
  const originalFetch = app.fetch.bind(app);
  const fetchWithEnv = (req: Request) =>
    originalFetch(req, {
      API_KEYS: kv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
    } as GatewayEnv['Bindings']);

  return { fetchWithEnv, kv, mockFrom };
}

// ---

describe('sha256hex', () => {
  it('is deterministic — sha256hex("hello") always returns same hash', async () => {
    const result = await sha256hex('hello');
    // SHA-256 of "hello" — known value
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    expect(result).toHaveLength(64);
  });

  it('returns lowercase hex string of length 64', async () => {
    const result = await sha256hex('test-key-123');
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---

describe('AUTH-03: Gateway rejects requests with missing/invalid API key', () => {
  it('missing Authorization header → 401', async () => {
    const { fetchWithEnv } = makeApp(null, null);
    const res = await fetchWithEnv(new Request('http://localhost/test'));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Missing Authorization header');
  });

  it('malformed header (not Bearer prefix) → 401', async () => {
    const { fetchWithEnv } = makeApp(null, null);
    const res = await fetchWithEnv(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Basic sometoken' },
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Missing Authorization header');
  });

  it('unknown key hash (not in KV or Supabase) → 401', async () => {
    // KV returns null, Supabase returns no data
    const { fetchWithEnv } = makeApp(null, null, { message: 'Not found' });
    const res = await fetchWithEnv(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer sk_test_unknown_key' },
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Invalid or revoked API key');
  });

  it('revoked key (data is null from revoked_at filter) → 401', async () => {
    // Supabase query uses .is('revoked_at', null) which returns no row for revoked keys
    const { fetchWithEnv } = makeApp(null, null, { message: 'Row not found' });
    const res = await fetchWithEnv(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer sk_test_revoked_key' },
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Invalid or revoked API key');
  });
});

// ---

describe('AUTH-03: Gateway passes valid API key and attaches auth context', () => {
  it('valid key found in KV cache → c.set("auth", cached) and next() called; Supabase NOT called', async () => {
    const cached: AuthContext = { userId: 'user-123', tier: 'free', keyId: 'key-abc' };
    const { fetchWithEnv, kv, mockFrom } = makeApp(cached, null);

    const res = await fetchWithEnv(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer sk_test_valid_key' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { tier: string; userId: string };
    expect(body.tier).toBe('free');
    expect(body.userId).toBe('user-123');

    // KV was called
    expect(kv.get).toHaveBeenCalled();
    // Supabase was NOT called (cache hit)
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('valid key not in KV → Supabase lookup → KV write with 60s TTL → next() called', async () => {
    const supabaseRow = {
      id: 'key-def',
      user_id: 'user-456',
      tier: 'starter',
      revoked_at: null,
    };
    const { fetchWithEnv, kv } = makeApp(null, supabaseRow);

    const res = await fetchWithEnv(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer sk_test_valid_key_2' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { tier: string; userId: string };
    expect(body.tier).toBe('starter');
    expect(body.userId).toBe('user-456');

    // KV put was called with 60s TTL
    expect(kv.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('"tier":"starter"'),
      { expirationTtl: 60 },
    );
  });
});

// ---

describe('AUTH-04: Auth middleware attaches correct tier from key record', () => {
  it('free tier key → c.get("auth").tier === "free"', async () => {
    const cached: AuthContext = { userId: 'u1', tier: 'free', keyId: 'k1' };
    const { fetchWithEnv } = makeApp(cached, null);

    const res = await fetchWithEnv(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer sk_test_free_key' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { tier: string };
    expect(body.tier).toBe('free');
  });

  it('starter tier key → c.get("auth").tier === "starter"', async () => {
    const supabaseRow = { id: 'k2', user_id: 'u2', tier: 'starter', revoked_at: null };
    const { fetchWithEnv } = makeApp(null, supabaseRow);

    const res = await fetchWithEnv(
      new Request('http://localhost/test', {
        headers: { Authorization: 'Bearer sk_test_starter_key' },
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { tier: string };
    expect(body.tier).toBe('starter');
  });
});
