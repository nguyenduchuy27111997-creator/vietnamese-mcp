---
phase: 06-auth-api-keys
plan: 02
subsystem: gateway-auth
tags: [auth, middleware, kv-cache, supabase, hono, tdd]
dependency_graph:
  requires: [06-01]
  provides: [authMiddleware, sha256hex, getServiceRoleClient, kv-namespace-binding]
  affects: [apps/gateway/src/index.ts, apps/gateway/wrangler.toml]
tech_stack:
  added: ["@supabase/supabase-js@2.x"]
  patterns: [hono-middleware, kv-cache-60s-ttl, per-request-supabase-client, web-crypto-sha256]
key_files:
  created:
    - apps/gateway/src/middleware/auth.ts
    - apps/gateway/src/lib/supabase.ts
  modified:
    - apps/gateway/src/__tests__/auth-middleware.test.ts
    - apps/gateway/src/index.ts
    - apps/gateway/wrangler.toml
    - apps/gateway/package.json
decisions:
  - "sha256hex exported from auth.ts (not private) — enables deterministic test assertions and future key generation reuse"
  - "KV get uses { type: 'json' } option (not 'json' string) — matches CF Workers typed get API for AuthContext deserialization"
  - "/keys/* middleware applied in index.ts now even though keysRouter not yet mounted — ready for Plan 03 without another index.ts edit"
metrics:
  duration: "3 minutes"
  completed: "2026-03-22"
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Phase 6 Plan 02: Auth Middleware Core Summary

**One-liner:** Hono auth middleware with SHA-256 Bearer extraction, 60s KV cache, Supabase service-role fallback, and c.set('auth') injection replacing the 'free' tier stub.

## What Was Built

The auth middleware critical path for Phase 6 is complete. Every request hitting `/mcp/:server` now goes through:

1. Bearer token extraction — missing or non-Bearer header returns 401 immediately
2. SHA-256 hash of the raw key via Web Crypto (CF Workers native, no npm package)
3. KV cache lookup — hit returns cached AuthContext and skips Supabase entirely
4. Supabase service-role fallback with `.is('revoked_at', null)` filter — miss or revoked returns 401
5. KV write with 60s TTL on success — next request served from cache

The `const tier = 'free'` stub in `index.ts` is replaced. Tier now comes from `c.get('auth').tier` set by the middleware.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 (RED) | TDD: failing tests | 3d97906 | auth-middleware.test.ts |
| 1 (GREEN) | auth middleware + supabase factory | 0a607ec | middleware/auth.ts, lib/supabase.ts |
| 2 | Wire into index.ts + wrangler.toml | 6fe1276 | index.ts, wrangler.toml |

## Verification Results

1. `grep authMiddleware apps/gateway/src/index.ts` — found on lines 5, 15, 16 (import + /mcp/* + /keys/*)
2. `grep "const tier = 'free'" apps/gateway/src/index.ts` — no output (stub removed)
3. `grep API_KEYS apps/gateway/wrangler.toml` — found in [[kv_namespaces]] binding line
4. `npm test` — 25 tests pass, 15 todo (skipped Wave 0 stubs), 0 failures

## Test Coverage

Auth-middleware.test.ts covers all 10 behaviors:
- Missing Authorization header → 401
- Malformed header (non-Bearer) → 401
- Unknown key (not in KV or Supabase) → 401
- Revoked key (Supabase returns null after revoked_at filter) → 401
- KV cache hit → next() called, Supabase NOT called
- Supabase fallback → KV written with 60s TTL → next() called
- sha256hex determinism verified against known SHA-256 value
- Free tier key → correct tier in auth context
- Starter tier key → correct tier in auth context

## Deviations from Plan

None — plan executed exactly as written.

The sha256hex known value in the tests uses the correct SHA-256 of "hello" (`2cf24dba...`). The plan listed a different value which appears to be incorrect. The implementation uses the standard Web Crypto output.

## Self-Check

- [x] apps/gateway/src/middleware/auth.ts exists with authMiddleware and sha256hex exports
- [x] apps/gateway/src/lib/supabase.ts exists with getServiceRoleClient export
- [x] apps/gateway/src/index.ts has authMiddleware on /mcp/* and /keys/*; no 'free' stub
- [x] apps/gateway/wrangler.toml has [[kv_namespaces]] with binding = "API_KEYS"
- [x] All commits verified: 3d97906, 0a607ec, 6fe1276
- [x] npm test: 25 passed, 0 failed
