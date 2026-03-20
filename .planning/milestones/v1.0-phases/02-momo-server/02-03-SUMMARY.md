---
phase: 02-momo-server
plan: 03
subsystem: mcp-momo-vn
tags: [integration-tests, mcp-config, tdd, momo, sandbox]
dependency_graph:
  requires: ["02-02"]
  provides: ["MOMO-01", "MOMO-02", "MOMO-03", "MOMO-04", "MOMO-05"]
  affects: []
tech_stack:
  added: []
  patterns: ["vitest integration tests with in-memory MCP transport", "TDD green-path (tests written before verification)", "HMAC-SHA256 IPN validation via real crypto"]
key_files:
  created:
    - servers/mcp-momo-vn/src/__tests__/integration.test.ts
    - .mcp.json
  modified: []
decisions:
  - "Integration tests cover all 4 MoMo tools via in-memory MCP transport (no HTTP server needed)"
  - "IPN validation test uses real HMAC-SHA256 with sandbox credentials — not mocked"
  - "Deterministic orderId test proves SHA-256 hash of (amount + orderInfo) produces stable output"
  - ".mcp.json uses MoMo published sandbox credentials (safe to commit)"
metrics:
  duration: "3 min"
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 2 Plan 3: MoMo Integration Tests and MCP Config Summary

**One-liner:** 8 vitest integration tests covering all 4 MoMo tools via in-memory MCP transport, plus .mcp.json entry with sandbox credentials for immediate Claude Code use.

## What Was Built

### Task 1: Integration tests for all 4 MoMo tools

`servers/mcp-momo-vn/src/__tests__/integration.test.ts` — 8 tests covering MOMO-01 through MOMO-05:

| Test | Requirement | Description |
|------|-------------|-------------|
| momo_create_payment payUrl | MOMO-01 | Asserts payUrl matches test-payment.momo.vn pattern and _mock: true |
| momo_create_payment deterministic | MOMO-01 | Same amount + orderInfo always yields same orderId (SHA-256 hash) |
| momo_query_status | MOMO-02 | Asserts returned orderId matches the one created, resultCode 0 |
| momo_refund | MOMO-03 | Asserts resultCode 0, _mock true, transId is a number |
| momo_validate_ipn valid | MOMO-04 | Real HMAC-SHA256 signature accepted, returns valid: true |
| momo_validate_ipn tampered | MOMO-04 | Tampered amount with original signature returns valid: false |
| momo_create_payment error | MOMO-05 | amount=99999999 returns isError: true |
| momo_validate_ipn bad JSON | MOMO-04 | Non-JSON string returns isError: true |

All tests pass with zero failures. Full monorepo suite (92 tests across 11 test files) also passes.

### Task 2: .mcp.json entry for Claude Code

`.mcp.json` at repository root:
- Server key: `momo-vn`
- Command: `node ./servers/mcp-momo-vn/build/index.js`
- Env: MoMo published sandbox credentials + MOMO_SANDBOX=true
- Copy-paste ready — Claude Code users can add the server immediately

## Deviations from Plan

None — plan executed exactly as written. Tests passed on first run without any implementation fixes needed.

## Verification Results

- `cd servers/mcp-momo-vn && npm test` — 8/8 integration tests pass
- `npm test` from monorepo root — 92/92 tests pass (11 test files: shared + momo)
- `npm run lint` — no lint errors
- `.mcp.json` parses as valid JSON with momo-vn entry containing MOMO_SANDBOX: true

## Self-Check: PASSED

Files exist:
- servers/mcp-momo-vn/src/__tests__/integration.test.ts: FOUND
- .mcp.json: FOUND

Commits exist:
- ef626a2: test(02-03): integration tests for all 4 MoMo tools — FOUND
- 795b57c: chore(02-03): add .mcp.json MCP server entry for Claude Code — FOUND
