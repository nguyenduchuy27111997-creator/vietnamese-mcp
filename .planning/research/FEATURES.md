# Feature Research

**Domain:** Hosted MCP gateway + developer SaaS platform with dual-currency billing (v1.1)
**Researched:** 2026-03-21
**Confidence:** MEDIUM (architecture decisions pre-committed in PROJECT.md; feature patterns derived from training knowledge of analogous SaaS platforms — Stripe, Supabase, Resend, WorkOS; web research unavailable this session)

---

## Scope Note

This file covers NEW features for v1.1 only. The existing v1.0 FEATURES.md covered MCP server tools (momo_create_payment, etc.). Those are complete and not re-listed here. This file focuses on:

- Hosted MCP gateway (Cloudflare Workers + Hono + StreamableHTTP)
- API key management (Supabase Auth)
- Usage metering (Tinybird)
- Billing (Stripe USD + MoMo VND, 4 tiers)
- npm publishing (free/self-hosted tier)
- Landing page + developer docs (Mintlify)

---

## Capability Area 1: Hosted MCP Gateway

The gateway is a Hono.js app on Cloudflare Workers that exposes all 5 MCP servers via StreamableHTTP transport. Developers point their `.mcp.json` at `https://api.vnmcphub.dev/{server-slug}` instead of running local `node` processes.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| StreamableHTTP transport endpoint per server | MCP spec 2025-03-26 defines StreamableHTTP as the standard remote transport; any hosted MCP gateway must implement it | MEDIUM | One route per server: `GET/POST /mcp/{slug}` with SSE response streaming; Hono handles SSE natively; MCP SDK's `StreamableHTTPServerTransport` class needed |
| API key authentication on every request | Developers expect gateway to be protected; unauthenticated access to any hosted API is broken | LOW | `Authorization: Bearer sk_live_xxx` header; middleware validates key against Supabase before routing to server; reject 401 on missing/invalid key |
| Per-server URL routing | One URL per server (not one per tool); matches `.mcp.json` mental model | LOW | `/mcp/momo`, `/mcp/zalopay`, `/mcp/vnpay`, `/mcp/zalo-oa`, `/mcp/viettel-pay`; Hono router maps slug → server instance |
| Correct CORS headers | MCP clients in browser or AI platforms need CORS; missing headers cause silent failures | LOW | `Access-Control-Allow-Origin: *` on OPTIONS + main routes; Hono has built-in CORS middleware |
| Health check endpoint | Monitoring, uptime checks, and CI need a ping endpoint | LOW | `GET /health` returns `{ status: "ok", version: "1.1.0" }` with 200; Cloudflare Workers support this trivially |
| Tier-based server access control | Free tier gets 2 servers, Starter gets 5, etc. — gateway must enforce this | MEDIUM | After key validation, check user's tier from Supabase; compare requested server slug against allowed servers for tier; return 403 with clear message on violation |
| Usage count per request | Every authenticated request must be metered for billing | MEDIUM | After successful auth, emit event to Tinybird with key_id, server, tool, timestamp before proxying to MCP server; async fire-and-forget to avoid latency |
| Graceful error responses in MCP format | Errors from the gateway (auth fail, tier limit) must be valid MCP JSON-RPC error responses | MEDIUM | Errors must be `{"jsonrpc":"2.0","error":{"code":-32xxx,"message":"..."}}` not plain HTTP 4xx; MCP clients don't parse raw HTTP errors |
| Rate limiting per API key | Prevents abuse; expected by any production API service | MEDIUM | Cloudflare Workers has built-in rate limiting via Durable Objects or KV; per-key sliding window; return 429 with `Retry-After` header |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Mock mode toggle via header or tier | Free tier always uses mock data (no real API keys needed); reduces operational risk for early users | MEDIUM | `X-Mock-Mode: true` header (paid tiers only) or forced-mock for free tier; gateway passes env flag to MCP server instance |
| Per-server mock vs. real toggle per key | Power users want to test one server in real mode while keeping others in mock | HIGH | Store per-server mode setting in Supabase user_settings; complex to implement; defer to v1.2 |
| Latency logging in response headers | Developers want to know gateway overhead vs. upstream API time | LOW | `X-Gateway-Latency-Ms` and `X-Upstream-Latency-Ms` headers; trivial to add with Hono middleware; no storage needed |
| Request ID for tracing | Every request gets a traceable ID for support tickets | LOW | `X-Request-Id: uuid-v4` response header; include in Tinybird event; enables "look up call #12345" support queries |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-tool granular access control | Enterprises want to restrict which tools each key can call | Adds schema complexity to every request; token parsing latency; not needed at current scale | Enforce at server level (2 vs 5 servers per tier); add tool-level ACL only if a Business customer explicitly requests it |
| WebSocket transport | Some think WebSocket is faster than SSE | MCP spec 2025-03-26 uses StreamableHTTP (HTTP + SSE); implementing WebSocket means maintaining a non-standard transport; Cloudflare Workers has limited WebSocket lifetime | Implement StreamableHTTP only; it is the correct MCP transport for remote servers |
| Session persistence across requests | Stateful sessions for multi-turn MCP conversations | Cloudflare Workers are stateless; session state requires Durable Objects or external store; MCP tools are inherently stateless (no multi-turn needed for payment/messaging tools) | Stateless per-request; each MCP call is independent |
| IP whitelisting | Security-conscious enterprises want it | VN developers are mobile, use dynamic IPs; IP whitelisting creates constant friction | API key rotation is sufficient; add IP allowlist for Business tier only if explicitly requested |

