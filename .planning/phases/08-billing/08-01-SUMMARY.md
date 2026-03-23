---
phase: 08-billing
plan: 01
subsystem: payments
tags: [stripe, momo, billing, typescript, cloudflare-workers, supabase, kv-cache]

# Dependency graph
requires:
  - phase: 06-auth-api-keys
    provides: GatewayEnv type, KV API_KEYS namespace, getServiceRoleClient pattern
  - phase: 07-metering
    provides: TINYBIRD_HOST binding pattern, wrangler.toml secrets structure
provides:
  - PaymentProvider interface with createCheckoutUrl contract
  - BillingTier type and CheckoutParams interface
  - STRIPE_TIERS (USD) and MOMO_TIERS (VND + amountVnd) pricing constants
  - handleTierUpgrade utility (fetch-before-update, KV invalidation)
  - checkIdempotency utility (PK conflict 23505 detection)
  - webhook_events idempotency table migration
  - stripe_customer_id column + index on api_keys migration
  - GatewayEnv.Bindings extended with 8 Stripe/MoMo secret fields
  - Wave 0 test stubs for BILL-01 through BILL-04
affects:
  - 08-billing/08-02 (Stripe provider uses PaymentProvider, handleTierUpgrade, checkIdempotency)
  - 08-billing/08-03 (MoMo provider uses PaymentProvider, handleTierUpgrade, checkIdempotency)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PaymentProvider interface decouples Stripe and MoMo provider implementations
    - handleTierUpgrade: fetch key hashes BEFORE update to avoid race condition (Pitfall 7)
    - checkIdempotency: INSERT + catch PK conflict code 23505 for webhook dedup
    - Test env casts use 'as unknown as GatewayEnv["Bindings"]' when partial env is passed

key-files:
  created:
    - apps/gateway/src/billing/provider.ts
    - apps/gateway/src/billing/tierUpgrade.ts
    - apps/gateway/supabase/migrations/002_webhook_events.sql
    - apps/gateway/src/__tests__/tier-upgrade.test.ts
    - apps/gateway/src/__tests__/billing-stripe.test.ts
    - apps/gateway/src/__tests__/billing-momo.test.ts
  modified:
    - apps/gateway/src/types.ts (8 new Bindings fields)
    - apps/gateway/src/__tests__/auth-middleware.test.ts (cast fix)
    - apps/gateway/src/__tests__/keys.test.ts (cast fix)
    - apps/gateway/src/__tests__/metering-integration.test.ts (cast fix)
    - apps/gateway/src/__tests__/usage-route.test.ts (cast fix)

key-decisions:
  - "Billing foundation split into Plan 01 (contracts/shared) before Plans 02/03 (Stripe/MoMo) to prevent duplication of tier-upgrade logic"
  - "stripe_customer_id added to api_keys in 002 migration (not a separate table) — consistent with existing schema; simpler lookup"
  - "Test env partial objects cast to 'as unknown as GatewayEnv[\"Bindings\"]' to satisfy TypeScript after new required fields added"

patterns-established:
  - "handleTierUpgrade pattern: SELECT key_hash first, then UPDATE tier, then delete KV entries"
  - "checkIdempotency pattern: INSERT to webhook_events, catch error.code === '23505'"
  - "Wave 0 stubs: it.todo() for all planned behaviors before provider implementations exist"

requirements-completed:
  - BILL-05
  - BILL-06

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 8 Plan 01: Billing Foundation Summary

**PaymentProvider interface, handleTierUpgrade with KV invalidation, webhook_events idempotency migration, stripe_customer_id column, and GatewayEnv Stripe/MoMo binding extensions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T10:16:33Z
- **Completed:** 2026-03-23T10:19:54Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Billing contract layer: PaymentProvider interface + BillingTier type + STRIPE_TIERS/MOMO_TIERS pricing constants
- Shared tier upgrade utility: handleTierUpgrade fetches hashes before update, deletes KV cache for instant tier effect
- Idempotency infrastructure: checkIdempotency + 002_webhook_events.sql migration (webhook_events table + stripe_customer_id column + index)
- Wave 0 test stubs: 16 it.todo stubs across billing-stripe.test.ts and billing-momo.test.ts covering BILL-01 through BILL-04

