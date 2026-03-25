import type { MiddlewareHandler } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getServiceRoleClient } from '../lib/supabase.js';

/**
 * JWT auth middleware for /keys routes.
 * Verifies a Supabase access token (JWT) and sets auth context.
 * Unlike the API key middleware, this uses supabase.auth.getUser()
 * to validate the token — the user doesn't have an API key yet
 * when they first visit the dashboard.
 */
export const jwtAuthMiddleware: MiddlewareHandler<GatewayEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }
  const token = authHeader.slice(7);

  const supabase = getServiceRoleClient(c.env);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('auth', {
    userId: data.user.id,
    tier: 'free', // default tier for new users; keys store their own tier
    keyId: '',    // no key context for JWT auth
  });

  return next();
};
