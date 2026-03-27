import { Hono } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getServiceRoleClient } from '../lib/supabase.js';

export const webhookLogsRouter = new Hono<GatewayEnv>();

// GET /webhook-logs — returns paginated, filterable webhook log entries.
// JWT auth is applied in index.ts before this router.
webhookLogsRouter.get('/', async (c) => {
  // auth is set by jwtAuthMiddleware — userId available for future scoping if needed
  c.get('auth');
  const supabase = getServiceRoleClient(c.env);

  // Query params for filtering
  const provider = c.req.query('provider'); // 'stripe' | 'momo'
  const status = c.req.query('status');     // 'success' | 'failed'
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);

  let query = supabase
    .from('webhook_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Webhook logs are a platform-wide debugging tool — not scoped to user_id.
  // All authenticated users can see all logs (admin-style access for v1).

  if (provider) query = query.eq('provider', provider);
  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ logs: data ?? [], total: count ?? 0, limit, offset });
});
