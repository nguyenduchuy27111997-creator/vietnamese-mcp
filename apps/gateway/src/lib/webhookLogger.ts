import { getServiceRoleClient } from './supabase.js';
import type { GatewayEnv } from '../types.js';

/**
 * Persists a webhook event to the webhook_logs table for debugging.
 * Fire-and-forget — does NOT throw on insert failure so billing routes are never broken.
 */
export async function logWebhookEvent(
  env: GatewayEnv['Bindings'],
  params: {
    eventId: string;
    provider: 'stripe' | 'momo';
    eventType: string;
    status: 'success' | 'failed';
    payload: unknown;
    userId?: string;
  },
): Promise<void> {
  const supabase = getServiceRoleClient(env);
  await supabase.from('webhook_logs').insert({
    event_id: params.eventId,
    provider: params.provider,
    event_type: params.eventType,
    status: params.status,
    payload: params.payload,
    user_id: params.userId ?? null,
  });
}
