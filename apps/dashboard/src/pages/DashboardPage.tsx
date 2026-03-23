import { useState } from 'react';
import { supabase } from '../supabase.js';
import { useKeys } from '../hooks/useKeys.js';
import type { ApiKey } from '../hooks/useKeys.js';
import { useUsage } from '../hooks/useUsage.js';
import { useBilling } from '../hooks/useBilling.js';

function UsageBar({ used, limit, period }: { used: number; limit: number; period: string }) {
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const label = limit === Infinity
    ? `${used.toLocaleString()} calls (unlimited)`
    : `${used.toLocaleString()} / ${limit.toLocaleString()} calls this month`;
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
        <span>{label}</span>
        <span>{period}</span>
      </div>
      <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct >= 90 ? '#ef4444' : '#2563eb',
          borderRadius: '3px',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

function UpgradeSection({
  currentTier,
  onStripeCheckout,
  onMomoCheckout,
  onManageSubscription,
}: {
  currentTier: string;
  onStripeCheckout: (tier: string) => void;
  onMomoCheckout: (tier: string) => void;
  onManageSubscription: () => void;
}) {
  if (currentTier !== 'free') {
    // Paid tier — show manage subscription
    return (
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#0c4a6e' }}>
            <strong style={{ textTransform: 'capitalize' }}>{currentTier}</strong> plan active
          </span>
          <button onClick={onManageSubscription}
            style={{ padding: '6px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Manage subscription
          </button>
        </div>
      </div>
    );
  }

  // Free tier — show upgrade CTA with two payment options
  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
      <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
        Upgrade to unlock more API calls and servers
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => onStripeCheckout('starter')}
          style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Pay with Card ($19/mo)
        </button>
        <button onClick={() => onMomoCheckout('starter')}
          style={{ padding: '8px 16px', background: '#a50064', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          Pay with MoMo (449,000 VND)
        </button>
      </div>
    </div>
  );
}

export function DashboardPage({ userEmail }: { userEmail: string }) {
  const { keys, loading, error, createKey, revokeKey } = useKeys();
  const { usage } = useUsage();
  const { startStripeCheckout, startMomoCheckout, openStripePortal } = useBilling();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeKeys = keys.filter(k => !k.revoked_at);
  const tier = activeKeys[0]?.tier ?? 'free';

  const handleCreate = async () => {
    setCreating(true);
    setNewKey(null);
    const raw = await createKey();
    if (raw) setNewKey(raw);
    setCreating(false);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', margin: 0 }}>API Keys</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
            {userEmail} &middot; Tier: <strong style={{ textTransform: 'capitalize' }}>{tier}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleCreate} disabled={creating || activeKeys.length >= 2}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            {creating ? 'Creating\u2026' : '+ Create key'}
          </button>
          <button onClick={() => supabase.auth.signOut()}
            style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Sign out
          </button>
        </div>
      </div>

      {usage && <UsageBar used={usage.used} limit={usage.limit} period={usage.period} />}

      <UpgradeSection
        currentTier={tier}
        onStripeCheckout={startStripeCheckout}
        onMomoCheckout={startMomoCheckout}
        onManageSubscription={openStripePortal}
      />

      {newKey && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#166534' }}>
            Save your API key &mdash; it won&apos;t be shown again
          </p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <code style={{ flex: 1, background: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {newKey}
            </code>
            <button onClick={() => handleCopy(newKey)}
              style={{ padding: '8px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: '13px' }}>{error}</p>}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading keys\u2026</p>
      ) : activeKeys.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280', border: '1px dashed #d1d5db', borderRadius: '8px' }}>
          No active API keys. Create one to get started.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Key</th>
              <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px 0', color: '#6b7280', fontWeight: 500 }}>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {activeKeys.map((k: ApiKey) => (
              <tr key={k.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 0' }}>
                  <code style={{ fontSize: '13px' }}>{k.key_prefix}&hellip;</code>
                </td>
                <td style={{ padding: '12px 0', color: '#374151' }}>{k.name}</td>
                <td style={{ padding: '12px 0', color: '#6b7280' }}>
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px 0', textAlign: 'right' }}>
                  <button onClick={() => revokeKey(k.id)}
                    style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #fca5a5', borderRadius: '4px', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
