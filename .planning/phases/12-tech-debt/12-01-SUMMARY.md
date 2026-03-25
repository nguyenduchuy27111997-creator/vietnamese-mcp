---
phase: 12-tech-debt
plan: 01
subsystem: testing
tags: [vitest, supabase, mocking, wrangler, cloudflare-workers]

# Dependency graph
requires:
  - phase: 06-auth
    provides: auth-middleware and keys router implementations that tests exercise
provides:
  - Zero it.todo stubs in gateway test suite (6 real assertions replacing stubs)
  - MOMO_ACCESS_KEY binding present in wrangler.toml with placeholder value
  - MOMO_ACCESS_KEY non-optional in GatewayEnv type
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase auth method mocking via makeSupabaseClient helper with vi.mock('@supabase/supabase-js')"
    - "Application-layer isolation tests: inject auth context via middleware, assert Supabase insert/select call args contain correct userId"

key-files:
  created: []
  modified:
    - apps/gateway/src/__tests__/auth-supabase.test.ts
    - apps/gateway/src/__tests__/rls-isolation.test.ts
    - apps/gateway/wrangler.toml
    - apps/gateway/src/types.ts

key-decisions:
  - "auth-supabase tests directly mock Supabase JS client auth methods (signUp/signInWithPassword) since gateway has no /auth endpoints — auth is client-side in dashboard"
  - "rls-isolation tests verify application-layer isolation (keys router uses auth.userId from context, not request body) since RLS is disabled per prior decision"
  - "MOMO_ACCESS_KEY made non-optional in GatewayEnv to enforce config completeness and prevent future drift"

patterns-established:
  - "Pattern: application-layer isolation tests use vi.mock + auth context injection, assert .toHaveBeenCalledWith(expect.objectContaining({ user_id: authCtx.userId }))"

requirements-completed:
  - DEBT-01
  - DEBT-02

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 12 Plan 01: Tech Debt Summary

**Replaced 6 it.todo stubs with real Supabase mock assertions and added MOMO_ACCESS_KEY binding to wrangler.toml to eliminate deploy warning**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-25T13:45:08Z
- **Completed:** 2026-03-25T13:46:48Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced all 4 it.todo stubs in auth-supabase.test.ts with real signUp/signInWithPassword mock tests (success + error cases)
- Replaced all 2 it.todo stubs in rls-isolation.test.ts with application-layer isolation tests asserting keys route uses auth.userId from context
- Added MOMO_ACCESS_KEY = "placeholder_pending_kyc" to wrangler.toml; removed `?` from GatewayEnv type to enforce presence
- Full test suite: 95/95 tests pass, zero skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement auth-supabase.test.ts and rls-isolation.test.ts stubs** - `2533e03` (feat)
2. **Task 2: Add MOMO_ACCESS_KEY to wrangler.toml** - `bedef86` (feat)

**Plan metadata:** (committed with docs commit below)

## Files Created/Modified

- `apps/gateway/src/__tests__/auth-supabase.test.ts` - 4 real test assertions for Supabase signUp/signInWithPassword (success + error paths)
- `apps/gateway/src/__tests__/rls-isolation.test.ts` - 2 application-layer isolation tests (SELECT filtered by auth.userId, INSERT enforces auth.userId over request body)
- `apps/gateway/wrangler.toml` - Added MOMO_ACCESS_KEY = "placeholder_pending_kyc" after MOMO_PARTNER_CODE
- `apps/gateway/src/types.ts` - Made MOMO_ACCESS_KEY non-optional (removed `?`)

## Decisions Made

- auth-supabase tests mock the Supabase JS client directly rather than testing HTTP endpoints (gateway has no /auth routes — auth is entirely client-side in the dashboard app)
- rls-isolation tests exercise the application layer (keys router) rather than DB-layer RLS (which is disabled) — consistent with existing STATE.md decision
- MOMO_ACCESS_KEY moved from optional to required in GatewayEnv type so TypeScript enforces the binding is present

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Self-Check: PASSED

All files present. Both task commits verified (2533e03, bedef86).

## Next Phase Readiness

- Gateway test suite is clean: 95 tests, 0 skipped, 0 it.todo stubs
- wrangler.toml has no unknown binding warnings
- Ready for Phase 12 Plan 02 (if it exists) or phase completion

---
*Phase: 12-tech-debt*
*Completed: 2026-03-25*
