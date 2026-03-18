import { signHmacSha512 } from '@vn-mcp/shared';

/**
 * Build VNPAY secure hash.
 * Algorithm: sort all vnp_ params alphabetically (excluding vnp_SecureHash,
 * vnp_SecureHashType), concatenate as query string, sign with HMAC-SHA512.
 *
 * Source: sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 *
 * This is the key architectural proof point: VNPAY signs sorted URL parameters
 * while MoMo/ZaloPay sign POST body fields. Both use the same shared HMAC primitives.
 */
export function buildVnpaySecureHash(
  params: Record<string, string | number>,
  hashSecret: string,
): string {
  const sorted = Object.entries(params)
    .filter(([k]) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
    .sort(([a], [b]) => a.localeCompare(b));

  const queryString = sorted
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  return signHmacSha512(hashSecret, queryString);
}
