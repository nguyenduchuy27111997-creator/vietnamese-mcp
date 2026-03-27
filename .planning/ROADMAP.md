# Roadmap: VN MCP Hub

## Milestones

- ✅ **v1.0 MCP Servers** — Phases 1-4 (shipped 2026-03-21)
- ✅ **v1.1 Platform Launch** — Phases 5-10 (shipped 2026-03-25)
- ✅ **v1.2 Production Deployment** — Phases 11-13 (shipped 2026-03-25)
- ✅ **v2.0 Modern Dashboard** — Phases 14-17 (shipped 2026-03-26)
- ✅ **v2.1 Growth & Marketing** — Phases 18-21 (shipped 2026-03-27)
- 🚧 **v3.0 Developer Experience** — Phases 22-25 (in progress)

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

<details>
<summary>✅ v2.0 Modern Dashboard (Phases 14-17) — SHIPPED 2026-03-26</summary>

- [x] **Phase 14: Design System Foundation** — Tailwind + shadcn/ui installed, dark mode default, Linear/Vercel design tokens applied (completed 2026-03-25)
- [x] **Phase 15: App Shell + Navigation** — Sidebar with collapsible nav, user menu, responsive mobile layout, client-side routing (completed 2026-03-25)
- [x] **Phase 16: Core Pages** — Overview, API Keys, and Usage pages fully redesigned with new design system (completed 2026-03-25)
- [x] **Phase 17: Billing + Settings + Quickstart** — Billing plan selector, Settings profile/danger zone, and new-user onboarding wizard (completed 2026-03-26)

</details>

<details>
<summary>✅ v2.1 Growth & Marketing (Phases 18-21) — SHIPPED 2026-03-27</summary>

- [x] **Phase 18: GitHub README & SEO** — Root README rewritten with badges, GIF demo, and per-server install guides (completed 2026-03-26)
- [x] **Phase 19: Example Apps** — Two complete starter apps (payment checkout + Zalo chatbot) with READMEs and GIF demos (completed 2026-03-26)
- [x] **Phase 20: Blog & Changelog** — Mintlify launch post, per-server guides, and changelog page (completed 2026-03-26)
- [x] **Phase 21: Product Hunt Launch** — Listing created with screenshots, tagline, and launch-day checklist ready (completed 2026-03-27)

</details>

### v3.0 Developer Experience (In Progress)

**Milestone Goal:** Make the platform sticky — API key scoping for granular permissions, an API playground for testing tool calls directly from the dashboard, webhook event logs for debugging, and usage export for self-service analytics.

- [x] **Phase 22: API Key Scoping** — Keys can be restricted to specific servers; gateway enforces scope with 403; dashboard shows scope badges (completed 2026-03-27)
- [x] **Phase 23: API Playground** — Dashboard page where developers select a server, pick a tool, fill params, and execute a real JSON-RPC call (completed 2026-03-27)
- [x] **Phase 24: Webhook Event Logs** — Gateway logs Stripe/MoMo webhook events; dashboard page shows filterable list with full payload viewer (completed 2026-03-27)
- [ ] **Phase 25: Usage Export** — Gateway CSV endpoint and dashboard download button for per-server, per-day usage data

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
- [x] 15-01-PLAN.md — Sidebar component, mobile nav Sheet overlay, AppShell layout wrapper
- [x] 15-02-PLAN.md — React Router v6 wiring, 6 placeholder pages, new-user redirect to /quickstart, human verification

### Phase 16: Core Pages
**Goal**: Overview, API Keys, and Usage pages are fully redesigned with the new design system — showing real data from the backend with polished UI components
**Depends on**: Phase 15
**Requirements**: PAGE-01, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. The Overview page displays a welcome card, key count, current-month usage, and active tier pulled from the API — all visible without scrolling on a standard desktop viewport
  2. The API Keys page lists all keys in a styled table with status badges; a user can search/filter, copy a key with a copy animation, create a new key via modal, and revoke a key via confirmation dialog
  3. The Usage page shows a bar/line chart of daily API calls over the last 30 days, a per-server breakdown table, and a warning banner when usage exceeds 80% of the tier limit
**Plans**: 3 plans

