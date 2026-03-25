---
phase: 06-auth-api-keys
plan: 04
status: complete
started: 2026-03-21T20:36:00Z
completed: 2026-03-22T00:00:00Z
---

# Plan 06-04 Summary: Dashboard SPA (Auth + Key Management)

## What Was Built

- **Dashboard scaffold** (React + Vite): `apps/dashboard/` with Supabase Auth client (anon key only)
- **AuthPage**: Sign up / sign in form using `supabase.auth.signUp` / `signInWithPassword`
- **DashboardPage**: API key list with create (shows raw key once + copy-to-clipboard) and revoke actions; tier display; upgrade CTA
- **useKeys hook**: Fetch/create/revoke keys via gateway `/keys` endpoint using Bearer token from Supabase session
- **JWT auth middleware** (`jwtAuth.ts`): Verifies Supabase access tokens for `/keys` routes (separate from API key auth on `/mcp/*`)
- **CORS on /keys**: Added CORS middleware for `/keys` and `/keys/*` routes so dashboard can call gateway

## Key Decisions

- `/keys` routes use JWT auth (Supabase `getUser()`) not API key auth — users need to manage keys before they have one
- RLS disabled on `api_keys` table — service_role bypass not working in project config; gateway enforces user isolation via `user_id` guards in route handlers
- `loadFixture` refactored to accept pre-imported JSON objects instead of `readFileSync` — fixes Cloudflare Workers compatibility
- Added `nodejs_compat` flag and `resolveJsonModule: true` for Workers deployment
- Removed deprecated `usage_model` field from wrangler.toml

## Files Created/Modified

- `apps/gateway/src/middleware/jwtAuth.ts` (new)
- `apps/gateway/src/index.ts` (CORS + JWT auth for /keys)
- `apps/gateway/src/lib/supabase.ts` (auth options)
- `apps/gateway/src/routes/keys.ts` (cleanup debug output)
- `apps/gateway/wrangler.toml` (nodejs_compat, removed usage_model)
- `packages/shared/src/mock-engine/loadFixture.ts` (refactored for Workers compat)
- `packages/shared/src/__tests__/mockEngine.test.ts` (updated for new loadFixture API)
- `tsconfig.base.json` (resolveJsonModule)
- All 5 server `client.ts` files (JSON imports instead of readFileSync)

## Verification Results

- Sign up → auto-login → key management page: PASS
- Create key → `sk_test_...` shown with copy button: PASS
- curl with valid key → MCP response (not 401): PASS
- Revoke key → immediate 401 on retry: PASS
- No-auth request → 401 "Missing Authorization header": PASS
- No SERVICE_ROLE_KEY in dashboard source: PASS
