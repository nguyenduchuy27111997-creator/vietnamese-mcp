import { Hono } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getUsageCount, TIER_LIMITS } from '../metering/usageCounter.js';

export const usageRouter = new Hono<GatewayEnv>();

usageRouter.get('/', async (c) => {
  const { keyId, tier } = c.get('auth');
  const used = await getUsageCount(keyId, c.env.API_KEYS);
  const limit = TIER_LIMITS[tier] ?? 1_000;
  const now = new Date();
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return c.json({ used, limit, period, tier, resetsAt });
});