---

## Capability Area 2: API Key Management

Developers need to create, rotate, and revoke API keys from a dashboard or API. This is the first interaction after signup.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| API key generation on signup | First thing a developer does after creating an account | LOW | Generate `sk_live_` prefix key (32 random bytes, base58 encoded); store hashed value (SHA-256) in Supabase `api_keys` table; never store raw key; only show once at creation |
| Multiple keys per account | Developers use different keys per project/environment | LOW | Up to 3 keys on Free, 10 on Starter, unlimited on Pro/Business; `api_keys` table has `user_id`, `name`, `key_hash`, `created_at`, `last_used_at`, `tier` |
| Key revocation | Compromised key must be killable immediately | LOW | `DELETE /api/keys/{id}` removes row from Supabase; gateway's key lookup cache (KV or in-memory) must invalidate within 30s |
| Key naming | Developers name keys by project ("production", "staging") | LOW | `name` column on `api_keys`, user-editable, max 64 chars; displayed in dashboard |
| Last used timestamp | Developers need to know if a key is still active | LOW | Update `last_used_at` on each auth check; display in dashboard; helps identify abandoned keys |
| Test vs. live key distinction | Standard developer tool pattern (Stripe, Twilio) | LOW | `sk_test_` prefix for keys that always return mock data; `sk_live_` prefix for keys that use real APIs when available; test keys are free-tier equivalent, never metered |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Key usage statistics on dashboard | Developers want to see which key is hitting which server | MEDIUM | Query Tinybird API from dashboard to show per-key call counts by server/day; visual chart; no new infrastructure needed since Tinybird is already required for billing |
| Key expiry date | Security-conscious teams rotate keys on schedule | LOW | Optional `expires_at` column; gateway rejects expired keys with 401 + message "Key expired. Rotate at dashboard URL"; auto-send email 7 days before expiry |
| .mcp.json snippet generation | One-click copy of the correct `.mcp.json` config for each server | LOW | High UX value, zero infrastructure cost; generate JSON client-side from template + key value; include all servers for tier |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| OAuth-based machine auth | Some CI/CD pipelines prefer OAuth over static keys | Requires OAuth server infrastructure (PKCE, token refresh, scopes); overkill for an MCP key; no AI coding agent supports OAuth for MCP today | API key via env var is the standard MCP pattern; document `CLAUDE_MCP_KEY=sk_live_xxx` env setup |
| Key scopes (per-server, per-tool) | Granular least-privilege | Multiplies key management UI complexity; at current scale, tier-based server access is sufficient | Tier controls server access; all tools within a server are accessible to the key holder |
| Key sharing between team members | Teams want shared keys | Shared keys break audit trails (who made which call?); support becomes impossible | Each developer gets their own key; team billing is per-account not per-key; add team seats in v2 |

---

## Capability Area 3: Usage Metering

