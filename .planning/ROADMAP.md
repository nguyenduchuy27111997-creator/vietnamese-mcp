# Roadmap: VN MCP Hub — Phase 1 MCP Servers

## Overview

Four phases take this project from an empty monorepo to five production-ready MCP servers wrapping Vietnamese fintech and messaging APIs. The work starts with shared infrastructure that every server depends on, then proves all architectural patterns with the MoMo server, then builds the remaining payment servers (ZaloPay and VNPAY) in parallel, and finishes with the OAuth-based Zalo OA server and the low-confidence ViettelPay server alongside all per-server documentation and integration tests. Every server runs in mock mode throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Monorepo Foundation** - Shared package + monorepo skeleton that all 5 servers depend on (completed 2026-03-18)
- [ ] **Phase 2: MoMo Server** - First complete server; validates all architectural patterns for replication
- [ ] **Phase 3: ZaloPay + VNPAY Servers** - Two payment servers following proven MoMo patterns
- [ ] **Phase 4: Zalo OA + ViettelPay Servers** - Complete remaining servers and ship all docs and tests

## Phase Details

### Phase 1: Monorepo Foundation
**Goal**: Shared infrastructure exists and enforces correctness so every server can be built without boilerplate or silent failure modes
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-10
**Success Criteria** (what must be TRUE):
  1. `npm install` at repo root installs all workspaces without errors and `npm run build` compiles `packages/shared` cleanly
  2. `packages/shared` exports HMAC signing, error formatting, mock engine, and test helpers — importable from a test file in a sibling package
  3. Any file containing `console.log` fails the lint check — the CI guard is verifiable by adding a test violation and running the linter
  4. A new server package can be scaffolded by copying the template structure and the TypeScript project reference compiles without additional configuration
  5. Zod schemas for shared input/output types are importable from `packages/shared` and validate a sample payload correctly
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Monorepo skeleton: npm workspaces, tsconfig.base.json, vitest, ESLint no-console rule, packages/shared scaffold
- [x] 01-02-PLAN.md — packages/shared core modules: HMAC signing, error formatting, mock engine, test helpers
- [x] 01-03-PLAN.md — Shared Zod schemas, tool naming convention validator, full integration test

### Phase 2: MoMo Server
**Goal**: The first complete MCP server is working in mock mode and every architectural pattern is proven and replicable
**Depends on**: Phase 1
**Requirements**: MOMO-01, MOMO-02, MOMO-03, MOMO-04, MOMO-05
**Success Criteria** (what must be TRUE):
  1. Claude Code, with `mcp-momo-vn` added to `.mcp.json`, can call `momo_create_payment` and receive a mock payUrl response with `"_mock": true`
  2. Claude Code can call `momo_query_status` with an orderId from a prior create_payment call and receive a matching mock transaction status
  3. Claude Code can call `momo_refund` with a transId and receive a successful mock refund response
  4. Claude Code can call `momo_validate_ipn` with a crafted IPN payload and the tool correctly validates or rejects the HMAC signature
  5. All four MoMo tools pass their vitest integration tests when `SANDBOX_MODE=true` — tests run with `npm test` from the server package directory
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Package scaffold, credentials, HMAC signature builders, mock fixtures, client.ts mock/real switcher
- [ ] 02-02-PLAN.md — 4 MoMo tool handlers (createPayment, queryStatus, refund, validateIpn) with inline Zod schemas + server entry point
- [ ] 02-03-PLAN.md — Integration tests for all 4 tools + .mcp.json entry for Claude Code

### Phase 3: ZaloPay + VNPAY Servers
**Goal**: Two additional payment servers are working in mock mode, each with a distinct auth scheme proven against the shared http-client factory
**Depends on**: Phase 2
**Requirements**: ZPAY-01, ZPAY-02, ZPAY-03, ZPAY-04, ZPAY-05, VNPY-01, VNPY-02, VNPY-03, VNPY-04
**Success Criteria** (what must be TRUE):
  1. Claude Code can call `zalopay_create_order` and receive a mock order with a redirect URL and `"_mock": true`
  2. Claude Code can call `zalopay_validate_callback` with a crafted callback payload and the tool correctly validates the MAC
  3. Claude Code can call `vnpay_create_payment_url` and receive a mock signed payment URL
  4. Claude Code can call `vnpay_verify_return` with a crafted return URL and the tool correctly validates or rejects the HMAC-SHA512 signature
  5. All ZaloPay and VNPAY tools pass their vitest integration tests when `SANDBOX_MODE=true`
**Plans**: TBD

Plans:
- [ ] 03-01: ZaloPay client + tools (zalopay_create_order, zalopay_query_order, zalopay_refund, zalopay_validate_callback) + tests
- [ ] 03-02: VNPAY client + tools (vnpay_create_payment_url, vnpay_verify_return, vnpay_query_transaction) + tests

### Phase 4: Zalo OA + ViettelPay Servers
**Goal**: All five servers are working in mock mode with complete documentation and integration tests — the hub is shippable
**Depends on**: Phase 3
**Requirements**: ZLOA-01, ZLOA-02, ZLOA-03, ZLOA-04, ZLOA-05, VTPAY-01, VTPAY-02, VTPAY-03, VTPAY-04, INFRA-07, INFRA-08, INFRA-09
**Success Criteria** (what must be TRUE):
  1. Claude Code can call `zalo_oa_send_message` with a follower userId and receive a mock sent-message confirmation
  2. Claude Code can call `zalo_oa_refresh_token` and receive a new mock access token — the mock simulates the token expiry and refresh cycle
  3. Claude Code can call `viettel_pay_create_payment` and receive a mock payment initiation response with all assumptions explicitly documented in MOCK_DEVIATIONS.md
  4. Every server package has a CLAUDE.md and a README.md that accurately describe tool names, required environment variables, and mock mode setup
  5. `npm test` from the repo root runs all integration tests across all five servers and they all pass in mock mode
**Plans**: TBD

Plans:
- [ ] 04-01: Zalo OA client + tools (zalo_oa_send_message, zalo_oa_get_follower_profile, zalo_oa_list_followers, zalo_oa_refresh_token) + OAuth token refresh + tests
- [ ] 04-02: ViettelPay client + tools (viettel_pay_create_payment, viettel_pay_query_status, viettel_pay_refund) + MOCK_DEVIATIONS.md + tests
- [ ] 04-03: CLAUDE.md + README.md per server + root .mcp.json with all 5 servers + full test suite pass

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Foundation | 3/3 | Complete   | 2026-03-18 |
| 2. MoMo Server | 2/3 | In Progress|  |
| 3. ZaloPay + VNPAY Servers | 0/2 | Not started | - |
| 4. Zalo OA + ViettelPay Servers | 0/3 | Not started | - |
