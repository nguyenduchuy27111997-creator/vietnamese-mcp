# Phase 8: Billing - Research

**Researched:** 2026-03-23
**Domain:** Stripe Checkout subscriptions, MoMo one-time IPN payments, Cloudflare Workers webhook signature verification, Supabase idempotency
**Confidence:** HIGH (Stripe), HIGH (MoMo — existing codebase has verified IPN pattern), HIGH (Supabase patterns)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Stripe Integration:**
- Stripe Checkout (redirect to Stripe-hosted page) — no PCI scope, Stripe handles card UI
- Recurring monthly subscriptions — auto-renew, Stripe handles retries and dunning
- Stripe Customer Portal enabled — users can cancel, change plan, update payment from dashboard link
- No Stripe account yet — plan includes full setup: create account, products/prices for 3 tiers, webhook endpoint, store keys as secrets
- Pricing: Starter $19/mo, Pro $49/mo, Business $149/mo

**MoMo Integration:**
- Build mock-first, verify when merchant account approved — same pattern as MCP servers
- Submit MoMo merchant application at Phase 8 start (3-7 day KYC)
- Fixed VND pricing: Starter 449k VND, Pro 1.19M VND, Business 3.59M VND
- One-time payments + manual renewal — MoMo doesn't support recurring; user pays again each month
- Tier downgrades to free after MoMo payment expiry (30 days from payment)

**Webhook Handling:**
- Supabase idempotency table: `webhook_events (event_id UNIQUE, provider, processed_at)` — INSERT before processing, duplicate fails with conflict
- Tier update: UPDATE all active `api_keys` SET tier = new_tier WHERE user_id = X AND revoked_at IS NULL
- KV cache invalidation: delete all KV entries for user's key hashes immediately after tier update — new tier takes effect instantly, not after 60s TTL
- PaymentProvider abstraction decouples Stripe and MoMo (BILL-05)

**Dashboard Billing UI:**
- Inline upgrade button next to tier display on DashboardPage — no separate pricing page
- Two buttons side by side: "Pay with Card ($19/mo)" and "Pay with MoMo (449,000₫)" — user picks
- Minimal billing status: current tier + "Manage subscription" (Stripe Portal link) or "Renew" + expiry date (MoMo)
- Free tier: no billing UI shown, just upgrade CTA

### Claude's Discretion
- Stripe webhook signature verification implementation details
- MoMo IPN HMAC field ordering (research needed — known pitfall)
- Exact Supabase migration for webhook_events table
- How to store Stripe customer_id (on api_keys table or separate)
- Dashboard upgrade modal/dropdown design
- Cron or scheduled check for MoMo payment expiry

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILL-01 | Stripe Checkout for Starter/Pro/Business tier subscriptions (USD) | Stripe Checkout Session API with mode="subscription", line_items, client_reference_id for user correlation |
| BILL-02 | Stripe webhooks update user tier in Supabase | `customer.subscription.updated` + `invoice.paid` events; webhook signature via `constructEventAsync`; idempotency table INSERT ON CONFLICT |
| BILL-03 | MoMo one-time payment for monthly subscription (VND) | MoMo v2 createPayment API; mock-first pattern matches existing mcp-momo-vn server |
| BILL-04 | MoMo IPN callback updates user tier in Supabase | Verified IPN field order (13 fields alphabetical) from existing `signatures.ts`; resultCode=0 means success; respond HTTP 204 within 15s |
| BILL-05 | PaymentProvider abstraction decouples Stripe and MoMo | Interface with `createCheckoutUrl()` and `handleWebhook()` methods; concrete StripeProvider + MoMoProvider |
| BILL-06 | Free tier requires no credit card | No billing UI for free users, only upgrade CTA; free tier flows through with no payment step |
</phase_requirements>

---

## Summary

Phase 8 adds two payment paths to the gateway: Stripe for USD recurring subscriptions and MoMo for VND one-time monthly payments. Both paths terminate in the same Supabase tier-upgrade operation protected by an idempotency table. The Cloudflare Workers environment requires Stripe's `constructEventAsync` (not `constructEvent`) because WebCrypto is async. MoMo IPN field ordering is already verified in the existing `servers/mcp-momo-vn/src/signatures.ts` — use `buildIpnSignature` directly; do not rebuild the ordering logic.

