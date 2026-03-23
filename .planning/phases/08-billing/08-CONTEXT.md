# Phase 8: Billing - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Stripe (USD) and MoMo (VND) payments upgrade user tiers in Supabase. Webhooks update tiers atomically with idempotency. Free tier requires no credit card. Dashboard gets inline upgrade buttons and minimal billing status.

</domain>

<decisions>
## Implementation Decisions

### Stripe Integration
- Stripe Checkout (redirect to Stripe-hosted page) — no PCI scope, Stripe handles card UI
- Recurring monthly subscriptions — auto-renew, Stripe handles retries and dunning
- Stripe Customer Portal enabled — users can cancel, change plan, update payment from dashboard link
- No Stripe account yet — plan includes full setup: create account, products/prices for 3 tiers, webhook endpoint, store keys as secrets
- Pricing: Starter $19/mo, Pro $49/mo, Business $149/mo

### MoMo Integration
- Build mock-first, verify when merchant account approved — same pattern as MCP servers
- Submit MoMo merchant application at Phase 8 start (3-7 day KYC)
- Fixed VND pricing: Starter 449k VND, Pro 1.19M VND, Business 3.59M VND
- One-time payments + manual renewal — MoMo doesn't support recurring; user pays again each month
- Tier downgrades to free after MoMo payment expiry (30 days from payment)

### Webhook Handling
- Supabase idempotency table: `webhook_events (event_id UNIQUE, provider, processed_at)` — INSERT before processing, duplicate fails with conflict
- Tier update: UPDATE all active `api_keys` SET tier = new_tier WHERE user_id = X AND revoked_at IS NULL
- KV cache invalidation: delete all KV entries for user's key hashes immediately after tier update — new tier takes effect instantly, not after 60s TTL
- PaymentProvider abstraction decouples Stripe and MoMo (BILL-05)

### Dashboard Billing UI
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Gateway Integration
- `apps/gateway/src/index.ts` — Main Hono app; webhook routes mount here
- `apps/gateway/src/types.ts` — GatewayEnv bindings need STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- `apps/gateway/src/middleware/auth.ts` — API key auth; KV cache entries to invalidate on tier change
- `apps/gateway/src/routes/keys.ts` — Keys CRUD; tier stored on api_keys table
- `apps/gateway/supabase/migrations/001_api_keys.sql` — Current schema (api_keys table)

### Metering (Phase 7)
- `apps/gateway/src/metering/usageCounter.ts` — TIER_LIMITS map; tier limits change with upgrade
- `apps/gateway/src/routes/usage.ts` — Usage route; tier affects limit display

### Dashboard
- `apps/dashboard/src/pages/DashboardPage.tsx` — Upgrade CTA and billing status go here
- `apps/dashboard/src/hooks/useKeys.ts` — Pattern for gateway API calls with JWT auth

### Prior Phase Context
- `.planning/phases/06-auth-api-keys/06-CONTEXT.md` — Auth decisions, RLS disabled, KV cache pattern
- `.planning/phases/07-metering/07-CONTEXT.md` — Metering decisions, tier limits

### Blockers
- STATE.md notes: MoMo merchant account requires 3-7 day KYC — submit at Phase 8 start
- STATE.md notes: MoMo Business subscription IPN field ordering differs from payment gateway IPN

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getServiceRoleClient(c.env)` — Supabase service role client for tier updates
- `sha256hex()` from auth.ts — could be reused for webhook signature verification
- KV invalidation pattern from keys.ts DELETE handler — same approach for tier change cache bust
- `jwtAuthMiddleware` — for dashboard billing endpoints (create checkout session, manage subscription)

### Established Patterns
- Worker secrets via `wrangler secret put` — same for STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
- CORS config already handles `/keys`, `/usage` — extend to `/billing` routes
- MoMo HMAC verification exists in `mcp-momo-vn` server — can reference pattern

### Integration Points
- `api_keys.tier` column — UPDATE on webhook; current values: free/starter/pro/business
- KV auth cache (`API_KEYS` namespace) — delete entries for user's keys on tier change
- `wrangler.toml` — add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MOMO_PARTNER_CODE as secrets
- DashboardPage.tsx — add upgrade button and billing status section

</code_context>

<specifics>
## Specific Ideas

- Two-button payment picker: "Pay with Card ($19/mo)" | "Pay with MoMo (449,000₫)" side by side
- MoMo payments are one-time with 30-day validity — show expiry countdown in dashboard
- Stripe Customer Portal link for self-service management (cancel, change plan, update card)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-billing*
*Context gathered: 2026-03-23*
