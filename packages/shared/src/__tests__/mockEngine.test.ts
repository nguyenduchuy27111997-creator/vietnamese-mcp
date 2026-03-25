import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMockMode, loadFixture } from '../mock-engine/index.js';

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
  it('returns a shallow copy with _mock: true added', () => {
    const data = { status: 0, message: 'success', orderId: 'ORD123' };
    const result = loadFixture(data);
    expect(result.status).toBe(0);
    expect(result.message).toBe('success');
    expect(result.orderId).toBe('ORD123');
    expect(result._mock).toBe(true);
  });

  it('injects _mock: true into the returned object', () => {
    const result = loadFixture({ foo: 'bar' });
    expect(result._mock).toBe(true);
  });

  it('does not mutate the original object', () => {
    const original = { foo: 'bar' };
    const result = loadFixture(original);
    expect(result._mock).toBe(true);
    expect((original as Record<string, unknown>)._mock).toBeUndefined();
  });

  it('supports generic typing', () => {
    interface PaymentResponse { orderId: string; amount: number }
    const data: PaymentResponse = { orderId: 'ORD456', amount: 100000 };

    const result = loadFixture<PaymentResponse>(data);
    expect(result.orderId).toBe('ORD456');
    expect(result.amount).toBe(100000);
    expect(result._mock).toBe(true);
  });
});
