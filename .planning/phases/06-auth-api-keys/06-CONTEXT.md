# Phase 6: Auth & API Keys - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add user authentication (Supabase Auth) and API key management to the gateway. Users sign up, generate API keys scoped to their tier, and the gateway authenticates every request via API key in Authorization header with KV caching. The gateway's existing `tier = 'free'` stub gets replaced with real auth. Dashboard UI is a minimal key manager on Cloudflare Pages.

</domain>

<decisions>
## Implementation Decisions

### API Key Format
- Stripe-style prefixes: `sk_test_` (mock mode) and `sk_live_` (real APIs, future)
- Keys are 32+ random hex chars after prefix: `sk_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4`
- Keys sent via `Authorization: Bearer sk_test_...` header
- SHA-256 hash stored in DB (never store raw keys)
- Key shown to user once on creation, masked after (`sk_test_a1b2...f6g7`)
- 2 keys per user maximum (one dev, one prod)

### Dashboard UI
- Minimal key manager: single page with sign up/login + API key list (create, revoke, copy)
- No usage charts or billing management — those come in Phases 7 and 8
- Hosted on Cloudflare Pages (same account as Workers gateway)
- Shows current tier, key count, and upgrade CTA
- Framework: Claude's discretion (React or plain HTML)

### KV Cache Strategy
- CF Workers KV caches API key lookups (avoid Supabase round-trip per request)
- TTL: 60 seconds — revoked keys stop working within 1 minute
- Cache key: SHA-256 of the API key → JSON with user_id, tier, key_id
- Cold start: miss → Supabase lookup → cache result in KV
- On key revoke: delete KV entry immediately (don't wait for TTL)

### Supabase Schema
- SQL migrations in `apps/gateway/supabase/migrations/` — version-controlled, reproducible
- Supabase project not yet created — plan should include setup instructions
- Tables needed: `api_keys` (key_hash, user_id, tier, name, created_at, revoked_at)
- RLS: users can only read/write their own keys
- Tier stored on api_keys table (not user profile) — allows per-key tier flexibility

### Claude's Discretion
- Exact Supabase auth configuration (email confirmation on/off)
- Dashboard CSS framework / styling approach
- KV namespace naming convention
- Supabase client initialization pattern in CF Workers
- Whether to use `@supabase/ssr` or direct `@supabase/supabase-js`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Gateway Integration
- `apps/gateway/src/index.ts` — Contains `tier = 'free'` stub that Phase 6 replaces with real auth
- `apps/gateway/src/tierAccess.ts` — `checkTierAccess(serverName, tier)` already accepts tier parameter
- `.planning/phases/05-gateway/05-CONTEXT.md` — Phase 5 decisions (per-server routes, tier error format)

### Research
- `.planning/research/ARCHITECTURE.md` — Auth middleware design, KV cache pattern
- `.planning/research/STACK.md` — Supabase package versions, CF Workers compatibility
- `.planning/research/PITFALLS.md` — Supabase RLS silent failure modes, service role key bypass

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `checkTierAccess(serverName, tier)` in `tierAccess.ts` — already handles tier-based server access, returns MCP -32001 error
- Hono middleware pattern established in `index.ts` — CORS middleware applied via `app.use('/mcp/*', ...)`
- `wrangler.toml` already exists — add KV namespace binding here

### Established Patterns
- Gateway uses `GatewayEnv = { Bindings: Record<string, string> }` Hono type — extend with KV binding
- All gateway errors are MCP JSON-RPC format (not HTTP status codes)
- `apps/gateway/` is a CF Workers workspace package with vitest

### Integration Points
- `index.ts` line `const tier = 'free'` → replace with auth middleware that extracts tier from API key
- KV binding in `wrangler.toml` → accessible via `c.env.API_KEYS` in Hono handlers
- Supabase client needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Worker secrets

</code_context>

<specifics>
## Specific Ideas

- Dashboard should feel like Stripe's API key page — clean, minimal, copy-to-clipboard
- `sk_test_` / `sk_live_` prefix instantly signals to developers what environment they're in

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-auth-api-keys*
*Context gathered: 2026-03-21*
