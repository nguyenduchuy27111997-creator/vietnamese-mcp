import { describe, it, expect } from 'vitest';
import { validateToolName, TOOL_NAME_PATTERN } from '../tool-naming.js';

describe('validateToolName', () => {
  it('accepts momo_create_payment', () => {
    expect(validateToolName('momo_create_payment')).toBe(true);
  });

  it('accepts zalopay_query_order', () => {
    expect(validateToolName('zalopay_query_order')).toBe(true);
  });

  it('accepts zalo_oa_send_message (underscore in service name is OK)', () => {
    expect(validateToolName('zalo_oa_send_message')).toBe(true);
  });

  it('rejects createPayment (missing service prefix)', () => {
    expect(validateToolName('createPayment')).toBe(false);
  });

  it('rejects momo-create-payment (hyphens not allowed)', () => {
    expect(validateToolName('momo-create-payment')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateToolName('')).toBe(false);
  });

  it('rejects single segment', () => {
    expect(validateToolName('momo')).toBe(false);
  });

  it('rejects two segments (requires minimum 3)', () => {
    expect(validateToolName('momo_create')).toBe(false);
  });
});

describe('TOOL_NAME_PATTERN', () => {
  it('matches the expected regex pattern /^[a-z][a-z0-9]*(_[a-z][a-z0-9]*){2,}$/', () => {
    expect(TOOL_NAME_PATTERN.source).toBe('^[a-z][a-z0-9]*(_[a-z][a-z0-9]*){2,}$');
  });

  it('matches valid tool names', () => {
    expect(TOOL_NAME_PATTERN.test('momo_create_payment')).toBe(true);
    expect(TOOL_NAME_PATTERN.test('vnpay_init_transaction')).toBe(true);
    expect(TOOL_NAME_PATTERN.test('zalo_oa_send_message')).toBe(true);
  });

  it('rejects invalid tool names', () => {
    expect(TOOL_NAME_PATTERN.test('createPayment')).toBe(false);
    expect(TOOL_NAME_PATTERN.test('momo-create-payment')).toBe(false);
    expect(TOOL_NAME_PATTERN.test('')).toBe(false);
  });
});
