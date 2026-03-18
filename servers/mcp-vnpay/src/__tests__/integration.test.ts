process.env.VNPAY_SANDBOX = 'true';

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../tools/index.js';
import { getVnpayCredentials } from '../credentials.js';
import { buildVnpaySecureHash } from '../signatures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let client: Client;

beforeAll(async () => {
  const server = new McpServer({ name: 'mcp-vnpay', version: '0.0.1' });
  registerAll(server);
  client = await createTestClient(server);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseResult(result: any): unknown {
  return JSON.parse(result.content[0].text as string);
}

describe('Integration: mcp-vnpay tools (VNPAY_SANDBOX=true)', () => {
  // VNPY-01: Create payment URL
  it('vnpay_create_payment_url returns paymentUrl with _mock:true (VNPY-01)', async () => {
    const result = await callTool(client, 'vnpay_create_payment_url', {
      amount: 150000,
      orderInfo: 'Thanh toan don hang tu Nguyen Van A',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; paymentUrl: string; orderId: string; amount: number };
    expect(data._mock).toBe(true);
    expect(data.paymentUrl).toContain('vnp_TxnRef=');
    expect(data.orderId).toMatch(/^VNP_/);
    expect(data.amount).toBe(150000);
  });

  // VNPY-01: Deterministic orderId
  it('vnpay_create_payment_url is deterministic — same input yields same orderId (VNPY-01)', async () => {
    const r1 = await callTool(client, 'vnpay_create_payment_url', {
      amount: 150000,
      orderInfo: 'Consistent test',
    });
    const r2 = await callTool(client, 'vnpay_create_payment_url', {
      amount: 150000,
      orderInfo: 'Consistent test',
    });
    const d1 = parseResult(r1) as { orderId: string };
    const d2 = parseResult(r2) as { orderId: string };
    expect(d1.orderId).toBe(d2.orderId);
  });

  // VNPY-02: Verify return with valid signature (full URL)
  it('vnpay_verify_return accepts correctly-signed return URL and returns valid:true (VNPY-02)', async () => {
    const credentials = getVnpayCredentials();

    // Construct a minimal set of vnp_ params and sign them
    const params: Record<string, string | number> = {
      vnp_Amount: 15000000,
      vnp_BankCode: 'NCB',
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14000001',
      vnp_TxnRef: 'VNP_test_valid',
    };

    const hash = buildVnpaySecureHash(params, credentials.hashSecret);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');

    const fullUrl = `https://localhost:3000/vnpay-return?${queryString}&vnp_SecureHashType=SHA512&vnp_SecureHash=${hash}`;

    const result = await callTool(client, 'vnpay_verify_return', {
      returnUrl: fullUrl,
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { valid: boolean };
    expect(data.valid).toBe(true);
  });

  // VNPY-02: Tampered URL
  it('vnpay_verify_return rejects tampered return URL and returns valid:false (VNPY-02)', async () => {
    const credentials = getVnpayCredentials();

    const params: Record<string, string | number> = {
      vnp_Amount: 15000000,
      vnp_BankCode: 'NCB',
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14000001',
      vnp_TxnRef: 'VNP_test_tamper',
    };

    const hash = buildVnpaySecureHash(params, credentials.hashSecret);

    // Tamper: change amount after computing hash
    const tamperedParams = { ...params, vnp_Amount: 999999 };
    const queryString = Object.entries(tamperedParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');

    const tamperedUrl = `https://localhost:3000/vnpay-return?${queryString}&vnp_SecureHashType=SHA512&vnp_SecureHash=${hash}`;

    const result = await callTool(client, 'vnpay_verify_return', {
      returnUrl: tamperedUrl,
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { valid: boolean };
    expect(data.valid).toBe(false);
  });

  // VNPY-02: Bare query string (no https:// prefix)
  it('vnpay_verify_return accepts bare query string input and returns valid:true (VNPY-02)', async () => {
    const credentials = getVnpayCredentials();

    const params: Record<string, string | number> = {
      vnp_Amount: 15000000,
      vnp_BankCode: 'NCB',
      vnp_ResponseCode: '00',
      vnp_TransactionNo: '14000001',
      vnp_TxnRef: 'VNP_test_querystring',
    };

    const hash = buildVnpaySecureHash(params, credentials.hashSecret);

    const queryString = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');

    const bareQueryString = `${queryString}&vnp_SecureHashType=SHA512&vnp_SecureHash=${hash}`;

    const result = await callTool(client, 'vnpay_verify_return', {
      returnUrl: bareQueryString,
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { valid: boolean };
    expect(data.valid).toBe(true);
  });

  // VNPY-03: Query transaction
  it('vnpay_query_transaction returns mock transaction data with _mock:true (VNPY-03)', async () => {
    const result = await callTool(client, 'vnpay_query_transaction', {
      txnRef: 'VNP_test123',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; vnp_TxnRef: string; vnp_ResponseCode: string };
    expect(data._mock).toBe(true);
    expect(data.vnp_TxnRef).toBe('VNP_test123');
    expect(data.vnp_ResponseCode).toBe('00');
  });

  // VNPY-04: Insufficient balance error path
  it('vnpay_create_payment_url with amount=99999999 returns isError:true (VNPY-04)', async () => {
    const result = await callTool(client, 'vnpay_create_payment_url', {
      amount: 99999999,
      orderInfo: 'Should fail',
    });
    expect(result.isError).toBe(true);
  });
});
