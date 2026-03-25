# VN MCP Hub — Vietnamese MCP Server Collection

## What This Is

A hosted SaaS platform and npm package collection of 5 MCP (Model Context Protocol) servers for Vietnamese fintech and messaging APIs — MoMo, ZaloPay, VNPAY, Zalo OA, and ViettelPay. Developers connect via SSE transport through a Cloudflare Workers gateway with API key auth, usage metering, and tiered billing — or self-host via npm install.

## Core Value

Developer installs an MCP server or signs up for a hosted API key, adds it to `.mcp.json`, and immediately has Claude Code create payment links, check transaction status, send Zalo messages — without writing any integration boilerplate.

## Requirements

### Validated

- ✓ Monorepo with npm workspaces and TypeScript project references — v1.0
- ✓ Shared HMAC signature generation (SHA-256, SHA-512) — v1.0
- ✓ Shared mock engine with env-flag switching — v1.0
- ✓ Shared error formatting with VN error code translation — v1.0
- ✓ Zod validation schemas for all tool inputs/outputs — v1.0
- ✓ Consistent tool naming convention (`{service}_{verb}_{noun}`) — v1.0
- ✓ CLAUDE.md context file per server — v1.0
- ✓ README with setup instructions per server — v1.0
- ✓ Integration tests in mock mode per server (117 tests) — v1.0
- ✓ No stdout pollution — console.error only (lint enforced) — v1.0
- ✓ MoMo: 4 tools (create_payment, query_status, refund, validate_ipn) — v1.0
- ✓ ZaloPay: 4 tools (create_order, query_order, refund, validate_callback) — v1.0
- ✓ VNPAY: 3 tools (create_payment_url, verify_return, query_transaction) — v1.0
- ✓ Zalo OA: 4 tools (send_message, get_follower_profile, list_followers, refresh_token) — v1.0
- ✓ ViettelPay: 3 tools (create_payment, query_status, refund) with MOCK_DEVIATIONS.md — v1.0
- ✓ Hosted MCP gateway on Cloudflare Workers (SSE/streamable HTTP) — v1.1
- ✓ Auth + API key management via Supabase (user accounts, per-tier keys) — v1.1
- ✓ Usage tracking via Tinybird (API calls per key, tier limits) — v1.1
- ✓ Billing via Stripe (USD) + MoMo mock (VND) with 4 pricing tiers — v1.1
- ✓ npm publishing for all 5 servers + shared under @vn-mcp scope — v1.1
- ✓ Landing page + developer docs (Mintlify) — v1.1
- ✓ 4 pricing tiers: Free / Starter $19 / Pro $49 / Business $149 — v1.1

### Active

- [ ] Dashboard deployed to Cloudflare Pages with production gateway URL
- [ ] Docs deployed to Mintlify cloud with public URL
- [ ] All URLs validated end-to-end (signup → key → tool call → usage → billing)
- [ ] Tech debt from v1.1 audit resolved (RLS, test stubs, MoMo access key, Tinybird tool name)

### Out of Scope

- Real API integration — still mock-first until developer accounts approved
- Banking API servers (VCB, TCB, MB) — Phase 2 Growth per brief
- E-commerce integrations (Shopee, Tiki) — Phase 2 Growth per brief
- QR code generation / VietQR / VNPAY bank list — feature additions deferred
- Zalo OA ZNS transactional notifications — feature addition deferred
- White-label licensing — after platform validated with direct users
- Usage dashboard UI (charts, analytics) — deferred to after first 20 paying customers
- Custom domain for docs — verify Mintlify free tier support

## Current Milestone: v1.2 Production Deployment

**Goal:** Deploy all services to production with working public URLs, validate the full user journey end-to-end, and resolve accumulated tech debt from v1.1.

**Target:**
- Dashboard on CF Pages (production VITE_GATEWAY_URL)
- Docs on Mintlify cloud (public URL)
- Full E2E validation: signup → API key → tool call → usage → upgrade
- Tech debt cleanup: RLS, test stubs, MoMo access key, Tinybird tool name

## Context

Shipped v1.1 Platform Launch with ~7,000 LOC TypeScript across 5 servers, 1 shared package, 1 gateway, 1 dashboard, and 1 docs site.

**Tech stack:** Node.js 20, TypeScript, MCP SDK, Zod, Vitest, Hono.js, Cloudflare Workers, Supabase, Tinybird, Stripe, Mintlify.

**Architecture:** npm workspaces monorepo. Gateway on CF Workers routes MCP requests to 5 server instances via SSE. Auth via SHA-256 hashed API keys with KV caching. Usage metering via Tinybird + KV counters. Billing via Stripe (USD recurring) + MoMo (VND one-time mock).

**Published packages:** @vn-mcp/shared@1.0.0, 5 servers @1.0.2 on npm.

**Known tech debt (8 items):** RLS disabled, MoMo mock-only pending KYC, 6 test stubs, tool name 'unknown' in Tinybird, dashboard not deployed to CF Pages, Mintlify cloud pending, custom domain not configured.

## Constraints

- **Tech Stack**: Node.js 20 + TypeScript — MCP SDK is TypeScript-first
- **Architecture**: Monorepo with shared utilities — consistency across 5 servers
- **API Access**: Mock-first — no real API sandbox accounts available yet
- **MCP Protocol**: MCP spec v1.0 (stable as of Q1/2026)
- **Package Manager**: npm — target audience expects npm install workflow
- **Gateway**: Hono.js on Cloudflare Workers — edge runtime, $0 cost to 100k req/day
- **Auth**: Supabase Auth + Postgres — RLS disabled, gateway enforces isolation
- **Metering**: Tinybird (ClickHouse) — real-time API call analytics, free 1k events/day
- **Billing**: Stripe (USD international) + MoMo (VND domestic, mock until KYC)
- **Budget**: < $500 for first 3 months hosting

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo over separate repos | Shared utilities (auth, errors, testing), consistent patterns | ✓ Good — shared package used by all 5 servers |
| Mock-first approach | No API accounts yet; enables full dev/test cycle | ✓ Good — 117+ tests pass, all servers functional |
| Build MoMo first to validate patterns | Prove architecture before replicating to 4 more servers | ✓ Good — pattern replicated cleanly to all servers |
| ViettelPay built last (low confidence) | No confirmed public API docs; MOCK_DEVIATIONS.md documents all assumptions | ✓ Good — 13-row deviation table written before code |
| TypeScript + Zod | MCP SDK requirement + type-safe schema validation | ✓ Good — clean compilation, runtime validation |
| Hosted MCP via Cloudflare Workers | Edge runtime, $0 to 100k req/day, SSE transport for MCP | ✓ Good — gateway deployed, 5 servers accessible |
| Supabase for auth + API keys | Built-in auth, Postgres for key storage | ✓ Good — RLS didn't work as expected (disabled), but gateway isolation sufficient |
| Stripe + MoMo dual billing | USD international + VND domestic covers all target users | ✓ Good — Stripe live, MoMo mock until KYC |
| Tinybird for usage metering | Real-time ClickHouse analytics, fire-and-forget | ✓ Good — non-blocking via waitUntil |
| KV counter for tier enforcement | Fast limit check without Tinybird latency | ✓ Good — sub-ms enforcement, Tinybird for analytics |
| loadFixture refactored to JSON imports | readFileSync incompatible with CF Workers | ✓ Good — all servers bundle correctly |
| JWT auth for /keys and /usage | Users manage keys before having an API key | ✓ Good — clean separation from API key auth |

---
*Last updated: 2026-03-25 after v1.1 milestone complete*
