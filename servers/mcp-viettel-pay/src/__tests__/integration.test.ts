process.env.VIETTELPAY_SANDBOX = 'true';

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../tools/index.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let client: Client;

beforeAll(async () => {
  const server = new McpServer({ name: 'mcp-viettel-pay', version: '0.0.1' });
  registerAll(server);
  client = await createTestClient(server);
});

function parseResult(result: { isError?: boolean; content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text);
}

describe('Integration: mcp-viettel-pay tools (VIETTELPAY_SANDBOX=true)', () => {
  // VTPAY-01: Create payment
  it('viettel_pay_create_payment returns paymentUrl with _mock:true (VTPAY-01)', async () => {
    const result = await callTool(client, 'viettel_pay_create_payment', {
      amount: 100000,
      orderInfo: 'Test ViettelPay order',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as {
      _mock: boolean;
      transactionId: string;
      paymentUrl: string;
      amount: number;
      code: string;
    };
    expect(data._mock).toBe(true);
    expect(data.transactionId).toMatch(/^VTP_/);
    expect(data.paymentUrl).toContain('viettelpay.vn');
    expect(data.amount).toBe(100000);
    expect(data.code).toBe('00');
  });

  // VTPAY-01: Insufficient balance error path
  it('viettel_pay_create_payment with amount=99999999 returns isError:true (VTPAY-01 error)', async () => {
    const result = await callTool(client, 'viettel_pay_create_payment', {
      amount: 99999999,
      orderInfo: 'Should fail',
    });
    expect(result.isError).toBe(true);
  });

  // VTPAY-02: Query status
  it('viettel_pay_query_status returns status with _mock:true (VTPAY-02)', async () => {
    const result = await callTool(client, 'viettel_pay_query_status', {
      transactionId: 'VTP_abc123def456',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as {
      _mock: boolean;
      transactionId: string;
      status: string;
      code: string;
    };
    expect(data._mock).toBe(true);
    expect(data.transactionId).toBe('VTP_abc123def456');
    expect(data.status).toBe('COMPLETED');
    expect(data.code).toBe('00');
  });

  // VTPAY-03: Refund
  it('viettel_pay_refund returns refund confirmation with _mock:true (VTPAY-03)', async () => {
    const result = await callTool(client, 'viettel_pay_refund', {
      transactionId: 'VTP_abc123def456',
      amount: 50000,
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as {
      _mock: boolean;
      amount: number;
      code: string;
      refundId: string;
    };
    expect(data._mock).toBe(true);
    expect(data.amount).toBe(50000);
    expect(data.code).toBe('00');
    expect(data.refundId).toMatch(/^VTP_REFUND_/);
  });

  // VTPAY-04: Deterministic transactionId
  it('viettel_pay_create_payment is deterministic (VTPAY-04)', async () => {
    const r1 = await callTool(client, 'viettel_pay_create_payment', {
      amount: 100000,
      orderInfo: 'Deterministic test',
    });
    const r2 = await callTool(client, 'viettel_pay_create_payment', {
      amount: 100000,
      orderInfo: 'Deterministic test',
    });
    const d1 = parseResult(r1) as { transactionId: string };
    const d2 = parseResult(r2) as { transactionId: string };
    expect(d1.transactionId).toBe(d2.transactionId);
  });
});
