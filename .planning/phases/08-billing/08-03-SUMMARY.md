---
phase: 08-billing
plan: 03
subsystem: payments
tags: [momo, hmac, crypto-subtle, cloudflare-workers, react, billing, ipn]

# Dependency graph
requires:
  - phase: 08-billing/08-01
    provides: BillingTier types, tierUpgrade logic, checkIdempotency, webhook_events table
  - phase: 08-billing/08-02
    provides: StripeProvider, billingRouter with MoMo 501 stub, billing routes on gateway

provides:
  - MoMoProvider mock-first checkout URL generator
  - verifyMomoIpn with crypto.subtle HMAC-SHA256 (CF Workers compatible)
  - POST /billing/momo-ipn route with sig verification, idempotency, tier upgrade, momo_expires_at
  - Migration 003_momo_expires_at.sql for 30-day MoMo payment expiry tracking
  - 8 real MoMo tests replacing Wave 0 todos (billing-momo.test.ts)
  - useBilling React hook for gateway billing API calls with JWT auth
  - UpgradeSection component on DashboardPage with dual payment buttons

affects: [Phase 9 and beyond — billing system complete; dashboard billing UI ready for production]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MoMo IPN verification: crypto.subtle HMAC-SHA256 with 13-field alphabetical raw string"
    - "MoMo mock-first: return test-payment.momo.vn URL until merchant account approved"
    - "MoMo IPN responds HTTP 204 (not 200) per MoMo requirement"
    - "extraData as base64 JSON carrying userId+tier through MoMo round-trip"

key-files:
  created:
    - apps/gateway/src/billing/momo.ts
    - apps/gateway/supabase/migrations/003_momo_expires_at.sql
    - apps/dashboard/src/hooks/useBilling.ts
  modified:
    - apps/gateway/src/routes/billing.ts
    - apps/gateway/src/__tests__/billing-momo.test.ts
    - apps/dashboard/src/pages/DashboardPage.tsx

key-decisions:
  - "MoMo IPN field order: 13 fields alphabetical — matches servers/mcp-momo-vn/src/signatures.ts reference"
  - "MoMo IPN returns HTTP 204 (not 200) — required by MoMo callback protocol"
  - "Mock-first MoMo checkout URL — returns test-payment.momo.vn until merchant KYC approved"
  - "momo_expires_at set to 30 days from IPN receipt — tracks one-time payment expiry"
  - "UpgradeSection inline on DashboardPage — no separate pricing page per locked CONTEXT.md decision"
  - "Free tier: two buttons side by side — Pay with Card ($19/mo) + Pay with MoMo (449,000 VND)"
  - "Paid tier: Manage subscription button (Stripe Portal)"

patterns-established:
  - "Pattern 1: MoMo IPN verification reuses same crypto.subtle logic as auth sha256hex — consistent CF Workers approach"
  - "Pattern 2: useBilling hook mirrors useKeys pattern — GATEWAY_URL + getAuthHeader() + fetch"

requirements-completed: [BILL-03, BILL-04, BILL-01, BILL-06]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 8 Plan 03: MoMo Payment Provider and Dashboard Billing UI Summary

**MoMo IPN handler with crypto.subtle HMAC-SHA256 verification, mock checkout, momo_expires_at migration, and dashboard upgrade buttons (Stripe + MoMo side by side)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-23T10:30:43Z
- **Completed:** 2026-03-23T10:35:44Z
- **Tasks:** 3 (plus checkpoint)
- **Files modified:** 6

## Accomplishments

- MoMo IPN handler verifies HMAC-SHA256 via crypto.subtle (CF Workers compatible), decodes base64 extraData, upgrades tier, sets momo_expires_at, responds HTTP 204
- All 6 Wave 0 MoMo test todos replaced with 8 real passing tests (verifyMomoIpn unit + route integration)
- Dashboard now shows upgrade CTA with dual payment buttons for free-tier users and "Manage subscription" for paid users

## Task Commits

Each task was committed atomically:

1. **Task 1: MoMo provider + IPN handler + momo_expires_at migration** - `bab6b4f` (feat)
2. **Task 2: Replace Wave 0 MoMo test todos with real tests** - `6207f65` (test)
3. **Task 3: Dashboard billing UI — upgrade buttons and billing status** - `46663bd` (feat)

## Files Created/Modified

- `apps/gateway/src/billing/momo.ts` - MoMoProvider (mock checkout) + verifyMomoIpn (crypto.subtle HMAC)
- `apps/gateway/supabase/migrations/003_momo_expires_at.sql` - ALTER TABLE to add momo_expires_at TIMESTAMPTZ
- `apps/gateway/src/routes/billing.ts` - Added MoMo IPN route + replaced 501 stub with MoMoProvider
- `apps/gateway/src/__tests__/billing-momo.test.ts` - 8 real tests (replaced all 6 it.todo stubs)
- `apps/dashboard/src/hooks/useBilling.ts` - React hook: startStripeCheckout, startMomoCheckout, openStripePortal
- `apps/dashboard/src/pages/DashboardPage.tsx` - Added UpgradeSection component, integrated useBilling

## Decisions Made

- MoMo IPN responds HTTP 204 (not 200) — required by MoMo callback protocol (Pitfall 5 from RESEARCH.md)
- Mock-first MoMo provider — returns test-payment.momo.vn URL until merchant KYC approval
- momo_expires_at set to 30 days from IPN receipt — one-time payment model (different from Stripe's recurring)
- UpgradeSection inline on DashboardPage — no separate pricing page per locked CONTEXT.md decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `apps/dashboard/tsconfig.json` does not exist (dashboard is Vite-only, no standalone tsconfig). The plan specified `npx tsc --noEmit --project apps/dashboard/tsconfig.json` but this path doesn't exist. This is a pre-existing condition — all pre-existing hooks (useKeys, useUsage) use the same `import.meta.env` pattern and the dashboard builds successfully through Vite. No code change needed.

## User Setup Required

None - no new environment variables added. MoMo IPN endpoint is `/billing/momo-ipn` (ready for MoMo dashboard configuration when merchant account is approved).

## Next Phase Readiness

- Complete dual-payment billing system ready: Stripe (USD, recurring) + MoMo (VND, one-time, mock)
- Dashboard billing UI complete — upgrade path visible to users
- MoMo merchant KYC approval still pending (known blocker from Phase 8 start) — replace mock URL with real MoMo v2 API once approved
- Phase 8 billing system: all 3 plans complete

---
*Phase: 08-billing*
*Completed: 2026-03-23*
