import { useState } from 'react';
import { supabase } from '../supabase.js';

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '8px 12px', marginBottom: '12px',
  border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px',
};
const btnStyle = (color: string): React.CSSProperties => ({
  width: '100%', padding: '10px', background: color, color: '#fff',
  border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer',
});

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fn = mode === 'signup'
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error: authError } = await fn;
    if (authError) setError(authError.message);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '32px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}>
      <h1 style={{ fontSize: '20px', marginBottom: '24px' }}>VN MCP Hub</h1>
      <form onSubmit={submit}>
        <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '8px' }}>{error}</p>}
        <button type="submit" style={btnStyle('#2563eb')} disabled={loading}>
          {loading ? 'Loading\u2026' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
        {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
        <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0 }}>
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </div>
  );
}