Plans:
- [x] 16-01-PLAN.md — Overview page: useOverview hook + stat cards (keys, usage, tier) with progress bar and activity placeholder
- [x] 16-02-PLAN.md — API Keys page: AlertDialog component, table with search/filter, create modal with copy animation, revoke confirmation
- [x] 16-03-PLAN.md — Usage page: recharts area chart (30-day), per-server breakdown table, 80% limit warning banner

### Phase 17: Billing + Settings + Quickstart
**Goal**: Billing, Settings, and Quickstart pages are complete — developers can upgrade their plan, update their profile, delete their account, and new users are guided through the onboarding wizard
**Depends on**: Phase 16
**Requirements**: PAGE-04, PAGE-05, PAGE-06
**Success Criteria** (what must be TRUE):
  1. The Billing page shows the current plan card with tier name and price; a user can select a different tier and be taken to Stripe Checkout (USD) or MoMo payment (VND) without leaving the dashboard
  2. The Settings page displays the user's email (read-only), a password change form, and a danger zone with a delete account button that requires typing a confirmation phrase before proceeding
  3. The Quickstart wizard presents 3 sequential steps (create key → configure .mcp.json → test call) and advances only when each step is completed — a user with an existing key can skip to the relevant step
**Plans**: 3 plans

Plans:
- [x] 17-01-PLAN.md — Billing page: 3 plan cards (Starter/Pro/Business) with Stripe + MoMo payment buttons and portal link
- [x] 17-02-PLAN.md — Settings page: profile email display, password change form, danger zone with delete account AlertDialog
- [x] 17-03-PLAN.md — Quickstart page: 3-step onboarding wizard (create key, configure .mcp.json, test call)

### Phase 18: GitHub README & SEO
**Goal**: The GitHub repository is the best first impression — a developer landing on the repo immediately understands what VN MCP Hub does, sees live npm badges, watches a GIF of the end-to-end flow, and can copy-paste a working install command
**Depends on**: Phase 17
**Requirements**: GH-01, GH-02, GH-03, GH-04
**Success Criteria** (what must be TRUE):
  1. The root README.md opens with a clear one-liner, feature highlights table, and architecture diagram — a developer understands the product in under 30 seconds without clicking any links
  2. All four badges (npm version, license, build status, MCP server count) are visible at the top of the README and link to correct destinations
  3. A GIF or video demo is embedded in the README showing the complete flow: signup, key creation, tool call returning a mock MoMo payment response
  4. Each per-server README (momo, zalopay, vnpay, zalo-oa, viettelpay) includes an `npm install` command, a minimal `.mcp.json` snippet, and a tool call example
**Plans**: 3 plans

Plans:
- [x] 18-01-PLAN.md — Root README rewrite with badges, feature table, architecture diagram, dual quickstart (npm + hosted gateway)
- [x] 18-02-PLAN.md — Per-server README updates: npm install, binary .mcp.json config, example prompts for all 5 servers
- [x] 18-03-PLAN.md — GIF demo: assets directory, README embed (GIF recording deferred to pre-launch)

### Phase 19: Example Apps
**Goal**: Two working starter apps (payment checkout + Zalo chatbot) developers can clone and run in under 5 minutes
**Depends on**: Phase 18
**Requirements**: EX-01, EX-02, EX-03
**Success Criteria** (what must be TRUE):
  1. Running the payment checkout example app (React) results in a rendered UI where clicking "Pay with MoMo" calls the hosted gateway and returns a mock payment URL — no manual configuration beyond setting an API key in `.env`
  2. Running the Zalo chatbot example (Node.js) and sending a test message results in the bot calling `zalooa_send_message` through the hosted gateway and logging the mock response — no manual configuration beyond setting an API key
  3. Both example READMEs contain: prerequisites, a 3-step setup (clone, install, configure), a `.mcp.json` snippet, and an embedded GIF or screenshot showing the running app
**Plans**: 2 plans

Plans:
- [ ] 19-01-PLAN.md — Payment checkout React app with MoMo/VNPAY buttons, gateway fetch calls, README with 3-step setup
- [ ] 19-02-PLAN.md — Zalo chatbot Node.js bot using @vn-mcp/mcp-zalo-oa via stdio, README with 3-step setup

