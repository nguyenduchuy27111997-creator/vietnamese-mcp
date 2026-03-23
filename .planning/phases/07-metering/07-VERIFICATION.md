---
phase: 07-metering
verified: 2026-03-23T08:45:00Z
status: gaps_found
score: 6/8 must-haves verified
re_verification: false
gaps:
  - truth: "sendTinybirdEvent uses default host https://api.tinybird.co when not provided"
    status: failed
    reason: "Implementation default was updated to https://api.europe-west2.gcp.tinybird.co (EU/GCP Tinybird region) after account setup, but metering.test.ts still asserts the URL matches /^https:\\/\\/api\\.tinybird\\.co/. The test fails because the actual default host no longer matches the regex."
    artifacts:
      - path: "apps/gateway/src/metering/tinybird.ts"
        issue: "Default host is 'https://api.europe-west2.gcp.tinybird.co', not 'https://api.tinybird.co'"
      - path: "apps/gateway/src/__tests__/metering.test.ts"
        issue: "Line 50 asserts url matches /^https:\\/\\/api\\.tinybird\\.co/ — fails against the actual regional default"
    missing:
      - "Either update the test regex to /^https:\\/\\/api\\..*\\.tinybird\\.co/ (accepting any regional subdomain) OR update the test to match the concrete EU host, OR keep 'https://api.tinybird.co' as the code default and rely on wrangler.toml TINYBIRD_HOST env var for the regional override"

  - truth: "GET /usage returns {used, limit, period, tier, resetsAt} for JWT-authenticated user with correct used count from KV"
    status: failed
    reason: "usage.ts queries Supabase for all active keys belonging to the JWT user, then sums KV counts across those keys. The test makeApp() does not mock getServiceRoleClient/Supabase, so the Supabase call returns no rows and used is always 0 regardless of the KV mock value. The test 'returns used: 847 when KV holds \"847\"' fails because the route never reaches the KV lookup for keyId."
    artifacts:
      - path: "apps/gateway/src/routes/usage.ts"
        issue: "Route calls getServiceRoleClient(c.env) and queries api_keys table — the test does not mock this dependency, causing used to always be 0"
      - path: "apps/gateway/src/__tests__/usage-route.test.ts"
        issue: "makeApp() injects KV mock but does not mock the Supabase client; getServiceRoleClient is never mocked so returns empty keys array"
    missing:
      - "Add vi.mock('../lib/supabase.js', ...) in usage-route.test.ts to mock getServiceRoleClient returning a fake supabase client whose .from().select().eq().is() chain resolves to {data: [{id: 'key-abc'}]}"
      - "Alternatively, the simpler fix: add a direct mock so the test can control which key IDs are returned before the KV lookup"
human_verification:
  - test: "Tinybird event appears in dashboard within 5 seconds"
    expected: "After a tool call via gateway, a row appears in the tool_calls data source in Tinybird UI within 5 seconds"
    why_human: "Requires live Tinybird workspace and deployed gateway; cannot verify network I/O or external service receipt programmatically"
  - test: "Dashboard UsageBar renders correctly with real usage data"
    expected: "After login, the dashboard shows 'X / 1,000 calls this month' with a blue progress bar; bar turns red when >= 90%"
    why_human: "Visual rendering and real /usage API call require browser environment"
---

# Phase 7: Metering Verification Report

**Phase Goal:** Every tool call emitted through the gateway is logged to Tinybird non-blocking, monthly call counts are queryable per key, and the gateway hard-stops requests when a tier limit is reached.

**Verified:** 2026-03-23T08:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | sendTinybirdEvent POSTs correct NDJSON payload with Bearer token auth | VERIFIED | tinybird.ts L14-19: `fetch(host/v0/events?name=tool_calls, {method:POST, headers:{Authorization:Bearer ${token}}, body:JSON.stringify(event)+'\n'})`. metering.test.ts POSTs-NDJSON test passes. |
| 2 | sendTinybirdEvent silently catches fetch errors without throwing | VERIFIED | tinybird.ts L23-25: catch block calls `console.error('Tinybird unreachable:', err)` and does not rethrow. Test verifies resolves to undefined. |
| 3 | sendTinybirdEvent uses default host `https://api.tinybird.co` when not provided | FAILED | tinybird.ts L12 default is `'https://api.europe-west2.gcp.tinybird.co'`. metering.test.ts L50 asserts URL matches `/^https:\/\/api\.tinybird\.co/` — test FAILS. |
| 4 | checkUsageLimit returns true when count >= tier limit | VERIFIED | usageCounter.ts L32-33; usageCounter.test.ts all checkUsageLimit cases pass. |
| 5 | checkUsageLimit returns false for business tier regardless of count | VERIFIED | usageCounter.ts L31: `if (tier === 'business') return false`. Test at 999999 passes. |
| 6 | incrementUsageCounter reads current value and writes incremented value to KV | VERIFIED | usageCounter.ts L23-28: reads then writes `String(current + 1)`. Tests pass for null→"1" and "5"→"6". |
| 7 | Tool call through gateway fires Tinybird event via ctx.waitUntil (non-blocking) | VERIFIED | index.ts L52-67: `c.executionCtx.waitUntil(Promise.all([sendTinybirdEvent(...), incrementUsageCounter(...)]))`. metering-integration.test.ts waitUntil test passes. |
| 8 | GET /usage returns correct used count for JWT-authenticated user | FAILED | usage.ts queries Supabase for all user keys then sums KV. usage-route.test.ts does not mock getServiceRoleClient — used is always 0. Test `returns used: 847 when KV holds "847"` FAILS. |

