// Wave 0: Gateway integration test scaffold
// Tests run against McpServer instances directly (Node.js, no CF Workers runtime needed)
// For SSE/HTTP transport tests: use wrangler dev manually (documented in VALIDATION.md)

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared/test-helpers';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

// These imports will fail until Plan 02 creates serverRegistry.ts
// Comment them out initially — uncomment when Plan 02 lands
// import { servers, FREE_SERVERS } from '../serverRegistry.js';

// GATE-01 + GATE-02: tools/list returns correct tool counts per server
describe('GATE-01 + GATE-02: Tool routing and tool count', () => {
  const serverMap: Record<string, { toolCount: number; envKey: string; envVal: string }> = {
    momo:        { toolCount: 4,  envKey: 'MOMO_SANDBOX',       envVal: 'true' },
    zalopay:     { toolCount: 4,  envKey: 'ZALOPAY_SANDBOX',    envVal: 'true' },
    vnpay:       { toolCount: 3,  envKey: 'VNPAY_SANDBOX',      envVal: 'true' },
    'zalo-oa':   { toolCount: 4,  envKey: 'ZALO_OA_SANDBOX',    envVal: 'true' },
    'viettel-pay': { toolCount: 3, envKey: 'VIETTELPAY_SANDBOX', envVal: 'true' },
  };

  it.todo('POST /mcp/momo returns valid MCP response (GATE-01) — requires Plan 02 serverRegistry');
  it.todo('tools/list on all 5 routes returns exactly 18 tools total (GATE-02) — requires Plan 02');
});

// GATE-03: Tool call through gateway returns mock response
describe('GATE-03: Tool call execution', () => {
  it.todo('momo_create_payment through gateway returns _mock:true response — requires Plan 02');
});

// GATE-04: CORS headers
describe('GATE-04: CORS preflight', () => {
  it.todo('OPTIONS /mcp/momo returns Access-Control-Allow-Origin and Access-Control-Allow-Methods — requires Plan 02');
});

// GATE-05: Per-connection isolation
describe('GATE-05: Per-connection McpServer isolation', () => {
  it.todo('Two concurrent McpServer instances share no state — requires Plan 02 serverRegistry');
});
