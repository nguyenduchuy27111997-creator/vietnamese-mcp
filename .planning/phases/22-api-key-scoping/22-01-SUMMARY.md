---
phase: 22-api-key-scoping
plan: 01
subsystem: api
tags: [hono, supabase, cloudflare-workers, kv, api-keys, scoping, rbac]

# Dependency graph
requires:
  - phase: 06-auth-keys
    provides: "api_keys table in Supabase; auth middleware; keys CRUD router; KV cache pattern"
provides:
  - "allowed_servers TEXT[] column via migration SQL"
  - "AuthContext.allowedServers field in types.ts"
  - "Auth middleware reads and caches allowedServers from Supabase"
  - "GET /keys and POST /keys handle allowed_servers field"
  - "scopeCheckMiddleware returns 403 for out-of-scope server requests"
  - "null allowedServers = all servers allowed (backward compatible)"
affects:
  - "dashboard app — key management UI should expose allowed_servers field"
  - "Phase 22-02 onwards — scoping is now enforced at gateway layer"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scope enforcement as a separate middleware (scopeCheckMiddleware) mounted after authMiddleware"
    - "null semantics: null allowedServers = all servers; array (even empty) = explicit list"
    - "VALID_SERVERS constant in keys route validates POST body"

key-files:
  created:
    - apps/gateway/supabase/migrations/20260327_add_allowed_servers.sql
    - apps/gateway/src/middleware/scopeCheck.ts
    - apps/gateway/src/__tests__/keys-scope.test.ts
    - apps/gateway/src/__tests__/scope.test.ts
  modified:
    - apps/gateway/src/types.ts
    - apps/gateway/src/middleware/auth.ts
    - apps/gateway/src/routes/keys.ts
    - apps/gateway/src/index.ts

key-decisions:
  - "allowedServers made optional (?) in AuthContext type to preserve backward compatibility with existing tests and code that constructs AuthContext without it"
  - "scopeCheckMiddleware extracted as a dedicated middleware file rather than inline code in index.ts, enabling isolated unit testing"
  - "Empty allowedServers array ([]) blocks all servers — consistent with allowedServers being an explicit whitelist"

patterns-established:
  - "Scope check middleware pattern: read auth context, check param against allowedServers, return 403 or next()"
  - "VALID_SERVERS whitelist in POST /keys prevents invalid server names at creation time"

requirements-completed: [SCOPE-01, SCOPE-03]

# Metrics
duration: 2min
completed: 2026-03-27
---

# Phase 22 Plan 01: API Key Scoping Summary

**API key server scoping via allowed_servers TEXT[] column, AuthContext extension, and scopeCheckMiddleware returning 403 for out-of-scope MCP requests**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-27T03:54:57Z
- **Completed:** 2026-03-27T03:57:25Z
- **Tasks:** 2
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments
- Added `allowed_servers TEXT[]` migration for `api_keys` table; NULL = all servers (backward compatible)
- Extended `AuthContext` with `allowedServers?: string[] | null`; auth middleware reads and caches the field from Supabase
- Updated keys CRUD: GET returns `allowed_servers`, POST validates entries against 5 known servers and returns 400 for unknowns
- Created `scopeCheckMiddleware` — mounted on `/mcp/:server` after `authMiddleware`; returns 403 with clear error message for out-of-scope requests
- 19 new tests across 2 test files; all 105 gateway tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration, types, auth middleware, and keys CRUD update** - `172c549` (feat)
2. **Task 2: Gateway scope enforcement (403) with tests** - `6374a95` (feat)

**Plan metadata:** (docs commit — see below)

_Note: TDD tasks each had RED test file committed with implementation in a single atomic commit per task._

## Files Created/Modified
- `apps/gateway/supabase/migrations/20260327_add_allowed_servers.sql` - Migration: ALTER TABLE api_keys ADD COLUMN allowed_servers TEXT[]
- `apps/gateway/src/types.ts` - Added `allowedServers?: string[] | null` to AuthContext
- `apps/gateway/src/middleware/auth.ts` - Selects `allowed_servers` from Supabase, populates AuthContext.allowedServers
- `apps/gateway/src/routes/keys.ts` - GET includes `allowed_servers`; POST validates and inserts `allowed_servers`
- `apps/gateway/src/middleware/scopeCheck.ts` - New middleware: 403 if allowedServers excludes requested server
- `apps/gateway/src/index.ts` - Imports and mounts scopeCheckMiddleware on `/mcp/:server`
- `apps/gateway/src/__tests__/keys-scope.test.ts` - Tests for allowed_servers in keys CRUD (5 tests)
- `apps/gateway/src/__tests__/scope.test.ts` - Tests for scopeCheckMiddleware (5 tests)

## Decisions Made
- Made `allowedServers` optional (`?`) in `AuthContext` rather than required — preserves backward compatibility with all existing code and tests that construct `AuthContext` without the field
- Extracted scope check into `scopeCheckMiddleware` rather than inlining in `/mcp/:server` handler — cleaner separation of concerns and enables isolated unit testing
- Empty array `[]` blocks all servers — consistent with "allowedServers is a whitelist" semantics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Migration must be applied to Supabase before scoping is enforced:**
```sql
ALTER TABLE api_keys ADD COLUMN allowed_servers TEXT[];
```
The migration file is at: `apps/gateway/supabase/migrations/20260327_add_allowed_servers.sql`

Run via Supabase CLI: `supabase db push` or apply manually in the Supabase SQL editor.

## Next Phase Readiness
- Scoping infrastructure is complete — gateway enforces `allowed_servers` on every MCP request
- Dashboard app (Phase 22 subsequent plans) can now add UI for selecting servers when creating a key
- The `VALID_SERVERS` constant in `keys.ts` can be imported if needed by dashboard or other consumers

---
*Phase: 22-api-key-scoping*
*Completed: 2026-03-27*

## Self-Check: PASSED

All artifacts verified:
- migration SQL: FOUND
- types.ts (allowedServers): FOUND
- auth.ts (allowed_servers): FOUND
- keys.ts (allowed_servers): FOUND
- scopeCheck.ts: FOUND
- index.ts (scopeCheckMiddleware): FOUND
- scope.test.ts: FOUND
- SUMMARY.md: FOUND

Commits verified:
- 172c549 (Task 1): FOUND
- 6374a95 (Task 2): FOUND
