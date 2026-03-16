# Project Research Summary

**Project:** Vietnamese MCP Hub — MCP servers wrapping Vietnamese fintech and messaging APIs
**Domain:** MCP server monorepo — payments (MoMo, ZaloPay, VNPAY, ViettelPay) + messaging (Zalo OA)
**Researched:** 2026-03-16
**Confidence:** MEDIUM-HIGH (core MCP stack HIGH; ViettelPay and Zalo OA docs MEDIUM/LOW)

## Executive Summary

This project is a greenfield MCP server monorepo with no existing competition — zero MCP servers for Vietnamese APIs exist on npm, GitHub, or the MCP Registry as of March 2026. The correct approach is a shared-package monorepo using npm workspaces with five independent STDIO-only MCP servers, each wrapping one Vietnamese API. All servers follow an identical internal structure (McpServer → tools/ → client.ts → shared utilities), with a `packages/shared` library providing HMAC signing, error formatting, mock engine, and test helpers. The entire Phase 1 runs in mock mode because real API accounts are not yet available, making mock fidelity a first-class requirement rather than an afterthought.

The recommended stack is Node.js 20 LTS + TypeScript 5.8 + `@modelcontextprotocol/sdk@1.27.x` + Zod 3.25+ + axios + vitest + msw. The MCP SDK is Anthropic-maintained and TypeScript-first; Zod is its required peer dependency. Build tooling is tsdown (tsup's maintained successor built on Rolldown). Each server exposes 4–6 curated tools designed around user intent, not raw API surface. The monorepo structure is justified by code sharing across five similar servers, and npm workspaces with TypeScript project references is sufficient at this scale — Turborepo/pnpm is unnecessary overhead.

The two highest risks are mock drift (mocks diverging from real APIs before real accounts arrive, causing silent breakage) and stdout pollution (any `console.log` silently corrupts the stdio JSON-RPC stream, crashing all Claude Code sessions). Both must be prevented at Phase 1 via ESLint rules, CI checks, and mock schema discipline. A secondary risk cluster applies to the Vietnamese payment signature implementations: MoMo, ZaloPay, and VNPAY each use unique HMAC field orderings per endpoint — a shared "generic HMAC helper" will produce wrong signatures. Signature builders must be implemented and verified per gateway, per endpoint, using official test vectors.

## Key Findings

### Recommended Stack

The MCP SDK (`@modelcontextprotocol/sdk@1.27.x`) is the only viable choice — it is Anthropic-maintained, TypeScript-first, and the project already constrains npm as the package manager. All five servers use STDIO transport exclusively; SSE is deprecated per MCP spec 2025-03-26 and StreamableHTTP is only needed when hosting servers remotely. tsdown replaces the now-unmaintained tsup and handles ESM import rewriting automatically. Vitest is preferred over Jest because it is ESM-native with zero extra configuration; msw intercepts HTTP at the network layer (not via monkey-patching) for clean mock isolation.

**Core technologies:**
- Node.js 20 LTS: required by MCP SDK; stable ESM support
- TypeScript 5.8+: MCP SDK is TypeScript-first; required by tsdown
- `@modelcontextprotocol/sdk@1.27.x`: Tier 1 Anthropic-maintained SDK; only production-ready option
- Zod 3.25+: required MCP SDK peer dependency; pin to 3.25+ to avoid Zod v4 API churn
- axios 1.x: handles HMAC header injection cleanly via interceptors for all five VN APIs
- tsdown: ESM-aware build tool; successor to tsup (no longer maintained)
- vitest 2.x + msw 2.x: ESM-native test runner + network-layer mock interception
- npm workspaces + TypeScript project references: sufficient for 5-package monorepo; no Turborepo needed

**Critical constraint:** Never use `console.log` — all output must go to `stderr`. Never use CommonJS. Never use tsup, SSE transport, fastmcp, jest, or ts-node.

### Expected Features

Every server must deliver create payment/order, query transaction status, refund, IPN signature validation, and sandbox mock mode. These are non-negotiable table stakes. Zod validation on all inputs and consistent `{service}_{verb}_{noun}` tool naming are required by project spec. Error code translation (Vietnamese numeric codes → English descriptions) is required for usability — MoMo alone has 40+ result codes.

**Must have (table stakes):**
- Payment/order creation with payUrl + QR output — the core action for all payment servers
- Transaction status query — required for IPN fallback and polling
- Refund (full + partial) — expected by any serious integration
- IPN/callback signature validation — validates inbound webhook payloads
- Sandbox mock mode across all tools — project constraint; no real accounts yet
- Zod input schemas on all tools — MCP SDK contract; project spec requirement
- Error code → English message mapping — VN error codes are numeric and undocumented in English
- Zalo OA: send message, get follower profile, list followers, refresh token

**Should have (competitive):**
- Realistic mock responses matching exact real API field names — differentiator (no competitors have VN mocks)
- QR code output as a discrete field — payment via QR is dominant in Vietnam
- Idempotent requestId/orderId generation helper — prevents double-charge bugs
- VNPAY bank list tool — enables AI-guided bank selection before payment
- Mock mode clearly flagged in responses (`"_mock": true`)

**Defer (v1.x after real accounts obtained):**
- Zalo ZNS (requires pre-approved templates — external dependency, unknown lead time)
- Zalo broadcast to all followers
- MoMo recurring subscription token
- Live API integration (blocked on developer account approval)
- Audit log MCP resource

**Defer (v2+):**
- Banking API servers (Vietcombank, BIDV, VietinBank)
- E-commerce platform integrations (Shopee, Lazada)
- npm publishing + MCP Registry listing
- Multi-tenant credential management

### Architecture Approach

The architecture follows a strict monorepo with `packages/shared` as the only internal dependency. Each of the five servers is structurally identical: `index.ts` (McpServer init + stdio transport) → `tools/` (one file per tool group, each exports `register(server)`) → `client.ts` (real or mock HTTP client, transparent to tools) → `schemas.ts` (all Zod schemas centralized per server) → `mock/` (JSON fixtures per tool). The shared package provides error formatting, HMAC/RSA signing factory, mock engine (MOCK_MODE env var + fixture loader), test helpers (in-memory transport wiring), and cross-server types. No API-specific code belongs in shared — only generic utilities.

**Major components:**
1. `packages/shared` — HMAC signing, error formatting, mock engine, test helpers, shared types; built first; depended on by all servers
2. Per-server `client.ts` — transparent real/mock switcher; HMAC auth injected via axios interceptor; only file that changes when moving from mock to real
3. Per-server `tools/` — one file per tool group; `register(server: McpServer)` pattern; testable without server instance
4. Per-server `mock/` — JSON fixtures named after tool files; mock engine loads by name
5. `.mcp.json` (workspace root) — registers all 5 servers for local Claude Code dev sessions

**Build order:** `packages/shared` must be built first (no internal deps). All 5 servers can then be built in parallel. Build MoMo server first to validate patterns, then replicate to remaining 4.

### Critical Pitfalls

1. **stdout pollution kills stdio transport** — any `console.log` silently corrupts JSON-RPC and causes cryptic `-32000 connection closed` errors. Prevention: enforce `console.error`-only via ESLint + CI grep check at Phase 1 before any server code is written. The failure mode is invisible and the error message is misleading.

2. **Mock drift** — mocks diverge from real API behavior during development; when real accounts arrive, field names, error codes, and HTTP status codes differ. Prevention: treat official API documentation as the only source of truth for mock schemas; add `MOCK_DEVIATIONS.md` per server; design integration tests to toggle from mock to real with a single env var.

3. **Signature field order errors** — MoMo, ZaloPay, and VNPAY all use HMAC-SHA256 but with unique per-endpoint field concatenation orders. A transposed field produces silent "invalid signature" errors with no useful debugging information. Prevention: implement a separate `buildSignatureString()` per gateway per endpoint; write unit tests using official test vectors from vendor docs.

4. **Zalo OA access token expiry** — Zalo OA tokens expire in ~1 hour. Treating them like static API keys causes all Zalo OA tools to fail after the first hour of a Claude Code session. Prevention: implement proactive token refresh every 23 hours; wrap every Zalo OA call in retry-on-401; test token expiry in mock mode.

5. **Vague or overlapping tool descriptions** — when all 5 servers are loaded simultaneously, Claude must select the correct server's tool. Vague or duplicated descriptions cause wrong-server calls or unnecessary multi-tool sequences. Prevention: prefix all tool names with gateway identifier (`momo_`, `zalopay_`, etc.); keep descriptions under 200 words focused on "when to call this" not "what the API does"; test with real Claude Code sessions.

## Implications for Roadmap

Based on research, the architecture dependency graph and pitfall-to-phase mapping suggest the following phase structure:

### Phase 1: Monorepo Foundation + Shared Package

**Rationale:** Architecture research is explicit — `packages/shared` must exist before any server can be built. This phase also establishes the two highest-severity pitfall preventions (stdout cleanliness and mock schema discipline) before any server code exists, when they are cheapest to enforce.

**Delivers:**
- npm workspaces monorepo skeleton with TypeScript 5.8, tsdown, vitest, msw configured
- `packages/shared` with error formatting, HMAC signing factory, mock engine, test helpers, shared types
- ESLint rule + CI grep check blocking any `console.log` usage
- Root `tsconfig.base.json` + TypeScript project references wired
- `.mcp.json` template for local dev registration
- CLAUDE.md template and per-server folder structure scaffolded

**Addresses:** Shared utility features (HMAC signing, error code formatting, mock engine, test harness)
**Avoids:** stdout pollution (established at foundation), copy-paste server structure divergence, credential exposure in source

**Research flag:** Standard patterns — skip phase research. MCP SDK docs, npm workspaces, and TypeScript project references are well-documented.

---

### Phase 2: MoMo Server (Pattern Validation)

**Rationale:** MoMo is the most-documented Vietnamese payment API in English and has the highest confidence in feature research. Building MoMo first validates all architectural patterns (client/mock switcher, tool registration, signature builder, Zod schemas, IPN validation) before replicating to the remaining four servers. Errors caught here are cheap; errors caught at server 5 are expensive.

**Delivers:**
- `mcp-momo-vn` with 4 tools: `momo_create_payment`, `momo_query_status`, `momo_refund`, `momo_validate_ipn`
- HMAC-SHA256 per-endpoint signature builder with unit test against official MoMo test vector
- Realistic mock fixtures with `"_mock": true` field
- Integration tests in mock mode with single env-var toggle to real
- CLAUDE.md for mcp-momo-vn
- `simulate_payment_result` mock tool for IPN testing

**Uses:** `@modelcontextprotocol/sdk`, Zod 3.25+, axios + HMAC interceptor, vitest + msw, `@vn-mcp/shared`
**Avoids:** Signature field order errors (unit-tested with official vectors), mock drift (fixtures match documented schemas), IPN untestability

**Research flag:** Needs phase research before implementation — confirm MoMo sandbox URL, test vector format, and IPN payload schema from developers.momo.vn.

---

### Phase 3: ZaloPay Server

**Rationale:** ZaloPay uses RSA-SHA256 MAC (different from MoMo's HMAC-SHA256) and has a two-key scheme (key1/key2). Building it immediately after MoMo tests the shared http-client factory's ability to handle multiple auth schemes. The pattern from Phase 2 is proven but the auth mechanism is meaningfully different.

**Delivers:**
- `mcp-zalopay-vn` with 4 tools: `zalopay_create_order`, `zalopay_query_order`, `zalopay_refund`, `zalopay_validate_callback`
- Per-endpoint signature builders for ZaloPay's varied field orderings
- RSA signing support added to `packages/shared/http-client`
- Mock fixtures + integration tests

**Avoids:** ZaloPay's app_id string-vs-integer gotcha, per-endpoint field order errors, shared signature utility anti-pattern

**Research flag:** Needs phase research — ZaloPay's endpoint-specific MAC field ordering must be verified from beta-docs.zalopay.vn before implementation.

---

### Phase 4: VNPAY Server

**Rationale:** VNPAY uses HMAC-SHA512 over an alphabetically sorted URL-encoded query string — a third distinct signing pattern. The lehuygiang28/vnpay community library can accelerate implementation but must be treated as MEDIUM confidence (not official VNPAY docs). VNPAY also has the amount-multiplication gotcha (the library multiplies by 100 internally — passing pre-multiplied amounts double-charges).

**Delivers:**
- `mcp-vnpay` with 4 tools: `vnpay_create_payment_url`, `vnpay_verify_return`, `vnpay_get_bank_list`, `vnpay_query_transaction`
- HMAC-SHA512 sorted-querystring signing verified against VNPAY sandbox
- Amount unit test: 100,000 VND input → correct wire format (no double-multiplication)
- Mock fixtures + integration tests

**Avoids:** Amount multiplication double-charge, sandbox/production credential mixing, IPN URL misconfiguration (must register in merchant portal AND in code)

**Research flag:** Needs phase research — verify official VNPAY API docs vs. community library behavior for payment URL construction and IPN verification.

---

### Phase 5: Zalo OA Server

**Rationale:** Zalo OA is architecturally distinct from the payment servers — it uses OAuth 2.0 token-based auth (short-lived tokens, not static HMAC keys) and has a follower-relationship constraint (can only message users who follow the OA). The token refresh requirement is a first-class feature, not an afterthought, and must be implemented before any other Zalo OA tool.

**Delivers:**
- `mcp-zalo-oa` with 4 tools: `zalo_oa_send_message`, `zalo_oa_get_follower_profile`, `zalo_oa_list_followers`, `zalo_oa_refresh_token`
- Proactive token refresh every 23 hours + retry-on-401 pattern
- Integration test simulating 401 response and verifying successful retry
- Mock mode simulates token expiry after N calls
- CLAUDE.md documenting follower opt-in constraint and OAuth setup

**Avoids:** Access token expiry causing session failures, browser-based OAuth (not possible in CLI/MCP context), mass broadcast getting OA suspended

**Research flag:** Needs phase research — Zalo OA developer docs are primarily Vietnamese; verify access_token TTL, refresh_token behavior, and follower-message constraints from developers.zalo.me.

---

### Phase 6: ViettelPay Server

**Rationale:** ViettelPay is deferred last because its public API documentation is sparse and LOW confidence. Building it last means the monorepo patterns are fully proven, making it easier to adapt when the actual API behavior is discovered. Mock schemas will need adjustment when real docs become available.

**Delivers:**
- `mcp-viettel-pay` with 3 tools: `viettel_pay_create_payment`, `viettel_pay_query_status`, `viettel_pay_refund`
- `MOCK_DEVIATIONS.md` explicitly documenting assumed vs. confirmed API behavior
- Mock fixtures flagged as LOW confidence in comments

**Avoids:** Guessing ViettelPay field behavior — document all assumptions explicitly; use Vietnamese-language docs rather than inferred behavior

**Research flag:** Requires phase research — ViettelPay has no verified English API documentation. Phase research must surface Vietnamese-language docs or confirm integration partner requirements before implementation begins.

---

### Phase Ordering Rationale

- Shared package first because all 5 servers have a hard build dependency on it — this is not a choice but a constraint from the architecture dependency graph.
- MoMo second because it is the highest-confidence API and will validate all patterns at lowest risk.
- ZaloPay and VNPAY third and fourth because they share the payment pattern with MoMo but have meaningfully different auth schemes — each teaches something new about the shared http-client factory.
- Zalo OA fifth because its OAuth token model requires different infrastructure (refresh loops, retry logic) that is cleanly separable from payment auth concerns.
- ViettelPay last because of LOW documentation confidence — building it last maximizes available documentation time and minimizes rework risk.
- Within each server phase, HMAC/signature implementation and testing must precede tool integration testing — wrong signatures produce silent mock-passing failures.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 2 (MoMo):** Confirm sandbox URL, IPN payload schema, and HMAC test vectors from developers.momo.vn before implementation
- **Phase 3 (ZaloPay):** ZaloPay endpoint-specific MAC field ordering must be verified from beta-docs.zalopay.vn; RSA signing scheme needs key format confirmed
- **Phase 4 (VNPAY):** Cross-reference community library behavior against official VNPAY docs; confirm IPN URL registration procedure
- **Phase 5 (Zalo OA):** Vietnamese-language docs must be read carefully; access_token TTL and refresh_token rotation behavior must be verified empirically
- **Phase 6 (ViettelPay):** Requires exploratory research phase before any implementation — API shape is effectively unknown

Phases with standard patterns (skip research-phase):
- **Phase 1 (Monorepo Foundation):** npm workspaces, TypeScript project references, MCP SDK setup, and ESLint configuration are all well-documented with multiple authoritative sources; no novel patterns required

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | MCP SDK, Node.js, TypeScript, Zod, vitest, msw all verified from official sources. Single-source concern on tsdown (tsup successor); consistent with tsup repo inactivity. Zod 3.25+ vs. v4 resolved in current SDK. |
| Features | MEDIUM | MoMo, ZaloPay, VNPAY features HIGH confidence from official docs. Zalo OA MEDIUM (Vietnamese docs parsed via search). ViettelPay LOW — no public English API docs found; mock schemas may require significant revision when real docs surface. |
| Architecture | HIGH | Verified against MCP SDK official GitHub, production monorepo reference (maurocanuto/mcp-server-starter), and MCP TypeScript SDK architecture overview. Patterns are consistent across sources. |
| Pitfalls | HIGH (MCP) / MEDIUM (VN API) | MCP pitfalls (stdout pollution, tool description quality, error handling) verified across multiple authoritative sources. VN API-specific pitfalls (signature ordering, VNPAY amount multiplication, Zalo OA token expiry) verified from official vendor docs where available; ViettelPay pitfalls inferred. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **ViettelPay API shape:** No public English documentation exists. Before Phase 6 implementation, either locate Vietnamese-language official docs or contact ViettelPay merchant support for integration specifications. Mock schemas are placeholders — real field names, auth scheme (HMAC vs. RSA), and error codes are unconfirmed.
- **Zalo OA access_token TTL:** Research cites "~1 hour" from a third-party workflow template (n8n). Verify the exact TTL and refresh_token expiry from official Zalo developer docs before Phase 5 implementation.
- **ZaloPay RSA vs. HMAC:** ARCHITECTURE.md lists ZaloPay as "RSA-SHA256 MAC" while PITFALLS.md lists it as "HMAC_SHA256 mac key2." This discrepancy must be resolved during Phase 3 research — ZaloPay may use HMAC for payment flow and RSA for other operations.
- **Real sandbox testing:** All five Vietnamese payment sandboxes have reduced feature sets compared to production. Budget explicit time post-Phase 1 for obtaining sandbox credentials and discovering sandbox-only behavioral differences before v1 launch.
- **MoMo sandbox device requirement:** Sandbox callbacks reportedly require a physical device to simulate PIN entry — this may affect IPN testing strategy and must be clarified during Phase 2.

## Sources

### Primary (HIGH confidence)

- [modelcontextprotocol/typescript-sdk GitHub](https://github.com/modelcontextprotocol/typescript-sdk) — SDK version 1.27.1, Zod peer dep, Node16 module config
- [MCP Transports spec 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) — SSE deprecated, StreamableHTTP modern standard
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) — official dev/debug tool
- [MoMo Developer Docs v3](https://developers.momo.vn/v3) — create payment, refund, query, signature/HMAC
- [ZaloPay Developer Docs](https://docs.zalopay.vn) — create order, query, refund, callback MAC
- [MSW official](https://mswjs.io/) — msw@2.x Node.js support
- [MCP Security Survival Guide](https://towardsdatascience.com/the-mcp-security-survival-guide-best-practices-pitfalls-and-real-world-lessons/) — stdout pollution, credential handling
- [15 Best Practices for MCP Servers](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/) — error handling, tool design
- [MCP Best Practices (philschmid.de)](https://www.philschmid.de/mcp-best-practices) — tool description quality

### Secondary (MEDIUM confidence)

- [lehuygiang28/vnpay library](https://github.com/lehuygiang28/vnpay) — VNPAY buildPaymentUrl, verifyReturnUrl, getBankList
- [Zalo For Developers](https://developers.zalo.me) — OA messaging, follower management, ZNS (Vietnamese-language docs)
- [maurocanuto/mcp-server-starter](https://github.com/maurocanuto/mcp-server-starter) — real-world monorepo reference (tsdown + MCP SDK + Zod)
- [Building MCP Servers the Right Way — Mauro Canuto](https://maurocanuto.medium.com/building-mcp-servers-the-right-way-a-production-ready-guide-in-typescript-8ceb9eae9c7f) — production monorepo patterns
- [ZaloPay Secure Data Transmission](https://beta-docs.zalopay.vn/docs/developer-tools/security/secure-data-transmission/) — MAC key scheme
- [Automated Zalo OA Token Management — n8n](https://n8n.io/workflows/8675-automated-zalo-oa-token-management-with-oauth-and-webhook-integration/) — token refresh pattern
- [Zod v4 MCP compatibility issue](https://github.com/modelcontextprotocol/typescript-sdk/issues/925) — breaking change history

### Tertiary (LOW confidence)

- ViettelPay: No official public API docs found; only third-party PSP integration guides — field names, auth scheme, and error codes are unconfirmed and require validation before Phase 6

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
