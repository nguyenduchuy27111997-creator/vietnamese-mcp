# Project Research Summary

**Project:** VN MCP Hub v1.1 — Hosted MCP Gateway Platform
**Domain:** Developer SaaS — hosted MCP gateway with dual-currency billing for Vietnamese fintech APIs
**Researched:** 2026-03-21
**Confidence:** MEDIUM–HIGH (stack and architecture HIGH from verified SDK source; VN market specifics MEDIUM)

## Executive Summary

VN MCP Hub v1.1 transforms an existing five-server stdio monorepo into a hosted developer platform: a Cloudflare Workers gateway exposing all MCP servers over Streamable HTTP transport, fronted by API key auth, metered billing, and a marketing site. The recommended approach layers cleanly on the v1.0 foundation — existing tool logic, schemas, and the shared HMAC package are all reused unchanged. The gateway wraps servers at the transport layer only, using `WebStandardStreamableHTTPServerTransport` from the installed MCP SDK (v1.27.1), which explicitly supports Cloudflare Workers. The dependency chain is strict: gateway must exist before auth, auth before metering, metering before billing; npm publishing and docs are independent and can proceed in parallel with billing.

The dual-currency billing requirement is the single highest-risk element of the build. Stripe handles international (USD) subscribers via standard webhooks and is well-documented. MoMo billing for Vietnamese developers is significantly more complex: MoMo has no native recurring/subscription API, requires a registered Vietnamese business entity with 3–7 business day KYC approval, and cannot be tested locally without a deployed public URL for IPN callbacks. The practical mitigation is to launch Stripe-only, build a `PaymentProvider` abstraction, submit the MoMo merchant application immediately, and add MoMo billing only after approval arrives — not blocking launch on it.

The three risks most likely to derail the project are (1) Cloudflare Workers CPU time limits terminating SSE sessions if the Unbound usage model is not set from day one, (2) Supabase RLS misconfiguration causing silent cross-tenant data leakage that is invisible without explicit two-user test coverage, and (3) Tinybird silently dropping metering events when the ingestion schema does not match the datasource definition. All three are avoidable with upfront configuration and verification checklists — none require architectural changes if caught early.

---

## Key Findings

### Recommended Stack

The v1.1 stack extends the existing v1.0 foundation (Node.js 20, TypeScript 5.x, MCP SDK 1.27.x, Zod, Vitest) with a Cloudflare Workers gateway package. Hono 4.x is the correct HTTP framework choice — it is purpose-built for edge runtimes, ships `streamSSE()` for SSE in `hono/streaming`, and the MCP SDK's own docstring shows Hono as the reference integration. Supabase handles auth, API key storage (with RLS), and subscription state in a single managed Postgres instance. Tinybird provides ClickHouse-backed usage metering via a simple REST POST endpoint — no SDK required, just `fetch()`. Stripe 16.x (the first version with explicit CF Workers support) handles USD billing. MoMo billing reuses the existing `@vn-mcp/shared` HMAC-SHA256 signing — no new npm package is needed. Mintlify handles developer docs. `@changesets/cli` manages monorepo versioning for npm publishing.

**Core technologies:**
- **Hono 4.x**: HTTP framework for CF Workers gateway — edge-native, SSE built-in, referenced in MCP SDK docs as the integration example
- **Wrangler 3.x**: CF Workers CLI — required for local dev parity with D1, KV, and Miniflare; set `usage_model = "unbound"` in `wrangler.toml` from day one
- **@supabase/supabase-js 2.x**: API key validation, RLS enforcement, subscription state — CF Workers compatible (no Node.js-only deps)
- **stripe 16.x**: USD billing — first version with explicit CF Workers support; earlier versions break in edge runtime
- **Tinybird REST API (no SDK)**: Usage metering via `fetch()` POST to `/v0/events` with `ctx.waitUntil()` — ClickHouse-backed, real-time aggregation
- **@changesets/cli 2.x**: Monorepo version coordination and changelog generation for npm publishing
- **Mintlify**: Developer docs — MDX + `mint.json`, purpose-built for developer API documentation
- **@cloudflare/workers-types 4.x**: TypeScript types for CF Workers — requires `moduleResolution: "Bundler"`, do NOT use `@types/node` in the Worker

### Expected Features

