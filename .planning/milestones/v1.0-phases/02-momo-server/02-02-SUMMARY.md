---
phase: 02-momo-server
plan: "02"
subsystem: mcp-momo-vn
tags: [mcp-tools, zod-validation, hmac-verification, momo-api]
dependency_graph:
  requires: ["02-01"]
  provides: ["momo_create_payment", "momo_query_status", "momo_refund", "momo_validate_ipn", "mcp-server-bootstrap"]
  affects: ["02-03"]
tech_stack:
  added: []
  patterns: ["inline-zod-schemas", "mcp-tool-registration", "real-hmac-ipn-validation"]
key_files:
  created:
    - servers/mcp-momo-vn/src/tools/createPayment.ts
    - servers/mcp-momo-vn/src/tools/queryStatus.ts
    - servers/mcp-momo-vn/src/tools/refund.ts
    - servers/mcp-momo-vn/src/tools/validateIpn.ts
    - servers/mcp-momo-vn/src/tools/index.ts
  modified:
    - servers/mcp-momo-vn/src/index.ts
decisions:
  - "validateIpn uses getMomoCredentials() + buildIpnSignature() directly — no isMockMode check, real HMAC always runs"
  - "registerAll(server) called before server.connect(transport) per MCP bootstrap ordering requirement"
metrics:
  duration: "2 min"
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 2 Plan 02: MoMo Tool Handlers + Server Bootstrap Summary

4 MoMo MCP tools with inline Zod schemas + server entry point wiring registerAll before StdioServerTransport connect.

## What Was Built

All 4 MoMo tool handlers and the server entry point that bootstraps the MCP server.

### Tool Files (servers/mcp-momo-vn/src/tools/)

**createPayment.ts** — `momo_create_payment` tool
- Schema: amount (int+), orderInfo (min 1), redirectUrl (url?), ipnUrl (url?), requestType (enum?), extraData (string?)
- Delegates to `momoClient.createPayment(args)`, returns MCP text content

**queryStatus.ts** — `momo_query_status` tool
- Schema: orderId (min 1)
- Delegates to `momoClient.queryStatus(args)`, returns MCP text content

**refund.ts** — `momo_refund` tool
- Schema: transId (int+), amount (int+), description (string?)
- Delegates to `momoClient.refund(args)`, returns MCP text content

**validateIpn.ts** — `momo_validate_ipn` tool
- Schema: ipnBody (min 1 — raw JSON string)
- Parses JSON, extracts 13 fields, calls `getMomoCredentials()` + `buildIpnSignature()` for real HMAC-SHA256 verification
- Returns `{ valid: true, orderId, amount, transId, resultCode, message }` on match
- Returns `{ valid: false, reason: 'Signature mismatch' }` on mismatch
- No `isMockMode` check — IPN validation always uses real HMAC logic

**index.ts** — `registerAll` barrel
- Imports all 4 `register` functions, calls each with `server` argument

### Server Entry Point (servers/mcp-momo-vn/src/index.ts)

- Creates `McpServer({ name: 'mcp-momo-vn', version: '0.0.1' })`
- Calls `registerAll(server)` — CRITICAL: before transport connect
- Creates `StdioServerTransport` and calls `server.connect(transport)`
- No `console.log` — stdout is MCP transport channel

## Decisions Made

1. **validateIpn always does real HMAC**: No `isMockMode` branch. `getMomoCredentials()` falls back to published sandbox credentials so validation works out-of-the-box in mock mode.
2. **registerAll before connect**: Bootstrap ordering per RESEARCH.md Pitfall 6 — tools registered before transport connect or tools/list returns empty.

## Verification Results

- `cd servers/mcp-momo-vn && npx tsc --noEmit` — PASS (0 errors)
- `npm run lint` from root — PASS
- All 5 tool files exist with correct exports
- No `console.log` in any tool file
- No `isMockMode` in validateIpn.ts

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- servers/mcp-momo-vn/src/tools/createPayment.ts — FOUND
- servers/mcp-momo-vn/src/tools/queryStatus.ts — FOUND
- servers/mcp-momo-vn/src/tools/refund.ts — FOUND
- servers/mcp-momo-vn/src/tools/validateIpn.ts — FOUND
- servers/mcp-momo-vn/src/tools/index.ts — FOUND
- servers/mcp-momo-vn/src/index.ts — FOUND
- Commit 14d333b (Task 1) — FOUND
- Commit 9ce75e1 (Task 2) — FOUND
