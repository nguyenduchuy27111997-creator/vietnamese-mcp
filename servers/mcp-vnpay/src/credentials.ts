export type VnpayCredentials = {
  tmnCode: string;
  hashSecret: string;
  endpoint: string;
};

/**
 * Load VNPAY credentials from environment variables.
 * Falls back to placeholder sandbox values if env vars are not set.
 * Note: VNPAY sandbox credentials require registration — no public test values available.
 * In mock mode, these are never sent to a real API but ARE used for HMAC signing in verification round-trips.
 * Real credentials must be set in .mcp.json env block for production use.
 */
export function getVnpayCredentials(): VnpayCredentials {
  return {
    tmnCode: process.env.VNPAY_TMN_CODE ?? 'VNPAY_TMN_DEMO',
    hashSecret: process.env.VNPAY_HASH_SECRET ?? 'VNPAY_HASH_SECRET_DEMO',
    endpoint: process.env.VNPAY_ENDPOINT ?? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  };
}