Every API call must be counted, stored, and queryable for billing and developer visibility.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Count API calls per billing period | Core of metered billing; without it, no usage-based pricing | MEDIUM | Tinybird receives events: `{key_id, user_id, server, tool, latency_ms, status, timestamp}`; aggregate via Tinybird Pipe query monthly; Stripe reads this count to generate invoice |
| Enforce monthly call limits per tier | Free: 1k/month, Starter: 10k, Pro: 100k; gateway must block calls at limit | MEDIUM | Gateway checks current-month count from Tinybird or Supabase counter before serving request; at-limit = 429 with message "Monthly limit reached. Upgrade at [pricing URL]" |
| Usage visible in dashboard | Developers want to monitor their consumption before hitting limit | MEDIUM | Dashboard calls Tinybird API with user's API key to show: calls this month, calls per server per day, estimated bill; real-time (Tinybird is ClickHouse, sub-second queries) |
| Usage warning emails | Alert at 80% and 100% of monthly limit | LOW | Supabase Edge Function triggered by Tinybird webhook or daily cron; send via Resend (or any transactional email) to user email |
| Overage handling (grace or hard stop) | Without overage policy, limits are confusing | LOW | Hard stop at limit for Free and Starter; overage billing at $0.001/call for Pro and Business (per brief); document policy clearly in pricing page |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Real-time usage counter on dashboard | Developers can see current-month count without lag | LOW | Tinybird's ClickHouse engine makes this trivially real-time; the counter visible in the dashboard is a competitive edge vs. monthly invoices-only |
| Per-server usage breakdown | "I've made 450 MoMo calls and 50 ZaloPay calls this month" | LOW | Already in the Tinybird event (server field); just surface in dashboard chart; no extra infrastructure |
| Usage export (CSV) | Enterprise compliance, auditing | LOW | CSV download from Tinybird Pipe query; add as Business-tier feature only |
| Call latency percentiles (p50/p95/p99) | Performance debugging for Pro+ users | MEDIUM | Already captured in `latency_ms` field; Tinybird can compute percentiles; surface in dashboard; strong signal to Pro users that the platform is performant |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-minute rate limiting as core billing | Some platforms charge per minute of compute | MCP calls are sub-second; billing by call-count is much simpler and more predictable for developers | Per-call billing per tier |
| Billing alerts via SMS (Vietnamese carrier) | Feels native to VN developers | SMS integration requires VN carrier registration, GDPR-equivalent (PDPA VN) compliance, cost per SMS; email achieves same goal | Email notifications at 80% + 100% |

---

## Capability Area 4: Billing — Stripe USD + MoMo VND

