# Requirements: VN MCP Hub — v1.1 Platform Launch

**Defined:** 2026-03-21
**Core Value:** Developer installs MCP server, adds to `.mcp.json`, and Claude Code can immediately create payments, check transactions, send messages — zero integration boilerplate.

## v1.1 Requirements

Requirements for platform launch. Each maps to roadmap phases.

### Gateway

- [ ] **GATE-01**: All 5 MCP servers accessible via Streamable HTTP transport on a single Cloudflare Workers endpoint
- [ ] **GATE-02**: MCP `tools/list` returns all 18 tools from all 5 servers
- [ ] **GATE-03**: Tool calls execute correctly through the gateway and return mock responses
- [ ] **GATE-04**: CORS headers allow browser-based MCP clients
- [ ] **GATE-05**: Per-connection McpServer instantiation (stateless, no shared state)

### Auth & API Keys

- [ ] **AUTH-01**: User can sign up and log in via Supabase Auth (email/password)
- [ ] **AUTH-02**: User can generate API keys from dashboard
- [ ] **AUTH-03**: Gateway authenticates requests via API key in header
- [ ] **AUTH-04**: API keys are scoped to pricing tiers (free/starter/pro/business)
- [ ] **AUTH-05**: RLS isolation — users cannot access other users' keys or data

### Metering

- [ ] **METR-01**: Every tool call is logged to Tinybird with API key, server, tool, timestamp
- [ ] **METR-02**: Usage counts are queryable per API key per billing period
- [ ] **METR-03**: Gateway enforces tier call limits (free: 1k/mo, starter: 10k, pro: 100k, business: unlimited)
- [ ] **METR-04**: Metering is non-blocking (ctx.waitUntil)

### Billing

- [ ] **BILL-01**: Stripe Checkout for Starter/Pro/Business tier subscriptions (USD)
- [ ] **BILL-02**: Stripe webhooks update user tier in Supabase
- [ ] **BILL-03**: MoMo one-time payment for monthly subscription (VND)
- [ ] **BILL-04**: MoMo IPN callback updates user tier in Supabase
- [ ] **BILL-05**: PaymentProvider abstraction decouples Stripe and MoMo
- [ ] **BILL-06**: Free tier requires no credit card

### npm Publishing

- [ ] **NPM-01**: All 5 server packages published to npm under @vn-mcp scope
- [ ] **NPM-02**: @vn-mcp/shared published as versioned dependency (not workspace:*)
- [ ] **NPM-03**: Each package installable standalone (npm install @vn-mcp/mcp-momo-vn)
- [ ] **NPM-04**: npm pack --dry-run verification before publish

### Landing Page & Docs

- [ ] **SITE-01**: Landing page with pricing table (4 tiers), feature highlights, signup CTA
- [ ] **SITE-02**: Developer docs with quick start for both self-hosted (npm) and hosted (API key) paths
- [ ] **SITE-03**: Per-server tool reference docs generated from existing READMEs
- [ ] **SITE-04**: Deployed on Mintlify or equivalent

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Additional Servers

- **SERV-01**: mcp-vcb-open-api (Vietcombank Open API)
- **SERV-02**: mcp-tcb-open-api (Techcombank)
- **SERV-03**: mcp-napas-qr (NAPAS VietQR standard)
- **SERV-04**: mcp-mb-open-api (MB Bank)
- **SERV-05**: mcp-vnpt-epay (VNPT ePay)

### Feature Additions

- **FEAT-01**: QR code generation as discrete tool output
- **FEAT-02**: VNPAY bank list tool (vnpay_get_bank_list)
- **FEAT-03**: Zalo OA ZNS transactional notifications
- **FEAT-04**: VietQR generation (NAPAS standard)
- **FEAT-05**: Real API integration (when developer accounts approved)
- **FEAT-06**: Usage dashboard for API key holders
- **FEAT-07**: White-label licensing for agencies

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real API integration | Mock-first until developer accounts approved |
| Banking API servers (VCB, TCB, MB) | Phase 2 Growth per brief |
| E-commerce integrations (Shopee, Tiki) | Phase 2 Growth per brief |
| Browser-based OAuth flow | MCP servers use API key auth via gateway |
| Usage dashboard UI | Deferred to after first 20 paying customers |
| White-label licensing | After platform validated with direct users |
| Custom domain for docs | Verify Mintlify free tier support first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| GATE-01 | — | Pending |
| GATE-02 | — | Pending |
| GATE-03 | — | Pending |
| GATE-04 | — | Pending |
| GATE-05 | — | Pending |
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| METR-01 | — | Pending |
| METR-02 | — | Pending |
| METR-03 | — | Pending |
| METR-04 | — | Pending |
| BILL-01 | — | Pending |
| BILL-02 | — | Pending |
| BILL-03 | — | Pending |
| BILL-04 | — | Pending |
| BILL-05 | — | Pending |
| BILL-06 | — | Pending |
| NPM-01 | — | Pending |
| NPM-02 | — | Pending |
| NPM-03 | — | Pending |
| NPM-04 | — | Pending |
| SITE-01 | — | Pending |
| SITE-02 | — | Pending |
| SITE-03 | — | Pending |
| SITE-04 | — | Pending |

**Coverage:**
- v1.1 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 ⚠️

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*
