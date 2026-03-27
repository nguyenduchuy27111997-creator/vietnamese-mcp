import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string) ?? '';

export type WebhookLog = {
  id: string;
  event_id: string;
  provider: 'stripe' | 'momo';
  event_type: string;
  status: 'success' | 'failed';
  payload: Record<string, unknown>;
  created_at: string;
  user_id: string | null;
};

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? `Bearer ${data.session.access_token}` : null;
}

export function useWebhookLogs() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');  // '' = all
  const [status, setStatus] = useState<string>('');      // '' = all
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const auth = await getAuthHeader();
    if (!auth) { setError('Not authenticated'); setLoading(false); return; }

    const params = new URLSearchParams();
    if (provider) params.set('provider', provider);
    if (status) params.set('status', status);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    try {
      const res = await fetch(`${GATEWAY_URL}/webhook-logs?${params}`, {
        headers: { Authorization: auth },
      });
      if (!res.ok) { setError('Failed to fetch logs'); setLoading(false); return; }
      const data = await res.json() as { logs: WebhookLog[]; total: number };
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      setError('Failed to fetch logs');
    }
    setLoading(false);
  }, [provider, status, offset]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, total, loading, error, provider, setProvider, status, setStatus, offset, setOffset, limit, refetch: fetchLogs };
}
