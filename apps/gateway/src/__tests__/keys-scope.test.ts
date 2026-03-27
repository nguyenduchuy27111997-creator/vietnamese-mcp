// SCOPE-01: Tests for allowed_servers field in keys CRUD
// TDD RED phase — tests written before implementation

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import { keysRouter } from '../routes/keys.js';

function makeKv() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

const defaultAuth: AuthContext = { userId: 'user-abc', tier: 'free', keyId: 'key-existing', allowedServers: null };

function makeApp(
  auth: AuthContext = defaultAuth,
  supabaseMock?: (from: ReturnType<typeof vi.fn>) => void,
) {
  const app = new Hono<GatewayEnv>();

  const mockFrom = vi.fn();
  if (supabaseMock) {
    supabaseMock(mockFrom);
  }
  vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

  const kv = makeKv();

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

// ─── GET /keys returns allowed_servers ───────────────────────────────────────

describe('SCOPE-01: GET /keys returns allowed_servers field', () => {
  it('returns allowed_servers in each key row', async () => {
    const rows = [
      {
        id: 'k1',
        key_prefix: 'sk_test_aabb',
        name: 'My Key',
        tier: 'free',
        created_at: '2026-03-27T00:00:00Z',
        revoked_at: null,
        allowed_servers: ['momo', 'zalopay'],
      },
      {
        id: 'k2',
        key_prefix: 'sk_test_ccdd',
        name: 'Dev Key',
        tier: 'free',
        created_at: '2026-03-26T00:00:00Z',
        revoked_at: null,
        allowed_servers: null,
      },
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
    expect(body).toHaveLength(2);
    expect(body[0]).toHaveProperty('allowed_servers');
    expect(body[0].allowed_servers).toEqual(['momo', 'zalopay']);
    expect(body[1].allowed_servers).toBeNull();
  });
});

// ─── POST /keys accepts allowed_servers ──────────────────────────────────────

describe('SCOPE-01: POST /keys accepts and validates allowed_servers', () => {
  it('POST with valid allowed_servers inserts and returns 201', async () => {
    const insertedRow = {
      id: 'new-key-id',
      key_prefix: 'sk_test_aabb',
      tier: 'free',
      created_at: '2026-03-27T00:00:00.000Z',
      allowed_servers: ['momo', 'zalopay'],
    };

    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
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
        body: JSON.stringify({ name: 'Scoped Key', allowed_servers: ['momo', 'zalopay'] }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.allowed_servers).toEqual(['momo', 'zalopay']);
  });

  it('POST with no allowed_servers inserts null (all servers allowed)', async () => {
    const insertedRow = {
      id: 'new-key-id-2',
      key_prefix: 'sk_test_ccdd',
      tier: 'free',
      created_at: '2026-03-27T00:00:00.000Z',
      allowed_servers: null,
    };

    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
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
        body: JSON.stringify({ name: 'All-access Key' }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.allowed_servers).toBeNull();
  });

  it('POST with invalid server name returns 400', async () => {
    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
        }),
      });

      mockFrom.mockReturnValueOnce({ select: mockCountSelect });
    });

    const res = await fetchWithEnv(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bad Key', allowed_servers: ['momo', 'invalid-server'] }),
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('Invalid server name: invalid-server');
  });

  it('POST with all valid server names succeeds', async () => {
    const validServers = ['momo', 'zalopay', 'vnpay', 'zalo-oa', 'viettel-pay'];
    const insertedRow = {
      id: 'new-key-id-3',
      key_prefix: 'sk_test_eeff',
      tier: 'free',
      created_at: '2026-03-27T00:00:00.000Z',
      allowed_servers: validServers,
    };

    const { fetchWithEnv } = makeApp(defaultAuth, (mockFrom) => {
      const mockCountSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ count: 0, error: null }),
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
        body: JSON.stringify({ name: 'Full Key', allowed_servers: validServers }),
      }),
    );

    expect(res.status).toBe(201);
  });
});
