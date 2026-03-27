import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase.js';
import { AuthPage } from './pages/AuthPage.js';
import { AppShell } from '@/components/app-shell';
import { ThemeProvider } from '@/components/theme-provider';
import { useKeys } from './hooks/useKeys.js';

// Lazy load page components
const OverviewPage = lazy(() => import('./pages/OverviewPage.js').then(m => ({ default: m.OverviewPage })));
const KeysPage = lazy(() => import('./pages/KeysPage.js').then(m => ({ default: m.KeysPage })));
const UsagePage = lazy(() => import('./pages/UsagePage.js').then(m => ({ default: m.UsagePage })));
const BillingPage = lazy(() => import('./pages/BillingPage.js').then(m => ({ default: m.BillingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.js').then(m => ({ default: m.SettingsPage })));
const QuickstartPage = lazy(() => import('./pages/QuickstartPage.js').then(m => ({ default: m.QuickstartPage })));
const PlaygroundPage = lazy(() => import('./pages/PlaygroundPage.js').then(m => ({ default: m.PlaygroundPage })));
const WebhookLogsPage = lazy(() => import('./pages/WebhookLogsPage.js').then(m => ({ default: m.WebhookLogsPage })));

function NewUserRedirect() {
  const { keys, loading } = useKeys();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if: not loading, zero keys, and user is on the root page
    if (!loading && keys.length === 0 && location.pathname === '/') {
      navigate('/quickstart', { replace: true });
    }
  }, [loading, keys.length, location.pathname, navigate]);

  return null;
}

function AuthenticatedApp({ session }: { session: Session }) {
  const userEmail = session.user.email ?? '';
  const handleSignOut = () => supabase.auth.signOut();

  return (
    <>
      <NewUserRedirect />
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground">Loading...</div>}>
        <Routes>
          <Route element={<AppShell userEmail={userEmail} onSignOut={handleSignOut} />}>
            <Route index element={<OverviewPage />} />
            <Route path="keys" element={<KeysPage />} />
            <Route path="usage" element={<UsagePage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="quickstart" element={<QuickstartPage />} />
            <Route path="playground" element={<PlaygroundPage />} />
            <Route path="webhook-logs" element={<WebhookLogsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <ThemeProvider defaultTheme="dark">
      {session ? <AuthenticatedApp session={session} /> : <AuthPage />}
    </ThemeProvider>
  );
}
