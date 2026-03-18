process.env.MOMO_SANDBOX = 'true';

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../tools/index.js';
import { getMomoCredentials } from '../credentials.js';
import { buildIpnSignature } from '../signatures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let client: Client;

beforeAll(async () => {
  const server = new McpServer({ name: 'mcp-momo-vn', version: '0.0.1' });
  registerAll(server);
  client = await createTestClient(server);
});

function parseResult(result: { isError?: boolean; content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text);
}

describe('Integration: mcp-momo-vn tools (MOMO_SANDBOX=true)', () => {
  // MOMO-01: Create payment
  it('momo_create_payment returns payUrl with _mock:true (MOMO-01)', async () => {
    const result = await callTool(client, 'momo_create_payment', {
      amount: 150000,
      orderInfo: 'Test order from Nguyen Van A',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; payUrl: string; orderId: string; amount: number };
    expect(data._mock).toBe(true);
    expect(data.payUrl).toMatch(/^https:\/\/test-payment\.momo\.vn\/pay\//);
    expect(data.orderId).toMatch(/^MOMO_/);
    expect(data.amount).toBe(150000);
  });

  // MOMO-01: Deterministic orderId
  it('momo_create_payment is deterministic — same input yields same orderId (MOMO-01)', async () => {
    const r1 = await callTool(client, 'momo_create_payment', {
      amount: 150000,
      orderInfo: 'Consistent test',
    });
    const r2 = await callTool(client, 'momo_create_payment', {
      amount: 150000,
      orderInfo: 'Consistent test',
    });
    const d1 = parseResult(r1) as { orderId: string };
    const d2 = parseResult(r2) as { orderId: string };
    expect(d1.orderId).toBe(d2.orderId);
  });

  // MOMO-02: Query status
  it('momo_query_status returns matching orderId and _mock:true (MOMO-02)', async () => {
    const createResult = await callTool(client, 'momo_create_payment', {
      amount: 200000,
      orderInfo: 'Query test',
    });
    const created = parseResult(createResult) as { orderId: string };
    const queryResult = await callTool(client, 'momo_query_status', { orderId: created.orderId });
    const queried = parseResult(queryResult) as { orderId: string; _mock: boolean; resultCode: number };
    expect(queried.orderId).toBe(created.orderId);
    expect(queried._mock).toBe(true);
    expect(queried.resultCode).toBe(0);
  });

  // MOMO-03: Refund
  it('momo_refund returns successful mock refund with numeric transId (MOMO-03)', async () => {
    const result = await callTool(client, 'momo_refund', {
      transId: 2350000001,
      amount: 50000,
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; resultCode: number; transId: unknown; amount: number };
    expect(data._mock).toBe(true);
    expect(data.resultCode).toBe(0);
    expect(typeof data.transId).toBe('number');
    expect(data.amount).toBe(50000);
  });

  // MOMO-04: IPN validation — valid signature
  it('momo_validate_ipn accepts correctly signed payload and returns valid:true (MOMO-04)', async () => {
    const credentials = getMomoCredentials();
    const ipnPayload = {
      accessKey: credentials.accessKey,
      amount: 150000,
      extraData: '',
      message: 'Thanh cong.',
      orderId: 'MOMO_test123',
      orderInfo: 'Test IPN',
      orderType: 'momo_wallet',
      partnerCode: credentials.partnerCode,
      payType: 'qr',
      requestId: 'REQ_test123',
      responseTime: 1710000000000,
      resultCode: 0,
      transId: 2350000001,
      signature: '',
    };
    ipnPayload.signature = buildIpnSignature(ipnPayload, credentials.secretKey);

    const result = await callTool(client, 'momo_validate_ipn', {
      ipnBody: JSON.stringify(ipnPayload),
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { valid: boolean; orderId: string; amount: number; transId: number };
    expect(data.valid).toBe(true);
    expect(data.orderId).toBe('MOMO_test123');
    expect(data.amount).toBe(150000);
    expect(data.transId).toBe(2350000001);
  });

  // MOMO-04: IPN validation — tampered payload
  it('momo_validate_ipn rejects tampered payload and returns valid:false (MOMO-04)', async () => {
    const credentials = getMomoCredentials();
    const ipnPayload = {
      accessKey: credentials.accessKey,
      amount: 150000,
      extraData: '',
      message: 'Thanh cong.',
      orderId: 'MOMO_test456',
      orderInfo: 'Tamper test',
      orderType: 'momo_wallet',
      partnerCode: credentials.partnerCode,
      payType: 'qr',
      requestId: 'REQ_test456',
      responseTime: 1710000000000,
      resultCode: 0,
      transId: 2350000002,
      signature: '',
    };
    ipnPayload.signature = buildIpnSignature(ipnPayload, credentials.secretKey);

    // Tamper: change amount but leave signature unchanged
    const tampered = { ...ipnPayload, amount: 999999 };

    const result = await callTool(client, 'momo_validate_ipn', {
      ipnBody: JSON.stringify(tampered),
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { valid: boolean };
    expect(data.valid).toBe(false);
  });

  // MOMO-05: Insufficient balance error path
  it('momo_create_payment with amount=99999999 returns isError:true (MOMO-05 error path)', async () => {
    const result = await callTool(client, 'momo_create_payment', {
      amount: 99999999,
      orderInfo: 'Should fail',
    });
    expect(result.isError).toBe(true);
  });

  // MOMO-04: Invalid JSON error path
  it('momo_validate_ipn with invalid JSON returns isError:true (MOMO-04 error path)', async () => {
    const result = await callTool(client, 'momo_validate_ipn', {
      ipnBody: 'not-json{{{',
    });
    expect(result.isError).toBe(true);
  });
});