The gateway must implement Streamable HTTP (not the deprecated 2024-11-05 HTTP+SSE transport) — a single endpoint handling both POST (tool calls) and GET (SSE stream). Every request requires Bearer API key validation with tier enforcement: Free tier = 2 servers + 1k calls/month, Starter = 5 servers + 10k calls/month. MoMo IPN and Stripe webhook endpoints are required on the same Worker. CORS headers and a `/health` endpoint are table stakes.

**Must have (table stakes — v1.1 launch):**
- StreamableHTTP gateway endpoint per server (`/mcp/:server`) with POST + GET on same route
- API key validation middleware (Bearer token → SHA-256 hash → Supabase lookup → 60s KV cache)
- Tier-based server access control (Free gets 2 servers, Starter gets 5)
- Monthly call limit enforcement via Tinybird count (hard stop at limit with MCP-formatted error)
- Rate limiting per API key via KV sliding window
- Stripe subscription (Free and Starter tiers at launch; Pro/Business deferred)
- MoMo one-time payment for first-month Starter (manual recurring, not automated at launch)
- Tinybird fire-and-forget usage event per request (`ctx.waitUntil`)
- npm publish all 5 server packages with `files: ["dist/", "README.md"]` and `bin` entries
- Mintlify landing page: hero, pricing table (USD + VND), server catalog, signup CTA
- Mintlify docs: quickstart, per-server tool reference, auth guide, error code reference
- MCP-formatted error responses (JSON-RPC envelope, not plain HTTP 4xx) for all gateway errors

**Should have (v1.2 — after first 20 paying customers):**
- Usage dashboard (per-key, per-server, per-day charts via Tinybird)
- Automated MoMo monthly billing (cron + email + IPN re-initiation)
- Usage warning emails at 80% and 100% of monthly limit
- Pro ($49) and Business ($149) Stripe tiers
- Annual billing discount (Stripe only)
- VND pricing display on landing page (499k, 1.2M, 3.7M VND)
- Vietnamese quickstart guide in docs
- Key expiry dates and rotation reminders
- `vn-mcp doctor` CLI health check tool

**Defer (v2+):**
- Team seats / shared subscriptions
- Live playground on landing page (requires sandboxed demo gateway)
- Vietnamese-language PDF invoice generation
- Banking API servers (Phase 2 per brief)
- PDPA VN compliance audit + DPA for enterprise customers
- Per-tool granular access control
- WebSocket transport (non-standard; MCP spec uses Streamable HTTP)

### Architecture Approach

The gateway is a new `workers/mcp-gateway/` package added to the monorepo workspace. All five existing server packages are imported for their `registerAll` tool registration functions — the existing `index.ts` files (which contain `StdioServerTransport`) are never imported by the gateway (importing them crashes CF Workers due to Node.js `process.stdin` dependency). Five `McpServer` instances are pre-instantiated at module scope in `serverRegistry.ts`; a new `WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })` is created per-request in stateless mode. Cloudflare KV caches API key metadata for 60 seconds. Supabase stores users, api_keys (hash only, never plaintext), and subscriptions. Tinybird receives usage events via `ctx.waitUntil(fetch(...))` — non-blocking. Stripe and MoMo webhooks are handled in `workers/webhooks/` routes that upsert the Supabase `subscriptions` table and then update `api_keys.tier`.

**Major components:**
1. **`workers/mcp-gateway`** — Hono app on CF Workers: auth middleware, rate limit middleware, MCP router, metering emitter, Stripe and MoMo webhook handlers
2. **Supabase** — Postgres with RLS: `api_keys` (hash, prefix, tier, user_id), `subscriptions` (provider, tier, status, period_end), `webhook_events` (idempotency table for Stripe)
3. **Cloudflare KV** — 60s auth cache keyed by `apikey:{sha256(rawKey)}`; sliding window rate limit counters per key per minute
4. **Tinybird** — `api_calls` datasource receiving `{api_key_id, user_id, server, tool, tier, status, latency_ms, timestamp}` events; queried for monthly totals and dashboard charts
5. **`apps/dashboard`** (optional v1.1 scope) — Astro or Next.js; Supabase Auth for login; API key generation UI
6. **`docs/` (Mintlify)** — MDX pages: quickstart, per-server reference, pricing, changelog

### Critical Pitfalls

1. **CF Workers CPU limit kills SSE sessions** — Set `[usage_model] = "unbound"` in `wrangler.toml` before writing any SSE code. The free/bundled plan's 10ms CPU limit terminates SSE handlers immediately in production (works locally — `wrangler dev` does not enforce limits).

