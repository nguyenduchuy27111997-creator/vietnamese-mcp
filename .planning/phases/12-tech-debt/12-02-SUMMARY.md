---
phase: 12-tech-debt
plan: "02"
subsystem: gateway
tags: [tinybird, metering, mcp, analytics, tdd]
dependency_graph:
  requires: []
  provides: [real-tool-name-in-tinybird]
  affects: [apps/gateway/src/index.ts, apps/gateway/src/__tests__/tool-name-extraction.test.ts]
tech_stack:
  added: []
  patterns: [request-clone-before-consume, tdd-red-green]
key_files:
  modified:
    - apps/gateway/src/index.ts
  created:
    - apps/gateway/src/__tests__/tool-name-extraction.test.ts
key_decisions:
  - Clone c.req.raw before reading body so handleMcpRequest transport receives unconsumed Request
  - Non-tools/call methods log empty string tool name (not 'unknown') for clean Tinybird analytics
  - Catch-all try/catch covers SSE and other non-JSON content without crashing
metrics:
  duration_minutes: 5
  completed_date: "2026-03-25"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
requirements:
  - DEBT-03
---

# Phase 12 Plan 02: Tool Name Extraction in Tinybird Events Summary

**One-liner:** Extract actual MCP tool name (e.g. `momo_create_payment`) from JSON-RPC request body via request clone and pass it to Tinybird, replacing the hardcoded `'unknown'`.

## Tasks Completed

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (RED) | Add failing tests for tool name extraction | 1c99637 | apps/gateway/src/__tests__/tool-name-extraction.test.ts |
| 1 (GREEN) | Implement tool name extraction in index.ts | d56f31b | apps/gateway/src/index.ts |

## What Was Built

The `/mcp/:server` route handler in `apps/gateway/src/index.ts` now:

1. Clones the raw request (`c.req.raw.clone()`) before passing it to `handleMcpRequest`, preserving the unconsumed body for the MCP transport layer.
2. Reads the cloned body as JSON and extracts `params.name` when `method === 'tools/call'`.
3. Passes the extracted `toolName` to `sendTinybirdEvent` in the `tool` field.
4. Falls back to empty string `''` for non-`tools/call` methods (e.g. `tools/list`, `ping`) and for non-JSON bodies (e.g. SSE streams).

## Verification Results

- `grep "'unknown'" apps/gateway/src/index.ts` — 0 matches (hardcoded 'unknown' removed)
- `grep "toolName" apps/gateway/src/index.ts` — 3 matches (declaration, assignment, usage)
- `grep "clone" apps/gateway/src/index.ts` — 1 match (request clone before body read)
- Full test suite: 95 tests passed, 0 failures, 0 regressions

## Decisions Made

- **Request clone pattern:** The clone is created immediately before the JSON parse, and only `c.req.raw` (the original) is passed to `handleMcpRequest`. This ensures the transport still receives a readable Request body regardless of what the clone reads.
- **Empty string for non-tool-call:** Using `''` instead of `'unknown'` for non-tool-call requests makes Tinybird filtering cleaner — an empty string is queryable as "not a tool call" rather than an ambiguous sentinel.
- **Silent catch:** The try/catch swallows all parse errors without logging — this is intentional since SSE connections are expected and not exceptional.

## Deviations from Plan

None - plan executed exactly as written. TDD flow followed: RED commit (1c99637) then GREEN commit (d56f31b).

## Self-Check

Files exist:
- [x] apps/gateway/src/index.ts — modified (toolName extraction added)
- [x] apps/gateway/src/__tests__/tool-name-extraction.test.ts — created

Commits exist:
- [x] 1c99637 — test(12-02): add failing tests for tool name extraction
- [x] d56f31b — feat(12-02): extract tool name from MCP JSON-RPC request body

## Self-Check: PASSED
