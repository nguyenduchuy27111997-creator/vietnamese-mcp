---
phase: 05-gateway
plan: "01"
subsystem: gateway
tags: [workspace, scaffold, cloudflare-workers, vitest, package-json]
dependency_graph:
  requires: []
  provides:
    - apps/gateway workspace with CF Workers config
    - ./tools subpath export on all 5 servers
    - GATE-01 through GATE-05 test stubs
  affects:
    - apps/gateway (Plans 02, 03)
    - wrangler bundling (module resolution fixed)
tech_stack:
  added:
    - "@cloudflare/workers-types ^4.0.0"
    - "wrangler ^3.0.0"
    - "hono ^4.0.0"
  patterns:
    - CF Workers Unbound usage model (no 10ms CPU limit)
    - Bundler moduleResolution for CF Workers TypeScript
    - Subpath exports (./tools) for server tool isolation
key_files:
  created:
    - apps/gateway/package.json
    - apps/gateway/wrangler.toml
    - apps/gateway/tsconfig.json
    - apps/gateway/vitest.config.ts
    - apps/gateway/src/__tests__/integration.test.ts
  modified:
    - package.json (workspaces: added apps/*)
    - servers/mcp-momo-vn/package.json (added exports)
    - servers/mcp-zalopay-vn/package.json (added exports)
    - servers/mcp-vnpay/package.json (added exports)
    - servers/mcp-zalo-oa/package.json (added exports)
    - servers/mcp-viettel-pay/package.json (added exports)
decisions:
  - "Set usage_model=unbound in wrangler.toml from day one — avoids 10ms CF Workers CPU limit killing SSE sessions"
  - "Gateway tsconfig uses @cloudflare/workers-types only (no @types/node) — prevents Request/Response/ReadableStream type conflicts"
  - "Server exports use ./src/tools/index.ts (source) not build artifact — monorepo imports resolve without build step"
metrics:
  duration: "~4 min"
  completed: "2026-03-21"
  tasks_completed: 2
  files_changed: 11
---

# Phase 5 Plan 01: Gateway Workspace Scaffold Summary

Gateway workspace scaffolded with CF Workers Unbound config, `./tools` subpath exports on all 5 servers, and GATE-01 through GATE-05 test stubs that pass immediately.

## What Was Built

Two tasks completed in sequence:

**Task 1 — Workspace glob and server subpath exports:** Root `package.json` workspaces updated from `["packages/*", "servers/*"]` to include `"apps/*"`. All 5 server `package.json` files received an `exports` field exposing `"./tools": "./src/tools/index.ts"` alongside the existing default `"."` export. This enables gateway to import `@vn-mcp/mcp-momo-vn/tools` without module-not-found errors during wrangler bundling.

**Task 2 — Gateway package scaffold:** Created `apps/gateway/` from scratch with:
- `package.json` naming the workspace `@vn-mcp/gateway` with dependencies on all 5 servers, hono, and MCP SDK
- `wrangler.toml` with `usage_model = "unbound"` as first-class setting (not a comment)
- `tsconfig.json` using `"moduleResolution": "Bundler"` and `"types": ["@cloudflare/workers-types"]` — no `@types/node`
- `vitest.config.ts` targeting `src/__tests__/**/*.test.ts` in Node.js environment
- `src/__tests__/integration.test.ts` with 5 `it.todo` stubs covering GATE-01 through GATE-05

Running `npm test --workspace=apps/gateway` exits 0 with 5 todo stubs and no failures.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | deb3d45 | feat(05-01): add apps/* workspace glob and ./tools subpath exports |
| Task 2 | 9e24237 | feat(05-01): scaffold gateway workspace with CF Workers config and test stubs |

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- Root workspace includes `apps/*`: PASSED (verified via node -e)
- All 5 server packages expose `"./tools"` export: PASSED (verified via grep, 5 matches)
- `apps/gateway/wrangler.toml` has `usage_model = "unbound"`: PASSED
- `apps/gateway/tsconfig.json` uses `@cloudflare/workers-types`, no `@types/node`: PASSED
- `apps/gateway/src/__tests__/integration.test.ts` contains GATE-01 through GATE-05: PASSED
- `npm test --workspace=apps/gateway` exits 0: PASSED (5 todo stubs)

## Self-Check: PASSED

All files present, both commits verified in git log.