This is the most complex capability area and the most specific to the Vietnamese market.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Stripe subscription for international users | Any developer outside VN (or VN devs with international cards) expects Stripe | MEDIUM | Stripe Subscriptions API; 4 Products (Free, Starter $19, Pro $49, Business $149); monthly billing; Stripe Checkout for onboarding flow; Stripe Customer Portal for self-service upgrades/cancellations |
| MoMo payment for VND-paying users | VN developers will pay in VND; Stripe card is a friction point (requires international Visa/Mastercard); without MoMo, conversion from VN users will be poor | HIGH | MoMo Business subscription payment requires MoMo Business API (not the payment gateway API already built); separate MoMo merchant account needed; monthly recurring is NOT native in MoMo — requires manual charge each month or webhook-driven re-initiation |
| Tier enforcement linked to payment status | A user who cancels must immediately lose access; a user who pays must immediately gain access | MEDIUM | Supabase `user_tier` column updated via Stripe webhook (`customer.subscription.updated`) and MoMo IPN; Cloudflare KV caches tier per key for gateway performance |
| Free tier that works without payment info | Developers must be able to try the product without a credit card | LOW | Free tier keys created at signup with no payment required; 1k calls/month enforced via Tinybird count; no card required unless upgrading |
| Upgrade/downgrade self-service | Developers expect to manage their own subscription | MEDIUM | Stripe Customer Portal handles this natively for Stripe subscribers; MoMo subscribers need a manual cancel + re-subscribe flow (MoMo has no hosted portal) — document this limitation clearly |
| Invoice generation and history | Developers need invoices for accounting | LOW | Stripe generates PDF invoices automatically; for MoMo payments, generate a simple PDF receipt from Supabase `momo_payments` table; email on payment confirmation |
| Subscription cancellation with immediate downgrade | Developers expect to cancel anytime | LOW | Stripe: `cancel_at_period_end: false` for immediate downgrade; MoMo: no recurring charge mechanism, so cancellation is simply not initiating next month's payment; downgrade in Supabase via webhook |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| VND pricing display (499,000 VND instead of $19) | VN developers think in VND; USD pricing feels foreign and triggers price anchoring | LOW | Show both USD and VND equivalents on pricing page; VND price should be round number (499k, 1.2M, 3.7M); display note "exchange rate fixed monthly" |
| MoMo QR payment on checkout | VN developers recognize MoMo QR immediately; lowest friction payment for domestic users | MEDIUM | Use mcp-momo-vn (already built!) to generate QR for payment; ironic and good marketing — "we use our own MCP servers to process payments" |
| Annual billing discount | 2 months free (16.7% discount) is standard developer SaaS | LOW | Stripe handles annual billing natively; MoMo annual billing requires a single larger charge; annual discount improves cash flow and reduces churn |
| Grace period on failed payments (3 days) | Vietnamese bank transfers sometimes fail due to limits; immediate lockout is harsh | LOW | Stripe Dunning handles retry automatically; for MoMo, implement 3-day grace period in Supabase before downgrading tier; email on day 1 and day 3 |
| Receipt in Vietnamese (invoice tiếng Việt) | Enterprises need Vietnamese-language receipts for accounting | MEDIUM | Stripe does not support Vietnamese invoices natively; generate custom PDF receipt in Vietnamese from Supabase data using a PDF library; Business tier only |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| ZaloPay subscription billing | ZaloPay is also popular in VN | ZaloPay business subscription API is less documented than MoMo; two manual billing systems doubles maintenance; ZaloPay lacks recurring billing infrastructure | MoMo for VND, Stripe for USD — two channels are sufficient; add ZaloPay if explicit user demand emerges |
| Crypto payment (USDT/USDC) | Popular in some VN tech circles | Regulatory risk in VN (crypto restrictions); accounting complexity; no self-serve billing portal available | Stripe + MoMo covers 95%+ of target users |
| Enterprise invoicing / net-30 payment | Enterprises want invoicing | Requires manual AR process; out of scope for a solo-founder micro-SaaS at this stage | Enterprise customers pay via Stripe with card or contact for wire transfer; add net-30 only if a large customer demands it |
| Lifetime deal (LTD) | Popular on AppSumo for launch | LTD cannibalizes subscription revenue; attracts deal-seekers not serious users; creates pricing anchor that makes future increases hard | Early adopter discount (50% off first 3 months) is better; preserves subscription model |

---

## Capability Area 5: npm Publishing

All 5 servers published to npm as `@vn-mcp/momo`, `@vn-mcp/zalopay`, etc. This enables the free/self-hosted tier and drives organic discovery.

### Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| All 5 servers published to npm under scoped package | npm is the standard discovery channel for Node.js developer tools; without npm listing, the product does not exist for most developers | LOW | `@vn-mcp/momo`, `@vn-mcp/zalopay`, `@vn-mcp/vnpay`, `@vn-mcp/zalo-oa`, `@vn-mcp/viettel-pay`; public packages; `npm install @vn-mcp/momo` |
| README with 5-minute quickstart | Developers judge a package in 60 seconds on npm/GitHub; no quickstart = skip | LOW | README must show: `npm install`, `.mcp.json` config, first tool call output; must be in English with Vietnamese notes for VN-specific concepts |
| Semantic versioning and CHANGELOG | Developers need to know when to upgrade and what changed | LOW | `v1.1.0` for hosted gateway release; `CHANGELOG.md` per package; semver strictly followed; breaking changes = major version bump |
| `bin` entry for `npx` execution | Developers want `npx @vn-mcp/momo` to just work; no `node dist/index.js` needed | LOW | `"bin": { "mcp-momo": "./dist/index.js" }` in `package.json`; makes `.mcp.json` cleaner: `"command": "npx", "args": ["@vn-mcp/momo"]` |
| Provenance attestation on npm | npm now supports package provenance; expected by security-conscious teams | LOW | `--provenance` flag in `npm publish` command; links npm package to GitHub Actions build; free; signals trust |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| CLI tool: `vn-mcp doctor` | Validates environment (env vars present, network reachable, key valid) before developer starts coding | MEDIUM | Root `@vn-mcp/cli` package; `npx vn-mcp doctor --server momo` checks env vars, pings gateway, validates API key; saves hours of debugging |
| MCP Registry listing | MCP Registry is the canonical discovery channel for MCP servers; listing = free distribution | LOW | Submit to `https://registry.mcp.so` (or equivalent); include all 5 servers; links back to landing page |
| Lockstep version across all packages | All 5 servers always release the same version number together | LOW | Simplifies user mental model; "I'm on v1.1.0" is unambiguous; implement with root `npm run release` script using `changesets` or manual version bump |

### Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Single monorepo npm package (`@vn-mcp/all`) | Simpler install | Forces users to pull all 5 servers even if they only need MoMo; increases install size; hides individual server changelogs | Keep separate packages; create a meta-package `@vn-mcp/all` that just `npm install`s the others as a convenience |
| Pre-bundled with all dependencies | Zero-dependency installs are appealing | Doubles bundle size; hides security vulnerabilities in outdated bundled deps; npm audit won't catch them | Keep external deps (axios, zod, MCP SDK); they install fast and stay up-to-date |

---

## Capability Area 6: Landing Page + Developer Docs

The landing page converts visitors to signups. The docs convert signups to activated users. Both are table stakes for a developer SaaS.

### Table Stakes (Landing Page)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Above-the-fold hero with clear value proposition | Visitors decide in 3 seconds; no value prop = bounce | LOW | "Claude Code speaks Vietnamese APIs" or "MCP servers for MoMo, ZaloPay, Zalo OA — zero boilerplate"; tagline in English, subtitle in Vietnamese OK |
| Working demo / code snippet in hero | Developer tools live or die by the demo; showing `.mcp.json` config + Claude output in the hero converts better than prose | LOW | Static code block showing `.mcp.json` + a Claude Code conversation creating a MoMo payment link; animated typing optional but not required |
| Pricing table (4 tiers, USD + VND) | Developers will not sign up without seeing pricing; hiding pricing = distrust | LOW | Free / Starter $19 (499k VND) / Pro $49 (1.2M VND) / Business $149 (3.7M VND); highlight "Most Popular" on Starter; include call limits per tier |
| Server catalog (all 5 servers, what they do) | Developers need to know what they're getting access to | LOW | Card grid: one card per server with icon, name, tool list, which tiers unlock it |
| Signup CTA → Supabase auth | Without signup, no trial; GitHub OAuth reduces friction | LOW | "Start for free" → Supabase OAuth (GitHub, Google); no credit card required for Free tier |
| SEO basics (title, description, OG image) | Organic search is the primary distribution for developer tools | LOW | Title: "VN MCP Hub — MCP Servers for Vietnamese Developers"; Vietnamese keywords in description; OG image with brand |
| Link to GitHub repo | Developer tools must be inspectable; closed-source creates distrust | LOW | GitHub link in nav; "View source" in footer; open-source core is a marketing asset |

### Table Stakes (Developer Docs)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Quickstart (5 minutes to first call) | Developers expect to be productive within 5 minutes or they churn | LOW | Install → API key → `.mcp.json` config → first Claude conversation using an MCP tool; Mintlify's "Getting Started" template |
| Per-server reference docs | Every server needs documented tools with inputs, outputs, and examples | LOW | One page per server; tool name, description, input schema (Zod), example input/output; already documented in CLAUDE.md — port to Mintlify format |
| Authentication guide | First source of confusion for new users | LOW | "Where to get your API key", "How to add it to `.mcp.json`", "Test vs. live key difference" |
| Error code reference | When something breaks, developers look here first | LOW | Unified list of gateway errors (401, 403, 429, 503) + VN API error codes per server; already have error translation tables in the codebase |
| Pricing + limits reference | Developers want to calculate their cost before upgrading | LOW | Tier comparison table with exact call limits, server access, and overage rates |
| Changelog | Developers subscribe to changelogs; without it, they don't know when to upgrade | LOW | One changelog page, newest first; link from npm README and GitHub releases |

