---
phase: 04-zalo-oa-viettelpay-servers
plan: "02"
subsystem: mcp-viettel-pay
tags: [viettel-pay, mock-only, payment, mcp-server]
dependency_graph:
  requires:
    - packages/shared (isMockMode, loadFixture, McpApiError, formatToolError, signHmacSha256, createTestClient, callTool)
  provides:
    - servers/mcp-viettel-pay (viettel_pay_create_payment, viettel_pay_query_status, viettel_pay_refund)
  affects: []
tech_stack:
  added:
    - "@vn-mcp/mcp-viettel-pay workspace package"
  patterns:
    - "Mock-only server with MOCK_DEVIATIONS.md documenting all assumptions"
    - "Error trigger: amount=99999999 throws McpApiError with code 06"
    - "Deterministic transactionId via SHA-256 hash of amount+orderInfo"
key_files:
  created:
    - servers/mcp-viettel-pay/MOCK_DEVIATIONS.md
    - servers/mcp-viettel-pay/package.json
    - servers/mcp-viettel-pay/tsconfig.json
    - servers/mcp-viettel-pay/vitest.config.ts
    - servers/mcp-viettel-pay/src/credentials.ts
    - servers/mcp-viettel-pay/src/signatures.ts
    - servers/mcp-viettel-pay/src/client.ts
    - servers/mcp-viettel-pay/src/tools/createPayment.ts
    - servers/mcp-viettel-pay/src/tools/queryStatus.ts
    - servers/mcp-viettel-pay/src/tools/refund.ts
    - servers/mcp-viettel-pay/src/tools/index.ts
    - servers/mcp-viettel-pay/src/index.ts
    - servers/mcp-viettel-pay/src/__tests__/integration.test.ts
    - servers/mcp-viettel-pay/src/mock/createPayment.json
    - servers/mcp-viettel-pay/src/mock/queryStatus.json
    - servers/mcp-viettel-pay/src/mock/refund.json
    - servers/mcp-viettel-pay/src/mock/errorInsufficientBalance.json
  modified: []
decisions:
  - "ViettelPay mock uses REST+HMAC-SHA256 for internal consistency despite real API using SOAP+RSA — documented in MOCK_DEVIATIONS.md"
  - "MOCK_DEVIATIONS.md written first (before any mock code) per plan Pitfall 4 requirement"
  - "transactionId uses VTP_ prefix + SHA-256 hash of amount+orderInfo (first 12 hex chars) for determinism"
metrics:
  duration: "3 min"
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 17
---

# Phase 4 Plan 02: mcp-viettel-pay Server Summary

Mock-only ViettelPay MCP server with 3 payment tools, 13-row MOCK_DEVIATIONS.md documenting all REST+HMAC assumptions against a SOAP+RSA real API, and 5 passing integration tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Scaffold MOCK_DEVIATIONS, package, credentials, signatures, client, fixtures | 4bbbe1b | MOCK_DEVIATIONS.md, package.json, tsconfig.json, vitest.config.ts, src/credentials.ts, src/signatures.ts, src/client.ts, 4x mock JSON |
| 2 | Tool handlers, entry point, registerAll barrel, integration tests | 88c36e9 | src/tools/*.ts, src/index.ts, src/__tests__/integration.test.ts |

## Verification Results

1. `npm test --workspace=servers/mcp-viettel-pay` — 5/5 tests pass
2. `npx tsc -p servers/mcp-viettel-pay/tsconfig.json --noEmit` — source files compile clean (pre-existing type mismatch in callTool return type affects integration test files in MoMo server too — out of scope)
3. `test -f servers/mcp-viettel-pay/MOCK_DEVIATIONS.md` — exists
4. Table rows in MOCK_DEVIATIONS.md — 15 rows (13 assumption rows + header + separator)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified:
- servers/mcp-viettel-pay/MOCK_DEVIATIONS.md: FOUND
- servers/mcp-viettel-pay/src/client.ts: FOUND
- servers/mcp-viettel-pay/src/signatures.ts: FOUND
- servers/mcp-viettel-pay/src/__tests__/integration.test.ts: FOUND

Commits verified:
- 4bbbe1b: FOUND
- 88c36e9: FOUND
