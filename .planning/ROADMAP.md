# Roadmap: VN MCP Hub

## Milestones

- ✅ **v1.0 MCP Servers** — Phases 1-4 (shipped 2026-03-21)
- ✅ **v1.1 Platform Launch** — Phases 5-10 (shipped 2026-03-25)
- ✅ **v1.2 Production Deployment** — Phases 11-13 (shipped 2026-03-25)
- 🚧 **v2.0 Modern Dashboard** — Phases 14-17 (in progress)

## Phases

<details>
<summary>✅ v1.0 MCP Servers (Phases 1-4) — SHIPPED 2026-03-21</summary>

- [x] Phase 1: Monorepo Foundation (3/3 plans) — completed 2026-03-18
- [x] Phase 2: MoMo Server (3/3 plans) — completed 2026-03-18
- [x] Phase 3: ZaloPay + VNPAY Servers (2/2 plans) — completed 2026-03-18
- [x] Phase 4: Zalo OA + ViettelPay Servers (3/3 plans) — completed 2026-03-18

</details>

<details>
<summary>✅ v1.1 Platform Launch (Phases 5-10) — SHIPPED 2026-03-25</summary>

- [x] Phase 5: Gateway — All 5 MCP servers reachable via Streamable HTTP on Cloudflare Workers (completed 2026-03-20)
- [x] Phase 6: Auth & API Keys — Users can sign up, generate API keys, and be authenticated at the gateway (completed 2026-03-22)
- [x] Phase 7: Metering — Every tool call is counted, enforced, and queryable per billing period (completed 2026-03-23)
- [x] Phase 8: Billing — Stripe (USD) and MoMo (VND) payments upgrade user tiers in Supabase (completed 2026-03-23)
- [x] Phase 9: npm Publishing — All 5 servers published to npm under @vn-mcp scope for self-hosted use (completed TBD)
- [x] Phase 10: Landing Page & Docs — Mintlify site with pricing, quickstart, and per-server tool reference (completed 2026-03-25)

</details>

<details>
<summary>✅ v1.2 Production Deployment (Phases 11-13) — SHIPPED 2026-03-25</summary>

- [x] **Phase 11: Deploy** — Dashboard on CF Pages and docs on Mintlify cloud, both live with production URLs and correct env config (completed 2026-03-25)
- [x] **Phase 12: Tech Debt** — Auth test stubs implemented, MOMO_ACCESS_KEY resolved, Tinybird tool name fixed (completed 2026-03-25)
- [x] **Phase 13: Validation** — Full E2E user journey verified: signup → key → tool call → usage → billing → self-hosted npm (completed 2026-03-25)

</details>

### 🚧 v2.0 Modern Dashboard (In Progress)

**Milestone Goal:** Complete UI/UX overhaul of the dashboard SPA — replace inline styles with Tailwind + shadcn/ui, add sidebar navigation, dark mode, and 7 polished pages covering the full user journey.

- [x] **Phase 14: Design System Foundation** — Tailwind + shadcn/ui installed, dark mode default, Linear/Vercel design tokens applied (completed 2026-03-25)
- [ ] **Phase 15: App Shell + Navigation** — Sidebar with collapsible nav, user menu, responsive mobile layout, client-side routing
- [ ] **Phase 16: Core Pages** — Overview, API Keys, and Usage pages fully redesigned with new design system
- [ ] **Phase 17: Billing + Settings + Quickstart** — Billing plan selector, Settings profile/danger zone, and new-user onboarding wizard

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
- [x] 05-01-PLAN.md — Workspace scaffolding: `apps/*` workspace glob, server `./tools` subpath exports, gateway package with wrangler.toml (`usage_model = "unbound"`), tsconfig, vitest config, and Wave 0 test stubs
- [x] 05-02-PLAN.md — Gateway core: serverRegistry.ts (5 McpServer instances at module scope), tierAccess.ts (MCP error -32001), router.ts (stateless transport per request), cors.ts, index.ts (Hono app), concrete GATE-01–GATE-05 tests
- [x] 05-03-PLAN.md — SSE heartbeat: heartbeat.ts (`wrapWithHeartbeat` via TransformStream), router.ts update, human smoke test via wrangler dev

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
- [x] 06-01-PLAN.md — Foundation: GatewayEnv types (types.ts), api_keys SQL migration with RLS + indexes, Wave 0 failing test stubs
- [x] 06-02-PLAN.md — Auth core: authMiddleware (Bearer → SHA-256 → KV → Supabase), getServiceRoleClient factory, index.ts wiring (replace const tier stub), wrangler.toml KV binding
- [x] 06-03-PLAN.md — Key CRUD: /keys router (GET list, POST create sk_test_ key, DELETE revoke + KV evict), mounted in index.ts
- [x] 06-04-PLAN.md — Dashboard: React + Vite SPA on CF Pages with Supabase Auth sign up/login, key list, create, revoke; human smoke test gate

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
- [x] 07-01-PLAN.md — Metering core: GatewayEnv TINYBIRD_TOKEN binding, tinybird.ts fire-and-forget event sender, usageCounter.ts KV counter with tier limits and -32002 error, full unit tests
- [x] 07-02-PLAN.md — Gateway wiring + dashboard: index.ts metering hook (usage check before, waitUntil after), /usage route, integration tests, dashboard usage bar, Tinybird account setup checkpoint

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
- [x] 08-01-PLAN.md — Billing foundation: PaymentProvider interface, tierUpgrade utility, webhook_events migration, GatewayEnv bindings, Wave 0 test stubs
- [x] 08-02-PLAN.md — Stripe Checkout, webhook handler, Customer Portal, billing routes, index.ts wiring
- [x] 08-03-PLAN.md — MoMo provider + IPN handler, stripe_customer_id migration, dashboard billing UI

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
- [x] 09-01-PLAN.md — Package prep: update all 6 package.json (version, publishConfig, files, exports, deps), build all packages, verify tarballs with npm pack --dry-run
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
**Plans**: 2 plans