**Score:** 6/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/gateway/src/types.ts` | GatewayEnv with TINYBIRD_TOKEN and TINYBIRD_HOST | VERIFIED | L14: `TINYBIRD_TOKEN: string`, L15: `TINYBIRD_HOST?: string` |
| `apps/gateway/src/metering/tinybird.ts` | Fire-and-forget Tinybird event sender, exports sendTinybirdEvent and ToolCallEvent | VERIFIED | Exports both; 27 lines of substantive implementation |
| `apps/gateway/src/metering/usageCounter.ts` | KV usage counter with tier limit checking, exports TIER_LIMITS, getUsageCount, incrementUsageCounter, checkUsageLimit, usageLimitResponse | VERIFIED | All 5 exports present; 64 lines of substantive implementation |
| `apps/gateway/src/__tests__/metering.test.ts` | Unit tests for tinybird.ts, min 40 lines | VERIFIED (with gap) | 75 lines, 4 tests — 3 pass, 1 fails (default host mismatch) |
| `apps/gateway/src/__tests__/usageCounter.test.ts` | Unit tests for usageCounter.ts, min 60 lines | VERIFIED | 137 lines, 13 tests — all pass |
| `apps/gateway/src/index.ts` | Metering wired into MCP route with waitUntil | VERIFIED | L9-10 imports, L41-67 metering-aware handler with waitUntil |
| `apps/gateway/src/routes/usage.ts` | GET /usage endpoint | VERIFIED (with gap) | File exists, substantive, wired — but Supabase dependency not mocked in tests |
| `apps/gateway/wrangler.toml` | TINYBIRD_HOST var and setup comments | VERIFIED | L8: `TINYBIRD_HOST = "https://api.europe-west2.gcp.tinybird.co"`, L24-28: wrangler secret comments |
| `apps/gateway/src/__tests__/usage-route.test.ts` | Tests for GET /usage, min 40 lines | STUB/FAILING | 111 lines, 6 tests — 1 fails (`used: 847` expected but got 0) due to missing Supabase mock |
| `apps/gateway/src/__tests__/metering-integration.test.ts` | Integration tests for metering flow, min 50 lines | VERIFIED | 225 lines, 4 describe blocks — all 4 tests pass |
| `apps/dashboard/src/hooks/useUsage.ts` | React hook fetching /usage, exports useUsage | VERIFIED | Exports `useUsage` and `UsageData`; fetches `${GATEWAY_URL}/usage` with JWT auth |
| `apps/dashboard/src/pages/DashboardPage.tsx` | UsageBar component rendered in dashboard | VERIFIED | L7-29: `UsageBar` component, L79: `{usage && <UsageBar used={usage.used} limit={usage.limit} period={usage.period} />}` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/gateway/src/index.ts` | `apps/gateway/src/metering/tinybird.ts` | sendTinybirdEvent called inside c.executionCtx.waitUntil | WIRED | L9: `import { sendTinybirdEvent }`, L54: called inside waitUntil Promise.all |
| `apps/gateway/src/index.ts` | `apps/gateway/src/metering/usageCounter.ts` | checkUsageLimit + incrementUsageCounter calls | WIRED | L10: import all 4 functions, L42-45: checkUsageLimit usage check, L65: incrementUsageCounter in waitUntil |
| `apps/gateway/src/routes/usage.ts` | `apps/gateway/src/metering/usageCounter.ts` | getUsageCount + TIER_LIMITS imports | WIRED | L3: `import { getUsageCount, TIER_LIMITS }`, L22-24: getUsageCount called in Promise.all, L27: TIER_LIMITS used |
| `apps/dashboard/src/pages/DashboardPage.tsx` | `apps/dashboard/src/hooks/useUsage.ts` | useUsage hook import | WIRED | L5: `import { useUsage }`, L33: `const { usage } = useUsage()`, L79: usage rendered |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| METR-01 | 07-01, 07-02 | Every tool call is logged to Tinybird with API key, server, tool, timestamp | SATISFIED | tinybird.ts sends ToolCallEvent with api_key_id, server, tool, timestamp, response_status. Fired from index.ts waitUntil. |
| METR-02 | 07-02 | Usage counts are queryable per API key per billing period | PARTIAL | GET /usage endpoint exists and returns {used, limit, period, tier, resetsAt}. However, the route aggregates across all user keys (not per-key) and the test suite has a failing test for this endpoint due to missing Supabase mock. |
| METR-03 | 07-01, 07-02 | Gateway enforces tier call limits (free: 1k/mo, starter: 10k, pro: 100k, business: unlimited) | SATISFIED | checkUsageLimit enforces TIER_LIMITS. index.ts calls it before handleMcpRequest. business tier skipped entirely. usageLimitResponse returns -32002. All enforcement tests pass. |
| METR-04 | 07-01, 07-02 | Metering is non-blocking (ctx.waitUntil) | SATISFIED | index.ts L52: `c.executionCtx.waitUntil(Promise.all([sendTinybirdEvent(...), incrementUsageCounter(...)]))`. Tool response returned before waitUntil resolves. |

