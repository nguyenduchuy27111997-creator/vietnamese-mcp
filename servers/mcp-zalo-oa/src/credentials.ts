export type ZaloOaCredentials = {
  appId: string;
  appSecret: string;
  accessToken: string;
  refreshToken: string;
};

/**
 * Load Zalo OA credentials from environment variables.
 * Falls back to demo values if env vars are not set.
 * Real credentials must be set in .mcp.json env block for production use.
 */
export function getZaloOaCredentials(): ZaloOaCredentials {
  return {
    appId: process.env.ZALO_OA_APP_ID ?? 'demo_app_id',
    appSecret: process.env.ZALO_OA_APP_SECRET ?? 'demo_app_secret',
    accessToken: process.env.ZALO_OA_ACCESS_TOKEN ?? 'demo_access_token',
    refreshToken: process.env.ZALO_OA_REFRESH_TOKEN ?? 'demo_refresh_token',
  };
}