### Differentiators (Landing Page + Docs)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Live playground on landing page | Developers can try a tool call without signup | HIGH | Requires demo API key + sandboxed gateway endpoint; significant backend work; defer to v1.2 |
| Vietnamese-language docs section | VN developers are more comfortable reading Vietnamese for nuanced concepts | MEDIUM | Key pages (Quickstart, MoMo guide, ZaloPay guide) translated to Vietnamese; Mintlify supports multi-language with separate directory; good signal to VN ICP |
| "Built with" showcase | Social proof from real users using the MCP servers | LOW | 3-4 testimonial cards from beta users; LinkedIn/Twitter handles; shows what they built; zero infrastructure, just copy |
| Integration guide per server (blog-style SEO) | SEO content that captures "how to integrate MoMo with Claude Code" searches | MEDIUM | One long-form guide per server published on the docs site; Mintlify supports blog-style pages; primary content marketing and SEO play for VN search |
| Community links (Discord, Facebook Group) | VN developers congregate on Facebook Groups and Discord; links from docs → community reduces churn | LOW | "Join the community" CTA in docs sidebar; links to Discord server and "Dev VN" Facebook groups; low infrastructure cost |

### Anti-Features (Landing Page + Docs)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Video tutorial in hero | Looks modern, shows product in action | Adds 2-3 weeks to launch; video becomes stale immediately when UI changes; developers prefer code over video | Code snippet + animated demo GIF in hero is faster to produce and stays accurate |
| Full API reference generated from OpenAPI | Completeness | The MCP protocol is not REST; OpenAPI docs mislead developers into thinking they can call the gateway like a REST API | Document MCP tools natively in Mintlify format; no OpenAPI |
| Dark mode docs | Design nice-to-have | Mintlify has dark mode built-in — this is already provided by default; listing as a feature is misleading | Just use Mintlify default theme |
| Blog as primary content channel | Content marketing strategy | Blog requires consistent publishing schedule; first 3 months should focus on product not content | Integration guides embedded in docs serve dual purpose (docs + SEO) without requiring a separate content calendar |

---

## Feature Dependencies

```
[Cloudflare Workers gateway]
    └──requires──> [Supabase API key table] (to validate keys)
    └──requires──> [Tinybird event ingest endpoint] (to emit usage events)
    └──requires──> [Tier lookup per key] (to enforce server access)

[Supabase API key table]
    └──requires──> [Supabase Auth user table] (key belongs to user)
    └──requires──> [Stripe/MoMo subscription status on user] (determines tier)

[Stripe subscription]
    └──requires──> [Stripe webhook endpoint on Supabase Edge Function] (to update tier on payment)
    └──enables──> [tier enforcement on gateway]

[MoMo subscription billing]
    └──requires──> [MoMo Business merchant account] (separate from the MCP servers built in v1.0)
    └──requires──> [manual monthly charge flow] (MoMo has no native recurring billing)
    └──enables──> [VND-paying users access to paid tiers]

[Tinybird usage events]
    └──enables──> [monthly call count for billing]
    └──enables──> [usage dashboard on landing page]
    └──enables──> [limit enforcement at gateway]

[npm publish]
    └──requires──> [CI/CD GitHub Actions] (automated publish on tag)
    └──enables──> [free/self-hosted tier users] (no gateway needed)

[Mintlify docs]
    └──requires──> [GitHub repo with docs/ directory] (Mintlify reads from GitHub)
    └──requires──> [existing CLAUDE.md content] (port to Mintlify format)
    └──enables──> [landing page linking to full docs]

[Landing page signup]
    └──requires──> [Supabase Auth] (GitHub/Google OAuth)
    └──produces──> [user record in Supabase]
    └──triggers──> [API key generation on first login]
```

### Critical Dependency: MoMo recurring billing is manual

MoMo does not have a native subscription/recurring billing API (unlike Stripe). The MoMo Business payment API initiates a one-time charge. For monthly subscriptions paid via MoMo, the system must:
1. Store the user's MoMo account identifier and agreed subscription plan in Supabase
2. On the 1st of each month, generate a new MoMo payment request and send a payment link via email
3. Wait for IPN confirmation before renewing tier
4. Implement a 3-day grace period for payment failures

