import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMockMode, loadFixture } from '../mock-engine/index.js';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('isMockMode', () => {
  beforeEach(() => {
    // Clean up env vars before each test
    delete process.env.MOMO_SANDBOX;
    delete process.env.ZALOPAY_SANDBOX;
  });

  afterEach(() => {
    delete process.env.MOMO_SANDBOX;
    delete process.env.ZALOPAY_SANDBOX;
  });

  it('returns true when MOMO_SANDBOX=true', () => {
    process.env.MOMO_SANDBOX = 'true';
    expect(isMockMode('momo')).toBe(true);
  });

  it('returns false when MOMO_SANDBOX is unset', () => {
    expect(isMockMode('momo')).toBe(false);
  });

  it('returns false when MOMO_SANDBOX is a non-true value', () => {
    process.env.MOMO_SANDBOX = '1';
    expect(isMockMode('momo')).toBe(false);
  });

  it('checks ZALOPAY_SANDBOX for service "zalopay"', () => {
    process.env.ZALOPAY_SANDBOX = 'true';
    expect(isMockMode('zalopay')).toBe(true);
  });

  it('uppercases the service name to build the env var name', () => {
    process.env.MOMO_SANDBOX = 'true';
    // Same service, different casing — should all check MOMO_SANDBOX
    expect(isMockMode('momo')).toBe(true);
    expect(isMockMode('MOMO')).toBe(true);
  });
});

describe('loadFixture', () => {
  let tmpDir: string;
  let fixturePath: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `vn-mcp-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    fixturePath = join(tmpDir, 'test-fixture.json');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads a JSON file and returns parsed content', () => {
    const data = { status: 0, message: 'success', orderId: 'ORD123' };
    writeFileSync(fixturePath, JSON.stringify(data));

    const result = loadFixture(fixturePath);
    expect(result.status).toBe(0);
    expect(result.message).toBe('success');
    expect(result.orderId).toBe('ORD123');
  });

  it('injects _mock: true into the returned object', () => {
    writeFileSync(fixturePath, JSON.stringify({ foo: 'bar' }));

    const result = loadFixture(fixturePath);
    expect(result._mock).toBe(true);
  });

  it('throws when the file does not exist', () => {
    expect(() => loadFixture('/nonexistent/path/fixture.json')).toThrow();
  });

  it('supports generic typing', () => {
    interface PaymentResponse { orderId: string; amount: number }
    const data: PaymentResponse = { orderId: 'ORD456', amount: 100000 };
    writeFileSync(fixturePath, JSON.stringify(data));

    const result = loadFixture<PaymentResponse>(fixturePath);
    expect(result.orderId).toBe('ORD456');
    expect(result.amount).toBe(100000);
    expect(result._mock).toBe(true);
  });
});
