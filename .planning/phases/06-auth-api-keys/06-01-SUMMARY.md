---
phase: 06-auth-api-keys
plan: "01"
subsystem: gateway/auth
tags: [types, schema, rls, tdd, wave-0]
dependency_graph:
  requires: []
  provides:
    - GatewayEnv type (apps/gateway/src/types.ts)
    - AuthContext type (apps/gateway/src/types.ts)
    - api_keys SQL migration (apps/gateway/supabase/migrations/001_api_keys.sql)
    - Wave 0 test stubs (auth-middleware, keys, auth-supabase, rls-isolation)
  affects:
    - apps/gateway/src/middleware/auth.ts (imports GatewayEnv — Plan 02)
    - apps/gateway/src/routes/keys.ts (imports GatewayEnv — Plan 03)
    - apps/gateway/src/index.ts (uses GatewayEnv — Plan 02)
tech_stack:
  added: []
  patterns:
    - AuthContext defined in types.ts to avoid circular import with middleware/auth.ts
    - Wave 0 nyquist compliance — test stubs created before implementation
    - RLS policy uses FOR ALL with USING + WITH CHECK for full tenant isolation
key_files:
  created:
    - apps/gateway/src/types.ts
    - apps/gateway/supabase/migrations/001_api_keys.sql
    - apps/gateway/src/__tests__/auth-middleware.test.ts
    - apps/gateway/src/__tests__/keys.test.ts
    - apps/gateway/src/__tests__/auth-supabase.test.ts
    - apps/gateway/src/__tests__/rls-isolation.test.ts
  modified: []
decisions:
  - "AuthContext defined in types.ts (not middleware/auth.ts) to prevent circular import — auth.ts imports from types.ts, never the reverse"
  - "RLS policy uses FOR ALL with both USING and WITH CHECK — SELECT-only USING would allow cross-tenant inserts"
  - "Wave 0 test stubs use it.todo() pattern — zero hard import errors, npm test green with 23 todo stubs"
metrics:
  duration: "2 minutes"
  completed_date: "2026-03-22"
  tasks_completed: 3
  files_created: 6
---

# Phase 6 Plan 01: Foundation — Types, Migration, Test Stubs Summary

GatewayEnv + AuthContext TypeScript types, api_keys SQL migration with RLS, and 4 Wave 0 test stub files covering all AUTH-01 through AUTH-05 requirements.

## What Was Built

### Task 1: GatewayEnv type definition (types.ts)

Created `apps/gateway/src/types.ts` exporting:
- `AuthContext`: `{ userId: string; tier: string; keyId: string }` — the auth payload attached to every request context
- `GatewayEnv`: Hono generic type with `Bindings` (API_KEYS KVNamespace, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and `Variables` (auth: AuthContext)

TypeScript check passes clean (`tsc --noEmit` zero errors).

### Task 2: SQL migration — api_keys table + RLS

Created `apps/gateway/supabase/migrations/001_api_keys.sql`:
- `api_keys` table with uuid primary key, user_id FK to auth.users, key_hash (UNIQUE), key_prefix, name, tier (CHECK constraint), revoked_at, created_at
- Performance indexes: `idx_api_keys_user_id` and `idx_api_keys_key_hash`
- `ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY`
- Policy `users_own_keys`: FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())

### Task 3: Wave 0 test stubs (red)

Created 4 test files totalling 23 todo stubs:
- `auth-middleware.test.ts`: 8 stubs for AUTH-03 and AUTH-04 (missing/invalid keys, valid key caching, tier attachment)
- `keys.test.ts`: 9 stubs for AUTH-02 and AUTH-05 (key creation, deletion, user isolation)
- `auth-supabase.test.ts`: 4 stubs for AUTH-01 (sign-up, sign-in flows)
- `rls-isolation.test.ts`: 2 stubs for AUTH-05 DB-layer RLS verification

`npm test` result: 15 passed (integration tests), 23 todo (new stubs), 0 failures.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Created files verified:
- `apps/gateway/src/types.ts` — FOUND
- `apps/gateway/supabase/migrations/001_api_keys.sql` — FOUND
- `apps/gateway/src/__tests__/auth-middleware.test.ts` — FOUND
- `apps/gateway/src/__tests__/keys.test.ts` — FOUND
- `apps/gateway/src/__tests__/auth-supabase.test.ts` — FOUND
- `apps/gateway/src/__tests__/rls-isolation.test.ts` — FOUND

Commits verified:
- 6fcf37f — feat(06-01): add GatewayEnv and AuthContext type definitions
- 0146059 — feat(06-01): add api_keys SQL migration with RLS
- b6d2bcb — test(06-01): add Wave 0 failing test stubs for auth and key management

## Self-Check: PASSED