This adds significant complexity to the billing implementation. MoMo billing should be built after Stripe billing is validated.

### Dependency Notes

- **Gateway requires Supabase before gateway can serve requests:** Key validation is a synchronous dependency; deploy Supabase schema and seed test keys before deploying gateway.
- **Tinybird is an async dependency:** The gateway can function without Tinybird (by logging to console) but usage limits and billing will not work. Build Tinybird integration in the same phase as the gateway, not after.
- **npm publish is independent:** npm publishing has zero dependencies on the gateway or billing infrastructure. It can be done in a separate phase or even before the gateway is ready.
- **Mintlify docs are independent:** Docs can be published before the gateway is ready; document the self-hosted npm install path first, then add hosted gateway docs.

---

## MVP Definition

### Launch With (v1.1)

The minimum platform needed to charge the first paying customer.

- [ ] StreamableHTTP gateway on Cloudflare Workers (all 5 servers accessible via HTTP)
- [ ] API key generation and validation (Supabase)
- [ ] Tier enforcement: Free (2 servers, 1k calls), Starter (5 servers, 10k calls)
- [ ] Tinybird usage metering (fire-and-forget event per request)
- [ ] Monthly call limit enforcement (hard stop at limit)
- [ ] Stripe subscription (Free and Starter tier only for launch)
- [ ] MoMo one-time payment for first month Starter (manual recurring, not automated)
- [ ] npm publish all 5 packages
- [ ] Mintlify landing page: hero, pricing, server catalog, signup CTA
- [ ] Mintlify docs: quickstart, per-server tool reference, auth guide

### Add After Validation (v1.2)

Features to add once first 20 paying customers are acquired.

- [ ] Pro ($49) and Business ($149) tiers — add after Starter demand validated
- [ ] Automated MoMo monthly billing flow (cron + email + IPN)
- [ ] Usage dashboard (per-key, per-server, per-day chart)
- [ ] Usage warning emails at 80% and 100% of limit
- [ ] Annual billing discount (Stripe only)
- [ ] VND pricing display on landing page
- [ ] Vietnamese quickstart guide in docs
- [ ] `vn-mcp doctor` CLI health check tool
- [ ] Key expiry dates and rotation reminders

### Future Consideration (v2+)

- [ ] Team seats (multiple users sharing one subscription)
- [ ] Custom MCP server builds for enterprise clients
- [ ] Vietnamese-language invoice PDF generation
- [ ] Live playground on landing page (demo without signup)
- [ ] Banking API servers (Phase 2 per brief)
- [ ] White-label licensing for agencies
- [ ] PDPA VN compliance audit and DPA for enterprise customers

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| StreamableHTTP gateway | HIGH | MEDIUM | P1 |
| API key validation middleware | HIGH | LOW | P1 |
| Free tier enforcement (2 servers, 1k calls) | HIGH | MEDIUM | P1 |
| Stripe Starter subscription | HIGH | MEDIUM | P1 |
| Tinybird usage event emit | HIGH | LOW | P1 |
| npm publish all 5 servers | HIGH | LOW | P1 |
| Landing page (hero + pricing + signup) | HIGH | MEDIUM | P1 |
| Mintlify quickstart + server reference | HIGH | MEDIUM | P1 |
| MoMo first-month payment | HIGH | HIGH | P1 (for VN users) |
| Rate limiting per key | MEDIUM | MEDIUM | P1 |
| CORS middleware | MEDIUM | LOW | P1 |
| Usage dashboard | MEDIUM | MEDIUM | P2 |
| Pro + Business Stripe tiers | HIGH | LOW | P2 |
| MoMo automated monthly billing | HIGH | HIGH | P2 |
| Annual billing | MEDIUM | LOW | P2 |
| Usage warning emails | MEDIUM | LOW | P2 |
| VND pricing display | MEDIUM | LOW | P2 |
| Vietnamese docs | MEDIUM | MEDIUM | P2 |
| CLI doctor tool | MEDIUM | MEDIUM | P3 |
| Live playground | HIGH | HIGH | P3 |
| Vietnamese invoice PDF | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.1 launch
- P2: Should have, add in v1.2 after first paying customers
- P3: Nice to have, v2+ consideration