## Task Commits

Each task was committed atomically:

1. **Task 1: GatewayEnv bindings + PaymentProvider interface + tier constants** - `f8da5c1` (feat)
2. **Task 2: handleTierUpgrade utility + idempotency migration + stripe_customer_id + tests** - `c5f6e29` (feat)
3. **Task 3: Wave 0 test stubs for Stripe and MoMo billing** - `1029e63` (test)

**Plan metadata:** (docs commit — created after summary)

## Files Created/Modified
- `apps/gateway/src/billing/provider.ts` - PaymentProvider interface, BillingTier, CheckoutParams, STRIPE_TIERS, MOMO_TIERS
- `apps/gateway/src/billing/tierUpgrade.ts` - handleTierUpgrade + checkIdempotency with Supabase + KV
- `apps/gateway/supabase/migrations/002_webhook_events.sql` - webhook_events table (PK event_id), stripe_customer_id column + index on api_keys
- `apps/gateway/src/types.ts` - GatewayEnv.Bindings extended with 8 Stripe/MoMo secret fields
- `apps/gateway/src/__tests__/tier-upgrade.test.ts` - 4 tests: handleTierUpgrade (2) + checkIdempotency (2)
- `apps/gateway/src/__tests__/billing-stripe.test.ts` - 10 it.todo stubs for BILL-01, BILL-02, Stripe Portal
- `apps/gateway/src/__tests__/billing-momo.test.ts` - 6 it.todo stubs for BILL-03, BILL-04
- `apps/gateway/src/__tests__/auth-middleware.test.ts` - cast fix: `as unknown as GatewayEnv['Bindings']`
- `apps/gateway/src/__tests__/keys.test.ts` - cast fix: `as unknown as GatewayEnv['Bindings']`
- `apps/gateway/src/__tests__/metering-integration.test.ts` - cast fix: `as unknown as GatewayEnv['Bindings']`
- `apps/gateway/src/__tests__/usage-route.test.ts` - cast fix: `as unknown as GatewayEnv['Bindings']`

## Decisions Made
- Billing contracts built first in Plan 01 before Stripe (02) and MoMo (03) — prevents duplicate tier-upgrade logic across two providers
- stripe_customer_id placed on api_keys table (not separate users_billing table) — simpler, consistent with existing schema; all active keys for a user share the same value
- Test env partial objects updated to use `as unknown as GatewayEnv['Bindings']` — TypeScript now requires the 8 new required fields in the cast; double-cast fixes without changing behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed TypeScript cast errors in 4 existing test files**
- **Found during:** Task 1 (TypeScript check after extending GatewayEnv.Bindings)
- **Issue:** Adding 8 required fields to GatewayEnv.Bindings caused existing test env partial objects to fail the `as GatewayEnv['Bindings']` cast — TypeScript now requires double-cast
- **Fix:** Changed `as GatewayEnv['Bindings']` to `as unknown as GatewayEnv['Bindings']` in auth-middleware.test.ts, keys.test.ts, metering-integration.test.ts, usage-route.test.ts
- **Files modified:** 4 test files
- **Verification:** Full test suite passes (65 tests, 22 todos)
- **Committed in:** `f8da5c1` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing critical fix to prevent test type errors)
**Impact on plan:** Necessary correctness fix — new required fields on GatewayEnv require updating all partial test environments. No scope creep.

## Issues Encountered
None — plan executed as specified.

## Next Phase Readiness
- Plan 02 (Stripe): All contracts ready. PaymentProvider interface, handleTierUpgrade, checkIdempotency, GatewayEnv bindings, and stripe_customer_id column all available.
- Plan 03 (MoMo): Same contracts available. Wave 0 stubs in billing-momo.test.ts ready to be filled.
- All tier-upgrade tests pass; full test suite green.

---
*Phase: 08-billing*
*Completed: 2026-03-23*
