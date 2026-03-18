/**
 * Check if a service is running in mock/sandbox mode.
 * Each server has its own env var: MOMO_SANDBOX, ZALOPAY_SANDBOX, etc.
 * @param service - lowercase service name (e.g., "momo", "zalopay", "vnpay", "viettelpay", "zalo_oa")
 */
export function isMockMode(service: string): boolean {
  const envVar = `${service.toUpperCase()}_SANDBOX`;
  return process.env[envVar] === 'true';
}
