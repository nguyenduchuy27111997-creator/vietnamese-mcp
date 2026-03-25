import { Hono } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getUsageCount, TIER_LIMITS } from '../metering/usageCounter.js';
import { getServiceRoleClient } from '../lib/supabase.js';

export const usageRouter = new Hono<GatewayEnv>();

usageRouter.get('/', async (c) => {
  const { userId, tier } = c.get('auth');

  // Look up all active keys for this user, then sum their KV usage counters
  const supabase = getServiceRoleClient(c.env);
  const { data: keys } = await supabase
    .from('api_keys')
    .select('id')
    .eq('user_id', userId)
    .is('revoked_at', null);

  let used = 0;
  if (keys && keys.length > 0) {
    const counts = await Promise.all(
      keys.map((k: { id: string }) => getUsageCount(k.id, c.env.API_KEYS)),
    );
    used = counts.reduce((sum, n) => sum + n, 0);
  }

  const limit = TIER_LIMITS[tier] ?? 1_000;
  const now = new Date();
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return c.json({ used, limit, period, tier, resetsAt });
});
