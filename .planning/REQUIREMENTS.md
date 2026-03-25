# Requirements: VN MCP Hub — v1.2 Production Deployment

**Defined:** 2026-03-25
**Core Value:** Developer installs MCP server or signs up for hosted API key, adds to `.mcp.json`, and immediately uses Claude Code for Vietnamese payments and messaging — zero integration boilerplate.

## v1.2 Requirements

Requirements for production deployment and tech debt resolution. Each maps to roadmap phases.

### Deployment

- [x] **DEPLOY-01**: Dashboard SPA deployed to Cloudflare Pages with production VITE_GATEWAY_URL
- [ ] **DEPLOY-02**: Docs site deployed to Mintlify cloud with public URL
- [ ] **DEPLOY-03**: All CTA links in docs and landing page point to working production URLs
- [x] **DEPLOY-04**: .env.production created for dashboard with gateway URL

### Validation

- [ ] **VAL-01**: Full E2E flow works: signup → create API key → MCP tool call → usage check
- [ ] **VAL-02**: Billing flow works: free user → Stripe Checkout → tier upgrade → increased limits
- [ ] **VAL-03**: Self-hosted npm flow works: npm install → .mcp.json config → tool call

### Tech Debt

- [ ] **DEBT-01**: Implement remaining auth test stubs (auth-supabase.test.ts, rls-isolation.test.ts)
- [ ] **DEBT-02**: Fix MOMO_ACCESS_KEY — add to wrangler.toml or remove from types
- [ ] **DEBT-03**: Fix Tinybird tool name — extract from MCP request body instead of 'unknown'

## v2 Requirements

Deferred to future release.

### Real API Integration

- **REAL-01**: MoMo live API integration (after merchant KYC approval)
- **REAL-02**: ViettelPay real SOAP+RSA integration (after API access)

### Additional Servers

- **SERV-01**: mcp-vcb-open-api (Vietcombank Open API)
- **SERV-02**: mcp-tcb-open-api (Techcombank)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom domain (mcpvn.dev) | Verify Mintlify support first; use subdomains for now |
| Usage dashboard with charts | Deferred to after first 20 paying customers |
| CI/CD pipeline | Manual deployment sufficient for v1.2 |
| RLS re-enablement | Gateway isolation sufficient; revisit when multiple clients access DB |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEPLOY-01 | Phase 11 | Complete |
| DEPLOY-02 | Phase 11 | Pending |
| DEPLOY-03 | Phase 11 | Pending |
| DEPLOY-04 | Phase 11 | Complete |
| DEBT-01 | Phase 12 | Pending |
| DEBT-02 | Phase 12 | Pending |
| DEBT-03 | Phase 12 | Pending |
| VAL-01 | Phase 13 | Pending |
| VAL-02 | Phase 13 | Pending |
| VAL-03 | Phase 13 | Pending |

**Coverage:**
- v1.2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
