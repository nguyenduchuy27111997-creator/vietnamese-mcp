# Stack Research

**Domain:** Hosted MCP platform — API gateway, auth, billing, metering, docs (v1.1 additions)
**Researched:** 2026-03-21
**Confidence:** MEDIUM–HIGH (Hono/Cloudflare verified via MCP spec + ecosystem knowledge; Supabase/Stripe versions from training data — flag for version confirmation before implementation)

> **Scope note:** This file covers ONLY the v1.1 additions. The v1.0 stack (Node.js 20, TypeScript, MCP SDK, Zod, tsdown, Vitest, ESLint) is validated and documented in the baseline STACK.md. Do not re-install or re-research those packages.

---

## Recommended Stack

### Core Technologies (NEW for v1.1)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Hono | 4.x (latest) | HTTP framework for Cloudflare Workers API gateway | Purpose-built for edge runtimes; ships with built-in SSE helpers and streaming response support; ~15KB bundle; works identically on Cloudflare Workers, Bun, Node.js — critical for local dev parity |
| Wrangler | 3.x (latest) | Cloudflare Workers CLI for deploy + local dev | Official Cloudflare tooling; `wrangler dev` provides local Worker runtime with D1, KV, and Durable Objects emulation; non-negotiable for CF Workers projects |
| @supabase/supabase-js | 2.x (latest) | Supabase client — auth, database RLS queries | Isomorphic client that works in edge runtimes (no Node.js-only dependencies); Cloudflare Workers compatible; handles JWT verification for API keys |
| @supabase/ssr | 0.5.x+ | Supabase server-side auth cookie/header handling | Designed for edge/SSR environments; necessary for reading auth headers in Cloudflare Workers middleware; replaces deprecated `@supabase/auth-helpers-nextjs` |
| stripe | 16.x (latest) | Stripe SDK — USD billing, subscription management, webhooks | Official Node.js/edge SDK; Stripe 16.x supports Cloudflare Workers edge runtime explicitly; handles webhook signature verification |
| @tinybird/sdk | Latest or REST API | Usage metering — send events, query aggregates | Tinybird's ClickHouse-backed event ingestion; free tier = 1,000 events/day; use REST `/v0/events` endpoint directly (no SDK needed if HTTP POST suffices for CF Workers) |

### Gateway Package (Workers-specific)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hono/streaming | Built into Hono 4.x | SSE streaming responses for MCP Streamable HTTP transport | Use `streamSSE()` from `hono/streaming` for the GET endpoint that opens a persistent SSE stream |
| @hono/zod-validator | 0.4.x | Hono middleware for Zod schema validation on incoming requests | Validates API key format, request bodies against Zod schemas — reuses existing Zod dependency |
| @hono/jwt | Built into Hono middleware | JWT verification for Supabase JWTs | Verify Supabase JWT tokens in Hono middleware before proxying to MCP servers |
| itty-router (SKIP) | — | Avoid — use Hono instead | Hono has better TypeScript support, middleware chain, and active maintenance |

### MCP Transport Adapter

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @modelcontextprotocol/sdk | 1.27.x (existing) | **Already installed** — provides `McpServer`, tool definitions | Reuse existing server definitions from stdio servers; wrap with HTTP transport adapter in gateway |

> **Critical design decision:** Do NOT create separate Worker-specific MCP server packages. Instead, the Cloudflare Worker gateway imports the existing 5 server definitions and adapts them to the Streamable HTTP transport. The MCP SDK's `McpServer` class is transport-agnostic; the transport is injected. This keeps a single source of truth for tools.

> **MCP Transport note:** The MCP spec (as of 2025-06-18) defines **Streamable HTTP** as the standard HTTP transport. The old HTTP+SSE transport (2024-11-05) is deprecated. Implement Streamable HTTP: a single endpoint supporting both POST (for client requests) and GET (for server-pushed SSE). The spec requires `MCP-Protocol-Version` header on all subsequent requests after initialization.

