process.env.ZALOPAY_SANDBOX = 'true';

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../tools/index.js';
import { getZaloPayCredentials } from '../credentials.js';
import { buildCallbackSignature } from '../signatures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let client: Client;

beforeAll(async () => {
  const server = new McpServer({ name: 'mcp-zalopay-vn', version: '0.0.1' });
  registerAll(server);
  client = await createTestClient(server);
});

function parseResult(result: { isError?: boolean; content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text);
}

describe('Integration: mcp-zalopay-vn tools (ZALOPAY_SANDBOX=true)', () => {
  // ZPAY-01: Create order
  it('zalopay_create_order returns paymentUrl and _mock:true (ZPAY-01)', async () => {
    const result = await callTool(client, 'zalopay_create_order', {
      amount: 150000,
      description: 'Test order from Nguyen Van A',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; paymentUrl: string; orderId: string; app_trans_id: string; amount: number };
    expect(data._mock).toBe(true);
    expect(typeof data.paymentUrl).toBe('string');
    expect(data.orderId).toBe(data.app_trans_id);
    expect(data.amount).toBe(150000);
  });

  // ZPAY-01: Deterministic app_trans_id
  it('zalopay_create_order is deterministic — same input yields same orderId (ZPAY-01)', async () => {
    const r1 = await callTool(client, 'zalopay_create_order', {
      amount: 150000,
      description: 'Consistent test',
    });
    const r2 = await callTool(client, 'zalopay_create_order', {
      amount: 150000,
      description: 'Consistent test',
    });
    const d1 = parseResult(r1) as { orderId: string };
    const d2 = parseResult(r2) as { orderId: string };
    expect(d1.orderId).toBe(d2.orderId);
  });

  // ZPAY-02: Query order
  it('zalopay_query_order returns matching app_trans_id and _mock:true (ZPAY-02)', async () => {
    const createResult = await callTool(client, 'zalopay_create_order', {
      amount: 200000,
      description: 'Query test',
    });
    const created = parseResult(createResult) as { app_trans_id: string };
    const queryResult = await callTool(client, 'zalopay_query_order', { appTransId: created.app_trans_id });
    const queried = parseResult(queryResult) as { app_trans_id: string; _mock: boolean };
    expect(queried.app_trans_id).toBe(created.app_trans_id);
    expect(queried._mock).toBe(true);
  });

  // ZPAY-03: Refund
  it('zalopay_refund returns successful mock refund (ZPAY-03)', async () => {
    const result = await callTool(client, 'zalopay_refund', {
      zpTransId: 240318000000001,
      amount: 50000,
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; return_code: number };
    expect(data._mock).toBe(true);
    expect(data.return_code).toBe(1);
  });

  // ZPAY-04: Callback validation — valid MAC
  it('zalopay_validate_callback accepts correctly-signed payload and returns valid:true (ZPAY-04)', async () => {
    const credentials = getZaloPayCredentials();
    const transactionFields = {
      app_id: '2553',
      app_trans_id: '260318_test123',
      app_time: 1710720000000,
      app_user: 'demo_user',
      amount: 150000,
      embed_data: '{}',
      item: '[]',
      description: 'Test callback',
    };
    const dataString = JSON.stringify(transactionFields);
    const mac = buildCallbackSignature(dataString, credentials.key2);
    const callbackPayload = { data: dataString, mac };

    const result = await callTool(client, 'zalopay_validate_callback', {
      callbackData: JSON.stringify(callbackPayload),
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { valid: boolean };
    expect(data.valid).toBe(true);
  });

  // ZPAY-04: Callback validation — tampered payload
  it('zalopay_validate_callback rejects tampered payload and returns valid:false (ZPAY-04)', async () => {
    const credentials = getZaloPayCredentials();
    const transactionFields = {
      app_id: '2553',
      app_trans_id: '260318_test456',
      app_time: 1710720000000,
      app_user: 'demo_user',
      amount: 150000,
      embed_data: '{}',
      item: '[]',
      description: 'Tamper test',
    };
    const dataString = JSON.stringify(transactionFields);
    const mac = buildCallbackSignature(dataString, credentials.key2);

    // Tamper: change data after MAC computed
    const tamperedData = JSON.stringify({ ...transactionFields, amount: 999999 });
    const callbackPayload = { data: tamperedData, mac };

    const result = await callTool(client, 'zalopay_validate_callback', {
      callbackData: JSON.stringify(callbackPayload),
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { valid: boolean };
    expect(data.valid).toBe(false);
  });

  // ZPAY-05: Error path — insufficient balance
  it('zalopay_create_order with amount=99999999 returns isError:true (ZPAY-05 error path)', async () => {
    const result = await callTool(client, 'zalopay_create_order', {
      amount: 99999999,
      description: 'Should fail',
    });
    expect(result.isError).toBe(true);
  });
});