2. **Importing server `index.ts` in the gateway crashes the Worker** — The `index.ts` in each server uses `StdioServerTransport` which imports `process.stdin`. This does not exist in CF Workers runtime and crashes the Worker at module evaluation. Import only `tools/index.ts` (`registerAll` function) from each server.

3. **Supabase RLS silent cross-tenant leakage** — Missing `WITH CHECK` clauses on UPDATE policies, or accidentally using the service role key for tenant queries, causes silent data leakage invisible without a two-user isolation test. Run `SELECT * FROM pg_policies` after every migration; write an explicit two-user cross-tenant test before any real data enters the system.

4. **Tinybird silently drops events on schema mismatch** — Tinybird returns HTTP 202 even when events fail schema validation; the response body contains `"quarantined_rows": N` when events are dropped. Parse the ingestion response body on every POST; verify with a 100-event test batch before wiring billing to Tinybird counts.

5. **Stripe webhook double-billing without idempotency** — Stripe retries webhooks on any non-2xx response. Store processed `stripe_event_id` values in a Supabase `webhook_events` table and check before processing — implement this before any billing logic is wired.

6. **MoMo merchant approval blocks billing launch** — Real MoMo payment processing requires a registered Vietnamese business with 3–7 day KYC approval. Submit the merchant application at the start of the billing phase. Build a `PaymentProvider` abstraction so Stripe launches without waiting for MoMo approval.

---

## Implications for Roadmap

Based on research, the dependency chain is strict and well-documented. Phase ordering is dictated by infrastructure dependencies, not feature preference. Six phases are suggested.

### Phase 1: Gateway Foundation

**Rationale:** Nothing else can be built until the HTTP gateway exists and all five MCP servers are reachable via Streamable HTTP. This is the core infrastructure that every subsequent phase depends on.

**Delivers:** Deployed Cloudflare Workers gateway at `api.vn-mcp.com/mcp/:server` responding correctly to MCP `tools/list` and `tools/call` for all five servers. Health check endpoint. CORS middleware.

**Addresses:** StreamableHTTP transport endpoint per server, per-server URL routing, CORS headers, health check (FEATURES.md table stakes)

**Avoids:**
- Set `[usage_model] = "unbound"` in `wrangler.toml` immediately (Pitfall 1)
- Import only `tools/index.ts` from each server, never `index.ts` (Pitfall 3 / Anti-Pattern 2 in ARCHITECTURE.md)
- Use stateless transport (`sessionIdGenerator: undefined`) — no session state in module scope (Anti-Pattern 1 in ARCHITECTURE.md)
- SSE heartbeat ping every 15 seconds via `streamSSE()` (Pitfall 2)
- Pre-instantiate all five McpServer instances at module scope, not per-request (Anti-Pattern 5 in ARCHITECTURE.md)

**Gate:** `tools/list` returns correct tools for each `:server` param; two concurrent SSE clients receive isolated events; SSE connection stays alive for 60+ seconds idle with heartbeat.

### Phase 2: Auth and API Key Management

**Rationale:** Gateway cannot serve paying customers without authentication. Supabase schema and KV caching must be in place before metering — Tinybird events are keyed by `api_key_id` which requires the auth schema to exist.

**Delivers:** API key generation and validation; tier-based server access control (Free = 2 servers, Starter = 5); KV caching (60s TTL) eliminating Supabase round-trip on hot path; rate limiting per key per minute.

**Addresses:** API key generation, revocation, naming, test vs. live key distinction, multiple keys per account, tier enforcement (FEATURES.md table stakes)

**Uses:** `@supabase/supabase-js` service role for gateway validation; Cloudflare KV namespace; Supabase migrations for `api_keys` and `subscriptions` tables with full RLS

**Avoids:**
- Enable RLS on every table; write two-user isolation test before real data enters (Pitfall 4)
- Store only SHA-256 hash in `api_keys`, never raw key (Anti-Pattern 3 in ARCHITECTURE.md)
- Use `anon` key for tenant operations; service role only for admin writes (Technical Debt table in PITFALLS.md)
- KV cache from day one — not as an optimization added later (Pitfall 5)

**Gate:** Authenticated requests pass; invalid/revoked keys return 401; revoked key rejected within 60 seconds; two-user RLS isolation test passes; `pg_policies` audit shows all tables covered.

### Phase 3: Usage Metering