### Auth & API Key Management

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/supabase-js | 2.x | Database queries for API key validation, RLS enforcement | All gateway requests — validate incoming `Authorization: Bearer sk_...` against Supabase `api_keys` table with RLS |
| supabase CLI | Latest (global install) | Migrations, local dev with `supabase start`, type generation | Development tooling — generates TypeScript types from Postgres schema; runs local Supabase stack via Docker |
| jose | 5.x | JWT signing/verification (lightweight) | Verify Supabase JWTs in edge runtime if `@supabase/ssr` JWT helpers are insufficient |

> **API key design:** Hash API keys before storing (SHA-256 of `sk_live_...` prefix keys). Store only the hash in Supabase. Compare incoming key hash at request time. RLS policy: each row has `user_id`, ensure users can only see their own keys via `auth.uid() = user_id`. This is standard Supabase RLS pattern.

### Billing (USD + VND)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| stripe | 16.x | Stripe SDK — subscription plans, checkout sessions, webhooks | All USD billing (international developers); use Stripe Checkout for plan upgrades to avoid PCI scope |
| momo-payment (or direct REST) | N/A — use direct HTTP | MoMo QR/deep-link payment for VND billing | MoMo does not have an official npm package; call MoMo API directly via `fetch()` with HMAC-SHA256 signing (reuse `packages/shared` signing utilities) |

> **MoMo billing note:** The existing `@vn-mcp/shared` package already has HMAC-SHA256 signing. MoMo payment creation for the billing flow reuses those shared primitives. No new npm package needed. The gateway Worker calls MoMo's `https://payment.momo.vn/v2/gateway/api/create` with `requestType: "payWithATM"` or `"captureWallet"`.

### Usage Metering

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tinybird REST API (no SDK) | REST v0 API | Send usage events per API call; query for billing cycle totals | Use direct `fetch()` to POST `/v0/events?name=api_calls` — Tinybird's ingestion endpoint accepts newline-delimited JSON; no npm package required |

> **Tinybird integration pattern:** In the Hono middleware chain, after each successful MCP tool call, fire-and-forget a POST to Tinybird `/v0/events`. Use `ctx.waitUntil(fetch(...))` in Cloudflare Workers to send the event without blocking the response. Free tier is 1,000 events/day — batch if needed via D1 local accumulation + periodic flush.

### npm Publishing

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| npm publish | npm 9+ (built-in) | Publish all 5 servers to npm registry | Use `npm publish --access public` from each server workspace; no additional tooling needed |
| changeset | @changesets/cli 2.x | Automated version bumping + changelog generation for monorepo | Manages version coordination across 5 server packages + shared package; generates CHANGELOG.md per package; pairs with GitHub Actions for release automation |
| GitHub Actions (release.yml) | N/A | Automated npm publish on git tag | Trigger `npm publish` on `release/*` tags; requires `NPM_TOKEN` secret in GitHub repo settings |

> **Publishing strategy:** Each of the 5 servers is published independently as `@vn-mcp/mcp-momo-vn`, etc. The `@vn-mcp/shared` package is published as a peer dependency. Free tier users `npm install @vn-mcp/mcp-momo-vn` and run locally. Paid users connect via the hosted gateway URL — they do NOT need to npm install anything.

### Documentation

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Mintlify | CLI + cloud-hosted | Developer docs — API reference, quickstart, pricing page | Use `mintlify dev` for local preview; deploy via Mintlify cloud (free tier available); docs live at `docs.subdomain.com`; MDX-based with built-in API playground |
| Mintlify CLI | Latest | Local docs development | `npm install -D mintlify` or use `npx mintlify dev` |

> **Mintlify note:** Mintlify uses `mint.json` for configuration and MDX files for content. It is purpose-built for developer documentation with built-in API playground that can test MCP endpoints. Confidence: MEDIUM — Mintlify is the market leader for developer docs in 2025-2026 but pricing tier for custom domains should be verified.

