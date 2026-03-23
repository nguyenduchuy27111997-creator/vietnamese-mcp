// AUTH-02 + AUTH-05 unit/integration tests for /keys route
// Wave 3 (Plan 03): replaces todo stubs with real implementation tests.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';

// Mock @supabase/supabase-js — no real network calls
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import { keysRouter } from '../routes/keys.js';

// Mock KV namespace factory
function makeKv() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

// Default auth context for tests
const defaultAuth: AuthContext = { userId: 'user-abc', tier: 'free', keyId: 'key-existing' };

// Build a Hono test app with keysRouter mounted and auth pre-injected
function makeApp(
  auth: AuthContext = defaultAuth,
  supabaseMock?: (from: ReturnType<typeof vi.fn>) => void,
) {
  const app = new Hono<GatewayEnv>();

  // Set up Supabase mock
  const mockFrom = vi.fn();
  if (supabaseMock) {
    supabaseMock(mockFrom);
  }
  vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

  const kv = makeKv();

  // Inject auth context (simulates authMiddleware having already run)
  app.use('*', async (c, next) => {
    c.set('auth', auth);
    await next();
  });

  app.route('/', keysRouter);

  const originalFetch = app.fetch.bind(app);
  const fetchWithEnv = (req: Request) =>
    originalFetch(req, {
      API_KEYS: kv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
    } as unknown as GatewayEnv['Bindings']);

  return { fetchWithEnv, kv, mockFrom };
}

// ─── POST /keys ─────────────────────────────────────────────────────────────

describe('AUTH-02: POST /keys creates a new API key', () => {
  it('returns 201 with { id, key_prefix, tier, created_at, key } where key starts with "sk_test_"', async () => {
    const insertedRow = {
      id: 'new-key-id',
      key_prefix: 'sk_test_aabb',
      tier: 'free',
      created_at: '2026-03-22T00:00:00.000Z',
    };

    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      // First call: count active keys (head=true, returns count=0)
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      });

      // Second call: insert new key
      const mockInsertSingle = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
      const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      mockFrom
        .mockReturnValueOnce({ select: mockCountSelect })
        .mockReturnValueOnce({ insert: mockInsert });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Key' }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; key_prefix: string; tier: string; created_at: string; key: string };
    expect(body.id).toBe('new-key-id');
    expect(body.key_prefix).toBe('sk_test_aabb');
    expect(body.tier).toBe('free');
    expect(body.key).toMatch(/^sk_test_[0-9a-f]{64}$/);
  });

  it('key field is 72 chars: "sk_test_" (8) + 64 hex chars (32 bytes)', async () => {
    const insertedRow = {
      id: 'new-key-id-2',
      key_prefix: 'sk_test_ccdd',
      tier: 'starter',
      created_at: '2026-03-22T00:00:00.000Z',
    };

    const { fetchWithEnv } = makeApp({ userId: 'user-xyz', tier: 'starter', keyId: 'k2' }, (mockFrom) => {
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      });
      const mockInsertSingle = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
      const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

      mockFrom
        .mockReturnValueOnce({ select: mockCountSelect })
        .mockReturnValueOnce({ insert: mockInsert });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json() as { key: string };
    expect(body.key).toHaveLength(72);
    expect(body.key.startsWith('sk_test_')).toBe(true);
  });

  it('third call when user already has 2 active keys returns 409', async () => {
    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 2, error: null }),
        }),
      });

      mockFrom.mockReturnValueOnce({ select: mockCountSelect });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(409);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Key limit reached (2 per user)');
  });
});

// ─── DELETE /keys/:id ────────────────────────────────────────────────────────