### Phase 20: Blog & Changelog
**Goal**: The Mintlify docs site has a blog section with a launch announcement and per-server guides, plus a changelog page — giving developers context on what the platform does and driving organic SEO discovery
**Depends on**: Phase 18
**Requirements**: BLOG-01, BLOG-02, BLOG-03
**Success Criteria** (what must be TRUE):
  1. The Mintlify blog is live and the launch post ("Introducing VN MCP Hub") is publicly accessible at a stable URL — covers what the platform is, why it exists, and how to get started in under 5 minutes
  2. At least one per-server guide post is published for each of the 5 servers, each containing: an intro, tool reference summary, a copy-pasteable `.mcp.json` config, and an example Claude Code prompt that uses the server
  3. A changelog page exists in the docs site listing v1.0, v1.1, v1.2, and v2.0 entries with dates, key features added, and links to relevant docs — a developer can see the project history at a glance
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md — Launch announcement blog post + blog/changelog navigation in docs.json
- [ ] 20-02-PLAN.md — 5 per-server guide blog posts (MoMo, ZaloPay, VNPAY, Zalo OA, ViettelPay)
- [ ] 20-03-PLAN.md — Changelog page with v1.0 through v2.0 release history

### Phase 21: Product Hunt Launch
**Goal**: The Product Hunt listing is fully prepared and ready to go live — all assets created, screenshots captured, tagline written, maker profile set up, and a launch-day action checklist drafted so the launch can be executed without scrambling
**Depends on**: Phase 19, Phase 20
**Requirements**: PH-01, PH-02, PH-03
**Success Criteria** (what must be TRUE):
  1. The Product Hunt listing is live (or scheduled) with a tagline under 60 characters, a description covering the problem/solution/who-it's-for, and a working link to the landing page
  2. At least 5 dashboard screenshots are captured in dark mode covering: auth/login, overview, API keys list, usage chart, and billing plan selection — all at 1280x800 or higher resolution
  3. A launch-day checklist document exists covering: first comment text drafted, 3 social posts written (Twitter/X, LinkedIn, dev community), and a response template for common Product Hunt questions
**Plans**: 2 plans

Plans:
- [ ] 21-01-PLAN.md — PH listing copy (tagline, description, maker story) + launch day checklist (first comment, social posts, response templates)
- [ ] 21-02-PLAN.md — Screenshot capture guide (5 dark-mode dashboard pages at 1280x800) + PH listing assembly checkpoint

### Phase 22: API Key Scoping
**Goal**: API keys can be restricted to specific servers; the gateway enforces scope and returns 403 for out-of-scope requests; the dashboard key creation UI lets users select allowed servers and shows scope badges on existing keys
**Depends on**: Phase 21
**Requirements**: SCOPE-01, SCOPE-02, SCOPE-03, SCOPE-04
**Success Criteria** (what must be TRUE):
  1. A key created with scope ["momo", "zalopay"] is rejected with HTTP 403 when used to call the vnpay server — not a 401, not a tier error
  2. Creating a key via the dashboard shows server checkboxes defaulting to all 5 servers; unchecking servers and saving persists the restriction
  3. The API Keys table displays scope badges next to each key (e.g., "MoMo ZaloPay") so a developer can see key permissions at a glance without opening edit dialogs
  4. A key created with default scope (all servers) passes gateway auth to all 5 servers — existing behavior is unchanged
**Plans**: 2 plans

Plans:
- [x] 22-01-PLAN.md — Supabase migration + gateway types + auth middleware + scope enforcement (403) + keys CRUD update
- [x] 22-02-PLAN.md — Dashboard Checkbox component + useKeys hook update + KeysPage scope UI (checkboxes + badges)

### Phase 23: API Playground
**Goal**: Developers can test any tool call from the dashboard without leaving the browser — select a server, pick a tool, fill in parameters auto-generated from the tool schema, execute the call against the gateway using their own API key, and see the raw JSON-RPC request and response side by side
**Depends on**: Phase 22 (scoped key is the auth mechanism the playground uses)
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. Navigating to the Playground page shows a server dropdown with all 5 servers; selecting one populates a tool dropdown with that server's tools
  2. Selecting a tool renders a parameter form auto-generated from the tool schema — required fields are marked, input types match field types (text, number, boolean)
  3. Clicking Execute sends the JSON-RPC request to the gateway using the user's API key and displays the response — a mock `momo_create_payment` call returns a mock payment URL within 3 seconds
  4. The request/response panel shows the raw JSON-RPC payload and formatted response with syntax highlighting — a developer can copy the exact payload to use outside the dashboard