### Development Tools (Gateway-specific)

| Tool | Purpose | Notes |
|------|---------|-------|
| wrangler | Local Worker dev (`wrangler dev`), deploy to CF | Create a `workers/gateway/wrangler.toml` — separate from the monorepo npm scripts; use `wrangler deploy` for production releases |
| Miniflare | Embedded in Wrangler 3.x | Local runtime emulation with D1, KV, Durable Objects — no separate install |
| supabase CLI | Local Supabase stack (`supabase start`) | Requires Docker; runs local Postgres + Auth + Studio; enables integration tests against real DB schema |
| Vitest (existing) | Gateway unit tests | Reuse existing Vitest setup; mock Supabase and Tinybird clients in tests; do NOT spin up Cloudflare Workers runtime in Vitest |

---

## Monorepo Integration

### New package/workspace locations

```
/
├── packages/
│   └── shared/           (EXISTING — reuse for HMAC signing in gateway)
├── servers/              (EXISTING 5 stdio servers — unchanged)
│   └── mcp-momo-vn/
│   └── ...
├── workers/              (NEW — Cloudflare Workers gateway)
│   └── gateway/
│       ├── src/
│       │   ├── index.ts       (Hono app entry)
│       │   ├── middleware/
│       │   │   ├── auth.ts    (API key validation via Supabase)
│       │   │   └── metering.ts (Tinybird event fire-and-forget)
│       │   ├── routes/
│       │   │   └── mcp.ts     (MCP Streamable HTTP endpoint)
│       │   └── servers/       (imports tool definitions from existing servers)
│       ├── wrangler.toml
│       └── package.json
├── web/                  (NEW — landing page)
│   └── landing/          (Astro or Next.js static; TBD)
└── docs/                 (NEW — Mintlify docs)
    ├── mint.json
    └── quickstart.mdx
```

> **Critical:** Add `"workers/*"` and `"web/*"` to the root `package.json` `workspaces` array. The gateway Worker imports `@vn-mcp/shared` for HMAC utilities and will import tool schemas from existing server packages.

### TypeScript configuration for Workers

Cloudflare Workers runtime is NOT Node.js. The `workers/gateway/tsconfig.json` must use:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["@cloudflare/workers-types"]
  }
}
```

Install `@cloudflare/workers-types` as a dev dependency in the gateway package. Do NOT use `@types/node` in the Worker — it will cause type conflicts with the CF runtime globals.

---

## Installation

```bash
# Gateway Worker (workers/gateway/)
npm install hono @supabase/supabase-js @supabase/ssr stripe
npm install -D wrangler @cloudflare/workers-types

# Hono validator middleware (gateway)
npm install @hono/zod-validator

# npm publishing toolchain (monorepo root)
npm install -D @changesets/cli