**Orphaned requirements:** None. All METR-01 through METR-04 are claimed in plan frontmatter and verified above.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/gateway/src/metering/tinybird.ts` | 12 | Default host changed to `https://api.europe-west2.gcp.tinybird.co` — deviates from plan spec `https://api.tinybird.co` and breaks metering.test.ts | Warning | 1 test failure; functional in production (host is correct for EU GCP), but test suite is red |
| `apps/gateway/src/routes/usage.ts` | 12-17 | Route calls Supabase to resolve keyIds before KV lookup — test does not mock this dependency | Blocker | 1 test failure; route behavior is more correct than plan (aggregates all user keys) but the test is broken |

---

### Human Verification Required

#### 1. Tinybird Event Ingestion (Live)

**Test:** Deploy gateway with TINYBIRD_TOKEN secret set. Make a tool call: `curl -X POST https://gateway.example.com/mcp/momo -H "Authorization: Bearer <api-key>" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`

**Expected:** Within 5 seconds, a row appears in the `tool_calls` data source in the Tinybird dashboard with correct api_key_id, server, timestamp.

**Why human:** Requires live Tinybird account, deployed Worker, and network I/O verification.

#### 2. Dashboard UsageBar Visual

**Test:** Log into the dashboard app at localhost after the gateway is running.

**Expected:** Below the header, a progress bar appears showing "X / 1,000 calls this month" with current month period. At >= 90% usage the bar turns red.

**Why human:** Requires browser rendering and authenticated session against a live gateway.

---

### Gaps Summary

Two test failures prevent the suite from being green. Neither is a logic error in the core metering behavior — both arise from a mismatch between what was implemented and what the tests assert:

**Gap 1 — Default Tinybird host mismatch.** The plan specified `https://api.tinybird.co` as the default host, but after the human-checkpoint Tinybird account setup (Task 3, Plan 02), the code was updated to `https://api.europe-west2.gcp.tinybird.co` to match the actual workspace region. The test was not updated to match. Fix options: (a) update the test assertion to accept any regional Tinybird host pattern, or (b) revert the default to `https://api.tinybird.co` and rely solely on the TINYBIRD_HOST env var (already in wrangler.toml) for the regional override — this is architecturally cleaner and matches the original design intent.

**Gap 2 — usage-route.test.ts missing Supabase mock.** The usage route implementation went beyond the plan spec — instead of reading KV by `keyId` from auth context, it queries Supabase for all active keys for the user and sums their KV counts. This is more correct behavior (user may have multiple keys) but the test was not updated to mock the Supabase dependency. The test injects a KV mock but the Supabase call returns `{data: null}` by default, leaving `used = 0` always. Fix: add `vi.mock('../lib/supabase.js', ...)` returning a fake supabase client whose chain resolves to `{data: [{id: 'key-abc'}]}` for the test key.

Both gaps are test-level fixes only — the production behavior is correct. The core metering infrastructure (METR-01, METR-03, METR-04) is fully implemented and wired. METR-02 is functionally implemented but the test coverage for the /usage route has a gap.

---

_Verified: 2026-03-23T08:45:00Z_
_Verifier: Claude (gsd-verifier)_
