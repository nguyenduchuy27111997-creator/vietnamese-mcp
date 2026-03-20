---
phase: 03-zalopay-vnpay-servers
plan: 02
subsystem: payments
tags: [vnpay, hmac-sha512, mcp-server, url-signing, mock-mode, vitest]

# Dependency graph
requires:
  - phase: 01-monorepo-foundation
    provides: shared package with signHmacSha512, isMockMode, loadFixture, McpApiError, createTestClient, callTool
  - phase: 02-momo-server
    provides: MCP server template pattern (credentials, client, tools, integration tests)
provides:
  - mcp-vnpay MCP server with 3 tools (vnpay_create_payment_url, vnpay_verify_return, vnpay_query_transaction)
  - buildVnpaySecureHash() URL-parameter HMAC-SHA512 signing (alphabetical sort)
  - Round-trip URL signing proof: sign params, build URL, verify URL hash
  - Mock mode with deterministic txnRef (VNP_ prefix + SHA-256 hash)
  - VND x100 conversion in createPaymentUrl, /100 division in verifyReturn output
affects: [03-01-zalopay, 04-viettpay-zalo-oa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - URL-parameter HMAC-SHA512 signing (vs POST body field ordering used by MoMo/ZaloPay)
    - Alphabetical sort of vnp_ params using localeCompare before HMAC computation
    - verifyReturn handles both full HTTPS URL and bare query string inputs
    - Fixed mock date (20260318120000) for deterministic test behavior

key-files:
  created:
    - servers/mcp-vnpay/package.json
    - servers/mcp-vnpay/tsconfig.json
    - servers/mcp-vnpay/vitest.config.ts
    - servers/mcp-vnpay/src/credentials.ts
    - servers/mcp-vnpay/src/signatures.ts
    - servers/mcp-vnpay/src/client.ts
    - servers/mcp-vnpay/src/mock/createPaymentUrl.json
    - servers/mcp-vnpay/src/mock/queryTransaction.json
    - servers/mcp-vnpay/src/mock/errorInsufficientBalance.json
    - servers/mcp-vnpay/src/tools/createPaymentUrl.ts
    - servers/mcp-vnpay/src/tools/verifyReturn.ts
    - servers/mcp-vnpay/src/tools/queryTransaction.ts
    - servers/mcp-vnpay/src/tools/index.ts
    - servers/mcp-vnpay/src/index.ts
    - servers/mcp-vnpay/src/__tests__/integration.test.ts
  modified:
    - package-lock.json

key-decisions:
  - "buildVnpaySecureHash uses signHmacSha512 from shared (NOT sha256) — architectural proof that shared HMAC primitives handle different signing strategies"
  - "parseResult in integration tests uses 'any' type for callTool return — same pre-existing type mismatch as MoMo template"
  - "verifyReturn accepts both full URL and bare query string — handles VNPAY gateway return redirect variations"
  - "VNPAY credentials use placeholder VNPAY_TMN_DEMO / VNPAY_HASH_SECRET_DEMO — no public sandbox test values available (unlike MoMo)"

patterns-established:
  - "URL-parameter signing: sort params alphabetically with localeCompare, URL-encode values, join with &, HMAC-SHA512"
  - "Amount conversion: multiply by 100 when building VNPAY params (VND * 100), divide by 100 when returning to caller"
  - "Deterministic txnRef: VNP_ + first 12 chars of SHA-256(amount + orderInfo)"

requirements-completed: [VNPY-01, VNPY-02, VNPY-03, VNPY-04]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 3 Plan 02: VNPAY Server Summary

**VNPAY MCP server with URL-parameter HMAC-SHA512 signing via shared primitives, 3 tools, and 7 passing integration tests proving round-trip URL signing works**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-18T06:21:06Z
- **Completed:** 2026-03-18T06:26:00Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments

- Implemented `buildVnpaySecureHash()` using `signHmacSha512` from shared package — proves VNPAY's URL-parameter signing strategy works with the same shared HMAC primitives used by MoMo/ZaloPay (the architectural proof point for shared package design)
- Built 3 VNPAY tool handlers (vnpay_create_payment_url, vnpay_verify_return, vnpay_query_transaction) with deterministic mock responses, VND x100 amount conversion, and error trigger
- 7 integration tests all pass: mock response, deterministic orderId, valid/tampered/bare-querystring verification, query, and error path

## Task Commits

1. **Task 1: VNPAY package scaffold, credentials, URL-based signatures, client, and mock fixtures** - `368c63b` (feat)
2. **Task 2: VNPAY tool handlers, server entry point, and integration tests** - `d87eba7` (feat)

## Files Created/Modified

- `servers/mcp-vnpay/package.json` - Package config with VNPAY_SANDBOX=true test script
- `servers/mcp-vnpay/src/credentials.ts` - getVnpayCredentials() with VNPAY_TMN_DEMO fallback
- `servers/mcp-vnpay/src/signatures.ts` - buildVnpaySecureHash() using signHmacSha512, alphabetical sort
- `servers/mcp-vnpay/src/client.ts` - vnpayClient with createPaymentUrl, verifyReturn, queryTransaction
- `servers/mcp-vnpay/src/mock/*.json` - 3 mock fixtures (createPaymentUrl, queryTransaction, errorInsufficientBalance)
- `servers/mcp-vnpay/src/tools/createPaymentUrl.ts` - vnpay_create_payment_url tool
- `servers/mcp-vnpay/src/tools/verifyReturn.ts` - vnpay_verify_return tool
- `servers/mcp-vnpay/src/tools/queryTransaction.ts` - vnpay_query_transaction tool
- `servers/mcp-vnpay/src/tools/index.ts` - registerAll barrel
- `servers/mcp-vnpay/src/index.ts` - MCP server bootstrap with StdioServerTransport
- `servers/mcp-vnpay/src/__tests__/integration.test.ts` - 7 integration tests

## Decisions Made

- `buildVnpaySecureHash` uses `signHmacSha512` from shared (NOT sha256) — this is the key architectural proof point showing the shared HMAC primitives handle fundamentally different signing strategies
- `parseResult` in integration tests uses `any` type for `callTool` return — same pre-existing type compatibility limitation as MoMo template; tests run correctly, TypeScript compiles cleanly
- `verifyReturn` handles both full HTTPS URLs and bare query strings — handles VNPAY gateway return redirect edge cases
- VNPAY credentials use placeholder values (VNPAY_TMN_DEMO / VNPAY_HASH_SECRET_DEMO) — unlike MoMo, no public sandbox test credentials available; placeholders work correctly for mock mode HMAC round-trips

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript compilation error in integration test file**
- **Found during:** Task 2 (integration tests)
- **Issue:** `parseResult` parameter type `{ isError?: boolean; content: Array<{ type: string; text: string }> }` was incompatible with `callTool` return type (which includes image/audio content union types). Same pre-existing issue exists in MoMo template.
- **Fix:** Changed `parseResult` parameter to `any` with direct `result.content[0].text` access — tests still pass, TypeScript compiles cleanly
- **Files modified:** `servers/mcp-vnpay/src/__tests__/integration.test.ts`
- **Verification:** `npx tsc --noEmit` passes, all 7 tests pass
- **Committed in:** d87eba7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required fix for clean TypeScript compilation. No scope creep.

## Issues Encountered

None beyond the TypeScript type fix documented above.

## Next Phase Readiness

- VNPAY MCP server complete with all 3 tools working in mock mode
- URL-parameter HMAC-SHA512 signing proved compatible with shared package
- Phase 03 plan 02 complete — Phase 03 has 2 plans total; plan 01 (ZaloPay) status depends on separate execution
- Ready for Phase 04 (ViettelPay + Zalo OA) once Phase 03 plan 01 is also complete

---
*Phase: 03-zalopay-vnpay-servers*
*Completed: 2026-03-18*
