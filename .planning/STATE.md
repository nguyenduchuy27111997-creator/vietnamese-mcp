---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Platform Launch
status: completed
stopped_at: Completed 10-01-PLAN.md (Mintlify scaffold)
last_updated: "2026-03-25T04:14:27.616Z"
last_activity: "2026-03-23 — Phase 8 Plan 02 (Stripe) complete. Next: Phase 8 Plan 03 (MoMo provider)"
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 16
  completed_plans: 15
  percent: 92
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Developer installs MCP server, adds to `.mcp.json`, and Claude Code can immediately create payments, check transactions, send messages — zero integration boilerplate.
**Current focus:** v1.1 Platform Launch — Phase 7: Metering (ready to plan)

## Current Position

Phase: 8 of 10 (Phase 8: Billing) — IN PROGRESS (Plan 2 of 3 complete)
Status: 08-01 foundation + 08-02 Stripe complete; Plan 03 (MoMo) remaining
Last activity: 2026-03-23 — Phase 8 Plan 02 (Stripe) complete. Next: Phase 8 Plan 03 (MoMo provider)

Progress: [█████████░] 92% (11 of 12 plans complete)

## Performance Metrics

**Velocity (from v1.0):**
- Total plans completed: 18
- Average duration: ~3.4 min/plan

**v1.1 plans:** 7 completed (of TBD total)

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table.

**Phase 5 decisions (made in 05-01):**
- Gateway: tsconfig uses `@cloudflare/workers-types` only, no `@types/node` — prevents Request/Response/ReadableStream type conflicts
- Gateway: Server exports reference `./src/tools/index.ts` (source) not build artifact — monorepo imports work without build step

**Phase 6 decisions (made in 06-01):**
- Auth: AuthContext defined in types.ts (not middleware/auth.ts) to prevent circular import
- Auth: Wave 0 test stubs use it.todo() — zero hard import errors, npm test green

**Phase 6 decisions (made in 06-02):**
- Auth: sha256hex exported from auth.ts (not private) — enables deterministic test assertions and future key generation reuse
- Auth: KV get uses { type: 'json' } option — matches CF Workers typed get API for AuthContext deserialization

**Phase 6 decisions (made in 06-03):**
- Keys: DELETE /keys/:id returns 404 (not 403) for cross-user attempts — consistent with RFC 7231 not leaking resource existence
- Keys: key_prefix = rawKey.slice(0, 16) = 'sk_test_' + first 8 hex chars — enough entropy to identify key without exposing full value
- Keys: KV delete called synchronously before returning 200 — ensures revoked key is immediately invalid, not after 60s TTL

**Phase 6 decisions (made in 06-04):**
- /keys routes use JWT auth (supabase.auth.getUser) not API key auth — users manage keys before having one
- RLS disabled on api_keys — service_role bypass not working in Supabase project config; gateway enforces user isolation in route handlers
- loadFixture refactored to accept imported JSON objects — fixes CF Workers (no readFileSync)
- Added nodejs_compat flag for Workers; resolveJsonModule for TS
- Removed deprecated usage_model from wrangler.toml

Pending v1.1 decisions (to be made during planning):
- Billing: Launch Stripe-only first; submit MoMo merchant application at Phase 8 start
- Auth: Import only `tools/index.ts` from servers — never `index.ts` (crashes CF Workers)
- [Phase 05-gateway]: Test pattern: create fresh McpServer per test — module-scope servers can only be connected to one transport at a time
- [Phase 05-gateway]: CORS function origin: Hono cors does exact string matching on arrays; use function form for localhost:* wildcard
- [Phase 05-gateway]: SSE heartbeat: ': ping\n\n' every 30s via TransformStream, 5-min idle timeout, non-SSE responses returned unchanged
- [Phase 07-metering]: Metering: TIER_LIMITS business: Infinity + checkUsageLimit short-circuits for business tier
- [Phase 07-metering]: Metering: usageKey uses UTC date (usage:{keyId}:YYYY-MM) for consistent timezone-safe KV buckets
- [Phase 07-metering]: Metering: sendTinybirdEvent fire-and-forget — catches all errors, logs via console.error, never rethrows
- [Phase 07-metering]: Usage route requires JWT auth (not API key auth) — users query their own aggregate usage from dashboard
- [Phase 07-metering]: Business tier skips KV read/write entirely in MCP route — zero overhead path
- [Phase 07-metering]: TINYBIRD_HOST added as wrangler.toml var (not secret) — host URL is not sensitive; TOKEN stays as secret
- [Phase 08-billing]: Billing foundation (Plan 01) built before Stripe/MoMo providers to share tier-upgrade logic in one place
- [Phase 08-billing]: stripe_customer_id placed on api_keys table (not separate users_billing table) — simpler, consistent schema
- [Phase 08-billing]: Test env partial objects cast to 'as unknown as GatewayEnv[Bindings]' after adding 8 required billing fields
- [Phase 08-billing]: Stripe client created per-request via createStripeClient(env.STRIPE_SECRET_KEY) — CF Workers env only available inside handler
- [Phase 08-billing]: invoice.paid uses invoice.parent.subscription_details.metadata for tier (Stripe v17+ API) — avoids extra subscriptions.retrieve() call
- [Phase 08-billing]: JWT auth on /billing/create-checkout and /billing/portal only — stripe-webhook uses its own signature verification
- [Phase 08-billing]: MoMo IPN returns HTTP 204 (not 200) per MoMo callback protocol requirement
- [Phase 08-billing]: Mock-first MoMo provider returns test-payment.momo.vn URL until merchant KYC approved
- [Phase 08-billing]: momo_expires_at set 30 days from IPN receipt tracking one-time MoMo payment expiry
- [Phase 08-billing]: UpgradeSection inline on DashboardPage with two side-by-side buttons per locked CONTEXT.md decision
- [Phase 09-npm-publishing]: Build script changed from tsdown (outputs dist/) to tsc --noCheck (outputs build/ per tsconfig outDir) — matches exports/bin fields and produces multi-file structure
- [Phase 09-npm-publishing]: tsc --noCheck used for all 6 server/shared builds — pre-existing type errors in src/client.ts (_mock type mismatch) are out-of-scope, transpile-only is sufficient for publishing
- [Phase 10-landing-page-docs]: docs.json (not mint.json) — config file renamed February 2025; unified navigation object with nested tabs/groups
- [Phase 10-landing-page-docs]: Single quickstart page with Tabs (no page splitting) — locked CONTEXT.md decision; Hosted (API Key) and Self-Hosted (npm) tabs

### Pending Todos

None.

### Blockers/Concerns

- [Phase 8] MoMo merchant account requires 3-7 business day KYC approval — submit at Phase 8 start, not end
- [Phase 8] MoMo Business subscription IPN field ordering differs from payment gateway IPN — verify before implementation; run /gsd:research-phase for Phase 8
- [Phase 10] Mintlify free tier custom domain support unconfirmed — verify before Phase 10 planning

## Session Continuity

Last session: 2026-03-25T04:14:27.614Z
Stopped at: Completed 10-01-PLAN.md (Mintlify scaffold)
Resume file: None
