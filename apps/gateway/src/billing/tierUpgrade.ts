import { getServiceRoleClient } from '../lib/supabase.js';
import type { GatewayEnv } from '../types.js';

/**
 * Upgrades (or downgrades) all active API keys for a user to the new tier.
 * Steps: fetch key hashes -> update tier -> invalidate KV cache.
 * MUST fetch hashes BEFORE update to avoid race condition (Pitfall 7 from research).
 */
export async function handleTierUpgrade(
  userId: string,
  newTier: string,
  env: GatewayEnv['Bindings'],
): Promise<void> {
  const supabase = getServiceRoleClient(env);

  // 1. Fetch all active key hashes (needed for KV invalidation)
  const { data: keys } = await supabase
    .from('api_keys')
    .select('key_hash')
    .eq('user_id', userId)
    .is('revoked_at', null);

  // 2. Update tier on all active keys
  await supabase
    .from('api_keys')
    .update({ tier: newTier })
    .eq('user_id', userId)
    .is('revoked_at', null);

  // 3. Invalidate KV cache — new tier takes effect immediately
  await Promise.all((keys ?? []).map(k => env.API_KEYS.delete(k.key_hash)));
}

/**
 * Idempotency check — returns true if event was already processed (duplicate).
 * Inserts event_id into webhook_events table; PK conflict = duplicate.
 */
export async function checkIdempotency(
  eventId: string,
  provider: 'stripe' | 'momo',
  env: GatewayEnv['Bindings'],
): Promise<boolean> {
  const supabase = getServiceRoleClient(env);
  const { error } = await supabase
    .from('webhook_events')
    .insert({ event_id: eventId, provider });

  // PostgreSQL unique violation code = '23505'
  return error?.code === '23505';
}
