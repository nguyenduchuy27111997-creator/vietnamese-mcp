export type ZaloPayCredentials = {
  appId: string;
  key1: string;
  key2: string;
  endpoint: string;
};

/**
 * Load ZaloPay credentials from environment variables.
 * Falls back to published sandbox test credentials if env vars are not set.
 * Real credentials must be set in .mcp.json env block for production use.
 */
export function getZaloPayCredentials(): ZaloPayCredentials {
  return {
    appId: process.env.ZALOPAY_APP_ID ?? '2553',
    key1: process.env.ZALOPAY_KEY1 ?? 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
    key2: process.env.ZALOPAY_KEY2 ?? 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
    endpoint: process.env.ZALOPAY_ENDPOINT ?? 'https://sb-openapi.zalopay.vn',
  };
}