The dashboard gets inline upgrade UI added to the existing `DashboardPage.tsx`. No new pages are needed. The upgrade flow is: user clicks button → dashboard calls gateway `/billing/create-checkout` → gateway creates Stripe session or MoMo payment link → dashboard redirects user. Webhooks are stateless HTTP endpoints on the gateway.

**Primary recommendation:** Implement Stripe first (testable immediately with Stripe CLI webhook forwarding), then wire up MoMo mock mode. Both share the same `handleTierUpgrade()` utility function to keep tier-update logic in one place.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | ^17+ (latest ~20.x) | Stripe API client for CF Workers | Official Stripe SDK; CF Workers support via `createFetchHttpClient()` + `createSubtleCryptoProvider()` |
| `@supabase/supabase-js` | ^2.99.3 (already installed) | Supabase DB writes for tier upgrade | Already in gateway — no new dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vn-mcp/shared` `signHmacSha256` | workspace:* | MoMo IPN HMAC verification | Re-use existing primitive; **but note**: shared package uses Node.js `createHmac` which is NOT available in CF Workers. Must use `crypto.subtle` directly (same as `sha256hex` in auth.ts) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `constructEventAsync` | Manual `crypto.subtle` HMAC verify | `constructEventAsync` is cleaner and officially supported in Workers; manual is fallback only |
| Supabase idempotency table | KV-based dedup | Table gives durable atomicity; KV is eventually consistent |

### Installation
```bash
npm install stripe --workspace=apps/gateway
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/gateway/src/
├── routes/
│   └── billing.ts          # /billing routes (create-checkout, stripe-webhook, momo-ipn, portal)
├── billing/
│   ├── provider.ts          # PaymentProvider interface (BILL-05)
│   ├── stripe.ts            # StripeProvider: createCheckoutUrl, handleWebhook
│   ├── momo.ts              # MoMoProvider: createPaymentUrl, handleIpn
│   └── tierUpgrade.ts       # handleTierUpgrade(userId, newTier, env) — shared logic
apps/gateway/supabase/migrations/
│   └── 002_webhook_events.sql  # webhook_events idempotency table
apps/dashboard/src/
├── hooks/
│   └── useBilling.ts        # createCheckoutSession, getBillingStatus
└── pages/
    └── DashboardPage.tsx    # Add UpgradeSection component inline
```

### Pattern 1: PaymentProvider Interface (BILL-05)
**What:** TypeScript interface that both Stripe and MoMo providers implement
**When to use:** Always — ensures billing.ts route handler does not hardcode provider logic

```typescript
// Source: CONTEXT.md decision
export interface PaymentProvider {
  createCheckoutUrl(params: {
    userId: string;
    tier: 'starter' | 'pro' | 'business';
    userEmail: string;
    returnUrl: string;
  }): Promise<string>;
}

// Stripe implementation example
// Source: docs.stripe.com/api/checkout/sessions/create
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
  customer_email: userEmail,
  client_reference_id: userId,  // correlates webhook to user
  success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: returnUrl,
});
return session.url!;
```

### Pattern 2: Stripe Webhook Verification in CF Workers
**What:** Use `constructEventAsync` + `createSubtleCryptoProvider` because CF Workers WebCrypto is async
**When to use:** Always for the Stripe webhook endpoint

```typescript
// Source: blog.cloudflare.com/announcing-stripe-support-in-workers + gebna.gg/blog
import Stripe from 'stripe/lib/stripe.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});
const webCrypto = Stripe.createSubtleCryptoProvider();

// In webhook handler:
const body = await c.req.text();  // raw body — MUST be text(), not json()
const sig = c.req.header('stripe-signature') ?? '';

let event: Stripe.Event;
try {
  event = await stripe.webhooks.constructEventAsync(
    body, sig, env.STRIPE_WEBHOOK_SECRET, undefined, webCrypto
  );
} catch {
  return c.json({ error: 'Invalid signature' }, 400);
}
```

### Pattern 3: MoMo IPN Verification
**What:** Re-use `buildIpnSignature` from existing `signatures.ts` in mcp-momo-vn server
**When to use:** POST /billing/momo-ipn handler

```typescript
// Source: servers/mcp-momo-vn/src/signatures.ts (verified field order)
// IPN field order (13 fields, alphabetical):
// accessKey, amount, extraData, message, orderId, orderInfo, orderType,
// partnerCode, payType, requestId, responseTime, resultCode, transId
//
// NOTE: buildIpnSignature uses Node.js createHmac — NOT compatible with CF Workers.
// Re-implement using crypto.subtle (same approach as sha256hex in auth.ts).