describe('AUTH-02: DELETE /keys/:id revokes an existing key', () => {
  it('revoke sets revoked_at in DB and deletes KV entry → returns 200 { success: true }', async () => {
    const keyHash = 'abc123hashvalue';

    const { fetchWithEnv, kv } = makeApp(defaultAuth, (mockFrom) => {
      // First call: select key_hash with user_id + id guard
      const mockFetchSingle = vi.fn().mockResolvedValue({ data: { key_hash: keyHash }, error: null });
      const mockFetchIs = vi.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchEqUserId = vi.fn().mockReturnValue({ is: mockFetchIs });
      const mockFetchEqId = vi.fn().mockReturnValue({ eq: mockFetchEqUserId });
      const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEqId });

      // Second call: update revoked_at
      const mockUpdateEq = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

      mockFrom
        .mockReturnValueOnce({ select: mockFetchSelect })
        .mockReturnValueOnce({ update: mockUpdate });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/key-id-001', { method: 'DELETE' }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);

    // KV delete must be called with the key_hash
    expect(kv.delete).toHaveBeenCalledWith(keyHash);
  });

  it('revoking nonexistent key returns 404', async () => {
    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockFetchSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockFetchIs = vi.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchEqUserId = vi.fn().mockReturnValue({ is: mockFetchIs });
      const mockFetchEqId = vi.fn().mockReturnValue({ eq: mockFetchEqUserId });
      const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEqId });

      mockFrom.mockReturnValueOnce({ select: mockFetchSelect });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/nonexistent-id', { method: 'DELETE' }),
    );

    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Key not found');
  });

  it('cannot revoke another user\'s key → 404 (user_id guard returns 404, not 403)', async () => {
    // Auth context belongs to user-other; key belongs to user-abc (different user)
    const otherAuth: AuthContext = { userId: 'user-other', tier: 'free', keyId: 'k-other' };

    const { fetchWithEnv } = makeApp(otherAuth, (mockFrom) => {
      // The .eq('user_id', 'user-other') guard causes no match for a key owned by user-abc
      const mockFetchSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } });
      const mockFetchIs = vi.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchEqUserId = vi.fn().mockReturnValue({ is: mockFetchIs });
      const mockFetchEqId = vi.fn().mockReturnValue({ eq: mockFetchEqUserId });
      const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEqId });

      mockFrom.mockReturnValueOnce({ select: mockFetchSelect });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/user-abc-key-id', { method: 'DELETE' }),
    );

    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Key not found');
  });
});

// ─── GET /keys ───────────────────────────────────────────────────────────────

describe('AUTH-02: GET /keys returns list without key_hash', () => {
  it('returns 200 with array of keys; key_hash is NOT in response', async () => {
    const rows = [
      { id: 'k1', key_prefix: 'sk_test_aabb', name: 'My Key', tier: 'free', created_at: '2026-03-22T00:00:00Z', revoked_at: null },
      { id: 'k2', key_prefix: 'sk_test_ccdd', name: 'Dev Key', tier: 'free', created_at: '2026-03-21T00:00:00Z', revoked_at: null },
    ];

    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockOrder = vi.fn().mockResolvedValue({ data: rows, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValueOnce({ select: mockSelect });
    });

    const res = await fetchWithEnv(new Request('http://localhost/'));

    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);

    // key_hash must NEVER appear in the response
    for (const row of body) {
      expect(row).not.toHaveProperty('key_hash');
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('key_prefix');
      expect(row).toHaveProperty('tier');
    }
  });

  it('returns empty array when user has no keys', async () => {
    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockFrom.mockReturnValueOnce({ select: mockSelect });
    });

    const res = await fetchWithEnv(new Request('http://localhost/'));

    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(body).toHaveLength(0);
  });
});

// ─── AUTH-05: RLS isolation ───────────────────────────────────────────────────

describe('AUTH-05: RLS isolation — User B cannot access User A keys via cross-user guard', () => {
  it('User B requesting DELETE on User A key gets 404 (not 403)', async () => {
    // This test validates the application-layer guard (user_id in WHERE clause)
    // The DB-level RLS is tested separately in rls-isolation.test.ts
    const userB: AuthContext = { userId: 'user-B', tier: 'free', keyId: 'k-B' };

    const { fetchWithEnv } = makeApp(userB, (mockFrom) => {
      // Supabase returns no row because user_id = 'user-B' doesn't match user-A's key
      const mockFetchSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockFetchIs = vi.fn().mockReturnValue({ single: mockFetchSingle });
      const mockFetchEqUserId = vi.fn().mockReturnValue({ is: mockFetchIs });
      const mockFetchEqId = vi.fn().mockReturnValue({ eq: mockFetchEqUserId });
      const mockFetchSelect = vi.fn().mockReturnValue({ eq: mockFetchEqId });

      mockFrom.mockReturnValueOnce({ select: mockFetchSelect });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/user-A-key-id', { method: 'DELETE' }),
    );

    expect(res.status).toBe(404);
  });
});
