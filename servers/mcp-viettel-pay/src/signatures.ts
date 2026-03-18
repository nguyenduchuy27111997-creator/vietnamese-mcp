import { signHmacSha256 } from '@vn-mcp/shared';

/**
 * Assumed HMAC-SHA256 — see MOCK_DEVIATIONS.md. Real ViettelPay uses RSA.
 *
 * Build HMAC-SHA256 signature for ViettelPay API requests.
 * This is an assumption — real ViettelPay uses RSA asymmetric crypto
 * (partner private key + Viettel public key), not HMAC-SHA256.
 */
export function buildViettelPaySignature(data: string, secretKey: string): string {
  return signHmacSha256(secretKey, data);
}