async function verifyMomoIpn(body: MomoIpnPayload, secretKey: string): Promise<boolean> {
  const raw = [
    `accessKey=${body.accessKey}`,
    `&amount=${body.amount}`,
    `&extraData=${body.extraData ?? ''}`,
    `&message=${body.message ?? ''}`,
    `&orderId=${body.orderId}`,
    `&orderInfo=${body.orderInfo ?? ''}`,
    `&orderType=${body.orderType ?? ''}`,
    `&partnerCode=${body.partnerCode}`,
    `&payType=${body.payType ?? ''}`,
    `&requestId=${body.requestId}`,
    `&responseTime=${body.responseTime}`,
    `&resultCode=${body.resultCode}`,
    `&transId=${body.transId}`,
  ].join('');
  // Use crypto.subtle HMAC-SHA256 (CF Workers compatible)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === body.signature;
}
// Respond HTTP 204 on success (MoMo requires 204 No Content within 15s)
```

### Pattern 4: Idempotency Table Insert
**What:** Insert webhook event_id before processing; UNIQUE constraint prevents double-processing
**When to use:** First step in every webhook handler (both Stripe and MoMo)

```typescript
// Source: CONTEXT.md + Supabase ON CONFLICT pattern
const supabase = getServiceRoleClient(env);
const { error: idempotencyError } = await supabase
  .from('webhook_events')
  .insert({ event_id: eventId, provider: 'stripe' });  // or 'momo'

