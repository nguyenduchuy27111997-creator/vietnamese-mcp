export type ViettelPayCredentials = {
  partnerCode: string;
  secretKey: string;
  endpoint: string;
};

/**
 * Load ViettelPay credentials from environment variables.
 * Falls back to demo values if env vars are not set.
 * Note: see MOCK_DEVIATIONS.md — real ViettelPay API uses username/password/serviceCode,
 * not partnerCode/secretKey. These env var names are inferred from MoMo pattern.
 */
export function getViettelPayCredentials(): ViettelPayCredentials {
  return {
    partnerCode: process.env.VIETTEL_PAY_PARTNER_CODE ?? 'VTPAY_DEMO',
    secretKey: process.env.VIETTEL_PAY_SECRET_KEY ?? 'demo_secret_key_vtpay',
    endpoint: process.env.VIETTEL_PAY_ENDPOINT ?? 'https://sandbox.viettelpay.vn/vtpay-api',
  };
}