**Rationale:** Must exist before billing. Tinybird counts drive monthly limit enforcement and quota checks. Billing tier enforcement is meaningless without usage data to enforce against.

**Delivers:** Tinybird `api_calls` datasource with strict schema; fire-and-forget event emission per request via `ctx.waitUntil`; monthly call count enforcement (hard stop at tier limit with MCP-formatted error response); Tinybird Pipe for per-key, per-server daily aggregates.

**Addresses:** Count API calls per billing period, enforce monthly call limits, usage visible in dashboard (FEATURES.md table stakes)

**Avoids:**
- Define Tinybird datasource schema strictly before writing ingestion code; run 100-event ingestion test before wiring billing (Pitfall 10)
- Parse Tinybird ingestion response body for `quarantined_rows`; alert if non-zero (Integration Gotchas in PITFALLS.md)
- Never block MCP response on metering — always `ctx.waitUntil()`, never `await fetch(tinybird)` (Anti-Pattern 4 in ARCHITECTURE.md)
- Use a `server_id` column in Tinybird datasource from day one — do not use a single datasource without server attribution (Technical Debt table in PITFALLS.md)

**Gate:** Tool calls appear in Tinybird within 5 seconds; 1000-event test shows exactly 1000 ingested (zero quarantined); monthly limit correctly blocks requests at threshold with MCP-formatted error.

### Phase 4: Billing (Stripe + MoMo)

**Rationale:** Revenue-generating phase. Stripe launches first because it requires no external approval. MoMo merchant application must be submitted at the START of this phase — the 3–7 day approval is a hard external dependency.

**Delivers:** Stripe products for Free + Starter tiers; Checkout Session flow; webhook handler with idempotency table; Stripe-triggered tier upgrades in Supabase. MoMo one-time payment link for VND Starter (manual first-month). MoMo IPN handler with HMAC verification. `PaymentProvider` abstraction interface for future MoMo automation.

**Addresses:** Stripe subscription, MoMo first-month payment, tier enforcement linked to payment status, free tier without payment info, invoice generation (FEATURES.md table stakes)

**Uses:** `stripe 16.x` (CF Workers compatible), existing `@vn-mcp/shared` HMAC signing for MoMo IPN verification, Supabase `webhook_events` table for Stripe idempotency

**Avoids:**
- Read raw body with `await c.req.text()` BEFORE any JSON parsing for Stripe webhook signature verification (Pitfall 6)
- Implement Stripe idempotency table (`webhook_events`) before any business logic — not as an afterthought (Pitfall 6)
- Deploy MoMo IPN endpoint BEFORE any sandbox payment testing — Workers subdomain is immediately public (Pitfall 7)
- Submit MoMo merchant account application at milestone start, not end (Pitfall 11)
- Build `PaymentProvider` abstraction so Stripe can launch without MoMo approval (Pitfall 11)
- Store Stripe customer ID with an index in Supabase — avoid full table scans on webhook events (Integration Gotchas in PITFALLS.md)

**Gate:** Stripe `checkout.session.completed` webhook upgrades api_key tier in Supabase; Stripe CLI event replay of same event does not double-credit; MoMo IPN with tampered HMAC signature rejected with 400; MoMo merchant application submitted and approval timeline confirmed.

**Research flag:** MoMo Business subscription payment API (receiving subscription fees) has different IPN field ordering than the standard payment gateway IPN already implemented. Verify against current MoMo Business developer docs before implementing `webhooks/momo.ts`. Consider running `/gsd:research-phase` for this phase.

### Phase 5: npm Publishing

**Rationale:** Independent of gateway and billing. Can run in parallel with Phase 4. Enables the free/self-hosted tier and drives organic npm and GitHub discovery — the primary distribution channel before paid tier is adopted.

**Delivers:** All five server packages published as `@vn-mcp/momo`, `@vn-mcp/zalopay`, `@vn-mcp/vnpay`, `@vn-mcp/zalo-oa`, `@vn-mcp/viettel-pay`. GitHub Actions publish workflow on release tag. MCP Registry submissions.

**Addresses:** npm publish, README quickstart, semantic versioning, `bin` entries for `npx` execution, provenance attestation (FEATURES.md table stakes)

**Avoids:**
- Add `"files": ["dist/", "README.md"]` to every server's `package.json` before first publish (Pitfall 9)
- Run `npm pack --dry-run` and verify no `src/`, `workspace:*` references, or env files in output (Pitfall 8 + Pitfall 9)
- Bundle `@vn-mcp/shared` inline via `tsdown` OR publish it as a versioned public package first — never use `workspace:*` as a runtime dep in published packages (Pitfall 8)
- Use `npm token create --type=automation` for CI publish (not a regular user token) (Integration Gotchas in PITFALLS.md)

