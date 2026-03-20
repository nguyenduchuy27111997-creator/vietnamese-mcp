# VN MCP Hub — Vietnamese MCP Server Collection

## What This Is

A monorepo of 5 MCP (Model Context Protocol) servers that connect Claude Code with popular Vietnamese fintech and messaging APIs — MoMo, ZaloPay, VNPAY, Zalo OA, and ViettelPay. The first MCP servers built specifically for the Vietnamese developer ecosystem, enabling Claude Code to natively create payments, check transactions, send messages, and manage OAuth tokens across VN platforms.

## Core Value

Developer installs an MCP server, adds it to `.mcp.json`, and immediately has Claude Code create payment links, check transaction status, send Zalo messages — without writing any integration boilerplate.

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

### Active

- [ ] Real API integration when developer accounts are approved
- [ ] npm publishing to registry
- [ ] QR code generation as discrete tool output
- [ ] VNPAY bank list tool (`vnpay_get_bank_list`)
- [ ] Zalo OA ZNS transactional notifications
- [ ] VietQR generation (NAPAS standard)

### Out of Scope

- API gateway / Cloudflare Workers — not needed until paid tier
- Auth & API key management (Supabase) — platform concern
- Usage tracking / billing / Stripe — future platform feature
- Landing page / docs site — marketing phase
- Banking API servers (VCB, TCB, MB) — after v1.0 validation
- E-commerce integrations (Shopee, Tiki) — after v1.0 validation
- Browser-based OAuth flow — MCP servers run in CLI context
- 1:1 REST endpoint mapping — MCP best practice is 4-6 curated tools per server

## Context

Shipped v1.0 with 2,980 LOC TypeScript across 5 servers and 1 shared package.
Tech stack: Node.js 20, TypeScript, MCP SDK, Zod, Vitest.
Architecture: npm workspaces monorepo with composite TypeScript project references.
All servers run in mock mode — no real API accounts yet.
Each server proves a distinct auth/signing scheme works with shared primitives:
- MoMo: HMAC-SHA256 with `&key=value` field ordering
- ZaloPay: Dual-key HMAC-SHA256 (key1 outbound, key2 callback) with pipe-separated fields
- VNPAY: URL-parameter HMAC-SHA512 with alphabetical sort
- Zalo OA: OAuth access/refresh token lifecycle
- ViettelPay: Mock-only REST+HMAC (real API is SOAP+RSA, documented in MOCK_DEVIATIONS.md)

## Constraints

- **Tech Stack**: Node.js 20 + TypeScript — MCP SDK is TypeScript-first
- **Architecture**: Monorepo with shared utilities — consistency across 5 servers
- **API Access**: Mock-first — no real API sandbox accounts available yet
- **MCP Protocol**: MCP spec v1.0 (stable as of Q1/2026)
- **Package Manager**: npm — target audience expects npm install workflow

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo over separate repos | Shared utilities (auth, errors, testing), consistent patterns | ✓ Good — shared package used by all 5 servers |
| Mock-first approach | No API accounts yet; enables full dev/test cycle | ✓ Good — 117 tests pass, all servers functional |
| Build MoMo first to validate patterns | Prove architecture before replicating to 4 more servers | ✓ Good — pattern replicated cleanly to all servers |
| ViettelPay built last (low confidence) | No confirmed public API docs; MOCK_DEVIATIONS.md documents all assumptions | ✓ Good — 13-row deviation table written before code |
| TypeScript + Zod | MCP SDK requirement + type-safe schema validation | ✓ Good — clean compilation, runtime validation |
| Dual-key scheme for ZaloPay | key1 for outbound, key2 for callback MAC — per official docs | ✓ Good — round-trip signing proven in tests |
| URL-parameter signing for VNPAY | Alphabetical sort + HMAC-SHA512 — distinct from POST body signing | ✓ Good — shared signHmacSha512 handles both strategies |
| Zero-params refreshToken for Zalo OA | Credentials from env only, no user-supplied tokens | ✓ Good — simplest secure approach |

---
*Last updated: 2026-03-21 after v1.0 milestone*
