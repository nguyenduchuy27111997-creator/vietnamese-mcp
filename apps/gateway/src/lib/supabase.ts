import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { GatewayEnv } from '../types.js';

/**
 * Returns a Supabase client using the service role key.
 * Called inside request handlers — env is only available per-request in CF Workers.
 * DO NOT call at module scope (env is undefined outside handler).
 */
export function getServiceRoleClient(env: GatewayEnv['Bindings']): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