if (idempotencyError?.code === '23505') {
  // Duplicate — already processed, return 200 immediately
  return c.json({ received: true });
}
```

### Pattern 5: Tier Upgrade with KV Invalidation
**What:** Update all user's active api_keys, then delete KV cache entries — instant effect
**When to use:** After successful idempotency check in webhook handler

```typescript
// Source: CONTEXT.md + keys.ts DELETE handler pattern
async function handleTierUpgrade(
  userId: string, newTier: string, env: GatewayEnv['Bindings']
): Promise<void> {
  const supabase = getServiceRoleClient(env);

  // 1. Fetch all active key hashes for this user (needed for KV invalidation)
  const { data: keys } = await supabase
    .from('api_keys')
    .select('key_hash')
    .eq('user_id', userId)
    .is('revoked_at', null);

  // 2. Update tier on all active keys atomically
  await supabase
    .from('api_keys')
    .update({ tier: newTier })
    .eq('user_id', userId)
    .is('revoked_at', null);

  // 3. Invalidate KV cache for all key hashes — new tier takes effect immediately
  await Promise.all((keys ?? []).map(k => env.API_KEYS.delete(k.key_hash)));
}
```

### Pattern 6: Stripe Billing Portal Session
**What:** Create a short-lived portal URL for users to self-manage subscriptions
**When to use:** GET /billing/portal endpoint (requires JWT auth)

```typescript
// Source: docs.stripe.com/api/customer_portal/sessions/create
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,  // stored on user record
  return_url: `${DASHBOARD_URL}/`,
});
return c.json({ url: session.url });
```

### Pattern 7: Stripe Price ID Map
**What:** Map tier names to Stripe Price IDs (created during Stripe account setup)
**When to use:** createCheckoutUrl resolves tier name to price_id

```typescript
// Price IDs created in Stripe Dashboard during account setup
const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: env.STRIPE_PRICE_STARTER,  // $19/mo recurring
  pro: env.STRIPE_PRICE_PRO,          // $49/mo recurring
  business: env.STRIPE_PRICE_BUSINESS, // $149/mo recurring
};
```

### Pattern 8: Dashboard Upgrade Hook
**What:** React hook following `useKeys` pattern to call gateway billing endpoints
**When to use:** DashboardPage.tsx upgrade buttons

```typescript
// Source: apps/dashboard/src/hooks/useKeys.ts pattern
export function useBilling() {
  const startStripeCheckout = async (tier: string) => {
    const auth = await getAuthHeader();
    const res = await fetch(`${GATEWAY_URL}/billing/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth! },
      body: JSON.stringify({ provider: 'stripe', tier }),
    });
    const { url } = await res.json() as { url: string };
    window.location.href = url;  // redirect to Stripe Checkout
  };
  // ...similar for momo
}
```

### Anti-Patterns to Avoid
- **`constructEvent` (sync) in CF Workers:** Will silently fail or throw "crypto not available." Always use `constructEventAsync`.
- **`createHmac` from `@vn-mcp/shared`:** Uses Node.js `node:crypto`, which is not available in CF Workers (even with `nodejs_compat` flag — `createHmac` specifically fails). Re-implement MoMo HMAC using `crypto.subtle`.
- **Module-scope Stripe initialization:** `new Stripe(env.STRIPE_SECRET_KEY, ...)` must be inside the request handler, not module scope — CF Workers env is only available per-request.
- **Processing webhook before idempotency insert:** Always insert to `webhook_events` FIRST, then process. The reverse creates a race window.
- **Responding to MoMo IPN after 15 seconds:** MoMo marks IPN as failed after 15s. Keep handler fast — do Supabase writes, no external HTTP calls.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stripe checkout session | Custom payment form | `stripe.checkout.sessions.create()` | PCI scope, card UI, 3DS, localization all handled |
| Stripe signature verification | Manual HMAC check | `constructEventAsync` + `createSubtleCryptoProvider` | Handles timestamp tolerance, signature format parsing |
| Stripe subscription dunning | Custom retry logic | Stripe Smart Retries (automatic) | Stripe retries failed payments on configurable schedule |
| Stripe customer self-service | Custom cancel/update UI | `stripe.billingPortal.sessions.create()` | Cancel, plan change, payment method update — no UI to build |
| MoMo IPN field ordering | Dynamic key sorting | Hardcoded alphabetical string (as in `signatures.ts`) | MoMo requires exact field order; dynamic sort is bug-prone |

**Key insight:** Stripe Checkout + Customer Portal eliminates ~80% of subscription UI surface area. The only UI needed is the "create checkout session" button.

---

## Common Pitfalls

### Pitfall 1: CF Workers — `constructEvent` vs `constructEventAsync`
**What goes wrong:** `stripe.webhooks.constructEvent()` is synchronous and uses Node.js crypto internally. In CF Workers, this throws or returns invalid results.
**Why it happens:** CF Workers WebCrypto (crypto.subtle) is async-only; no synchronous digest API.
**How to avoid:** Always use `stripe.webhooks.constructEventAsync(body, sig, secret, undefined, webCrypto)` where `webCrypto = Stripe.createSubtleCryptoProvider()`.
**Warning signs:** "crypto is not defined" or "constructEvent is not a function" errors in wrangler dev.

### Pitfall 2: Stripe Webhook Raw Body Mutation
**What goes wrong:** Calling `c.req.json()` before signature verification parses and re-serializes the body, changing whitespace and field order — signature check fails with 400.
**Why it happens:** Stripe signature is over the exact raw bytes received.
**How to avoid:** Use `const body = await c.req.text()` in the webhook handler. Never call `.json()` before `constructEventAsync`.
**Warning signs:** 400 errors on valid events; "No signatures found matching the expected signature for payload" in Stripe Dashboard.

### Pitfall 3: MoMo IPN `node:crypto` in CF Workers
**What goes wrong:** Importing `signHmacSha256` from `@vn-mcp/shared` fails in CF Workers because it calls `createHmac` from `node:crypto`. Even with `nodejs_compat`, `createHmac` is not available.
**Why it happens:** `nodejs_compat` only shims a subset of Node.js APIs in Workers; `createHmac` is not included.
**How to avoid:** Implement `verifyMomoIpn()` using `crypto.subtle` (same pattern as `sha256hex` in `auth.ts`).
**Warning signs:** "createHmac is not a function" in wrangler dev.

### Pitfall 4: Stripe Webhook Event — Which Event to Use for Tier
**What goes wrong:** Using `checkout.session.completed` alone misses subscription renewals and cancellations.
**Why it happens:** `checkout.session.completed` fires once on initial purchase; renewals fire `invoice.paid`.
**How to avoid:** Handle `checkout.session.completed` (initial), `customer.subscription.updated` (plan change), `customer.subscription.deleted` (cancellation → downgrade to free), `invoice.paid` (renewal).
**Warning signs:** Users who cancel stay on paid tier; users who upgrade mid-cycle don't see immediate tier change.

### Pitfall 5: MoMo IPN Response Code
**What goes wrong:** Responding HTTP 200 to MoMo IPN — MoMo marks it as failed and retries.
**Why it happens:** MoMo IPN spec requires exactly HTTP 204 No Content.
**How to avoid:** `return c.body(null, 204)` after successful processing. On signature failure: HTTP 400.
**Warning signs:** MoMo dashboard shows IPN as "failed" despite handler running successfully.

### Pitfall 6: Stripe customer_id Storage
**What goes wrong:** Not storing `stripe_customer_id` means you cannot create Customer Portal sessions or correlate subscription events to users when `client_reference_id` is not on the event.
**Why it happens:** Stripe events for `customer.subscription.*` contain `customer` field but not your `client_reference_id`.
**How to avoid:** On `checkout.session.completed`, extract `session.customer` (Stripe customer ID) and `session.client_reference_id` (your userId). Store in a `stripe_customers` table or as a column on `api_keys`.
**Recommendation:** Add `stripe_customer_id TEXT` column to `api_keys` (or a separate `users_billing` table). On webhook, look up user by `stripe_customer_id`.

### Pitfall 7: KV Key Invalidation — Must Fetch Hashes Before Update
**What goes wrong:** Updating `api_keys.tier` first, then trying to select `key_hash` — the SELECT may return stale data or miss keys if update changes visibility.
**Why it happens:** Race condition between UPDATE and SELECT.
**How to avoid:** SELECT `key_hash` WHERE `revoked_at IS NULL` first, THEN UPDATE tier, THEN delete KV entries using the pre-fetched hashes (established pattern from `handleTierUpgrade`).

---

## Code Examples

### Stripe Checkout Session (Subscription)
```typescript
// Source: docs.stripe.com/api/checkout/sessions/create
const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
});

const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  customer_email: userEmail,
  client_reference_id: userId,      // CRITICAL: correlates session to user in webhook
  success_url: `${dashboardUrl}?upgraded=1`,
  cancel_url: dashboardUrl,
  metadata: { tier },
});
// session.url is the Stripe-hosted checkout page
```

### Stripe Webhook Handler (CF Workers)
```typescript
// Source: blog.cloudflare.com/announcing-stripe-support-in-workers
import Stripe from 'stripe/lib/stripe.js';

billingRouter.post('/stripe-webhook', async (c) => {
  const body = await c.req.text();   // raw text — do NOT use .json()
  const sig = c.req.header('stripe-signature') ?? '';

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const webCrypto = Stripe.createSubtleCryptoProvider();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body, sig, c.env.STRIPE_WEBHOOK_SECRET, undefined, webCrypto
    );
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  // Idempotency check FIRST
  const supabase = getServiceRoleClient(c.env);
  const { error: dupError } = await supabase
    .from('webhook_events')
    .insert({ event_id: event.id, provider: 'stripe' });
  if (dupError?.code === '23505') return c.json({ received: true });

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id!;
      const tier = session.metadata?.tier ?? 'starter';
      // Also store stripe_customer_id for future events
      await handleTierUpgrade(userId, tier, c.env);
      break;
    }
    case 'customer.subscription.deleted': {
      // Downgrade to free when subscription cancelled
      const sub = event.data.object as Stripe.Subscription;
      const userId = await getUserIdByStripeCustomer(sub.customer as string, supabase);
      if (userId) await handleTierUpgrade(userId, 'free', c.env);
      break;
    }
  }

  return c.json({ received: true });
});
```

### MoMo IPN Handler
```typescript
// Source: developers.momo.vn/v3/docs/payment/api/result-handling/notification/
billingRouter.post('/momo-ipn', async (c) => {
  const body = await c.req.json<MomoIpnPayload>();

  // 1. Verify HMAC signature (crypto.subtle — CF Workers compatible)
  const valid = await verifyMomoIpn(body, c.env.MOMO_SECRET_KEY);
  if (!valid) return c.json({ error: 'Invalid signature' }, 400);

  // 2. Only process success (resultCode === 0)
  if (body.resultCode !== 0) return c.body(null, 204);

  // 3. Idempotency check
  const supabase = getServiceRoleClient(c.env);
  const { error: dupError } = await supabase
    .from('webhook_events')
    .insert({ event_id: body.orderId, provider: 'momo' });
  if (dupError?.code === '23505') return c.body(null, 204);

  // 4. extraData contains userId and tier (set when creating payment)
  const { userId, tier } = JSON.parse(atob(body.extraData));
  await handleTierUpgrade(userId, tier, c.env);

  // MoMo REQUIRES 204 No Content (not 200)
  return c.body(null, 204);
});
```

### Supabase Migration — webhook_events
```sql
-- Source: CONTEXT.md decision
-- Migration: 002_webhook_events
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id     TEXT PRIMARY KEY,                     -- Stripe event.id or MoMo orderId
  provider     TEXT NOT NULL CHECK (provider IN ('stripe', 'momo')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- UNIQUE is enforced by PRIMARY KEY; no additional index needed
```

### GatewayEnv Bindings — additions
```typescript
// Add to apps/gateway/src/types.ts GatewayEnv.Bindings:
STRIPE_SECRET_KEY: string;
STRIPE_WEBHOOK_SECRET: string;
STRIPE_PRICE_STARTER: string;
STRIPE_PRICE_PRO: string;
STRIPE_PRICE_BUSINESS: string;
MOMO_PARTNER_CODE: string;
MOMO_ACCESS_KEY: string;
MOMO_SECRET_KEY: string;
```

### wrangler.toml — new secrets (do not add to toml, only document)
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PRICE_STARTER
wrangler secret put STRIPE_PRICE_PRO
wrangler secret put STRIPE_PRICE_BUSINESS
wrangler secret put MOMO_PARTNER_CODE
wrangler secret put MOMO_ACCESS_KEY
wrangler secret put MOMO_SECRET_KEY
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `stripe.webhooks.constructEvent` | `constructEventAsync` + `createSubtleCryptoProvider` | ~2022 (CF Workers native crypto) | Required for CF Workers — sync version does not work |
| `stripe/lib/stripe.js` import | `import Stripe from 'stripe'` | Stripe v12+ | CF Workers now uses standard import; `stripe/lib/stripe.js` path still works as fallback |
| Stripe `httpAgent` for Node | `Stripe.createFetchHttpClient()` | v10+ | CF Workers has no Node http module |

**Deprecated/outdated:**
- `express.raw()` middleware for Stripe webhook raw body: This is Express-specific. Hono uses `c.req.text()` — no middleware needed.
- `Idempotency-Key` header on Stripe POST requests: Distinct from webhook idempotency (our table). The header is for Stripe API calls, not webhook processing.

---

## Open Questions

1. **Where to store `stripe_customer_id`**
   - What we know: `customer.subscription.*` events contain `customer` (Stripe customer ID) but not `client_reference_id`. Need a reverse lookup.
   - What's unclear: Add column to `api_keys` (coupling billing to keys) or create separate `users_billing` table?
   - Recommendation: Add `stripe_customer_id TEXT` to `api_keys` — simpler, consistent with existing schema. Set it when processing `checkout.session.completed` using `session.customer`. All active keys for a user will have the same value.

2. **MoMo extraData encoding for userId/tier correlation**
   - What we know: MoMo IPN sends back `extraData` verbatim from the create-payment request. MoMo's API expects `extraData` to be base64-encoded.
   - What's unclear: Exact max length limit on extraData.
   - Recommendation: `extraData = btoa(JSON.stringify({ userId, tier }))` — userId is a UUID (36 chars) + tier (up to 8 chars); base64 of ~50 chars is ~70 chars, well within limits.

3. **MoMo payment expiry cron / scheduled check**
   - What we know: MoMo tier expires 30 days after payment. No recurring MoMo webhook for expiry.
   - What's unclear: Whether to use Cloudflare Cron Triggers or a periodic check in the dashboard.
   - Recommendation: Add a `momo_expires_at TIMESTAMPTZ` column to `api_keys`. On MoMo IPN success, set this 30 days out. Use Cloudflare Cron Trigger (1/day) to SELECT expired rows and downgrade to free. Alternatively, check at auth time (gateway auth middleware — if `momo_expires_at < NOW()`, downgrade inline). Auth-time check is simpler and requires no cron setup for phase 8.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 |
| Config file | `apps/gateway/vitest.config.ts` (inferred — `"test": "vitest run"` in package.json) |
| Quick run command | `npm test --workspace=apps/gateway` |
| Full suite command | `npm test --workspace=apps/gateway` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-01 | Stripe checkout session created with correct tier and client_reference_id | unit | `npm test --workspace=apps/gateway -- --reporter verbose billing` | ❌ Wave 0 |
| BILL-02 | Valid Stripe webhook updates tier; replayed event does NOT double-upgrade (idempotency) | unit | `npm test --workspace=apps/gateway -- billing` | ❌ Wave 0 |
| BILL-03 | MoMo create payment returns redirect URL (mock mode) | unit | `npm test --workspace=apps/gateway -- billing` | ❌ Wave 0 |
| BILL-04 | MoMo IPN with valid HMAC + resultCode=0 upgrades tier; tampered HMAC returns 400 | unit | `npm test --workspace=apps/gateway -- billing` | ❌ Wave 0 |
| BILL-05 | PaymentProvider interface enforced — StripeProvider + MoMoProvider both implement it | unit | `npm test --workspace=apps/gateway -- billing` | ❌ Wave 0 |
| BILL-06 | Free tier user can fetch /mcp/* without any billing prompt | integration | `npm test --workspace=apps/gateway -- integration` | ✅ (existing auth tests) |

### Sampling Rate
- **Per task commit:** `npm test --workspace=apps/gateway`
- **Per wave merge:** `npm test --workspace=apps/gateway`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/gateway/src/__tests__/billing.test.ts` — covers BILL-01 through BILL-05 (mock Stripe + MoMo)
- [ ] Stripe mock: use `jest.mock` / `vi.mock` on `stripe` module — no real API calls in tests
- [ ] MoMo mock: use MOMO_SANDBOX=true environment variable (same as other MCP server tests)
- [ ] Supabase mock: same `vi.mock('../lib/supabase.js')` pattern as existing `auth-middleware.test.ts`

---

## Sources

### Primary (HIGH confidence)
- `servers/mcp-momo-vn/src/signatures.ts` — MoMo IPN HMAC field order (13 fields, verified in this codebase)
- `developers.momo.vn/v3/docs/payment/api/result-handling/notification/` — IPN field list, HTTP 204 response requirement
- `docs.stripe.com/api/checkout/sessions/create` — Checkout Session parameters
- `docs.stripe.com/billing/subscriptions/webhooks` — Critical subscription lifecycle events
- `blog.cloudflare.com/announcing-stripe-support-in-workers/` — CF Workers Stripe initialization pattern with `createFetchHttpClient` and `createSubtleCryptoProvider`
- `apps/gateway/src/middleware/auth.ts` — sha256hex pattern (crypto.subtle in CF Workers)

### Secondary (MEDIUM confidence)
- `hono.dev/examples/stripe-webhook` — `c.req.text()` pattern for raw body in Hono
- `docs.stripe.com/api/customer_portal/sessions/create` — `stripe.billingPortal.sessions.create()` API
- `gebna.gg/blog/stripe-webhook-cloudflare-workers` — `constructEventAsync` verification in CF Workers
- WebSearch: stripe npm latest version ~20.x (2025), `stripe.webhooks.constructEventAsync` confirmed

### Tertiary (LOW confidence — validate during implementation)
- Stripe `customer.subscription.deleted` event fires when subscription cancelled — verify event name against actual Stripe test events
- MoMo `extraData` max length limit — not explicitly documented; base64(JSON) approach should be safe

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Stripe CF Workers support is GA (official Cloudflare blog post); existing codebase already uses `@supabase/supabase-js`
- Architecture: HIGH — PaymentProvider pattern is a standard interface pattern; tier upgrade logic mirrors existing KV invalidation in keys.ts
- MoMo IPN field order: HIGH — verified in `servers/mcp-momo-vn/src/signatures.ts` which already implements it correctly
- CF Workers Stripe async verification: HIGH — official Cloudflare announcement + multiple community sources agree
- Pitfalls: HIGH — `constructEventAsync`, raw body, and `crypto.subtle` are all verified from official sources

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (Stripe API stable; MoMo API stable)
