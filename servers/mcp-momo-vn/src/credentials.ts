export type MomoCredentials = {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
};

/**
 * Load MoMo credentials from environment variables.
 * Falls back to published sandbox test credentials if env vars are not set.
 * Real credentials must be set in .mcp.json env block for production use.
 */
export function getMomoCredentials(): MomoCredentials {
  return {
    partnerCode: process.env.MOMO_PARTNER_CODE ?? 'MOMOBKUN20180529',
    accessKey: process.env.MOMO_ACCESS_KEY ?? 'klm05TvNBzhg7h7j',
    secretKey: process.env.MOMO_SECRET_KEY ?? 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa',
  };
}