**Plans**: 2 plans

Plans:
- [x] 23-01-PLAN.md — Tool schema registry (18 tools), shadcn Select component, sidebar nav + route wiring, PlaygroundPage with server/tool dropdowns and auto-generated param form
- [x] 23-02-PLAN.md — Execute button with JSON-RPC fetch + SSE parsing, request/response tabbed panel with syntax highlighting and copy buttons, human verification

### Phase 24: Webhook Event Logs
**Goal**: Gateway logs all webhook events; dashboard shows filterable list with payload viewer
**Depends on**: Phase 22 (dashboard auth pattern established)
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04
**Success Criteria** (what must be TRUE):
  1. After a Stripe or MoMo webhook fires, the event appears in the dashboard Webhook Logs page within 5 seconds — timestamp, provider (Stripe/MoMo), event type, and success/failed status are visible in the list row
  2. Clicking a log row expands to show the full raw payload JSON with syntax highlighting — the developer can see exactly what was received
  3. Filtering the list by provider "Stripe" hides all MoMo events; filtering by status "failed" shows only events where processing returned a non-200 response
  4. The webhook logs page loads in under 2 seconds with 100+ events in the store — pagination or virtual scroll prevents DOM overload
**Plans**: 2 plans

Plans:
- [ ] 24-01-PLAN.md — Supabase migration + webhookLogger utility + billing route logging + GET /webhook-logs endpoint with JWT auth and filters
- [ ] 24-02-PLAN.md — Dashboard WebhookLogsPage with table, expandable payload viewer, provider/status filters, sidebar nav + routing

### Phase 25: Usage Export
**Goal**: Developers can download their usage data as a CSV file directly from the dashboard — a date range picker selects the window, the gateway endpoint queries Tinybird and streams CSV with proper headers, and the browser triggers a file download
**Depends on**: Phase 22 (JWT auth pattern for /usage/export route)
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04
**Success Criteria** (what must be TRUE):
  1. Clicking "Export CSV" on the Usage page triggers a file download named `usage-export-YYYY-MM-DD.csv` — no page navigation, no new tab
  2. The downloaded CSV contains columns: date, server, tool, call_count — one row per (date, server, tool) combination within the selected range
  3. Selecting "Last 30 days" from the date range picker and clicking Export produces a CSV covering exactly the last 30 calendar days — no gaps, no extra rows outside the range
  4. The gateway GET /usage/export endpoint returns Content-Type: text/csv and Content-Disposition: attachment — curl downloads a valid CSV without needing dashboard UI
**Plans**: 2 plans

Plans:
- [ ] 25-01: Gateway GET /usage/export endpoint — JWT auth, date range params, Tinybird query, CSV serialization, correct response headers
- [ ] 25-02: Dashboard Usage page — date range picker (7/30/90 days + custom), Export CSV button wired to /usage/export endpoint

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
| 15. App Shell + Navigation | v2.0 | 2/2 | Complete | 2026-03-25 |
| 16. Core Pages | v2.0 | 3/3 | Complete | 2026-03-25 |
| 17. Billing + Settings + Quickstart | v2.0 | 3/3 | Complete | 2026-03-26 |
| 18. GitHub README & SEO | v2.1 | 3/3 | Complete | 2026-03-26 |
| 19. Example Apps | v2.1 | 2/2 | Complete | 2026-03-26 |
| 20. Blog & Changelog | v2.1 | 3/3 | Complete | 2026-03-26 |
| 21. Product Hunt Launch | v2.1 | 2/2 | Complete | 2026-03-27 |
| 22. API Key Scoping | v3.0 | 2/2 | Complete | 2026-03-27 |
| 23. API Playground | v3.0 | 2/2 | Complete | 2026-03-27 |
| 24. Webhook Event Logs | 2/2 | Complete    | 2026-03-27 | - |
| 25. Usage Export | 1/2 | In Progress|  | - |

**Full v1.0 details:** `.planning/milestones/v1.0-ROADMAP.md`
