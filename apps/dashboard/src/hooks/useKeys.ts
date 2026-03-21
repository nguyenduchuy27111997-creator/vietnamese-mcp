import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string) ?? '';

export type ApiKey = {
  id: string;
  key_prefix: string;
  name: string;
  tier: string;
  created_at: string;
  revoked_at: string | null;
};

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export function useKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    const auth = await getAuthHeader();
    if (!auth) { setError('Not authenticated'); setLoading(false); return; }
    const res = await fetch(`${GATEWAY_URL}/keys`, { headers: { Authorization: auth } });
    if (!res.ok) { setError('Failed to fetch keys'); setLoading(false); return; }
    setKeys(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = useCallback(async (name?: string): Promise<string | null> => {
    const auth = await getAuthHeader();
    if (!auth) return null;
    const res = await fetch(`${GATEWAY_URL}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ name: name ?? 'My API Key' }),
    });
    if (!res.ok) {
      const body = await res.json() as { error?: string };
      setError(body.error ?? 'Failed to create key');
      return null;
    }
    const data = await res.json() as ApiKey & { key: string };
    setKeys(prev => [data, ...prev]);
    return data.key; // raw key — show once
  }, []);

  const revokeKey = useCallback(async (id: string) => {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch(`${GATEWAY_URL}/keys/${id}`, {
      method: 'DELETE',
      headers: { Authorization: auth },
    });
    if (res.ok) setKeys(prev => prev.filter(k => k.id !== id));
    else setError('Failed to revoke key');
  }, []);

  return { keys, loading, error, fetchKeys, createKey, revokeKey };
}
