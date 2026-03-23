---
phase: 07-metering
plan: 01
subsystem: api
tags: [tinybird, kv, metering, usage-counter, cloudflare-workers]

# Dependency graph
requires:
  - phase: 06-auth-api-keys
    provides: GatewayEnv type, KVNamespace usage patterns, AuthContext with tier
provides:
  - metering/tinybird.ts with fire-and-forget sendTinybirdEvent (NDJSON POST to Tinybird Events API)
  - metering/usageCounter.ts with TIER_LIMITS, getUsageCount, incrementUsageCounter, checkUsageLimit, usageLimitResponse
  - Extended GatewayEnv.Bindings with TINYBIRD_TOKEN and TINYBIRD_HOST
affects: [07-02, gateway-integration, billing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fire-and-forget async pattern for external analytics (tinybird.ts swallows errors silently)
    - KV monthly bucketing: usage:{keyId}:YYYY-MM for per-month rate limiting
    - JSON-RPC error response pattern reused from tierAccess.ts (-32002 for usage limit)
    - TDD red-green cycle: failing tests committed first, then implementation

key-files:
  created:
    - apps/gateway/src/metering/tinybird.ts
    - apps/gateway/src/metering/usageCounter.ts
    - apps/gateway/src/__tests__/metering.test.ts
    - apps/gateway/src/__tests__/usageCounter.test.ts
  modified:
    - apps/gateway/src/types.ts

key-decisions:
  - "TIER_LIMITS business: Infinity — avoids special-casing in all callers; checkUsageLimit short-circuits for business tier anyway"
  - "usageKey uses UTC date — consistent key format across timezones, no daylight-saving boundary issues"
  - "sendTinybirdEvent: console.error on both network failure and non-ok response — never throws, fire-and-forget semantics preserved"
  - "usageLimitResponse mirrors tierAccess.ts pattern (status 200, JSON-RPC error) — consistent error contract for MCP clients"

patterns-established:
  - "Fire-and-forget: async functions that must not block or throw should catch all errors and log via console.error"
  - "KV monthly buckets: usage:{keyId}:YYYY-MM — incrementUsageCounter reads then writes; no atomic ops needed at this scale"

requirements-completed: [METR-01, METR-03, METR-04]

# Metrics
duration: 2min
completed: 2026-03-23
---

# Phase 7 Plan 01: Metering Core Modules Summary

**Tinybird fire-and-forget event sender and KV monthly usage counter with tier limit enforcement, fully unit tested (17 new tests)**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-23T08:26:57Z
- **Completed:** 2026-03-23T08:28:56Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extended GatewayEnv.Bindings with TINYBIRD_TOKEN (required) and TINYBIRD_HOST (optional) for Plan 02 integration
- Created metering/tinybird.ts: sendTinybirdEvent posts NDJSON to Tinybird Events API with Bearer auth, silently swallows all errors
- Created metering/usageCounter.ts: monthly KV buckets (usage:{keyId}:YYYY-MM), per-tier limits, usageLimitResponse returning -32002 JSON-RPC error
- 17 new tests (4 metering + 13 usageCounter) — all 51 gateway tests pass, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1+2: Extend GatewayEnv types and create metering modules + unit tests** - `3e22df8` (feat)

_Note: TDD tasks combined into single commit — tests written first (RED), then implementation (GREEN), all passing in one commit cycle._

## Files Created/Modified
- `apps/gateway/src/types.ts` - Added TINYBIRD_TOKEN and TINYBIRD_HOST to GatewayEnv.Bindings
- `apps/gateway/src/metering/tinybird.ts` - Fire-and-forget sendTinybirdEvent; exports ToolCallEvent type
- `apps/gateway/src/metering/usageCounter.ts` - TIER_LIMITS, getUsageCount, incrementUsageCounter, checkUsageLimit, usageLimitResponse
- `apps/gateway/src/__tests__/metering.test.ts` - 4 unit tests for sendTinybirdEvent
- `apps/gateway/src/__tests__/usageCounter.test.ts` - 13 unit tests for all usageCounter exports

## Decisions Made
- TIER_LIMITS business: Infinity — avoids special-casing in callers; checkUsageLimit explicitly short-circuits for business tier
- usageKey uses UTC date format — consistent across timezones
- sendTinybirdEvent catches both network errors and non-ok responses, logs via console.error, never rethrows
- usageLimitResponse mirrors tierAccess.ts -32001 pattern with -32002 — consistent JSON-RPC error contract

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan. TINYBIRD_TOKEN will need to be added to wrangler.toml secrets before Plan 02 integration is deployed.

## Next Phase Readiness
- Plan 02 can now import sendTinybirdEvent and usageCounter functions directly from metering/ modules
- TINYBIRD_TOKEN env var needed in wrangler.toml secrets for production deployment
- All building blocks ready: fire-and-forget analytics + tier-aware monthly rate limiting

---
*Phase: 07-metering*
*Completed: 2026-03-23*
