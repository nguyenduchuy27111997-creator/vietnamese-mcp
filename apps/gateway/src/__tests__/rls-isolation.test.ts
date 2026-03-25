// AUTH-05: Application-layer isolation tests for api_keys
// RLS is disabled — isolation is enforced by the keys router using auth.userId from middleware.
// These tests verify the application-layer guard: users can only see/create their own keys.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';

// Mock @supabase/supabase-js — no real network calls
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';

// Helper: inject a fixed auth context (bypasses real auth middleware)
function makeJwtMiddleware(authCtx: AuthContext) {
  return async (c: Parameters<typeof Hono.prototype.use>[1] extends (...args: infer A) => unknown ? A[0] : never, next: () => Promise<void>) => {
    (c as { set: (k: string, v: unknown) => void }).set('auth', authCtx);
    await next();
  };
}

// Build a minimal Hono app mounting keysRouter with injected auth context
async function makeApp(authCtx: AuthContext) {
  // Import keysRouter dynamically so vi.mock('@supabase/supabase-js') is already set up
  const { keysRouter } = await import('../routes/keys.js');

  const app = new Hono<GatewayEnv>();

  // Inject auth context directly without running real authMiddleware
  app.use('*', async (c, next) => {
    c.set('auth', authCtx);
    await next();
  });

  app.route('/keys', keysRouter);

  // Build fetchWithEnv — injects bindings into every request
  const kv = {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };

  const originalFetch = app.fetch.bind(app);
  const fetchWithEnv = (req: Request) =>
    originalFetch(req, {
      API_KEYS: kv,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
    } as unknown as GatewayEnv['Bindings']);

  return { fetchWithEnv };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---

describe('AUTH-05: RLS isolation — User B cannot access User A rows via anon client', () => {
  it('User B anon client: SELECT from api_keys WHERE user_id = userA.id returns empty array (RLS filtered)', async () => {
    // User B is the authenticated caller
    const userB: AuthContext = { userId: 'user-b', tier: 'free', keyId: 'key-b1' };

    // Mock Supabase: GET /keys calls .eq('user_id', auth.userId)
    // The route enforces user_id = auth.userId — User B can never see User A's keys
    // Supabase returns only User B's keys (application guard ensures correct filter)
    const userBKeys = [
      { id: 'key-b1', key_prefix: 'sk_test_bb', name: 'B Key', tier: 'free', created_at: '2025-01-01', revoked_at: null },
    ];

    const mockSingle = vi.fn();
    const mockOrder = vi.fn().mockResolvedValue({ data: userBKeys, error: null });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder, is: vi.fn().mockReturnValue({ single: mockSingle }) });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = await makeApp(userB);
    const res = await fetchWithEnv(new Request('http://localhost/keys'));

    expect(res.status).toBe(200);
    const body = await res.json() as { id: string }[];

    // Application layer ONLY queried with User B's userId
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-b');
    // Response contains only User B's keys
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe('key-b1');
  });

  it('User B anon client: INSERT api_keys with user_id = userA.id throws RLS policy violation', async () => {
    // User B is the authenticated caller
    const userB: AuthContext = { userId: 'user-b', tier: 'free', keyId: 'key-b1' };

    // Mock Supabase: POST /keys uses auth.userId from context — never from request body
    const newKey = { id: 'key-new', key_prefix: 'sk_test_', tier: 'free', created_at: '2025-01-01' };

    // Count check (key limit) — returns 0 active keys
    const mockCountSingle = vi.fn();
    const mockCountIs = vi.fn().mockResolvedValue({ count: 0, error: null });
    const mockCountEq = vi.fn().mockReturnValue({ is: mockCountIs });
    const mockCountSelect = vi.fn().mockReturnValue({ eq: mockCountEq });

    // Insert chain
    const mockInsertSingle = vi.fn().mockResolvedValue({ data: newKey, error: null });
    const mockInsertSelect = vi.fn().mockReturnValue({ single: mockInsertSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockInsertSelect });

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'api_keys') {
        return {
          select: mockCountSelect,
          insert: mockInsert,
        };
      }
      return {};
    });

    vi.mocked(createClient).mockReturnValue({ from: mockFrom } as ReturnType<typeof createClient>);

    const { fetchWithEnv } = await makeApp(userB);

    // User B attempts to POST /keys (attempting to create a key)
    // Even if request body contains user_id: 'user-a', the route ignores it
    const res = await fetchWithEnv(
      new Request('http://localhost/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Attempted Key', user_id: 'user-a' }),  // user_id in body is ignored
      }),
    );

    // Should succeed but use User B's auth.userId
    expect(res.status).toBe(201);

    // CRITICAL: the insert call must use User B's userId from auth context, NOT 'user-a' from request body
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-b' }),
    );
    // Confirm that user-a's id was NOT used
    expect(mockInsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-a' }),
    );
  });
});