---

## Competitor Feature Analysis

No direct competitors for Vietnamese MCP servers. Comparison against analogous developer tool SaaS platforms with hosted gateway + billing:

| Feature | Resend (email API SaaS) | Upstash (serverless Redis) | Our Approach |
|---------|------------------------|---------------------------|--------------|
| Free tier | 100 emails/day, no card | 10k commands/day, no card | 1k calls/month, 2 servers, no card |
| API key UX | One key per domain | Per-database key | Per-account key, up to 3 on Free |
| Billing | Stripe only (USD) | Stripe only (USD) | Stripe (USD) + MoMo (VND) — VN-specific |
| Docs | Mintlify-style, excellent | Custom MDX, excellent | Mintlify (same tool as Resend) |
| SDK | `resend` npm package | `@upstash/redis` npm package | `@vn-mcp/*` npm packages |
| Pricing display | USD only | USD only | USD + VND equivalent |
| Self-hosted | Not available | Redis OSS self-hostable | npm packages enable self-hosted free tier |
| Dashboard | Usage per domain/day | Throughput per database | Usage per server per day (via Tinybird) |

---

## VN Market Specifics

These features and patterns matter specifically because the target market is Vietnamese developers.

### Payment method distribution among VN developers (MEDIUM confidence — training knowledge)

- MoMo penetration in VN: ~70%+ of smartphone users have MoMo wallet
- International credit card (Visa/Mastercard) penetration is lower, especially among freelancers
- ZaloPay: second most popular wallet but business payment API is less mature
- Implication: **MoMo payment must work at launch**; Stripe-only billing will exclude a significant portion of VN target users

### Distribution channels specific to VN developers (MEDIUM confidence)

- Viblo.asia: Vietnamese-language tech blog platform; a well-ranked Viblo post drives 500-2000 developer visits
- Facebook Group "Cộng đồng Developer Việt Nam" (300k+ members): primary social channel for VN dev news
- YouTube tech VN (TheDevForum, ToiDiCode): product demos and tutorials
- TikTok developer content: growing but younger audience
- LinkedIn VN tech: for startup/enterprise ICPs
- GitHub trending: MCP servers trend frequently in 2025-2026; being on GitHub trending for 1 day = 500+ stars

### Localization requirements

- Pricing page: show VND equivalent (499k, 1.2M, 3.7M) alongside USD; do not show only USD
- Error messages in English (VN developers read English tech content)
- Docs: English primary, Vietnamese secondary (key pages translated)
- Support: Respond in Vietnamese on Facebook/Discord; English on GitHub issues
- Legal: Privacy policy must reference Vietnam's PDPA (Luật An ninh mạng 2018, Nghị định 13/2023/NĐ-CP); basic compliance required for collecting user data

---

## Sources

All findings are from training knowledge (HIGH-MEDIUM confidence for general SaaS patterns; MEDIUM for VN market specifics) and official project documents (PROJECT.md, brief.md, existing research files). External web research was unavailable this session.

**HIGH confidence (well-established SaaS patterns, multiple independent sources in training data):**
- Stripe metered billing and subscription patterns
- API key management patterns (Stripe, Resend, Twilio, Supabase)
- Developer SaaS landing page conventions (Resend, Upstash, Neon, Fly.io)
- Mintlify docs patterns
- npm package publishing conventions (bin, provenance, scoped packages)
- MCP StreamableHTTP transport spec (verified in prior v1.0 research)
- Cloudflare Workers capabilities and constraints

**MEDIUM confidence (VN-market-specific, training data coverage is less dense):**
- MoMo wallet market penetration estimates
- MoMo Business recurring billing limitations (no native subscription; manual re-charge required)
- Viblo.asia, Facebook Dev VN group distribution patterns
- VN developer payment method preferences
- PDPA Vietnam compliance requirements

**LOW confidence (unverified):**
- MoMo Business API specifics for merchant subscription charging (requires direct testing with MoMo Business merchant account)
- ZaloPay subscription billing API maturity
- Exact VND pricing equivalents (exchange rate fluctuates)

---

*Feature research for: Hosted MCP gateway + developer SaaS platform (v1.1)*
*Researched: 2026-03-21*
