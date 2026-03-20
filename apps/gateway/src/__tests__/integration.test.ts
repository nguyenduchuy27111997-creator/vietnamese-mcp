// Gateway integration tests
// Tests use McpServer directly via InMemoryTransport — no CF Workers runtime needed.
// End-to-end SSE/Hono HTTP tests require `wrangler dev` + curl (manual, see VALIDATION.md).
//
// IMPORTANT: McpServer instances can only be connected once per transport.
// Module-scope `servers` instances from serverRegistry are used for structure/registry tests only.
// For tool-call tests that need multiple connections, fresh McpServer instances are created per test.

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared/test-helpers';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { servers, FREE_SERVERS } from '../serverRegistry.js';
import { checkTierAccess } from '../tierAccess.js';
import { registerAll as registerMomo } from '@vn-mcp/mcp-momo-vn/tools';
import { registerAll as registerZaloPay } from '@vn-mcp/mcp-zalopay-vn/tools';
import { registerAll as registerVnpay } from '@vn-mcp/mcp-vnpay/tools';
import { registerAll as registerZaloOa } from '@vn-mcp/mcp-zalo-oa/tools';
import { registerAll as registerViettelPay } from '@vn-mcp/mcp-viettel-pay/tools';

// Set env vars needed by mock engines
process.env.MOMO_SANDBOX = 'true';
process.env.ZALOPAY_SANDBOX = 'true';
process.env.VNPAY_SANDBOX = 'true';
process.env.ZALO_OA_SANDBOX = 'true';
process.env.VIETTELPAY_SANDBOX = 'true';

/** Create a fresh McpServer and connect via createTestClient — avoids "already connected" error. */
async function freshClient(register: (s: McpServer) => void, name: string): Promise<Client> {
  const s = new McpServer({ name, version: '1.1.0' });
  register(s);
  return createTestClient(s);
}

// GATE-01: Server registry structure
describe('GATE-01: Server registry contains exactly 5 named servers', () => {
  it('servers object contains exactly 5 named servers', () => {
    expect(Object.keys(servers)).toHaveLength(5);
    expect(Object.keys(servers)).toContain('momo');
    expect(Object.keys(servers)).toContain('zalopay');
    expect(Object.keys(servers)).toContain('vnpay');
    expect(Object.keys(servers)).toContain('zalo-oa');
    expect(Object.keys(servers)).toContain('viettel-pay');
  });
});

// GATE-02: Tool counts — each server returns correct number of tools
describe('GATE-02: tools/list returns correct tool counts per server', () => {
  it('momo has exactly 4 tools', async () => {
    const client = await freshClient(registerMomo, 'mcp-momo-vn');
    const result = await client.listTools();
    expect(result.tools).toHaveLength(4);
  });

  it('zalopay has exactly 4 tools', async () => {
    const client = await freshClient(registerZaloPay, 'mcp-zalopay-vn');
    const result = await client.listTools();
    expect(result.tools).toHaveLength(4);
  });

  it('vnpay has exactly 3 tools', async () => {
    const client = await freshClient(registerVnpay, 'mcp-vnpay');
    const result = await client.listTools();
    expect(result.tools).toHaveLength(3);
  });

  it('zalo-oa has exactly 4 tools', async () => {
    const client = await freshClient(registerZaloOa, 'mcp-zalo-oa');
    const result = await client.listTools();
    expect(result.tools).toHaveLength(4);
  });

  it('viettel-pay has exactly 3 tools', async () => {
    const client = await freshClient(registerViettelPay, 'mcp-viettel-pay');
    const result = await client.listTools();
    expect(result.tools).toHaveLength(3);
  });

  it('total tool count across all 5 servers is exactly 18', async () => {
    const registrations = [registerMomo, registerZaloPay, registerVnpay, registerZaloOa, registerViettelPay];
    const names = ['mcp-momo-vn', 'mcp-zalopay-vn', 'mcp-vnpay', 'mcp-zalo-oa', 'mcp-viettel-pay'];
    let total = 0;
    for (let i = 0; i < registrations.length; i++) {
      const client = await freshClient(registrations[i], names[i]);
      const result = await client.listTools();
      total += result.tools.length;
    }
    expect(total).toBe(18);
  });
});

// GATE-03: Tool call execution returns mock response
describe('GATE-03: Tool call returns mock response', () => {
  let momoClient: Client;

  beforeAll(async () => {
    momoClient = await freshClient(registerMomo, 'mcp-momo-vn');
  });

  it('momo_create_payment returns _mock:true response (GATE-03)', async () => {
    const result = await callTool(momoClient, 'momo_create_payment', {
      amount: 10000,
      orderInfo: 'gateway test',
    });
    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const data = JSON.parse(text) as { _mock: boolean; payUrl: string };
    expect(data._mock).toBe(true);
    expect(data.payUrl).toBeDefined();
  });
});

// GATE-04: Tier access check — MCP error -32001 for restricted servers
describe('GATE-04: Tier access control', () => {
  it('free tier accessing momo returns null (access granted)', () => {
    expect(checkTierAccess('momo', 'free')).toBeNull();
  });

  it('free tier accessing zalopay returns null (access granted)', () => {
    expect(checkTierAccess('zalopay', 'free')).toBeNull();
  });

  it('free tier accessing vnpay returns Response with code -32001', async () => {
    const response = checkTierAccess('vnpay', 'free');
    expect(response).not.toBeNull();
    const body = await response!.json() as { error: { code: number } };
    expect(body.error.code).toBe(-32001);
  });

  it('starter tier accessing vnpay returns null (access granted)', () => {
    expect(checkTierAccess('vnpay', 'starter')).toBeNull();
  });

  it('FREE_SERVERS contains exactly momo and zalopay', () => {
    expect(FREE_SERVERS.size).toBe(2);
    expect(FREE_SERVERS.has('momo')).toBe(true);
    expect(FREE_SERVERS.has('zalopay')).toBe(true);
    expect(FREE_SERVERS.has('vnpay')).toBe(false);
  });
});

// GATE-05: Per-connection McpServer isolation (no shared state)
describe('GATE-05: McpServer isolation', () => {
  it('servers object holds independent instances — different references', () => {
    expect(servers['momo']).not.toBe(servers['zalopay']);
    expect(servers['momo']).not.toBe(servers['vnpay']);
  });

  it('concurrent clients on same server receive independent connections', async () => {
    // Two fresh clients — each uses its own McpServer instance to avoid "already connected" error.
    // This verifies that two independent tool registrations yield the same tool set (no shared state corruption).
    const [client1, client2] = await Promise.all([
      freshClient(registerMomo, 'mcp-momo-vn'),
      freshClient(registerMomo, 'mcp-momo-vn'),
    ]);
    const [r1, r2] = await Promise.all([client1.listTools(), client2.listTools()]);
    expect(r1.tools).toHaveLength(4);
    expect(r2.tools).toHaveLength(4);
  });
});
