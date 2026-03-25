// DEBT-03: Tool name extraction from MCP JSON-RPC request body
// Tests for the tool name extraction logic in the /mcp/:server route handler.
// These tests verify behavior described in 12-02-PLAN.md.

import { describe, it, expect, vi, afterEach } from 'vitest';

// We test the extraction logic by importing the app and sending mock requests.
// The app uses authMiddleware which reads from Supabase — we stub at the middleware level.

import app from '../index.js';

// --- Minimal mock env ---
const mockEnv = {
  TINYBIRD_TOKEN: 'tb_test',
  TINYBIRD_HOST: 'https://mock.tinybird.co',
  API_KEYS: {
    get: vi.fn().mockResolvedValue('0'), // usage counter = 0
    put: vi.fn().mockResolvedValue(undefined),
  },
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'mock-service-key',
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_mock',
  STRIPE_PRICE_STARTER: 'price_starter',
  STRIPE_PRICE_BUSINESS: 'price_business',
  MOMO_SECRET_KEY: 'mock-momo-secret',
  MOMO_PARTNER_CODE: 'mock-momo-partner',
  MOMO_ACCESS_KEY: 'mock-momo-access',
};

// Stub auth middleware so requests bypass Supabase lookup
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (c: { set: (k: string, v: unknown) => void }, next: () => Promise<void>) => {
    c.set('auth', { keyId: 'test-key-id', tier: 'business' });
    await next();
  }),
}));

// Stub handleMcpRequest so we don't need a real MCP server
vi.mock('../router.js', () => ({
  handleMcpRequest: vi.fn().mockResolvedValue(new Response('{}', { status: 200 })),
}));

// Capture Tinybird calls to inspect the tool field
vi.mock('../metering/tinybird.js', () => ({
  sendTinybirdEvent: vi.fn().mockResolvedValue(undefined),
}));

// Stub usage counter (business tier skips, but import it anyway for completeness)
vi.mock('../metering/usageCounter.js', () => ({
  getUsageCount: vi.fn().mockResolvedValue(0),
  checkUsageLimit: vi.fn().mockReturnValue(false),
  incrementUsageCounter: vi.fn().mockResolvedValue(undefined),
  usageLimitResponse: vi.fn(),
}));

import { sendTinybirdEvent } from '../metering/tinybird.js';

/** Helper: POST a JSON body to /mcp/momo and resolve after waitUntil callbacks fire */
async function postMcp(body: unknown): Promise<void> {
  const { sendTinybirdEvent: spy } = await import('../metering/tinybird.js');
  (spy as ReturnType<typeof vi.fn>).mockClear();

  const waitUntilPromises: Promise<unknown>[] = [];
  const mockCtx = {
    waitUntil: (p: Promise<unknown>) => waitUntilPromises.push(p),
    passThroughOnException: vi.fn(),
  };

  const req = new Request('http://localhost/mcp/momo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  await app.fetch(req, mockEnv, mockCtx as unknown as ExecutionContext);
  // Flush all waitUntil promises so Tinybird events fire
  await Promise.all(waitUntilPromises);
}

describe('DEBT-03: Tool name extraction from MCP request body', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('tools/call request: tool field equals params.name (e.g. momo_create_payment)', async () => {
    await postMcp({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'momo_create_payment', arguments: { amount: 10000 } },
    });

    expect(sendTinybirdEvent).toHaveBeenCalledOnce();
    const [event] = (sendTinybirdEvent as ReturnType<typeof vi.fn>).mock.calls[0] as [{ tool: string }];
    expect(event.tool).toBe('momo_create_payment');
  });

  it('tools/list request: tool field is empty string (not "unknown")', async () => {
    await postMcp({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    expect(sendTinybirdEvent).toHaveBeenCalledOnce();
    const [event] = (sendTinybirdEvent as ReturnType<typeof vi.fn>).mock.calls[0] as [{ tool: string }];
    expect(event.tool).toBe('');
    expect(event.tool).not.toBe('unknown');
  });

  it('ping request: tool field is empty string (not "unknown")', async () => {
    await postMcp({
      jsonrpc: '2.0',
      id: 3,
      method: 'ping',
    });

    expect(sendTinybirdEvent).toHaveBeenCalledOnce();
    const [event] = (sendTinybirdEvent as ReturnType<typeof vi.fn>).mock.calls[0] as [{ tool: string }];
    expect(event.tool).toBe('');
    expect(event.tool).not.toBe('unknown');
  });

  it('non-JSON body (SSE): tool field is empty string, no crash', async () => {
    const waitUntilPromises: Promise<unknown>[] = [];
    const mockCtx = {
      waitUntil: (p: Promise<unknown>) => waitUntilPromises.push(p),
      passThroughOnException: vi.fn(),
    };

    const spy = sendTinybirdEvent as ReturnType<typeof vi.fn>;
    spy.mockClear();

    const req = new Request('http://localhost/mcp/momo', {
      method: 'POST',
      headers: { 'Content-Type': 'text/event-stream' },
      body: 'not-json-at-all',
    });

    await app.fetch(req, mockEnv, mockCtx as unknown as ExecutionContext);
    await Promise.all(waitUntilPromises);

    expect(sendTinybirdEvent).toHaveBeenCalledOnce();
    const [event] = spy.mock.calls[0] as [{ tool: string }];
    expect(event.tool).toBe('');
    expect(event.tool).not.toBe('unknown');
  });
});
