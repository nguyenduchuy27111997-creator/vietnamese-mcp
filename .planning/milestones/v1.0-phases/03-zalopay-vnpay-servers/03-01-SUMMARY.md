---
phase: 03-zalopay-vnpay-servers
plan: "01"
subsystem: mcp-zalopay-vn
tags: [zalopay, mcp-server, mock-mode, hmac-sha256, dual-key]
dependency_graph:
  requires: [packages/shared]
  provides: [servers/mcp-zalopay-vn]
  affects: [.mcp.json, packages/shared/src/errors/error-codes.ts]
tech_stack:
  added: ["@vn-mcp/mcp-zalopay-vn workspace package"]
  patterns: ["dual-key HMAC-SHA256 (key1 outbound, key2 callback)", "deterministic app_trans_id with YYMMDD_ prefix", "pipe-separated signature fields"]
key_files:
  created:
    - servers/mcp-zalopay-vn/package.json
    - servers/mcp-zalopay-vn/tsconfig.json
    - servers/mcp-zalopay-vn/vitest.config.ts
    - servers/mcp-zalopay-vn/src/credentials.ts
    - servers/mcp-zalopay-vn/src/signatures.ts
    - servers/mcp-zalopay-vn/src/client.ts
    - servers/mcp-zalopay-vn/src/mock/createOrder.json
    - servers/mcp-zalopay-vn/src/mock/queryOrder.json
    - servers/mcp-zalopay-vn/src/mock/refund.json
    - servers/mcp-zalopay-vn/src/mock/errorInsufficientBalance.json
    - servers/mcp-zalopay-vn/src/tools/createOrder.ts
    - servers/mcp-zalopay-vn/src/tools/queryOrder.ts
    - servers/mcp-zalopay-vn/src/tools/refund.ts
    - servers/mcp-zalopay-vn/src/tools/validateCallback.ts
    - servers/mcp-zalopay-vn/src/tools/index.ts
    - servers/mcp-zalopay-vn/src/index.ts
    - servers/mcp-zalopay-vn/src/__tests__/integration.test.ts
  modified:
    - packages/shared/src/errors/error-codes.ts
    - .mcp.json
decisions:
  - "ZaloPay callback validation uses key2 (not key1) for HMAC-SHA256 over raw data field string"
  - "Pipe-separated field ordering for all ZaloPay signatures (not &key=value like MoMo)"
  - "Deterministic app_trans_id: YYMMDD_ prefix + first 8 chars of SHA-256(amount+description)"
  - "amount=99999999 triggers McpApiError('-54') for insufficient balance error path"
metrics:
  duration: "5 min"
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 19
---

# Phase 3 Plan 01: ZaloPay MCP Server Summary

**One-liner:** ZaloPay MCP server with dual-key HMAC-SHA256 scheme (key1 outbound, key2 callback) delivering 4 tools in mock mode with 7 passing integration tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ZaloPay package scaffold, credentials, signatures, client, and mock fixtures | 27d32bf | 12 files |
| 2 | ZaloPay tool handlers, server entry point, and integration tests | 0b0f299 | 7 files |

## What Was Built

### Package Structure
The `servers/mcp-zalopay-vn/` package was created following the MoMo server template pattern exactly. It registers as `@vn-mcp/mcp-zalopay-vn` in the npm workspace.

### Dual-Key HMAC-SHA256 Scheme
ZaloPay uses two keys for different purposes:
- **key1**: Used for all outbound request signatures (createOrder, queryOrder, refund)
- **key2**: Used exclusively for callback MAC verification

This is implemented in `signatures.ts` with 4 functions using pipe `|` as separator (distinct from MoMo's `&key=value` format).

### Deterministic app_trans_id
Format: `YYMMDD_` + first 8 hex chars of SHA-256(`${amount}${description}`). Same inputs always produce the same ID, enabling idempotent test assertions.

### 4 Tools
- `zalopay_create_order`: Creates payment order, returns paymentUrl + app_trans_id
- `zalopay_query_order`: Checks order status by app_trans_id
- `zalopay_refund`: Issues refund by zp_trans_id
- `zalopay_validate_callback`: Validates callback MAC using key2, returns parsed transaction data

### Error Codes Extended
`packages/shared/src/errors/error-codes.ts` extended with:
- ZaloPay: `-54` (Insufficient balance), `-68` (Duplicate app_trans_id)
- VNPAY: Full error code table (09, 10, 11, 12, 13, 24, 51, 65, 75, 79, 99)

### .mcp.json Updated
Added `zalopay-vn` and `vnpay` entries alongside existing `momo-vn`.

## Test Results

All 7 integration tests pass with `ZALOPAY_SANDBOX=true`:

1. ZPAY-01: zalopay_create_order returns paymentUrl and _mock:true
2. ZPAY-01 deterministic: same input yields same orderId
3. ZPAY-02: zalopay_query_order returns matching app_trans_id and _mock:true
4. ZPAY-03: zalopay_refund returns successful mock refund
5. ZPAY-04 valid: zalopay_validate_callback accepts correctly-signed payload (valid:true)
6. ZPAY-04 tampered: zalopay_validate_callback rejects tampered payload (valid:false)
7. ZPAY-05: zalopay_create_order with amount=99999999 returns isError:true

## Deviations from Plan

### Out-of-Scope Discovery (Not Fixed)

Pre-existing TypeScript strict-mode type mismatch in test files between `callTool` return type and `parseResult` parameter type — same issue exists in `mcp-momo-vn` integration tests. Does not prevent tests from running (vitest uses esbuild transpilation). Logged as deferred item, not introduced by this plan.

## Self-Check: PASSED

Files verified present:
- servers/mcp-zalopay-vn/src/credentials.ts: FOUND
- servers/mcp-zalopay-vn/src/signatures.ts: FOUND
- servers/mcp-zalopay-vn/src/client.ts: FOUND
- servers/mcp-zalopay-vn/src/tools/validateCallback.ts: FOUND
- servers/mcp-zalopay-vn/src/__tests__/integration.test.ts: FOUND
- packages/shared/src/errors/error-codes.ts: FOUND (extended)
- .mcp.json: FOUND (3 server entries)

Commits verified:
- 27d32bf: feat(03-01): ZaloPay package scaffold... FOUND
- 0b0f299: feat(03-01): ZaloPay tool handlers... FOUND
