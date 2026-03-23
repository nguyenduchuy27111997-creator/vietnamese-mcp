# Roadmap: VN MCP Hub

## Milestones

- ✅ **v1.0 MCP Servers** — Phases 1-4 (shipped 2026-03-21)
- 🚧 **v1.1 Platform Launch** — Phases 5-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MCP Servers (Phases 1-4) — SHIPPED 2026-03-21</summary>

- [x] Phase 1: Monorepo Foundation (3/3 plans) — completed 2026-03-18
- [x] Phase 2: MoMo Server (3/3 plans) — completed 2026-03-18
- [x] Phase 3: ZaloPay + VNPAY Servers (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Zalo OA + ViettelPay Servers (3/3 plans) — completed 2026-03-18

</details>

### 🚧 v1.1 Platform Launch (In Progress)

**Milestone Goal:** Transform local-only MCP servers into a hosted SaaS platform with metered billing, so developers can connect via SSE transport without running anything locally.

- [x] **Phase 5: Gateway** — All 5 MCP servers reachable via Streamable HTTP on Cloudflare Workers (completed 2026-03-20)
- [x] **Phase 6: Auth & API Keys** — Users can sign up, generate API keys, and be authenticated at the gateway (completed 2026-03-22)
- [x] **Phase 7: Metering** — Every tool call is counted, enforced, and queryable per billing period (completed 2026-03-23)
- [x] **Phase 8: Billing** — Stripe (USD) and MoMo (VND) payments upgrade user tiers in Supabase (completed 2026-03-23)
- [ ] **Phase 9: npm Publishing** — All 5 servers published to npm under @vn-mcp scope for self-hosted use
- [ ] **Phase 10: Landing Page & Docs** — Mintlify site with pricing, quickstart, and per-server tool reference

## Phase Details

### Phase 5: Gateway
**Goal**: All 5 MCP servers are reachable via Streamable HTTP transport on a single Cloudflare Workers endpoint, with correct tool routing, CORS, and stateless SSE
**Depends on**: Phase 4 (v1.0 monorepo with server tool packages)
**Requirements**: GATE-01, GATE-02, GATE-03, GATE-04, GATE-05
**Success Criteria** (what must be TRUE):
  1. A client sending `tools/list` to `/mcp/:server` receives all tools for that server — 18 tools total across 5 server routes
  2. A tool call through the gateway returns the same mock response as calling the server directly via stdio
  3. Two concurrent SSE clients on different server routes receive isolated events with no cross-connection bleed
  4. An SSE connection stays alive for 60+ seconds idle (heartbeat active; no CF Workers CPU timeout)
  5. Browser-based MCP clients can connect — OPTIONS preflight returns correct CORS headers
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md — Workspace scaffolding: `apps/*` workspace glob, server `./tools` subpath exports, gateway package with wrangler.toml (`usage_model = "unbound"`), tsconfig, vitest config, and Wave 0 test stubs
- [ ] 05-02-PLAN.md — Gateway core: serverRegistry.ts (5 McpServer instances at module scope), tierAccess.ts (MCP error -32001), router.ts (stateless transport per request), cors.ts, index.ts (Hono app), concrete GATE-01–GATE-05 tests
- [ ] 05-03-PLAN.md — SSE heartbeat: heartbeat.ts (`wrapWithHeartbeat` via TransformStream), router.ts update, human smoke test via wrangler dev

### Phase 6: Auth & API Keys
**Goal**: Users can sign up, generate API keys scoped to their tier, and the gateway authenticates every request against those keys with KV caching and RLS isolation
**Depends on**: Phase 5
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. A new user can sign up with email/password, log in, and generate an API key from a dashboard UI
  2. A request with a valid API key passes gateway authentication; an invalid or revoked key returns a 401 within the same request
  3. A revoked API key is rejected at the gateway within 60 seconds (KV cache TTL)
  4. A Free-tier key cannot access more than 2 servers — requests to restricted servers return a tier error
  5. Two separate user accounts cannot read or write each other's API keys or subscription data (RLS isolation)
**Plans**: 4 plans

Plans:
- [ ] 06-01-PLAN.md — Foundation: GatewayEnv types (types.ts), api_keys SQL migration with RLS + indexes, Wave 0 failing test stubs
- [ ] 06-02-PLAN.md — Auth core: authMiddleware (Bearer → SHA-256 → KV → Supabase), getServiceRoleClient factory, index.ts wiring (replace const tier stub), wrangler.toml KV binding
- [ ] 06-03-PLAN.md — Key CRUD: /keys router (GET list, POST create sk_test_ key, DELETE revoke + KV evict), mounted in index.ts
- [ ] 06-04-PLAN.md — Dashboard: React + Vite SPA on CF Pages with Supabase Auth sign up/login, key list, create, revoke; human smoke test gate

### Phase 7: Metering
**Goal**: Every tool call emitted through the gateway is logged to Tinybird non-blocking, monthly call counts are queryable per key, and the gateway hard-stops requests when a tier limit is reached
**Depends on**: Phase 6
**Requirements**: METR-01, METR-02, METR-03, METR-04
**Success Criteria** (what must be TRUE):
  1. A tool call appears in Tinybird with correct api_key_id, server, tool, and timestamp within 5 seconds
  2. A 1000-event ingestion batch shows exactly 1000 events in Tinybird (zero quarantined rows)
  3. A Free-tier key that has made 1000 calls in the current month receives an MCP-formatted error on call 1001 — not a plain HTTP 429
  4. Gateway response time is not measurably increased by metering — events are fire-and-forget via ctx.waitUntil
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Metering core: GatewayEnv TINYBIRD_TOKEN binding, tinybird.ts fire-and-forget event sender, usageCounter.ts KV counter with tier limits and -32002 error, full unit tests
- [ ] 07-02-PLAN.md — Gateway wiring + dashboard: index.ts metering hook (usage check before, waitUntil after), /usage route, integration tests, dashboard usage bar, Tinybird account setup checkpoint

### Phase 8: Billing
**Goal**: Developers can pay via Stripe (USD) or MoMo (VND) to upgrade their tier; webhooks update Supabase atomically with idempotency; free tier requires no payment info
**Depends on**: Phase 6, Phase 7
**Requirements**: BILL-01, BILL-02, BILL-03, BILL-04, BILL-05, BILL-06
**Success Criteria** (what must be TRUE):
  1. A user completes Stripe Checkout for Starter and their API key tier is upgraded in Supabase within one webhook delivery
  2. Replaying the same Stripe webhook event a second time does not double-credit the subscription (idempotency table enforced)
  3. A MoMo IPN with a tampered HMAC signature is rejected with HTTP 400 and the tier is not upgraded
  4. A MoMo IPN with a valid signature upgrades the user's tier to Starter in Supabase
  5. A user on the Free tier can call tools immediately after signup — no credit card prompt
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Billing foundation: PaymentProvider interface, tierUpgrade utility, webhook_events migration, GatewayEnv bindings, Wave 0 test stubs
- [ ] 08-02-PLAN.md — Stripe Checkout, webhook handler, Customer Portal, billing routes, index.ts wiring
- [ ] 08-03-PLAN.md — MoMo provider + IPN handler, stripe_customer_id migration, dashboard billing UI

### Phase 9: npm Publishing
**Goal**: All 5 server packages are published to npm under @vn-mcp scope and installable standalone outside the monorepo, enabling the self-hosted free tier
**Depends on**: Phase 5 (monorepo build structure from gateway work)
**Requirements**: NPM-01, NPM-02, NPM-03, NPM-04
**Success Criteria** (what must be TRUE):
  1. Running `npm install @vn-mcp/momo` from outside the monorepo succeeds and the package is usable
  2. Adding a published server to `.mcp.json` and running a tool call completes end-to-end without errors
  3. Each published package tarball contains no `src/` files, no `workspace:*` references, and is under 50KB
  4. `npm pack --dry-run` passes clean for all 5 servers and @vn-mcp/shared before any publish
**Plans**: 2 plans

Plans:
- [ ] 09-01-PLAN.md — Package prep: update all 6 package.json (version, publishConfig, files, exports, deps), build all packages, verify tarballs with npm pack --dry-run
- [ ] 09-02-PLAN.md — Publish: npm account + org setup, publish shared first then 5 servers, standalone install smoke test

### Phase 10: Landing Page & Docs
**Goal**: A Mintlify site is deployed with a pricing landing page and developer docs covering both self-hosted (npm) and hosted (API key) paths, enabling a new developer to go from zero to first tool call in under 5 minutes
**Depends on**: Phase 9 (npm install path must be documented accurately)
**Requirements**: SITE-01, SITE-02, SITE-03, SITE-04
**Success Criteria** (what must be TRUE):
  1. A new developer can read the quickstart, install the npm package or configure their API key, and complete a tool call within 5 minutes on a fresh machine
  2. The landing page shows a pricing table with all 4 tiers (USD and VND pricing), a server catalog, and a signup CTA that routes to Supabase Auth
  3. Per-server tool reference docs are present for all 5 servers with correct tool names, parameters, and example responses
  4. The site is live on Mintlify (or equivalent) and accessible via a public URL
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Monorepo Foundation | v1.0 | 3/3 | Complete | 2026-03-18 |
| 2. MoMo Server | v1.0 | 3/3 | Complete | 2026-03-18 |
| 3. ZaloPay + VNPAY Servers | v1.0 | 2/2 | Complete | 2026-03-18 |
| 4. Zalo OA + ViettelPay Servers | v1.0 | 3/3 | Complete | 2026-03-18 |
| 5. Gateway | 3/3 | Complete   | 2026-03-20 | - |
| 6. Auth & API Keys | v1.1 | 4/4 | Complete | 2026-03-22 |
| 7. Metering | 2/2 | Complete   | 2026-03-23 | - |
| 8. Billing | 3/3 | Complete   | 2026-03-23 | - |
| 9. npm Publishing | v1.1 | 0/2 | Not started | - |
| 10. Landing Page & Docs | v1.1 | 0/? | Not started | - |

**Full v1.0 details:** `.planning/milestones/v1.0-ROADMAP.md`
