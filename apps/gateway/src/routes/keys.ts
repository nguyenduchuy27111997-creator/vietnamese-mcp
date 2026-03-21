import { Hono } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getServiceRoleClient } from '../lib/supabase.js';
import { sha256hex } from '../middleware/auth.js';

export const keysRouter = new Hono<GatewayEnv>();

// GET /keys — list caller's active keys (key_hash never returned)
keysRouter.get('/', async (c) => {
  const auth = c.get('auth');
  const supabase = getServiceRoleClient(c.env);

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, key_prefix, name, tier, created_at, revoked_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) return c.json({ error: 'Failed to fetch keys' }, 500);
  return c.json(data ?? []);
});

// POST /keys — create a new API key (raw key returned once)
keysRouter.post('/', async (c) => {
  const auth = c.get('auth');
  const supabase = getServiceRoleClient(c.env);

  // Enforce 2-key-per-user limit (active keys only)
  const { count, error: countError } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .is('revoked_at', null);

  if (countError) return c.json({ error: 'Failed to check key count' }, 500);
  if ((count ?? 0) >= 2) return c.json({ error: 'Key limit reached (2 per user)' }, 409);

  // Generate: sk_test_ + 64 hex chars (32 random bytes)
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const suffix = [...randomBytes].map(b => b.toString(16).padStart(2, '0')).join('');
  const rawKey = `sk_test_${suffix}`;
  const keyPrefix = rawKey.slice(0, 16); // 'sk_test_' + 8 hex chars

  const keyHash = await sha256hex(rawKey);

  const body = await c.req.json<{ name?: string }>().catch(() => ({}));

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: auth.userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      tier: auth.tier,
      name: body.name ?? 'My API Key',
    })
    .select('id, key_prefix, tier, created_at')
    .single();

  if (error) return c.json({ error: 'Failed to create key' }, 500);

  // Raw key returned once — never stored, never returned again
  return c.json({ ...data, key: rawKey }, 201);
});

// DELETE /keys/:id — revoke a key (immediate KV invalidation)
keysRouter.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const keyId = c.req.param('id');
  const supabase = getServiceRoleClient(c.env);

  // Fetch with user_id guard — prevents cross-user revoke
  const { data, error } = await supabase
    .from('api_keys')
    .select('key_hash')
    .eq('id', keyId)
    .eq('user_id', auth.userId)
    .is('revoked_at', null)
    .single();

  if (error || !data) return c.json({ error: 'Key not found' }, 404);

  // Revoke in DB
  await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId);

  // Invalidate KV immediately — don't wait for 60s TTL
  await c.env.API_KEYS.delete(data.key_hash);

  return c.json({ success: true });
});
