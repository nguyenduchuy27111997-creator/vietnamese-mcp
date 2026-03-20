---
phase: 01-monorepo-foundation
plan: 03
subsystem: infra
tags: [tool-naming, zod, mcp-sdk, vitest, tdd, integration-test, in-memory-transport]

# Dependency graph
requires:
  - phase: 01-02
    provides: createTestClient, callTool, formatToolError, McpApiError, isMockMode, loadFixture, signHmacSha256, signHmacSha512

provides:
  - validateToolName enforcing {service}_{verb}_{noun} minimum 3-segment pattern
  - TOOL_NAME_PATTERN regex export from @vn-mcp/shared
  - Full integration test: MCP server + inline Zod schema + in-memory transport + callTool
  - INFRA-05 pattern established: per-server inline Zod schemas (not shared schemas)
  - INFRA-06 fulfilled: tool naming convention validated and tested

affects:
  - 02-momo
  - 03-zalopay
  - 04-zalo-oa
  - 05-vnpay
  - 06-viettel-pay

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tool names follow {service}_{verb}_{noun} with minimum 3 underscore-separated segments"
    - "Zod schemas are defined INLINE per tool handler — not shared from @vn-mcp/shared"
    - "Integration tests use McpServer + server.tool() + createTestClient + callTool (in-memory, no stdio)"

key-files:
  created:
    - packages/shared/src/tool-naming.ts
    - packages/shared/src/__tests__/toolNaming.test.ts
    - packages/shared/src/__tests__/integration.test.ts
  modified:
    - packages/shared/src/index.ts (added validateToolName + TOOL_NAME_PATTERN re-export)

key-decisions:
  - "validateToolName uses /^[a-z][a-z0-9]*(_[a-z][a-z0-9]*){2,}$/ — underscore-in-service-name (e.g., zalo_oa) is valid as it creates additional segments"
  - "Zod schemas are per-server inline (INFRA-05): integration test demonstrates the reference pattern, not a shared schema"

# Metrics
duration: 1min
completed: 2026-03-18
---

# Phase 1 Plan 03: Tool Naming Convention and Integration Test Summary

**Tool naming convention validator (INFRA-06) and full end-to-end integration test proving @vn-mcp/shared is complete — MCP server creation, tool registration with inline Zod schema (INFRA-05 pattern), in-memory transport, callTool, and error handling all verified together**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-18T01:08:37Z
- **Completed:** 2026-03-18T01:09:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Tool naming convention validator: `validateToolName` and `TOOL_NAME_PATTERN` enforcing `{service}_{verb}_{noun}` with minimum 3 underscore-separated lowercase segments
- 11 unit tests for tool naming (TDD: RED then GREEN)
- Full integration test proving the entire @vn-mcp/shared package works end-to-end: McpServer creation, tool registration with inline Zod VND amount validation, in-memory transport connection, callTool invocation, and response assertion
- Error path test: invalid negative amount returns `isError: true` via `formatToolError`
- All 42 tests pass across 5 test files; lint passes; build produces clean ESM output

## Task Commits

Each task was committed atomically:

1. **Task 1: Tool naming convention validator (TDD)** - `cc9ec2e` (feat)
2. **Task 2: Full integration test** - `778c68e` (feat)

## Files Created/Modified
- `packages/shared/src/tool-naming.ts` - validateToolName and TOOL_NAME_PATTERN exports
- `packages/shared/src/__tests__/toolNaming.test.ts` - 11 vitest tests for tool naming (TDD)
- `packages/shared/src/__tests__/integration.test.ts` - 2 integration tests proving full shared package end-to-end
- `packages/shared/src/index.ts` - added validateToolName + TOOL_NAME_PATTERN re-exports

## Decisions Made
- Tool name regex allows underscores within segments (e.g., `zalo_oa_send_message` has 4 segments: service=`zalo`+`oa`, verb=`send`, noun=`message`) — the pattern correctly requires minimum 3 total underscore-separated lowercase-starting segments
- Zod schemas are per-server inline (INFRA-05): the integration test deliberately defines `VndAmountSchema` within the tool handler to establish the reference pattern for all Phase 2+ servers, not to be imported from packages/shared

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
- @vn-mcp/shared is complete: all 4 submodule groups implemented, tested, and exported
- 42 tests pass across 5 test files (hmac, formatToolError, mockEngine, toolNaming, integration)
- Tool naming convention (INFRA-06) and Zod validation pattern (INFRA-05) are documented and tested
- Integration test serves as the reference implementation for Phase 2 MoMo server tool handlers
- Phase 1 Monorepo Foundation is complete — ready for Phase 2 MoMo server

## Self-Check: PASSED
