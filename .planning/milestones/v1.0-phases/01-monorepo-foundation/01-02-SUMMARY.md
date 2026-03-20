---
phase: 01-monorepo-foundation
plan: 02
subsystem: infra
tags: [node-crypto, hmac-sha256, hmac-sha512, mcp-sdk, vitest, mock-engine, error-handling, in-memory-transport]

# Dependency graph
requires:
  - phase: 01-01
    provides: npm workspaces monorepo, tsconfig.base.json, ESLint flat config, vitest, packages/shared scaffold

provides:
  - HMAC-SHA256 and HMAC-SHA512 signing primitives using node:crypto
  - McpApiError class with error_code, message, provider, suggestion fields
  - VN_ERROR_CODES stub translation tables for momo, zalopay, vnpay, viettelpay
  - translateErrorCode helper for English error description lookups
  - formatToolError returning MCP-compliant { isError: true, content } with code_meaning
  - isMockMode per-service env var checker (MOMO_SANDBOX, ZALOPAY_SANDBOX, etc.)
  - loadFixture JSON fixture loader injecting _mock: true
  - createTestClient in-memory MCP transport factory for integration tests
  - callTool ergonomic test helper wrapping client.callTool

affects:
  - 01-03
  - 02-momo
  - 03-zalopay
  - 04-zalo-oa
  - 05-vnpay
  - 06-viettel-pay

# Tech tracking
tech-stack:
  added:
    - "@modelcontextprotocol/sdk (installed into packages/shared)"
    - "zod@^3.25.0 (installed into packages/shared)"
  patterns:
    - "HMAC signing is a node:crypto primitive only — field ordering is per-server responsibility (PITFALLS.md)"
    - "formatToolError uses console.error (never console.log) to comply with MCP stdio transport rule"
    - "Mock responses always include _mock: true field per UX pitfall guidance"
    - "isMockMode uses per-service env vars (SERVICE_SANDBOX=true) not a single global flag"
    - "In-memory MCP transport (InMemoryTransport.createLinkedPair) for zero-boilerplate integration tests"

