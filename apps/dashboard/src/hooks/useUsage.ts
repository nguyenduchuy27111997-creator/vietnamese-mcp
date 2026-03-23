import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase.js';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string) ?? '';

export type UsageData = {
  used: number;
  limit: number;
  period: string;
  tier: string;
  resetsAt: string;
};

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError(null);
    const auth = await getAuthHeader();
    if (!auth) { setError('Not authenticated'); setLoading(false); return; }
    try {
      const res = await fetch(`${GATEWAY_URL}/usage`, {
        headers: { Authorization: auth },
      });
      if (!res.ok) { setError('Failed to fetch usage'); setLoading(false); return; }
      setUsage(await res.json());
    } catch {
      setError('Failed to fetch usage');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  return { usage, loading, error, refetch: fetchUsage };
}
