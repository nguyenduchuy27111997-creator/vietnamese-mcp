import { supabase } from '../supabase.js';

const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL as string) ?? '';

async function getAuthHeader(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? `Bearer ${token}` : null;
}

export function useBilling() {
  /**
   * Redirect user to Stripe Checkout page.
   * Gateway creates the session and returns the URL.
   */
  const startStripeCheckout = async (tier: string) => {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch(`${GATEWAY_URL}/billing/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ provider: 'stripe', tier, returnUrl: window.location.origin }),
    });
    if (!res.ok) return;
    const { url } = await res.json() as { url: string };
    window.location.href = url;
  };

  /**
   * Redirect user to MoMo payment page (mock mode until merchant approved).
   */
  const startMomoCheckout = async (tier: string) => {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch(`${GATEWAY_URL}/billing/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify({ provider: 'momo', tier, returnUrl: window.location.origin }),
    });
    if (!res.ok) return;
    const { url } = await res.json() as { url: string };
    window.location.href = url;
  };

  /**
   * Open Stripe Customer Portal for subscription management.
   */
  const openStripePortal = async () => {
    const auth = await getAuthHeader();
    if (!auth) return;
    const res = await fetch(`${GATEWAY_URL}/billing/portal`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) return;
    const { url } = await res.json() as { url: string };
    window.location.href = url;
  };

  return { startStripeCheckout, startMomoCheckout, openStripePortal };
}