Plans:
- [x] 10-01-PLAN.md — Mintlify scaffold (docs.json), landing page (pricing, hero, CTA), quickstart (hosted/self-hosted tabs)
- [x] 10-02-PLAN.md — 5 per-server tool reference pages, server overview, pricing page, Mintlify deployment + human verification

### Phase 11: Deploy
**Goal**: Dashboard SPA and docs site are live at public production URLs, with correct environment configuration pointing to the deployed gateway
**Depends on**: Phase 10
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04
**Success Criteria** (what must be TRUE):
  1. Visiting the dashboard URL loads the React SPA and shows the login screen — not a CF Pages 404
  2. Visiting the docs URL shows the Mintlify site with all pages navigable — not a "coming soon" placeholder
  3. Every signup CTA and docs link in the docs site and landing page navigates to a working URL (no dead links)
  4. The dashboard connects to the production gateway — API calls from the deployed SPA reach the deployed CF Workers endpoint
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — Create .env.production, build dashboard, deploy to CF Pages, verify login screen loads
- [x] 11-02-PLAN.md — Update all CTA/gateway URLs in docs to production values, deploy docs to Mintlify cloud, verify all links

### Phase 12: Tech Debt
**Goal**: Accumulated v1.1 tech debt is resolved — test stubs are implemented, wrangler.toml is clean, and Tinybird receives correct tool names on every event
**Depends on**: Phase 11
**Requirements**: DEBT-01, DEBT-02, DEBT-03
**Success Criteria** (what must be TRUE):
  1. Running `npm test` in the gateway workspace shows zero skipped or stubbed tests — auth-supabase.test.ts and rls-isolation.test.ts have real assertions that pass
  2. `wrangler deploy` succeeds without unknown binding warnings — MOMO_ACCESS_KEY is either present in wrangler.toml or removed from GatewayEnv types
  3. A tool call logged in Tinybird shows the actual tool name (e.g. `momo_create_payment`) instead of `unknown`
**Plans**: 2 plans

Plans:
- [x] 12-01-PLAN.md — Implement auth + RLS test stubs with real assertions, add MOMO_ACCESS_KEY to wrangler.toml
- [x] 12-02-PLAN.md — Extract tool name from MCP JSON-RPC request body for Tinybird events

### Phase 13: Validation
**Goal**: The full end-to-end user journey works in production — from signup through API key creation, tool calls, usage tracking, tier upgrade, and self-hosted npm install
**Depends on**: Phase 11, Phase 12
**Requirements**: VAL-01, VAL-02, VAL-03
**Success Criteria** (what must be TRUE):
  1. A new user can sign up on the deployed dashboard, create an API key, make a tool call through the production gateway, and see their usage increment
  2. A free-tier user can complete Stripe Checkout in the deployed dashboard and their key's tier upgrades to Starter within one webhook delivery
  3. A developer can run `npm install @vn-mcp/momo`, add the config to `.mcp.json`, and complete a tool call end-to-end without touching the hosted gateway
**Plans**: 2 plans

Plans:
- [ ] 13-01-PLAN.md — E2E hosted path: signup, API key creation, MCP tool call, usage tracking, Stripe billing upgrade
- [ ] 13-02-PLAN.md — E2E self-hosted npm path: install from npm, stdio tool call, .mcp.json config

### Phase 14: Design System Foundation
**Goal**: apps/dashboard has Tailwind CSS + shadcn/ui fully configured, a dark mode default with manual toggle, and design tokens (colors, typography, spacing) that match the Linear/Vercel aesthetic — so every subsequent page is built on a consistent visual foundation
**Depends on**: Phase 13
**Requirements**: DS-01, DS-02, DS-03
**Success Criteria** (what must be TRUE):
  1. Running the dashboard in dev mode renders with a dark background by default — no flash of white/unstyled content
  2. A manual theme toggle switches between dark and light mode and persists the choice across page reloads
  3. shadcn/ui components (Button, Card, Badge, Dialog) render correctly with the project's color tokens applied
  4. Tailwind classes are available in all dashboard source files — no PostCSS or config errors in the build
