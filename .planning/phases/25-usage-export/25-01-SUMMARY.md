---
phase: 25-usage-export
plan: "01"
subsystem: gateway-api
tags: [usage, export, csv, tinybird, jwt-auth]
dependency_graph:
  requires: [auth-middleware, jwt-auth, supabase-client, tinybird-metering]
  provides: [GET /usage/export endpoint, CSV export capability]
  affects: [apps/gateway/src/index.ts]
tech_stack:
  added: []
  patterns: [Hono router with GatewayEnv, Tinybird SQL v0/sql endpoint, CSVWithNames format, UUID sanitization]
key_files:
  created:
    - apps/gateway/src/routes/usageExport.ts
    - apps/gateway/src/__tests__/usage-export.test.ts
  modified:
    - apps/gateway/src/index.ts
decisions:
  - UUID sanitization on Supabase key IDs before SQL interpolation prevents injection
  - Tinybird POST /v0/sql used (not GET) for query submission with form-encoded body
  - Fallback to header-only CSV when Tinybird is unavailable keeps endpoint resilient
  - /usage/export mounted before /usage in index.ts for correct Hono path precedence
metrics:
  duration_seconds: 127
  completed_date: "2026-03-27"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 25 Plan 01: Usage Export Endpoint Summary

**One-liner:** GET /usage/export with JWT auth, Supabase key lookup, Tinybird SQL aggregation by date/server/tool, and direct CSV streaming with UUID sanitization.

## What Was Built

A new `/usage/export` endpoint on the Cloudflare Workers gateway that:

1. Validates date range query params (`start`, `end`) — rejects missing/invalid/out-of-order/over-366-day ranges with descriptive 400 errors
2. Looks up the authenticated user's active API keys via Supabase (scoped to `user_id`, non-revoked)
3. Submits a GROUP BY aggregation query to Tinybird's `/v0/sql` endpoint using `FORMAT CSVWithNames`
4. Streams the Tinybird CSV response directly to the client with proper `Content-Type: text/csv` and `Content-Disposition: attachment` headers
5. Falls back to a header-only CSV if Tinybird is unavailable (graceful degradation)

The route is mounted in `index.ts` before `/usage` with CORS and JWT auth middleware applied, matching the established pattern for all authenticated routes.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 (RED) | Failing tests for 7 behaviors | 4eed2db |
| 1 (GREEN) | usageExport.ts implementation | 79a3e53 |
| 2 | Mount route in index.ts | 6484270 |

## Test Results

All 7 unit tests pass:
- Returns 400 when `start` param is missing
- Returns 400 when `end` param is missing
- Returns 400 when `start` > `end`
- Returns 400 when date range exceeds 366 days
- Returns CSV with correct `Content-Type` and `Content-Disposition` headers
- CSV contains header row `date,server,tool,call_count` followed by data rows
- Returns empty CSV (header only) when no data exists

## Decisions Made

- **UUID sanitization before SQL interpolation:** Key IDs from Supabase are filtered through a UUID regex before being placed in the IN clause — any non-UUID IDs are silently dropped. This prevents SQL injection without needing a parameterized query driver.
- **POST /v0/sql with form-encoded body:** Tinybird's SQL endpoint accepts queries via `q=` POST body, which handles large queries with many key IDs better than a query string.
- **Tinybird CSVWithNames:** The `FORMAT CSVWithNames` directive makes Tinybird include the header row, so the response can be streamed directly without transformation.
- **Graceful fallback:** If Tinybird is down or errors, the endpoint returns a valid CSV with just the header — the user gets a 200 response instead of a 500, with an empty but parseable file.
- **Route order in index.ts:** `/usage/export` CORS/JWT/route block placed before `/usage` to ensure Hono matches the more-specific path first.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `apps/gateway/src/routes/usageExport.ts` — FOUND
- [x] `apps/gateway/src/__tests__/usage-export.test.ts` — FOUND
- [x] `apps/gateway/src/index.ts` modified — FOUND
- [x] Commit 4eed2db (RED tests) — FOUND
- [x] Commit 79a3e53 (GREEN implementation) — FOUND
- [x] Commit 6484270 (mount route) — FOUND