key-files:
  created:
    - packages/shared/src/http-client/hmac.ts
    - packages/shared/src/http-client/index.ts
    - packages/shared/src/errors/McpApiError.ts
    - packages/shared/src/errors/error-codes.ts
    - packages/shared/src/errors/formatToolError.ts
    - packages/shared/src/errors/index.ts
    - packages/shared/src/mock-engine/isMockMode.ts
    - packages/shared/src/mock-engine/loadFixture.ts
    - packages/shared/src/mock-engine/index.ts
    - packages/shared/src/test-helpers/createTestClient.ts
    - packages/shared/src/test-helpers/callTool.ts
    - packages/shared/src/test-helpers/index.ts
    - packages/shared/src/__tests__/hmac.test.ts
    - packages/shared/src/__tests__/formatToolError.test.ts
    - packages/shared/src/__tests__/mockEngine.test.ts
  modified:
    - packages/shared/src/index.ts (full barrel export for all four submodules)
    - packages/shared/package.json (@modelcontextprotocol/sdk + zod dependencies added)
    - eslint.config.js (**/dist/** and **/build/** patterns added to ignores)

key-decisions:
  - "HMAC signing functions are node:crypto primitives only — no field ordering logic; each server implements its own buildSignatureString per PITFALLS.md"
  - "translateErrorCode uses err.error_code as the lookup key, not a prefixed code — callers pass numeric/string codes like '1005', not 'MOMO_1005'"
  - "ESLint ignores extended to **/dist/** and **/build/** patterns to cover nested package build output directories"

patterns-established:
  - "Pattern: All error logging uses console.error (never console.log) — enforced by ESLint no-console rule"
  - "Pattern: formatToolError is the single error surface for all MCP tool handlers"
  - "Pattern: Mock responses always carry _mock: true for developer clarity (UX pitfall)"
  - "Pattern: Integration tests use createTestClient + callTool with InMemoryTransport, no stdio required"
  - "Pattern: isMockMode(service) — lowercase service name maps to UPPERCASE_SANDBOX env var"

requirements-completed: [INFRA-02, INFRA-03, INFRA-04]

# Metrics
duration: 4min
completed: 2026-03-18
---

# Phase 1 Plan 02: @vn-mcp/shared Shared Modules Summary

**HMAC-SHA256/SHA512 signing primitives, McpApiError with VN error code translation tables, mock engine with _mock:true fixture injection, and in-memory MCP test helpers — the four shared utility modules all five MCP servers depend on**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T01:01:18Z
- **Completed:** 2026-03-18T01:05:32Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- HMAC-SHA256 and HMAC-SHA512 signing using node:crypto (not crypto-js) — verified against known test vectors
- McpApiError structured error class and formatToolError with VN error code translation (stub tables for all 4 payment providers)
- isMockMode per-service env var checker and loadFixture with automatic _mock: true injection
- createTestClient and callTool using InMemoryTransport — zero-boilerplate integration testing for all 5 future MCP servers
- 29 tests across 3 test files, all passing; lint passes; build compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: HMAC signing, McpApiError, VN error codes, formatToolError** - `e2e0efa` (feat)
2. **Task 2: Mock engine, test helpers, barrel exports** - `c62901a` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `packages/shared/src/http-client/hmac.ts` - signHmacSha256 and signHmacSha512 using node:crypto
- `packages/shared/src/http-client/index.ts` - barrel export
- `packages/shared/src/errors/McpApiError.ts` - structured error class with error_code, provider, suggestion
- `packages/shared/src/errors/error-codes.ts` - VN_ERROR_CODES stub tables + translateErrorCode helper
- `packages/shared/src/errors/formatToolError.ts` - MCP-compliant error formatter with code_meaning lookup
- `packages/shared/src/errors/index.ts` - barrel export
- `packages/shared/src/mock-engine/isMockMode.ts` - per-service SANDBOX env var checker
- `packages/shared/src/mock-engine/loadFixture.ts` - JSON fixture loader injecting _mock: true
- `packages/shared/src/mock-engine/index.ts` - barrel export
- `packages/shared/src/test-helpers/createTestClient.ts` - in-memory MCP client factory
- `packages/shared/src/test-helpers/callTool.ts` - ergonomic tool invocation helper
- `packages/shared/src/test-helpers/index.ts` - barrel export
- `packages/shared/src/index.ts` - re-exports all four submodule groups + VERSION
- `packages/shared/src/__tests__/hmac.test.ts` - 6 HMAC tests with known test vectors
- `packages/shared/src/__tests__/formatToolError.test.ts` - 14 tests for McpApiError, VN_ERROR_CODES, translateErrorCode, formatToolError
- `packages/shared/src/__tests__/mockEngine.test.ts` - 9 tests for isMockMode and loadFixture
- `packages/shared/package.json` - added @modelcontextprotocol/sdk and zod dependencies
- `eslint.config.js` - extended ignores to cover **/dist/** and **/build/**

## Decisions Made
- HMAC utilities are primitives only — no field ordering or concatenation logic; each server owns its own signature string builder per PITFALLS.md guidance on ZaloPay/MoMo/VNPAY signature discrepancies
- translateErrorCode uses the raw error_code value (e.g., "1005") as the lookup key; callers should pass provider codes directly (not prefixed codes like "MOMO_1005")
- ESLint ignores pattern extended from `dist/**` to `**/dist/**` — the original pattern didn't cover nested build output under `packages/shared/dist/`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed incorrect HMAC-SHA512 test vector prefix**
- **Found during:** Task 1 (TDD RED/GREEN — hmac.test.ts)
- **Issue:** Plan specified SHA512 digest starting with "21d45bba" but actual Node.js HMAC-SHA512("secret", "hello") starts with "db1595ae"
- **Fix:** Updated hmac.test.ts to use the correct full hex digest
- **Files modified:** `packages/shared/src/__tests__/hmac.test.ts`
- **Verification:** signHmacSha256 test still passes with its correct vector; SHA512 test passes with corrected value
- **Committed in:** `e2e0efa` (Task 1 commit)

**2. [Rule 2 - Missing] Removed unused import in mockEngine test**
- **Found during:** Task 2 (lint verification after implementation)
- **Issue:** `resolve` was imported from `node:path` in mockEngine.test.ts but never used — ESLint no-unused-vars error
- **Fix:** Removed `resolve` from the import statement
- **Files modified:** `packages/shared/src/__tests__/mockEngine.test.ts`
- **Verification:** `npm run lint` passes cleanly
- **Committed in:** `c62901a` (Task 2 commit)

**3. [Rule 3 - Blocking] Extended ESLint ignores to cover nested dist directories**
- **Found during:** Task 2 (overall verification — npm run lint)
- **Issue:** After running `npm run build`, ESLint was linting `packages/shared/dist/index.mjs` (generated file) and reporting `console` and `process` as undefined. The existing `dist/**` pattern only matched root-level `dist/`; nested `packages/shared/dist/` wasn't covered.
- **Fix:** Added `**/dist/**` and `**/build/**` patterns to eslint.config.js ignores
- **Files modified:** `eslint.config.js`
- **Verification:** `npm run lint` passes cleanly after the build
- **Committed in:** (docs commit — eslint.config.js staged with plan metadata)

---

**Total deviations:** 3 auto-fixed (1 bug, 1 missing, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correctness (wrong test vector), code quality (unused import), and tool chain correctness (linting generated files). No scope creep.

## Issues Encountered
- The HMAC-SHA512 test vector prefix "21d45bba" in the plan spec was incorrect — the actual Node.js crypto output starts with "db1595ae". Fixed by computing the real value and updating the test.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All four @vn-mcp/shared submodule groups are implemented and tested
- 29 tests pass, lint passes, build produces ESM output with type declarations
- createTestClient and callTool are ready for MCP server integration tests in Phase 2+
- Mock engine is ready for sandbox-first development across all five server implementations
- Ready for Phase 1 Plan 03 (final monorepo foundation plan)

## Self-Check: PASSED
