import { useKeys } from './useKeys.js';
import { useUsage } from './useUsage.js';

export function useOverview() {
  const { keys, loading: keysLoading, error: keysError } = useKeys();
  const { usage, loading: usageLoading, error: usageError } = useUsage();

  const activeKeys = keys.filter(k => !k.revoked_at).length;
  const totalKeys = keys.length;

  return {
    activeKeys,
    totalKeys,
    used: usage?.used ?? 0,
    limit: usage?.limit ?? 0,
    tier: usage?.tier ?? 'free',
    period: usage?.period ?? '',
    resetsAt: usage?.resetsAt ?? '',
    usagePercent: usage ? Math.round((usage.used / usage.limit) * 100) : 0,
    loading: keysLoading || usageLoading,
    error: keysError || usageError,
  };
}
