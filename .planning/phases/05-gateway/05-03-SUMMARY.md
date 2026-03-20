---
phase: 05-gateway
plan: 03
subsystem: infra
tags: [cloudflare-workers, sse, heartbeat, wrangler, mcp, transform-stream]

# Dependency graph
requires:
  - phase: 05-02
    provides: router.ts handleMcpRequest, cors.ts, index.ts, serverRegistry, tierAccess — the full gateway core this plan adds heartbeat to

provides:
  - SSE heartbeat wrapper (wrapWithHeartbeat) that injects `: ping\n\n` comments every 30s
  - Idle timeout (5 minutes) with automatic stream close and resource cleanup
  - Human-verified smoke test confirming 60s idle survival on wrangler dev
  - Full Phase 5 gateway implementation sign-off

affects:
  - 06-auth
  - any future phase that deploys or extends the CF Workers gateway

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SSE heartbeat via TransformStream: pipe source body through, inject `: ping\\n\\n` on setInterval, cancel interval and clearTimeout on stream close/error"
    - "Content-type guard: wrapWithHeartbeat returns response unchanged when Content-Type is not text/event-stream — JSON-RPC responses never wrapped"

key-files:
  created:
    - apps/gateway/src/heartbeat.ts
  modified:
    - apps/gateway/src/router.ts

key-decisions:
  - "Heartbeat format: `: ping\\n\\n` SSE comment — lowest overhead, invisible to MCP clients, does not alter protocol framing"
  - "Interval 30 seconds / idle timeout 5 minutes — keeps connection alive past CF 60s proxy kill without holding resources indefinitely"
  - "Non-SSE guard: wrapWithHeartbeat checks Content-Type before wrapping — JSON-RPC POST responses returned unchanged"
  - "Resource cleanup: clearInterval + clearTimeout in finally block of async pipe — no timer leak on error or close"

patterns-established:
  - "TransformStream heartbeat: read source with getReader(), startHeartbeat() immediately, resetIdleTimeout() on each chunk, close writer in finally"
  - "Wrap-not-replace pattern: SSE response headers preserved verbatim, only body stream is replaced with wrapped readable"

requirements-completed: [GATE-01, GATE-02, GATE-03, GATE-04, GATE-05]

# Metrics
duration: ~20min
completed: 2026-03-21
---

# Phase 5 Plan 03: SSE Heartbeat + Smoke Test Summary

**TransformStream SSE heartbeat (`: ping\n\n` every 30s, 5-min idle timeout) added to CF Workers gateway and human-verified end-to-end via wrangler dev**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-21T02:40:00Z
- **Completed:** 2026-03-21T03:00:00Z
- **Tasks:** 2 (Task 1: auto; Task 2: checkpoint:human-verify — approved)
- **Files modified:** 2

## Accomplishments
- Created `heartbeat.ts` with `wrapWithHeartbeat()` — TransformStream that pipes MCP SSE body through unchanged while injecting `: ping\n\n` comments on a 30s interval
- Updated `router.ts` to wrap all SSE responses with heartbeat; non-SSE JSON-RPC responses returned unchanged via content-type guard
- Human smoke test confirmed: /health, tools/list POST, 60s SSE idle survival, CORS OPTIONS preflight, and tier -32001 error all produce expected output against wrangler dev

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement SSE heartbeat wrapper and update router** - `3417e49` (feat)
2. **Task 2: Human smoke test — wrangler dev end-to-end verification** - checkpoint approved (no code commit — human verification only)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified
- `apps/gateway/src/heartbeat.ts` - `wrapWithHeartbeat(response, intervalMs, idleTimeoutMs)` — TransformStream SSE heartbeat wrapper with idle timeout and resource cleanup
- `apps/gateway/src/router.ts` - Added `import { wrapWithHeartbeat }` and wraps `transport.handleRequest(req)` response before returning

## Decisions Made
- Heartbeat format `: ping\n\n` (SSE comment) chosen as lowest overhead option that is invisible to MCP clients — does not alter protocol framing
- 30s interval / 5-minute idle timeout balances CF 60s proxy kill avoidance with resource conservation
- Non-SSE guard ensures JSON-RPC POST responses (application/json) are never wrapped — content-type check at top of function

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 gateway is fully complete: scaffold (05-01), core implementation (05-02), SSE heartbeat + smoke test (05-03)
- All 5 MCP servers (momo, vnpay, zalopay, zalo-oa, viettel-pay) are accessible via /mcp/:server
- Free-tier gating (GATE-05, -32001 error) enforced for vnpay, zalo-oa, viettel-pay
- Gateway is ready for Phase 6 (Auth) to layer authentication on top of the existing Hono router

---
*Phase: 05-gateway*
*Completed: 2026-03-21*