**Gate:** `npm install @vn-mcp/momo` from outside the monorepo works; `.mcp.json` stdio usage completes end-to-end tool call; published package size <50KB per server; no `src/` files in published tarball.

### Phase 6: Landing Page and Developer Docs

**Rationale:** Independent of gateway but depends on Phase 5 (npm install path documented first). Can begin in parallel with Phases 4 and 5 — docs can document the stdio/npm path before hosted gateway is complete.

**Delivers:** Mintlify docs site at `docs.vn-mcp.com`: quickstart, per-server tool reference, auth guide, error code reference, pricing + limits reference, changelog. Marketing landing page: hero with code snippet demo, pricing table (USD + VND), server catalog, signup CTA linking to Supabase Auth. `.mcp.json` snippet generator per server. SEO basics (title, OG image, Vietnamese keywords).

**Addresses:** Landing page with hero, pricing table, server catalog, signup CTA, SEO; Mintlify quickstart, per-server docs, auth guide, error reference, changelog (FEATURES.md table stakes)

**Avoids:** Live playground in hero (defer to v1.2); OpenAPI docs (MCP is not REST; they mislead); video in hero (stales immediately; animated GIF is faster to produce); blog as primary channel (defer to integration guides in docs that serve dual purpose)

**Gate:** New user can sign up, receive an API key, add it to `.mcp.json`, and complete a tool call within 5 minutes on a fresh machine.

---

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Cannot authenticate requests to an endpoint that does not exist.
- **Phase 2 before Phase 3:** Tinybird events are keyed by `api_key_id`; the key schema must exist before metering is meaningful.
- **Phase 3 before Phase 4:** Billing enforcement (monthly quota checks, tier limits) queries Tinybird counts. Building billing without usage data to enforce against produces non-functional tier limits.
- **Phases 5 and 6 are parallel-eligible:** npm publishing and docs have zero dependency on the gateway, billing, or metering infrastructure. They can begin after Phase 1 scaffolding gives the monorepo structure to publish from.
- **MoMo merchant application submitted at Phase 4 start** — the 3–7 day KYC approval is an external hard dependency. Submitting it at milestone start (not end) is required to avoid blocking launch.

### Research Flags

Phases needing deeper research during planning:

- **Phase 4 (Billing — MoMo):** The existing codebase implements the MoMo payment gateway API (generating payment links). The billing use case uses MoMo Business merchant APIs to receive subscription payments — different flow, different IPN field ordering, separate merchant account type. English documentation is sparse. Run `/gsd:research-phase` before Phase 4 planning.
- **Phase 1 (Gateway — SSE keepalive):** Verify whether `streamSSE()` in Hono 4.x automatically sends heartbeat pings or requires explicit implementation. CF Workers SSE connection timeout behavior varies by edge location — validate in `wrangler dev` and in production during Phase 1.

Phases with standard patterns (skip research-phase):

