# Phase 10: Landing Page & Docs - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Mintlify site deployed with pricing landing page and developer docs. Quickstart covers both self-hosted (npm) and hosted (API key) paths. Per-server tool reference docs generated from existing READMEs. New developer goes from zero to first tool call in under 5 minutes.

</domain>

<decisions>
## Implementation Decisions

### Landing Page Content
- Developer-first hero: "Vietnamese Payment APIs for Claude Code" — code snippet showing .mcp.json config, "Get started in 2 minutes" CTA
- Pricing table: USD primary with VND toggle/tab — international audience sees USD first, Vietnamese users can switch
- 4 tiers: Free (1k calls), Starter $19/449k VND (10k calls), Pro $49/1.19M VND (100k calls), Business $149/3.59M VND (unlimited)
- Signup CTA links to dashboard (apps/dashboard on CF Pages) — Supabase Auth signup flow
- Feature highlights: 5 servers, 18 tools, mock-first development, MCP protocol

### Documentation Structure
- Single quickstart page with tabs: "Hosted (API Key)" and "Self-Hosted (npm)" — no page switching
- Per-server tool reference: one page per server, content generated from existing CLAUDE.md/README.md files — tool name, parameters, example response
- Minimal manual writing — leverage existing server docs

### Platform
- Mintlify — purpose-built for developer docs, free tier, MDX, built-in search
- Mintlify subdomain initially (e.g., mcpvn.mintlify.app) — custom domain deferred
- Site lives in `apps/docs/` directory in the monorepo

### Claude's Discretion
- Exact Mintlify configuration (mint.json structure, navigation, colors)
- Landing page visual design (hero illustration, color scheme)
- Whether to include a server catalog/comparison table
- Mintlify tab component usage for hosted/self-hosted quickstart
- How to structure the mint.json navigation sidebar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Server Documentation (source for tool reference)
- `servers/mcp-momo-vn/CLAUDE.md` — MoMo tools, env vars, workflows
- `servers/mcp-momo-vn/README.md` — MoMo setup, tool descriptions
- `servers/mcp-zalopay-vn/CLAUDE.md` — ZaloPay tools, dual-key HMAC
- `servers/mcp-vnpay/CLAUDE.md` — VNPAY tools, URL-parameter signing
- `servers/mcp-zalo-oa/CLAUDE.md` — Zalo OA tools, OAuth lifecycle
- `servers/mcp-viettel-pay/CLAUDE.md` — ViettelPay tools, mock deviations

### Pricing & Billing
- `apps/gateway/src/billing/provider.ts` — STRIPE_TIERS and MOMO_TIERS constants (exact pricing)
- `apps/gateway/src/metering/usageCounter.ts` — TIER_LIMITS (call limits per tier)

### Dashboard
- `apps/dashboard/.env.example` — Dashboard URL pattern for signup CTA

### npm Packages
- `packages/shared/package.json` — @vn-mcp/shared@1.0.0
- `servers/mcp-momo-vn/package.json` — @vn-mcp/mcp-momo-vn@1.0.2

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 5 CLAUDE.md files with complete tool tables, env vars, workflows — direct source for tool reference pages
- 5 README.md files with setup instructions — source for quickstart content
- STRIPE_TIERS / MOMO_TIERS in provider.ts — authoritative pricing data
- TIER_LIMITS in usageCounter.ts — authoritative call limits

### Established Patterns
- Monorepo workspace at `apps/` — docs site fits as `apps/docs/`
- CF Pages deployment pattern from dashboard — same for Mintlify (if self-hosted) or Mintlify cloud

### Integration Points
- Dashboard URL — signup CTA destination
- Gateway URL — hosted quickstart references this
- npm package names — self-hosted quickstart uses these for `npm install`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Custom domain setup — verify Mintlify free tier support, configure later
- Blog / changelog section — not needed for MVP launch

</deferred>

---

*Phase: 10-landing-page-docs*
*Context gathered: 2026-03-25*
