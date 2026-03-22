# Phase 7: Metering - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Every tool call emitted through the gateway is logged to Tinybird non-blocking, monthly call counts are queryable per key via a gateway endpoint, and the gateway hard-stops requests when a tier limit is reached. Dashboard gets a usage bar.

</domain>

<decisions>
## Implementation Decisions

### Event Pipeline
- Fire-and-forget via `ctx.waitUntil` — zero latency impact on MCP responses
- Minimal payload: `api_key_id`, `server`, `tool`, `timestamp`, `response_status`
- Hook point: after tool execution — only counts successful tool calls, not auth failures or tier blocks
- On Tinybird ingestion failure: silent drop with `console.error` — metering is best-effort, never blocks user requests

### Limit Enforcement
- KV counter per key per month: key format `usage:{keyId}:YYYY-MM`, increment on each call
- Check order: tier access → usage check → tool execution
- MCP JSON-RPC error code `-32002` when limit hit — consistent with existing `-32001` tier error, includes limit info + upgrade URL
- Business tier (`unlimited`): skip KV counter read/write entirely — zero overhead for premium users
- Tier limits: free 1k/mo, starter 10k/mo, pro 100k/mo, business unlimited

### Usage Query API
- `GET /usage` endpoint on gateway — reads KV counter, same JWT auth as `/keys`
- Response: `{used, limit, period, tier, resetsAt}` — summary only, no per-server breakdown
- Dashboard: add minimal usage bar to DashboardPage — "847 / 1,000 calls this month" with progress bar

### Tinybird Setup
- No account yet — plan includes full setup: create workspace, define data source, create API pipe, set auth token
- Start with Tinybird free tier (1k events/day ≈ 30k/month) — upgrade when needed
- Auth token stored as Worker secret: `wrangler secret put TINYBIRD_TOKEN`

### Claude's Discretion
- Tinybird data source schema column types and sorting key
- KV counter key naming convention details
- Exact usage bar UI styling in dashboard
- Whether to create a Tinybird API pipe for analytics queries (beyond what KV provides)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Gateway Integration
- `apps/gateway/src/index.ts` — Main Hono app; metering middleware hooks in here
- `apps/gateway/src/router.ts` — `handleMcpRequest()` where tool execution happens; metering fires after this returns
- `apps/gateway/src/tierAccess.ts` — Existing `-32001` tier error format; `-32002` usage limit error follows same pattern
- `apps/gateway/src/middleware/auth.ts` — API key auth provides `AuthContext` with `keyId` and `tier`
- `apps/gateway/src/middleware/jwtAuth.ts` — JWT auth for `/keys` and `/usage` endpoints
- `apps/gateway/src/types.ts` — `GatewayEnv` type needs `TINYBIRD_TOKEN` binding

### Dashboard
- `apps/dashboard/src/pages/DashboardPage.tsx` — Add usage bar here
- `apps/dashboard/src/hooks/useKeys.ts` — Pattern for gateway API calls with JWT auth

### Prior Phase Context
- `.planning/phases/06-auth-api-keys/06-CONTEXT.md` — KV cache pattern, auth middleware design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ctx.waitUntil()` available in CF Workers — use for fire-and-forget Tinybird ingestion
- `c.env.API_KEYS` KV namespace already bound — add usage counter to same namespace or create separate one
- `jwtAuthMiddleware` — reuse for `/usage` endpoint auth (same as `/keys`)
- `GatewayEnv` type — extend with `TINYBIRD_TOKEN` string binding

### Established Patterns
- KV caching with TTL in auth middleware — same pattern for usage counters (no TTL, manual reset)
- MCP JSON-RPC error format in `tierAccess.ts` — `-32002` follows same structure
- Worker secrets via `wrangler secret put` — same pattern for `TINYBIRD_TOKEN`
- CORS config already handles `/keys` — extend to `/usage`

### Integration Points
- `router.ts:handleMcpRequest()` — metering fires after this returns, inside `ctx.waitUntil`
- `index.ts` app.all('/mcp/:server') handler — has access to `c.get('auth')` and `c.executionCtx`
- `wrangler.toml` — may need second KV namespace for usage counters (or reuse API_KEYS)
- Dashboard `DashboardPage.tsx` — add usage fetch + bar component

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-metering*
*Context gathered: 2026-03-22*
