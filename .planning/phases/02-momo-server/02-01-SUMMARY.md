---
phase: 02-momo-server
plan: "01"
subsystem: mcp-momo-vn
tags: [momo, scaffold, hmac, mock, credentials]
dependency_graph:
  requires: [packages/shared]
  provides: [servers/mcp-momo-vn]
  affects: [02-02-PLAN.md]
tech_stack:
  added: []
  patterns:
    - isMockMode/loadFixture mock switcher pattern
    - hardcoded-field-order HMAC signature builders per MoMo v2 docs
    - fileURLToPath import.meta.url for cwd-safe fixture path resolution
    - deterministic orderId via SHA-256 hash of amount+orderInfo
key_files:
  created:
    - servers/mcp-momo-vn/package.json
    - servers/mcp-momo-vn/tsconfig.json
    - servers/mcp-momo-vn/vitest.config.ts
    - servers/mcp-momo-vn/src/credentials.ts
    - servers/mcp-momo-vn/src/signatures.ts
    - servers/mcp-momo-vn/src/client.ts
    - servers/mcp-momo-vn/src/index.ts
    - servers/mcp-momo-vn/src/mock/createPayment.json
    - servers/mcp-momo-vn/src/mock/queryStatus.json
    - servers/mcp-momo-vn/src/mock/refund.json
    - servers/mcp-momo-vn/src/mock/errorInsufficientBalance.json
  modified: []
decisions:
  - "Built shared package with tsc --build before momo-vn tsc --noEmit (composite project reference requires declaration files in build/)"
  - "generateRequestId() removed from queryStatus/refund return (not in curated output spec)"
  - "void keyword anti-pattern avoided: dropped unused requestId generation in queryStatus/refund"
metrics:
  duration: 3 min
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 11
---

# Phase 2 Plan 01: mcp-momo-vn Scaffold Summary

**One-liner:** mcp-momo-vn package scaffold with getMomoCredentials, 4 HMAC signature builders (MoMo v2 exact field order), and momoClient mock switcher with 4 JSON fixtures.

## What Was Built

### Task 1 — Package scaffold, credentials, HMAC signatures (commit: 79f70ac)

Created the `servers/mcp-momo-vn/` workspace package:

- **package.json** — `@vn-mcp/mcp-momo-vn` with `MOMO_SANDBOX=true vitest run` test script
- **tsconfig.json** — composite TypeScript project referencing `../../packages/shared`
- **vitest.config.ts** — local test runner config (node environment, globals)
- **src/credentials.ts** — `getMomoCredentials()` with env var overrides and published sandbox fallbacks (`MOMOBKUN20180529`/`klm05TvNBzhg7h7j`/`at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa`)
- **src/signatures.ts** — 4 exported builders with hardcoded MoMo v2 field ordering:
  - `buildCreateSignature` (10 fields: accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType)
  - `buildQuerySignature` (4 fields: accessKey, orderId, partnerCode, requestId)
  - `buildRefundSignature` (7 fields: accessKey, amount, description, orderId, partnerCode, requestId, transId)
  - `buildIpnSignature` (13 fields: accessKey, amount, extraData, message, orderId, orderInfo, orderType, partnerCode, payType, requestId, responseTime, resultCode, transId)
- **src/index.ts** — placeholder for Plan 02 tool registration

### Task 2 — Mock fixtures + client.ts (commit: 43d2ce8)

Created 4 mock JSON fixtures in `src/mock/` with realistic Vietnamese test data and numeric transIds:
- `createPayment.json` — resultCode 0, transId 2350000001 (number)
- `queryStatus.json` — resultCode 0, payType "qr", refundTrans []
- `refund.json` — resultCode 0, transId 2350000002 (number)
- `errorInsufficientBalance.json` — resultCode 1005

Created `src/client.ts` with `momoClient` object:
- `createPayment()` — deterministic orderId (`MOMO_` + SHA-256 12-char hash), amount=99999999 throws McpApiError 1005
- `queryStatus()` — overrides orderId with requested value, returns curated status object
- `refund()` — orderId as `MOMO_REFUND_${transId}`, returns curated refund object
- All methods use `join(MOCK_DIR, 'file.json')` with `import.meta.url` for cwd-safe paths

## Verification Results

- `cd servers/mcp-momo-vn && npx tsc --noEmit` — exits 0
- `npm run lint` from root — exits 0 (no console.log, no linting errors)
- `npm install` from root — resolves workspace without errors
- All 4 mock JSON files parse as valid JSON with numeric transId values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Built shared package declarations before momo-vn tsc check**
- **Found during:** Task 1 verification (`npx tsc --noEmit`)
- **Issue:** TypeScript composite project reference requires `packages/shared/build/index.d.ts` but shared package had only been built with `tsdown` (outputs to `dist/`). The `tsc --noEmit` failed with TS6305 error.
- **Fix:** Ran `cd packages/shared && npx tsc --build` to generate `build/` declarations for the composite reference.
- **Files modified:** packages/shared/build/ (generated, not tracked)
- **Impact:** None — this is expected for TypeScript project references; future plans building momo-vn will also need shared built first.

## Self-Check: PASSED

All 11 created files confirmed present on disk. Both task commits (79f70ac, 43d2ce8) confirmed in git log.
