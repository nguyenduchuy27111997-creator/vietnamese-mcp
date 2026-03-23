// METR-02 integration tests for metering flow in gateway index.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';
import { getUsageCount, checkUsageLimit, incrementUsageCounter, usageLimitResponse } from '../metering/usageCounter.js';
import { sendTinybirdEvent } from '../metering/tinybird.js';

// Mock metering modules
vi.mock('../metering/usageCounter.js', () => ({
  getUsageCount: vi.fn(),
  checkUsageLimit: vi.fn(),
  incrementUsageCounter: vi.fn().mockResolvedValue(undefined),
  usageLimitResponse: vi.fn(),
  TIER_LIMITS: { free: 1_000, starter: 10_000, pro: 100_000, business: Infinity },
}));

vi.mock('../metering/tinybird.js', () => ({
  sendTinybirdEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock router
vi.mock('../router.js', () => ({
  handleMcpRequest: vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { tools: [] } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  ),
}));

import { handleMcpRequest } from '../router.js';

function makeKv() {
  return {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  };
}

function buildApp(auth: AuthContext) {
  const app = new Hono<GatewayEnv>();
  const kv = makeKv();
  const waitUntilMock = vi.fn();

  // Inject auth context
  app.use('/mcp/*', async (c, next) => {
    c.set('auth', auth);
    return next();
  });

  // Replicate the metering-aware MCP route (mirrors index.ts logic)
  app.all('/mcp/:server', async (c) => {
    const serverName = c.req.param('server');
    const { tier, keyId } = c.get('auth');

    if (tier !== 'business') {
      const used = await getUsageCount(keyId, c.env.API_KEYS);
      if (checkUsageLimit(used, tier)) {
        return usageLimitResponse(tier, used) as Response;
      }
    }

    const response = await handleMcpRequest(serverName, c.req.raw, tier);

    c.executionCtx.waitUntil(
      Promise.all([
        sendTinybirdEvent(
          {
            api_key_id: keyId,
            server: serverName,
            tool: 'unknown',
            timestamp: new Date().toISOString(),
            response_status: 'ok',
          },
          c.env.TINYBIRD_TOKEN,
          c.env.TINYBIRD_HOST,
        ),
        tier !== 'business' ? incrementUsageCounter(keyId, c.env.API_KEYS) : Promise.resolve(),
      ]),
    );

    return response;
  });

  const originalFetch = app.fetch.bind(app);
  const fetchWithEnv = (req: Request) =>
    originalFetch(
      req,
      {
        API_KEYS: kv,
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
        TINYBIRD_TOKEN: 'tb_test_token',
      } as unknown as GatewayEnv['Bindings'],
      { waitUntil: waitUntilMock, passThroughOnException: vi.fn() },
    );

  return { fetchWithEnv, kv, waitUntilMock };
}

// ---

describe('Metering integration — free tier under limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('free tier at 999 → request proceeds (handleMcpRequest called)', async () => {
    const auth: AuthContext = { userId: 'u1', tier: 'free', keyId: 'key-free' };
    vi.mocked(getUsageCount).mockResolvedValue(999);
    vi.mocked(checkUsageLimit).mockReturnValue(false);

    const { fetchWithEnv } = buildApp(auth);
    const res = await fetchWithEnv(
      new Request('http://localhost/mcp/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(handleMcpRequest).toHaveBeenCalled();
    expect(getUsageCount).toHaveBeenCalledWith('key-free', expect.anything());
  });
});

describe('Metering integration — free tier at limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('free tier at 1000 → returns -32002 limit error', async () => {
    const auth: AuthContext = { userId: 'u1', tier: 'free', keyId: 'key-free' };
    vi.mocked(getUsageCount).mockResolvedValue(1000);
    vi.mocked(checkUsageLimit).mockReturnValue(true);
    vi.mocked(usageLimitResponse).mockReturnValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32002, message: 'Monthly call limit reached (1000/1000).', data: {} },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ) as unknown as ReturnType<typeof usageLimitResponse>,
    );

    const { fetchWithEnv } = buildApp(auth);
    const res = await fetchWithEnv(
      new Request('http://localhost/mcp/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { error: { code: number } };
    expect(body.error.code).toBe(-32002);
    expect(handleMcpRequest).not.toHaveBeenCalled();
  });
});

describe('Metering integration — business tier skips KV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('business tier → getUsageCount NOT called', async () => {
    const auth: AuthContext = { userId: 'u2', tier: 'business', keyId: 'key-biz' };

    const { fetchWithEnv } = buildApp(auth);
    await fetchWithEnv(
      new Request('http://localhost/mcp/momo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
    );

    expect(getUsageCount).not.toHaveBeenCalled();
    expect(handleMcpRequest).toHaveBeenCalled();
  });
});

describe('Metering integration — waitUntil fires Tinybird event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waitUntil fires sendTinybirdEvent with correct event shape', async () => {
    const auth: AuthContext = { userId: 'u1', tier: 'free', keyId: 'key-fire' };
    vi.mocked(getUsageCount).mockResolvedValue(5);
    vi.mocked(checkUsageLimit).mockReturnValue(false);

    const { fetchWithEnv, waitUntilMock } = buildApp(auth);
    await fetchWithEnv(
      new Request('http://localhost/mcp/zalopay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
    );

    expect(waitUntilMock).toHaveBeenCalledOnce();

    // Resolve the waitUntil promise so sendTinybirdEvent fires
    const waitUntilArg = waitUntilMock.mock.calls[0][0] as Promise<unknown>;
    await waitUntilArg;

    expect(sendTinybirdEvent).toHaveBeenCalledOnce();
    const [event, token] = vi.mocked(sendTinybirdEvent).mock.calls[0] as [
      { api_key_id: string; server: string; tool: string; timestamp: string; response_status: string },
      string,
    ];
    expect(event.api_key_id).toBe('key-fire');
    expect(event.server).toBe('zalopay');
    expect(event.response_status).toBe('ok');
    expect(token).toBe('tb_test_token');
  });
});
