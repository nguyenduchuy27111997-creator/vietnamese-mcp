---
phase: 05-gateway
plan: "02"
subsystem: gateway
tags: [hono, cloudflare-workers, mcp-sdk, streamable-http, cors, vitest, tier-access]

dependency_graph:
  requires:
    - phase: 05-01
      provides: apps/gateway workspace scaffold, ./tools subpath exports on all 5 servers, test infrastructure
  provides:
    - serverRegistry.ts: module-scope McpServer registry for all 5 servers
    - tierAccess.ts: tier-based access returning MCP error -32001 for free tier on restricted servers
    - router.ts: stateless per-request WebStandardStreamableHTTPServerTransport handler
    - cors.ts: CORS config with localhost:* wildcard via function origin
    - index.ts: Hono app with /mcp/:server route and /health endpoint
    - All 5 GATE requirements covered by 15 passing integration tests
  affects:
    - 05-03 (deployment/wrangler dev smoke tests)
    - 06-auth (tierAccess.ts tier stub becomes real auth in Phase 6)

tech-stack:
  added: []
  patterns:
    - Module-scope McpServer registry — register tools once at module eval, never inside request handlers
    - Stateless transport per request — new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined }) per call
    - Tier access returns MCP JSON-RPC error -32001 (not HTTP 403) — protocol-level errors, not HTTP-level
    - CORS origin function form for localhost:* wildcard (Hono cors does exact string matching on arrays)
    - Fresh McpServer per test — avoid "already connected" error when testing multiple connections

key-files:
  created:
    - apps/gateway/src/serverRegistry.ts
    - apps/gateway/src/tierAccess.ts
    - apps/gateway/src/router.ts
    - apps/gateway/src/cors.ts
    - apps/gateway/src/index.ts
  modified:
    - apps/gateway/src/__tests__/integration.test.ts

key-decisions:
  - "Test design: create fresh McpServer instances per test rather than reusing module-scope servers — McpServer can only be connected to one transport at a time"
  - "CORS uses function origin form (not array) — Hono cors does exact string matching; function enables localhost:* wildcard"
  - "tierAccess returns HTTP 200 with JSON-RPC error body — not HTTP 403 — per MCP protocol contract"

patterns-established:
  - "Pattern: freshClient() helper in tests creates a new McpServer + registerAll + createTestClient per invocation"
  - "Pattern: module-scope servers object used only for registry structure tests (not tool-call tests)"

requirements-completed: [GATE-01, GATE-02, GATE-03, GATE-04, GATE-05]

duration: ~5min
completed: 2026-03-21
---

# Phase 5 Plan 02: Gateway Core Implementation Summary

**Hono gateway wiring all 5 MCP servers via stateless Streamable HTTP transport with CORS, tier access guard, and 15 GATE integration tests passing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-20T19:42:32Z
- **Completed:** 2026-03-20T19:47:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Implemented full gateway: serverRegistry, tierAccess, router, cors, and Hono index
- All 5 MCP servers reachable through module-scope registry (4+4+3+4+3 = 18 tools total)
- Tier access guard returns MCP JSON-RPC -32001 for free tier on restricted servers
- 15 integration tests covering GATE-01 through GATE-05 all pass

## Task Commits

1. **Task 1: serverRegistry.ts, tierAccess.ts, router.ts** - `3ed79ed` (feat)
2. **Task 2: cors.ts, index.ts, and concrete GATE tests** - `0c59167` (feat)

## Files Created/Modified

- `apps/gateway/src/serverRegistry.ts` - Module-scope McpServer registry for all 5 servers, exports servers, FREE_SERVERS, ALL_SERVERS
- `apps/gateway/src/tierAccess.ts` - Tier-based server access check returning MCP error -32001 for free tier on restricted servers
- `apps/gateway/src/router.ts` - handleMcpRequest with new stateless transport per request (sessionIdGenerator: undefined)
- `apps/gateway/src/cors.ts` - CORS config with localhost:* wildcard via origin function
- `apps/gateway/src/index.ts` - Hono app with app.all('/mcp/:server') and /health route
- `apps/gateway/src/__tests__/integration.test.ts` - 15 concrete GATE tests replacing Plan 01 todo stubs

## Decisions Made

- **Test pattern for McpServer reuse:** McpServer instances can only be connected to one transport at a time. Module-scope `servers` are used only for registry structure tests; tool-call tests create fresh McpServer instances per test via a `freshClient()` helper.
- **CORS function origin:** Hono cors middleware does exact string matching on origin arrays, so `'http://localhost:*'` would not match. Used function form `(origin) => origin.startsWith('http://localhost:') ? origin : 'https://claude.ai'` instead.
- **HTTP 200 for tier errors:** tierAccess returns HTTP 200 with a JSON-RPC error body per MCP protocol contract — errors are protocol-level, not HTTP-level.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed "already connected" test failures by using fresh McpServer per test**
- **Found during:** Task 2 (concrete GATE tests)
- **Issue:** Plan's test code called `createTestClient(servers['momo'])` multiple times across tests; McpServer can only be connected to one transport at a time, causing "Already connected to a transport" error on second call
- **Fix:** Added `freshClient(register, name)` helper that creates a new McpServer, calls registerAll, then createTestClient — each invocation gets a fresh instance
- **Files modified:** apps/gateway/src/__tests__/integration.test.ts
- **Verification:** All 15 tests pass (`npm test --workspace=apps/gateway` exits 0)
- **Committed in:** 0c59167 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Fix necessary for test correctness. The gateway architecture itself is unchanged — module-scope McpServer registry is still correct for production; the fix is test-only.

## Issues Encountered

None beyond the test auto-fix described above.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- Full gateway source code complete and all GATE requirements covered by passing tests
- Ready for Plan 03 (wrangler dev smoke test / deployment validation)
- Phase 6 auth integration: replace `const tier = 'free'` in index.ts with real API key lookup; tierAccess.ts requires no changes

---
*Phase: 05-gateway*
*Completed: 2026-03-21*
