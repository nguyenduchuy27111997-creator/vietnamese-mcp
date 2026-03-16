# VN MCP Hub — Phase 1 MCP Servers

## What This Is

A monorepo of MCP (Model Context Protocol) servers that connect Claude Code with popular Vietnamese fintech and messaging APIs — MoMo, ZaloPay, Zalo OA, ViettelPay, and VNPAY. These are the first MCP servers built specifically for the Vietnamese developer ecosystem, enabling Claude Code to natively understand and interact with VN payment gateways and messaging platforms.

## Core Value

Developer can install an MCP server, add it to `.mcp.json`, and immediately have Claude Code create payment links, check transaction status, send Zalo messages — without writing any integration boilerplate.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 5 MCP servers built: mcp-momo-vn, mcp-zalopay-vn, mcp-zalo-oa, mcp-viettel-pay, mcp-vnpay
- [ ] Each server follows consistent structure (tools/, client, schemas, sandbox)
- [ ] Mock/sandbox mode for all servers (real API accounts not yet available)
- [ ] Each server installable via npm and works with Claude Code
- [ ] CLAUDE.md context file per server for Claude Code awareness
- [ ] README with setup instructions per server
- [ ] Shared utilities across monorepo (auth helpers, error handling, testing patterns)
- [ ] Zod validation schemas for all tool inputs/outputs
- [ ] Integration tests using mock mode

### Out of Scope

- API gateway / Cloudflare Workers deployment — not needed until paid tier
- Auth & API key management (Supabase) — platform concern, not server concern
- Usage tracking / billing / Stripe integration — future platform feature
- Landing page / docs site (Mintlify) — marketing phase
- Phase 2 servers (banking APIs, e-commerce) — after Phase 1 validation
- Real API integration — mock-first, real integration when developer accounts approved
- npm publishing — build must work locally first

## Context

- MCP is Anthropic's open protocol for AI-to-system communication. MCP SDK is TypeScript-first.
- Zero MCP servers exist for Vietnamese APIs on npm, GitHub, or MCP Registry — clear first-mover opportunity.
- Vietnamese fintech APIs (MoMo, ZaloPay, ViettelPay, VNPAY) each have unique auth schemes, error codes, and sandbox environments.
- Zalo OA has 100k+ business accounts in Vietnam — messaging integration is high-value.
- Developer does not yet have API developer accounts for any of the VN services — all servers will be mock-first with realistic simulated responses.
- Target users: Vietnamese developers using Claude Code daily for payment/messaging integration projects.

## Constraints

- **Tech Stack**: Node.js 20 + TypeScript — MCP SDK is TypeScript-first, no alternative
- **Architecture**: Monorepo with shared utilities — consistency across 5 servers is critical
- **API Access**: Mock-first — no real API sandbox accounts available yet
- **MCP Protocol**: Must follow MCP spec v1.0 (stable as of Q1/2026)
- **Package Manager**: npm — target audience expects npm install workflow

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Monorepo over separate repos | Shared utilities (auth, errors, testing), consistent patterns across servers | — Pending |
| Mock-first approach | No API accounts yet; enables full development and testing without external dependencies | — Pending |
| All 5 Phase 1 servers in scope | User wants complete Phase 1 coverage (MoMo, ZaloPay, Zalo OA, ViettelPay, VNPAY) | — Pending |
| TypeScript + Zod | MCP SDK requirement + type-safe schema validation | — Pending |

---
*Last updated: 2026-03-16 after initialization*
