// SCOPE-03: Tests for gateway scope enforcement
// scopeCheckMiddleware returns 403 when key's allowedServers excludes requested server

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';
import { scopeCheckMiddleware } from '../middleware/scopeCheck.js';

function makeKv() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

// Build a mini Hono app that tests scopeCheckMiddleware
function makeScopeApp(auth: AuthContext) {
  const app = new Hono<GatewayEnv>();

  // Inject auth context (simulates authMiddleware having already run)
  app.use('/mcp/:server', async (c, next) => {
    c.set('auth', auth);
    return next();
  });

  // Mount scope check middleware
  app.use('/mcp/:server', scopeCheckMiddleware);

  // Dummy MCP handler — if we reach here, scope check passed
  app.all('/mcp/:server', (c) => {
    return c.json({ ok: true, server: c.req.param('server') }, 200);
  });

  const originalFetch = app.fetch.bind(app);
  const fetchWithEnv = (req: Request) =>
    originalFetch(req, {
      API_KEYS: makeKv(),
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
    } as unknown as GatewayEnv['Bindings']);

  return { fetchWithEnv };
}

describe('SCOPE-03: scopeCheckMiddleware enforces server scope', () => {
  it('key with allowedServers=["momo","zalopay"] calling /mcp/vnpay -> 403', async () => {
    const auth: AuthContext = {
      userId: 'user-abc',
      tier: 'free',
      keyId: 'key-1',
      allowedServers: ['momo', 'zalopay'],
    };
    const { fetchWithEnv } = makeScopeApp(auth);

    const res = await fetchWithEnv(new Request('http://localhost/mcp/vnpay'));

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('API key not authorized for server: vnpay');
  });

  it('key with allowedServers=["momo"] calling /mcp/momo -> 200 (passes through)', async () => {
    const auth: AuthContext = {
      userId: 'user-abc',
      tier: 'free',
      keyId: 'key-2',
      allowedServers: ['momo'],
    };
    const { fetchWithEnv } = makeScopeApp(auth);

    const res = await fetchWithEnv(new Request('http://localhost/mcp/momo'));

    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; server: string };
    expect(body.ok).toBe(true);
    expect(body.server).toBe('momo');
  });

  it('key with allowedServers=null calling /mcp/vnpay -> 200 (null = all servers)', async () => {
    const auth: AuthContext = {
      userId: 'user-abc',
      tier: 'free',
      keyId: 'key-3',
      allowedServers: null,
    };
    const { fetchWithEnv } = makeScopeApp(auth);

    const res = await fetchWithEnv(new Request('http://localhost/mcp/vnpay'));

    expect(res.status).toBe(200);
  });

  it('key with allowedServers=[] (empty array) calling any server -> 403', async () => {
    const auth: AuthContext = {
      userId: 'user-abc',
      tier: 'free',
      keyId: 'key-4',
      allowedServers: [],
    };
    const { fetchWithEnv } = makeScopeApp(auth);

    const res = await fetchWithEnv(new Request('http://localhost/mcp/momo'));

    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('API key not authorized for server: momo');
  });

  it('key with no allowedServers field (undefined) calling any server -> 200 (backward compatible)', async () => {
    const auth: AuthContext = {
      userId: 'user-abc',
      tier: 'free',
      keyId: 'key-5',
      // allowedServers not set — undefined
    };
    const { fetchWithEnv } = makeScopeApp(auth);

    const res = await fetchWithEnv(new Request('http://localhost/mcp/zalopay'));

    expect(res.status).toBe(200);
  });
});
