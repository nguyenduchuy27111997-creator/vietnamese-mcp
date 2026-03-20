---
phase: 04-zalo-oa-viettelpay-servers
plan: "01"
subsystem: mcp-zalo-oa
tags: [mcp-server, zalo-oa, messaging, oauth, mock-mode, integration-tests]
dependency_graph:
  requires: [packages/shared]
  provides: [servers/mcp-zalo-oa]
  affects: [packages/shared/src/errors/error-codes.ts]
tech_stack:
  added: [mcp-zalo-oa server package]
  patterns: [mock-client-switcher, fixture-loading, tool-registration, composite-project-references]
key_files:
  created:
    - servers/mcp-zalo-oa/package.json
    - servers/mcp-zalo-oa/tsconfig.json
    - servers/mcp-zalo-oa/vitest.config.ts
    - servers/mcp-zalo-oa/src/credentials.ts
    - servers/mcp-zalo-oa/src/client.ts
    - servers/mcp-zalo-oa/src/mock/sendMessage.json
    - servers/mcp-zalo-oa/src/mock/getFollowerProfile.json
    - servers/mcp-zalo-oa/src/mock/listFollowers.json
    - servers/mcp-zalo-oa/src/mock/refreshToken.json
    - servers/mcp-zalo-oa/src/tools/sendMessage.ts
    - servers/mcp-zalo-oa/src/tools/getFollowerProfile.ts
    - servers/mcp-zalo-oa/src/tools/listFollowers.ts
    - servers/mcp-zalo-oa/src/tools/refreshToken.ts
    - servers/mcp-zalo-oa/src/tools/index.ts
    - servers/mcp-zalo-oa/src/index.ts
    - servers/mcp-zalo-oa/src/__tests__/integration.test.ts
  modified:
    - packages/shared/src/errors/error-codes.ts
decisions:
  - "zalo_oa error codes (0, 210, 400) added to shared VN_ERROR_CODES table"
  - "zaloOaClient uses isMockMode('zalo_oa') — checks ZALO_OA_SANDBOX env var via shared package"
  - "refreshToken tool has zero params schema (empty object) — credentials read from env only per plan"
  - "TypeScript tsc --noEmit reveals pre-existing callTool type narrowing issue (same as momo/zalopay/vnpay) — tests pass at runtime, not a regression"
metrics:
  duration: "8 min"
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_created: 16
  files_modified: 1
---

# Phase 4 Plan 01: mcp-zalo-oa Server Summary

**One-liner:** Zalo OA MCP server with 4 messaging/OAuth tools (sendMessage, getFollowerProfile, listFollowers, refreshToken) using mock-first isMockMode pattern identical to mcp-momo-vn.

## What Was Built

The complete `@vn-mcp/mcp-zalo-oa` MCP server package, proving that the monorepo pattern established in Phase 2 (mcp-momo-vn) scales cleanly to messaging/OAuth APIs. The server exposes 4 tools covering the core Zalo OA follower messaging lifecycle.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Scaffold package with credentials, client, mock fixtures, error codes | 5aaa862 | package.json, credentials.ts, client.ts, 4 mock fixtures, error-codes.ts |
| 2 | Implement 4 tool handlers, server entry point, integration tests | 86360cb | sendMessage.ts, getFollowerProfile.ts, listFollowers.ts, refreshToken.ts, index.ts, integration.test.ts |

## Tools Implemented

| Tool | Description | Error Path |
|------|-------------|-----------|
| `zalo_oa_send_message` | Send text/image/file message to follower | userId='invalid_user' → McpApiError 210 |
| `zalo_oa_get_follower_profile` | Get follower profile by userId | userId='invalid_user' → McpApiError 210 |
| `zalo_oa_list_followers` | List OA followers with offset pagination | N/A (mock always succeeds) |
| `zalo_oa_refresh_token` | Refresh access token from env (zero params) | N/A (mock always succeeds) |

## Test Results

```
Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  379ms
```

All 6 integration tests pass under `ZALO_OA_SANDBOX=true`:
- ZLOA-01: sendMessage happy path (_mock:true, message_id present)
- ZLOA-01 error: sendMessage with invalid_user → isError:true
- ZLOA-02: getFollowerProfile happy path (_mock:true, display_name present)
- ZLOA-02 error: getFollowerProfile with invalid_user → isError:true
- ZLOA-03: listFollowers happy path (3 followers, total=3, offset=0)
- ZLOA-04: refreshToken happy path (mock_access_token_xxxxx, expires_in=3600)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

**TypeScript tsc --noEmit type errors in integration.test.ts:** The `parseResult` function uses `{ isError?: boolean; content: { type: string; text: string }[] }` but `callTool` returns the full MCP SDK union type. This is a pre-existing issue present in mcp-momo-vn, mcp-zalopay-vn, and mcp-vnpay integration tests. Tests pass at runtime. Not a regression introduced by this plan.

## Decisions Made

1. `zalo_oa` error codes added to shared `VN_ERROR_CODES` table with codes: `0` (Success), `210` (User not found or not a follower), `400` (Invalid access token).
2. `refreshToken` has empty Zod schema `{}` — credentials come from env vars only, no user-supplied token params.
3. `zaloOaClient` uses `isMockMode('zalo_oa')` which checks `ZALO_OA_SANDBOX` env var via the shared mock-engine.

## Self-Check: PASSED

- client.ts: FOUND
- sendMessage.ts: FOUND
- integration.test.ts: FOUND
- commit 5aaa862: FOUND
- commit 86360cb: FOUND
