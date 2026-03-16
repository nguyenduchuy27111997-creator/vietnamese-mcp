# Requirements: VN MCP Hub — Phase 1

**Defined:** 2026-03-16
**Core Value:** Developer installs MCP server, adds to `.mcp.json`, and Claude Code can immediately create payments, check transactions, send messages — zero integration boilerplate.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Shared Infrastructure

- [ ] **INFRA-01**: Monorepo with npm workspaces and TypeScript project references
- [ ] **INFRA-02**: Shared HMAC signature generation utility (SHA-256, SHA-512)
- [ ] **INFRA-03**: Shared mock engine with env-flag switching (`SANDBOX_MODE=true`)
- [ ] **INFRA-04**: Shared error formatting utility with VN error code translation
- [ ] **INFRA-05**: Zod validation schemas for all tool inputs and outputs
- [ ] **INFRA-06**: Consistent tool naming convention (`{service}_{verb}_{noun}`)
- [ ] **INFRA-07**: CLAUDE.md context file per server
- [ ] **INFRA-08**: README with setup instructions per server
- [ ] **INFRA-09**: Integration tests in mock mode per server
- [ ] **INFRA-10**: No stdout pollution — console.error only (lint rule enforced)

### MoMo (`mcp-momo-vn`)

- [ ] **MOMO-01**: `momo_create_payment` — create QR/wallet/ATM payment with payUrl output
- [ ] **MOMO-02**: `momo_query_status` — check transaction by orderId
- [ ] **MOMO-03**: `momo_refund` — full and partial refund by transId
- [ ] **MOMO-04**: `momo_validate_ipn` — validate + parse incoming IPN payload signature
- [ ] **MOMO-05**: Sandbox mock mode for all MoMo tools

### ZaloPay (`mcp-zalopay-vn`)

- [ ] **ZPAY-01**: `zalopay_create_order` — create order with redirect URL
- [ ] **ZPAY-02**: `zalopay_query_order` — check status by app_trans_id
- [ ] **ZPAY-03**: `zalopay_refund` — refund by zp_trans_id
- [ ] **ZPAY-04**: `zalopay_validate_callback` — validate callback MAC
- [ ] **ZPAY-05**: Sandbox mock mode for all ZaloPay tools

### VNPAY (`mcp-vnpay`)

- [ ] **VNPY-01**: `vnpay_create_payment_url` — build signed payment URL
- [ ] **VNPY-02**: `vnpay_verify_return` — verify return URL signature
- [ ] **VNPY-03**: `vnpay_query_transaction` — query transaction status
- [ ] **VNPY-04**: Sandbox mock mode for all VNPAY tools

### Zalo OA (`mcp-zalo-oa`)

- [ ] **ZLOA-01**: `zalo_oa_send_message` — send text/image/file to follower by userId
- [ ] **ZLOA-02**: `zalo_oa_get_follower_profile` — get profile info by userId
- [ ] **ZLOA-03**: `zalo_oa_list_followers` — paginated follower list
- [ ] **ZLOA-04**: `zalo_oa_refresh_token` — refresh expired access token
- [ ] **ZLOA-05**: Sandbox mock mode for all Zalo OA tools

### ViettelPay (`mcp-viettel-pay`)

- [ ] **VTPAY-01**: `viettel_pay_create_payment` — initiate payment request
- [ ] **VTPAY-02**: `viettel_pay_query_status` — check transaction status
- [ ] **VTPAY-03**: `viettel_pay_refund` — refund transaction
- [ ] **VTPAY-04**: Sandbox mock mode for all ViettelPay tools

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Differentiators

- **DIFF-01**: QR code generation as discrete tool output
- **DIFF-02**: VNPAY bank list tool (`vnpay_get_bank_list`)
- **DIFF-03**: Multi-method payment creation (wallet, ATM, credit card, BNPL)
- **DIFF-04**: VietQR generation (NAPAS standard)
- **DIFF-05**: Idempotent request ID generation helper
- **DIFF-06**: Structured audit log as MCP resource

### Zalo OA Extensions

- **ZLOA-06**: ZNS transactional notifications by phone number (requires template approval)
- **ZLOA-07**: Broadcast message to all followers with segmentation

### Platform

- **PLAT-01**: npm publishing to registry
- **PLAT-02**: Real API integration (when developer accounts approved)
- **PLAT-03**: API gateway (Cloudflare Workers)
- **PLAT-04**: Auth & API key management (Supabase)
- **PLAT-05**: Usage tracking / billing (Tinybird + Stripe)

## Out of Scope

| Feature | Reason |
|---------|--------|
| 1:1 REST endpoint mapping | Produces 50+ tools per server; confuses AI agents; MCP best practice is 4-6 curated tools |
| Storing credentials in tool args | Security risk — credentials appear in Claude context and logs |
| Webhook server / IPN listener | MCP servers are stdio-based; cannot listen on ports; wrong architectural layer |
| Real-time transaction streaming | Payment APIs are request-response only; polling is correct pattern |
| Automatic retry with backoff | Hides failures from Claude; agent cannot reason about retried failures |
| Multi-currency support | All five VN APIs are VND-only; adds complexity for zero benefit |
| Browser-based OAuth flow | MCP servers run in CLI context; cannot open browser |
| Banking API servers (VCB, TCB, MB) | Phase 2 — after Phase 1 validation |
| E-commerce integrations (Shopee, Tiki) | Phase 2 — after Phase 1 validation |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | — | Pending |
| INFRA-02 | — | Pending |
| INFRA-03 | — | Pending |
| INFRA-04 | — | Pending |
| INFRA-05 | — | Pending |
| INFRA-06 | — | Pending |
| INFRA-07 | — | Pending |
| INFRA-08 | — | Pending |
| INFRA-09 | — | Pending |
| INFRA-10 | — | Pending |
| MOMO-01 | — | Pending |
| MOMO-02 | — | Pending |
| MOMO-03 | — | Pending |
| MOMO-04 | — | Pending |
| MOMO-05 | — | Pending |
| ZPAY-01 | — | Pending |
| ZPAY-02 | — | Pending |
| ZPAY-03 | — | Pending |
| ZPAY-04 | — | Pending |
| ZPAY-05 | — | Pending |
| VNPY-01 | — | Pending |
| VNPY-02 | — | Pending |
| VNPY-03 | — | Pending |
| VNPY-04 | — | Pending |
| ZLOA-01 | — | Pending |
| ZLOA-02 | — | Pending |
| ZLOA-03 | — | Pending |
| ZLOA-04 | — | Pending |
| ZLOA-05 | — | Pending |
| VTPAY-01 | — | Pending |
| VTPAY-02 | — | Pending |
| VTPAY-03 | — | Pending |
| VTPAY-04 | — | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 0
- Unmapped: 33 ⚠️

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after initial definition*
