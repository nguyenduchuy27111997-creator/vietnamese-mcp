import type { MiddlewareHandler } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';
import { getServiceRoleClient } from '../lib/supabase.js';

export const authMiddleware: MiddlewareHandler<GatewayEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }
  const rawKey = authHeader.slice(7);
  const keyHash = await sha256hex(rawKey);

  // 1. KV cache hit — skip Supabase
  const cached = await c.env.API_KEYS.get<AuthContext>(keyHash, { type: 'json' });
  if (cached) {
    c.set('auth', cached);
    return next();
  }

  // 2. Supabase fallback — service role bypasses RLS intentionally
  const supabase = getServiceRoleClient(c.env);
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, tier, revoked_at, allowed_servers')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)  // CRITICAL: reject revoked keys
    .single();

  if (error || !data) {
    return c.json({ error: 'Invalid or revoked API key' }, 401);
  }

  const authCtx: AuthContext = {
    userId: data.user_id,
    tier: data.tier,
    keyId: data.id,
    allowedServers: data.allowed_servers ?? null,
  };

  // 3. Cache result with 60s TTL
  await c.env.API_KEYS.put(keyHash, JSON.stringify(authCtx), { expirationTtl: 60 });

  c.set('auth', authCtx);
  return next();
};

export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
