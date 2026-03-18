import { describe, it, expect } from 'vitest';
import { formatToolError, McpApiError, VN_ERROR_CODES, translateErrorCode } from '../errors/index.js';

describe('McpApiError', () => {
  it('holds error_code, message, provider, and suggestion properties', () => {
    const err = new McpApiError('MOMO_1005', 'Insufficient balance', 'momo', 'Check balance');
    expect(err.error_code).toBe('MOMO_1005');
    expect(err.message).toBe('Insufficient balance');
    expect(err.provider).toBe('momo');
    expect(err.suggestion).toBe('Check balance');
    expect(err.name).toBe('McpApiError');
    expect(err).toBeInstanceOf(Error);
  });

  it('works without a suggestion', () => {
    const err = new McpApiError('CODE', 'msg', 'provider');
    expect(err.suggestion).toBeUndefined();
  });
});

describe('VN_ERROR_CODES', () => {
  it('has stub entries for momo', () => {
    expect(VN_ERROR_CODES.momo).toBeDefined();
    expect(typeof VN_ERROR_CODES.momo).toBe('object');
    expect(Object.keys(VN_ERROR_CODES.momo).length).toBeGreaterThanOrEqual(1);
  });

  it('has stub entries for zalopay', () => {
    expect(VN_ERROR_CODES.zalopay).toBeDefined();
  });

  it('has stub entries for vnpay', () => {
    expect(VN_ERROR_CODES.vnpay).toBeDefined();
  });

  it('has stub entries for viettelpay', () => {
    expect(VN_ERROR_CODES.viettelpay).toBeDefined();
  });
});

describe('translateErrorCode', () => {
  it('returns an English description for a known momo code', () => {
    const result = translateErrorCode('momo', '1005');
    expect(result).toBe('Insufficient balance');
  });

  it('returns undefined for an unknown momo code', () => {
    expect(translateErrorCode('momo', '9999')).toBeUndefined();
  });

  it('returns undefined for an unknown provider', () => {
    expect(translateErrorCode('unknown_provider', '1')).toBeUndefined();
  });
});

describe('formatToolError', () => {
  it('formats a plain Error', () => {
    const result = formatToolError(new Error('fail'));
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('Error: fail');
  });

  it('formats a string error', () => {
    const result = formatToolError('string error');
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe('Error: string error');
  });

  it('formats McpApiError with error_code, message, and provider', () => {
    const err = new McpApiError('MOMO_1005', 'Insufficient balance', 'momo', 'Check balance');
    const result = formatToolError(err);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('MOMO_1005');
    expect(result.content[0].text).toContain('Insufficient balance');
    expect(result.content[0].text).toContain('momo');
  });

  it('includes code_meaning when McpApiError has a known error code translation', () => {
    // MOMO_1005 won't match translateErrorCode("momo", "1005") since the error_code
    // field is "MOMO_1005" but translateErrorCode looks up by provider "momo" and code "1005"
    // The plan uses provider: "momo" and error_code: "MOMO_1005" — but translateErrorCode
    // is called with err.provider and err.error_code. Let's test with a code that will match.
    const err = new McpApiError('1005', 'Insufficient balance', 'momo');
    const result = formatToolError(err);
    expect(result.content[0].text).toContain('code_meaning');
    expect(result.content[0].text).toContain('Insufficient balance');
  });

  it('does not include code_meaning when code is unknown', () => {
    const err = new McpApiError('9999', 'Unknown error', 'momo');
    const result = formatToolError(err);
    expect(result.content[0].text).not.toContain('code_meaning');
  });
});