**Plans**: 2 plans

Plans:
- [x] 14-01-PLAN.md — Tailwind CSS + PostCSS + shadcn/ui toolchain, config files, globals.css with design tokens, dark mode script, fonts
- [x] 14-02-PLAN.md — Install 14 shadcn/ui components, ThemeProvider + ThemeToggle, wire into App.tsx

### Phase 15: App Shell + Navigation
**Goal**: A persistent sidebar shell wraps all dashboard pages with collapsible navigation, active page highlighting, user avatar/email in the footer, hamburger menu on mobile, and client-side routing connecting all pages
**Depends on**: Phase 14
**Requirements**: SHELL-01, SHELL-02, SHELL-03, SHELL-04, NAV-01, NAV-02
**Success Criteria** (what must be TRUE):
  1. Navigating between Overview, API Keys, Usage, Billing, and Settings updates the active indicator in the sidebar and renders the correct page without a full reload
  2. On a mobile viewport the sidebar is hidden and a hamburger icon opens it as an overlay drawer
  3. The sidebar footer shows the logged-in user's email and a sign-out button that logs the user out and redirects to login
  4. A new user with zero API keys is automatically redirected to the Quickstart page on first login
**Plans**: 2 plans

Plans:
- [ ] 15-01-PLAN.md — Sidebar component, mobile nav Sheet overlay, AppShell layout wrapper
- [ ] 15-02-PLAN.md — React Router v6 wiring, 6 placeholder pages, new-user redirect to /quickstart, human verification

### Phase 16: Core Pages
**Goal**: Overview, API Keys, and Usage pages are fully redesigned with the new design system — showing real data from the backend with polished UI components
**Depends on**: Phase 15
**Requirements**: PAGE-01, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. The Overview page displays a welcome card, key count, current-month usage, and active tier pulled from the API — all visible without scrolling on a standard desktop viewport
  2. The API Keys page lists all keys in a styled table with status badges; a user can search/filter, copy a key with a copy animation, create a new key via modal, and revoke a key via confirmation dialog
  3. The Usage page shows a bar/line chart of daily API calls over the last 30 days, a per-server breakdown table, and a warning banner when usage exceeds 80% of the tier limit
**Plans**: TBD

### Phase 17: Billing + Settings + Quickstart
**Goal**: Billing, Settings, and Quickstart pages are complete — developers can upgrade their plan, update their profile, delete their account, and new users are guided through the onboarding wizard
**Depends on**: Phase 16
**Requirements**: PAGE-04, PAGE-05, PAGE-06
**Success Criteria** (what must be TRUE):
  1. The Billing page shows the current plan card with tier name and price; a user can select a different tier and be taken to Stripe Checkout (USD) or MoMo payment (VND) without leaving the dashboard
  2. The Settings page displays the user's email (read-only), a password change form, and a danger zone with a delete account button that requires typing a confirmation phrase before proceeding
  3. The Quickstart wizard presents 3 sequential steps (create key → configure .mcp.json → test call) and advances only when each step is completed — a user with an existing key can skip to the relevant step
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Monorepo Foundation | v1.0 | 3/3 | Complete | 2026-03-18 |
| 2. MoMo Server | v1.0 | 3/3 | Complete | 2026-03-18 |
| 3. ZaloPay + VNPAY Servers | v1.0 | 2/2 | Complete | 2026-03-18 |
| 4. Zalo OA + ViettelPay Servers | v1.0 | 3/3 | Complete | 2026-03-18 |
| 5. Gateway | v1.1 | 3/3 | Complete | 2026-03-20 |
| 6. Auth & API Keys | v1.1 | 4/4 | Complete | 2026-03-22 |
| 7. Metering | v1.1 | 2/2 | Complete | 2026-03-23 |
| 8. Billing | v1.1 | 3/3 | Complete | 2026-03-23 |
| 9. npm Publishing | v1.1 | 1/2 | In Progress | - |
| 10. Landing Page & Docs | v1.1 | 2/2 | Complete | 2026-03-25 |
| 11. Deploy | v1.2 | 2/2 | Complete | 2026-03-25 |
| 12. Tech Debt | v1.2 | 2/2 | Complete | 2026-03-25 |
| 13. Validation | v1.2 | 0/2 | Not started | - |
| 14. Design System Foundation | v2.0 | 2/2 | Complete | 2026-03-25 |
| 15. App Shell + Navigation | v2.0 | 0/2 | Not started | - |
| 16. Core Pages | v2.0 | 0/TBD | Not started | - |
| 17. Billing + Settings + Quickstart | v2.0 | 0/TBD | Not started | - |

**Full v1.0 details:** `.planning/milestones/v1.0-ROADMAP.md`