# Docs (docs/ directory — separate from monorepo)
# Mintlify is configured via mint.json + MDX files, deployed to Mintlify cloud
# Local preview only:
npx mintlify dev
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hono | Itachi Router / itty-router | itty-router is minimal but lacks TypeScript inference, middleware chain quality, and active maintenance; Hono is the de facto standard for CF Workers HTTP frameworks in 2025 |
| Hono | Express on CF Workers | Express requires Node.js compatibility mode in Workers; introduces overhead and may not support all Worker APIs; Hono is designed for the edge runtime |
| Supabase Auth | Clerk | Clerk has a better UI but costs more and adds a third-party dependency for core auth; Supabase Auth + RLS keeps auth + data in the same system, reducing complexity |
| Supabase Auth | Auth0 | Auth0 is overengineered for API-key-only auth; Supabase handles JWT issuance + RLS + API key storage in one system |
| Stripe | Paddle | Paddle handles VAT automatically (relevant for EU customers) but has less developer tooling and lower developer familiarity; Stripe is the correct default for developer SaaS |
| MoMo direct REST | momo-node (unofficial) | No official MoMo npm SDK exists; unofficial packages are unmaintained and lag behind API changes; existing `@vn-mcp/shared` HMAC signing already handles MoMo payload signing |
| Tinybird REST API | Mixpanel / Amplitude | Mixpanel/Amplitude are user analytics tools, not time-series API metering tools; Tinybird's ClickHouse foundation handles billions of events with real-time aggregation — purpose-fit for metering |
| Tinybird REST API | Kafka + ClickHouse self-hosted | Tinybird is managed ClickHouse; self-hosting adds operational burden incompatible with a <$500 3-month budget constraint |
| Mintlify | GitBook | GitBook's API playground is less developer-focused; Mintlify has better MCP/API documentation templates and is the current standard for developer tool docs |
| Mintlify | Docusaurus | Docusaurus requires more configuration and lacks built-in API playground; Mintlify is purpose-built for developer API docs |
| @changesets/cli | semantic-release | semantic-release requires commit convention adherence; changesets is more explicit and better for manual control over version bumps across a monorepo |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @supabase/auth-helpers-nextjs | Deprecated — replaced by `@supabase/ssr` | `@supabase/ssr` |
| node-momo / any unofficial MoMo npm package | Unmaintained, may lag MoMo API changes, no TypeScript support | Direct `fetch()` calls with `@vn-mcp/shared` HMAC signing |
| SSE-only transport (HTTP+SSE 2024-11-05) | Deprecated in MCP spec; replaced by Streamable HTTP | Streamable HTTP transport (single endpoint, POST + GET) |
| D1 (Cloudflare's SQLite) as primary database | Supabase Postgres + RLS provides richer multi-tenant isolation; D1 lacks row-level security primitives | Supabase Postgres |
| Durable Objects for session state | Complexity overkill for stateless MCP gateway; each request is independently authenticated | Stateless JWT/API-key validation in Hono middleware |
| Express.js in Cloudflare Workers | Express requires Node.js compat flag which limits access to native Worker APIs | Hono (edge-native) |
| KV Store for API key storage | Cloudflare KV is eventually consistent; API key validation requires immediate consistency | Supabase Postgres (strong consistency) |
| Next.js for the landing page (if using Workers) | Next.js app router deployed on Vercel is fine; deploying Next.js ON Cloudflare Workers adds complexity; use Astro or a static site for simplicity | Astro (static) or Next.js on Vercel (separate from Workers) |
| Stripe Billing portal in Worker | Stripe Checkout/Customer Portal redirects must be initiated from a web page, not directly from the API gateway Worker | Separate landing page handles Stripe Checkout session creation; Worker only validates subscription status |

---

## Stack Patterns by Variant

**If a user sends an API key (Bearer token) to the gateway:**
- Hono auth middleware extracts `Authorization: Bearer sk_live_...` header
- SHA-256 hash the key, query Supabase `api_keys` table WHERE hash matches
- RLS ensures the query only returns the key if `user_id` matches the requester's context
- Return 401 if not found; inject `user_id`, `tier`, and `monthly_limit` into Hono context for downstream middleware

**If metering an API call:**
- After successful tool execution, fire `ctx.waitUntil(tinybird.ingest({...}))` — non-blocking
- Tinybird event schema: `{ api_key_hash, server, tool, tier, timestamp, latency_ms, status }`
- Query Tinybird for monthly totals in the billing cycle to enforce tier limits before execution

**If a developer subscribes (USD tier):**
- Landing page initiates Stripe Checkout Session → user pays → Stripe webhook fires
- Worker (or edge function) receives `checkout.session.completed` webhook, verifies Stripe signature
- Upsert `subscriptions` row in Supabase: `{ user_id, stripe_customer_id, tier, valid_until }`
- Subsequent API key validations read the `tier` from the Supabase row

**If a developer subscribes (VND tier via MoMo):**
- Landing page calls a Worker route to create MoMo payment link
- Worker uses `@vn-mcp/shared` HMAC signing to call MoMo API
- MoMo IPN (instant payment notification) callback hits a Worker route
- Validate IPN signature with `@vn-mcp/shared` `validateIpn` utility (already implemented)
- Upsert subscription row in Supabase with `payment_method: "momo"`, `tier`, `valid_until`

**If publishing to npm:**
- Run `npx changeset` to bump versions and generate changelogs
- GitHub Action triggers on `release/*` branch merge, runs `npm publish --workspace servers/mcp-momo-vn --access public` for each server
- `@vn-mcp/shared` is published first (it's a dependency of the 5 servers)
- Each server's `package.json` `"files"` field includes only `build/` and `README.md`

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| hono@4.x | @cloudflare/workers-types@4.x | Use Hono 4.x with Workers types 4.x; Hono 3.x has different SSE API |
| hono@4.x | @modelcontextprotocol/sdk@1.27.x | MCP SDK used in Node.js (stdio servers); Hono handles HTTP adaptation layer; they don't share runtime |
| @supabase/supabase-js@2.x | Cloudflare Workers | Confirmed compatible (no Node.js-only imports); requires `globalThis.fetch` which Workers provide |
| stripe@16.x | Cloudflare Workers | Stripe 16.x added explicit CF Workers support; earlier versions used Node.js `http` module and would fail |
| @cloudflare/workers-types@4.x | TypeScript@5.x | Requires TypeScript 5.x; use `moduleResolution: "Bundler"` in Worker tsconfig |
| @changesets/cli@2.x | npm workspaces | Changesets natively understands npm workspaces; reads all `package.json` in workspace packages |
| wrangler@3.x | Node.js 18, 20 | Wrangler 3.x requires Node.js 18+; project uses Node.js 20 LTS — compatible |

---

## Sources

- MCP transports specification (fetched 2026-03-21 from modelcontextprotocol.io) — Streamable HTTP is the current standard (spec version 2025-06-18); HTTP+SSE (2024-11-05) is deprecated. **HIGH confidence.**
- Existing `package.json` in monorepo — confirmed `@modelcontextprotocol/sdk@^1.27.1`, TypeScript `^5.9.3`, Vitest `^3.2.4`. **HIGH confidence.**
- Hono documentation (training data + ecosystem knowledge) — Hono 4.x is the current major version with SSE streaming in `hono/streaming`; purpose-built for CF Workers. **MEDIUM confidence — verify Hono version on npmjs.com before implementation.**
- Supabase docs (training data) — `@supabase/supabase-js` v2.x, `@supabase/ssr` for edge environments, confirmed CF Workers compatible. **MEDIUM confidence — verify `@supabase/ssr` version before implementation.**
- Stripe (training data) — Stripe 16.x introduced CF Workers support explicitly. **MEDIUM confidence — verify current major version on npmjs.com.**
- Tinybird REST API design (training data + architecture reasoning) — Tinybird ingests via `/v0/events` HTTP endpoint; no SDK required for simple ingestion; `ctx.waitUntil()` pattern for CF Workers. **MEDIUM confidence.**
- MoMo payment API (existing implementation in monorepo) — HMAC-SHA256 signing already implemented in `@vn-mcp/shared`; existing `momo_validate_ipn` tool validates IPN signatures. **HIGH confidence.**
- Mintlify (training data) — Mintlify is the standard developer docs platform for API-first products; MDX + `mint.json` config; local dev via `npx mintlify dev`. **MEDIUM confidence.**
- @changesets/cli (training data + ecosystem knowledge) — standard monorepo release management; npm workspace compatible. **MEDIUM confidence.**

---

*Stack research for: VN MCP Hub v1.1 — Hosted platform additions (gateway, auth, billing, metering, npm, docs)*
*Researched: 2026-03-21*
