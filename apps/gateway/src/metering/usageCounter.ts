import type { KVNamespace } from '@cloudflare/workers-types';

export const TIER_LIMITS: Record<string, number> = {
  free: 1_000,
  starter: 10_000,
  pro: 100_000,
  business: Infinity,
};

function usageKey(keyId: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `usage:${keyId}:${year}-${month}`;
}

export async function getUsageCount(keyId: string, kv: KVNamespace): Promise<number> {
  const raw = await kv.get(usageKey(keyId));
  if (raw === null) return 0;
  return parseInt(raw, 10);
}

export async function incrementUsageCounter(keyId: string, kv: KVNamespace): Promise<void> {
  const key = usageKey(keyId);
  const raw = await kv.get(key);
  const current = raw === null ? 0 : parseInt(raw, 10);
  await kv.put(key, String(current + 1));
}

export function checkUsageLimit(used: number, tier: string): boolean {
  if (tier === 'business') return false;
  const limit = TIER_LIMITS[tier] ?? 1_000;
  return used >= limit;
}

export function usageLimitResponse(tier: string, used: number): Response {
  const limit = TIER_LIMITS[tier] ?? 1_000;

  // Calculate resetsAt: first day of next UTC month
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const resetsAt = nextMonth.toISOString();

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: null,
    error: {
      code: -32002,
      message: `Monthly call limit reached (${used}/${limit}). Upgrade at https://mcpvn.dev/pricing`,
      data: {
        used,
        limit,
        tier,
        upgradeUrl: 'https://mcpvn.dev/pricing',
        resetsAt,
      },
    },
  });

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