- **Phase 2 (Auth + API Keys):** Supabase RLS and API key hashing are well-documented, established patterns (used by Resend, Upstash, Supabase's own guides). Verification checklist from PITFALLS.md is sufficient.
- **Phase 3 (Metering):** Tinybird Events API HTTP POST is straightforward. The main risk is schema validation — a verification checklist (100-event test, quarantined_rows check) is sufficient, not additional research.
- **Phase 5 (npm Publishing):** Standard npm workspace publishing with `tsdown` bundling. Pitfalls are known and mechanical to prevent (`npm pack --dry-run` checklist).
- **Phase 6 (Docs):** Mintlify setup is well-documented. Content is ported from existing CLAUDE.md files. No novel technical integration.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack (Hono + CF Workers + MCP SDK) verified against actual `node_modules`; `WebStandardStreamableHTTPServerTransport` confirmed CF Workers-compatible from SDK docstring. Package versions (Stripe 16.x, Supabase 2.x, Hono 4.x) should be confirmed on npmjs.com before writing `package.json`. |
| Features | MEDIUM–HIGH | SaaS feature patterns (API key management, metered billing, developer docs) are well-established from Stripe, Resend, Upstash comparisons. VN market specifics (MoMo penetration ~70%, Facebook Group distribution) are MEDIUM confidence from training data. |
| Architecture | HIGH | MCP SDK source inspected directly in `node_modules`; CF Workers constraints verified against official docs; build order confirmed by dependency analysis. Stateless transport pattern explicitly recommended in MCP SDK docstring. |
| Pitfalls | HIGH (CF Workers, Stripe, Supabase, npm) / MEDIUM (MoMo Business IPN, Tinybird quarantine) | CF Workers CPU limits, Stripe webhook idempotency, Supabase RLS `WITH CHECK`, and npm `workspace:*` pitfalls sourced from official documentation. MoMo Business merchant API specifics and Tinybird quarantined_rows behavior are from community docs — MEDIUM confidence. |

**Overall confidence:** MEDIUM–HIGH

### Gaps to Address

- **MoMo Business merchant API field ordering:** The existing implementation handles the MoMo payment gateway IPN (for verifying payment from the MoMo app). The billing use case — where VN MCP Hub is the merchant receiving subscription payments — uses a different API path. The HMAC field order in subscription IPNs may differ from payment IPNs. Verify before Phase 4 implementation.

- **Package version confirmation:** Hono 4.x, `@supabase/ssr` 0.5.x+, and Stripe 16.x should be verified on npmjs.com against current published major versions before the gateway `package.json` is written. Research confidence is MEDIUM for exact version numbers.

- **MoMo merchant account approval timeline:** The 3–7 business day estimate may be optimistic if additional business documentation is required. If approval extends beyond the Phase 4 window, MoMo billing slips to v1.2. The `PaymentProvider` abstraction mitigates but does not eliminate this risk.

- **Mintlify free tier custom domain support:** If the Mintlify free tier does not support custom subdomains (`docs.vn-mcp.com`), a paid Mintlify plan should be included in the infrastructure cost estimate. Verify before Phase 6 planning.

- **VND pricing update policy:** The landing page VND pricing (499k, 1.2M, 3.7M) is an approximation at a fixed exchange rate. A decision is needed on update frequency and whether to label it as "approximately" to avoid confusion when the exchange rate fluctuates.

- **CF Workers Unbound plan cost:** The Workers Paid plan ($5/month) is required for the Unbound usage model. Confirmed but should be included in the infrastructure budget for planning.

---

## Sources

### Primary (HIGH confidence)

- MCP SDK `node_modules/@modelcontextprotocol/sdk@1.27.1` inspected directly — `WebStandardStreamableHTTPServerTransport` docstring confirms CF Workers support and shows Hono as the reference integration
- MCP Transports specification (`modelcontextprotocol.io/docs/concepts/transports`, fetched 2026-03-21) — Streamable HTTP current standard; HTTP+SSE 2024-11-05 deprecated
- Existing monorepo codebase — `package.json` confirmed versions, `packages/shared/src/` HMAC utilities, `servers/*/tools/index.ts` `registerAll` export pattern confirmed present
- Cloudflare Workers Platform Limits (official) — CPU time limits, Bundled vs Unbound usage model behavior
- Supabase Row Level Security documentation (official) — `USING`, `WITH CHECK`, service role bypass behavior
- Stripe Webhook Verification documentation (official) — raw body requirement, timestamp window, retry behavior
- npm Workspaces documentation (official) — `workspace:*` protocol publish behavior, `files` field semantics

### Secondary (MEDIUM confidence)

- Hono 4.x documentation (training data) — `streamSSE()`, `@hono/zod-validator`, JWT middleware patterns
- Tinybird Events API (training data + community) — NDJSON POST format, `quarantined_rows` field in ingestion response
- MoMo IPN callback documentation (official MoMo developer docs, Vietnamese) — HMAC-SHA256 field order for standard payment IPN
- MoMo merchant account onboarding documentation — KYC requirements, business entity requirement, approval timeline estimate
- Mintlify documentation (training data) — `mint.json` configuration, MDX page structure, `npx mintlify dev` local preview
- `@changesets/cli` (training data + ecosystem knowledge) — npm workspace compatibility, version bump workflow

### Tertiary (LOW confidence — validate before implementation)

- MoMo Business subscription API specifics — limited English documentation; verify IPN field ordering in subscription payment context (vs. standard payment IPN) against current MoMo API docs before Phase 4
- VN market MoMo wallet penetration (~70% of smartphone users) — training data approximation, not verified from current market data
- Exact VND pricing equivalents — exchange rate approximation at time of research

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
