---
phase: 06-auth-api-keys
plan: 03
subsystem: gateway-keys
tags: [auth, api-keys, crud, kv-invalidation, supabase, hono, tdd]
dependency_graph:
  requires: [06-02]
  provides: [keysRouter, POST /keys, DELETE /keys/:id, GET /keys]
  affects: [apps/gateway/src/index.ts]
tech_stack:
  added: []
  patterns: [hono-router, web-crypto-random-bytes, sha256-key-hashing, kv-immediate-eviction, 2-key-per-user-limit]
key_files:
  created:
    - apps/gateway/src/routes/keys.ts
    - apps/gateway/src/__tests__/keys.test.ts
  modified:
    - apps/gateway/src/index.ts
decisions:
  - "DELETE /keys/:id uses .eq('user_id', auth.userId) guard returning 404 (not 403) for cross-user attempts — consistent with RFC 7231 not leaking resource existence"
  - "key_prefix = rawKey.slice(0, 16) = 'sk_test_' + first 8 hex chars — enough entropy to identify key without exposing full value"
  - "KV delete called synchronously before returning 200 — ensures revoked key is immediately invalid, not after 60s TTL"
metrics:
  duration: "3 minutes"
  completed: "2026-03-22"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 6 Plan 03: Keys CRUD Router Summary

**One-liner:** POST /keys generates sk_test_-prefixed 72-char API keys with SHA-256 hash stored, DELETE /keys/:id revokes in DB and immediately evicts KV, GET /keys returns list without key_hash.

## What Was Built

The `/keys` management endpoints are complete. Developers can now create and revoke API keys from the gateway:

- **POST /keys**: Generates `sk_test_` + 64 hex chars (32 crypto random bytes) = 72 chars total. `key_prefix` = first 16 chars. SHA-256 hash stored in Supabase. Raw key returned once in response — never stored, never returned again. 2-key-per-user limit enforced (409 if >= 2 active keys).
- **DELETE /keys/:id**: Fetches row with `.eq('id', keyId).eq('user_id', auth.userId)` — cross-user attempts return 404 (not 403, not leaking resource existence). Sets `revoked_at` in DB and immediately calls `c.env.API_KEYS.delete(key_hash)` before returning 200.
- **GET /keys**: Returns array of `{ id, key_prefix, name, tier, created_at, revoked_at }` ordered by `created_at DESC`. `key_hash` is never included in any response.

`keysRouter` is mounted in `index.ts` at `/keys` — the `/keys/*` authMiddleware guard (added in Plan 02) covers all three routes.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | /keys CRUD router + tests | 43e9a69 | routes/keys.ts, __tests__/keys.test.ts |
| 2 | Mount keysRouter in index.ts | eb670ab | index.ts |

## Verification Results

1. `grep "keysRouter" apps/gateway/src/index.ts` — two lines: import + `app.route('/keys', keysRouter)`
2. `grep "revoked_at" apps/gateway/src/routes/keys.ts` — appears in GET select, DELETE fetch guard, and DELETE update
3. `grep "API_KEYS.delete" apps/gateway/src/routes/keys.ts` — present (immediate KV eviction on revoke)
4. `grep "key_hash" apps/gateway/src/routes/keys.ts` — only in insert body, internal DELETE select, and KV delete — never in GET select returned to client
5. `npm test` — 34 tests pass, 6 todo (skipped Wave 0 stubs), 0 failures

## Test Coverage

keys.test.ts covers 9 behaviors:
- POST returns 201 with `{ id, key_prefix, tier, created_at, key }` where key starts with `sk_test_`
- key field is exactly 72 chars
- POST with 2 active keys returns 409 with `Key limit reached (2 per user)`
- DELETE returns 200 `{ success: true }` and calls `kv.delete(key_hash)`
- DELETE with nonexistent key returns 404
- DELETE with another user's key returns 404 (user_id guard)
- GET returns 200 array without `key_hash` field
- GET returns empty array when user has no keys
- AUTH-05: User B DELETE on User A key returns 404

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] apps/gateway/src/routes/keys.ts exists with keysRouter, GET, POST, DELETE handlers
- [x] apps/gateway/src/__tests__/keys.test.ts exists with 9 real tests (replaced todo stubs)
- [x] apps/gateway/src/index.ts has `import { keysRouter }` and `app.route('/keys', keysRouter)`
- [x] All commits verified: 43e9a69, eb670ab
- [x] npm test: 34 passed, 0 failed
