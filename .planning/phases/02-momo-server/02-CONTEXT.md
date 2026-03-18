# Phase 2: MoMo Server - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

First complete MCP server — `mcp-momo-vn` with 4 payment tools (`momo_create_payment`, `momo_query_status`, `momo_refund`, `momo_validate_ipn`) running in mock mode. This is the template server — every architectural pattern proven here will be replicated to ZaloPay, VNPAY, Zalo OA, and ViettelPay.

</domain>

<decisions>
## Implementation Decisions

### MoMo API signature scheme
- Hardcoded per-endpoint field ordering for HMAC-SHA256 signature strings — each tool knows its own signature field order matching MoMo v2 docs exactly
- V2 API only — no v3 support needed (most documented, widely used, stable)
- Credentials via environment variables: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` — set in `.mcp.json` env block. Mock mode uses built-in test values if not set
- Use `signHmacSha256()` from `@vn-mcp/shared` for the HMAC primitive; field concatenation/ordering lives in the MoMo server code

### Mock fixture realism
- Fake but structured URLs: `https://test-payment.momo.vn/pay/MOMO_abc123` — looks real, uses MoMo's test domain, doesn't resolve
- Error scenarios triggered by amount: `amount=99999999` → insufficient balance, `amount=0` → invalid amount. No env var changes needed between tests
- Realistic numeric transIds: 10-digit numeric like real MoMo (e.g., `2350000001`) — helps catch string/number type bugs
- All documented MoMo response fields included in fixtures — makes the mock a complete API reference
- Deterministic IDs from input: `orderId` = `MOMO_` + hash(amount + description). Same input always produces same ID — tests are reproducible
- Every mock response includes `"_mock": true` field

### Tool input/output design
- `momo_create_payment`: Required params: `amount`, `orderInfo`. Optional: `redirectUrl`, `ipnUrl`, `extraData`, `requestType`. Server generates `orderId`, `requestId`, `partnerCode` internally
- Default payment method: `captureWallet` (QR code — most common). Optional `requestType` param for `payWithATM`, `payWithCC`, etc.
- Curated response objects: `{ orderId, payUrl, transId, status, amount }` — not raw MoMo response. Claude gets what it needs without parsing nested structures
- `momo_query_status`: Accepts `orderId` only (MoMo v2 primary query key). No transId lookup
- `momo_refund`: Accepts `transId` and `amount` for full/partial refund
- Zod schemas inline with each tool (per Phase 1 decision)

### IPN validation approach
- `momo_validate_ipn` accepts raw IPN JSON body as a string — tool parses, extracts signature, recomputes HMAC, returns valid/invalid + parsed fields
- Real HMAC verification in mock mode using known test secretKey — proves signature logic works, tests can craft valid payloads
- On success returns parsed transaction details: `{ valid: true, orderId, amount, transId, resultCode, message }`
- Validation only — no IPN response/acknowledgment generation (that's the developer's HTTP server responsibility, not the MCP tool's job)

### Claude's Discretion
- Exact MoMo v2 endpoint URLs and request body structure
- `momo_refund` parameter design (beyond transId + amount)
- Error response structure details
- Test fixture data values (specific Vietnamese merchant names, phone numbers, amounts)
- Integration test structure and assertion patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Shared infrastructure
- `packages/shared/src/http-client/hmac.ts` — HMAC-SHA256/512 signing primitives (field ordering is NOT here — per PITFALLS.md)
- `packages/shared/src/errors/error-codes.ts` — VN_ERROR_CODES stub map with MoMo error codes and translateErrorCode helper
- `packages/shared/src/errors/McpApiError.ts` — Structured error class for MCP API errors
- `packages/shared/src/errors/formatToolError.ts` — MCP-compliant error formatter with `isError: true`
- `packages/shared/src/mock-engine/isMockMode.ts` — Per-service env var mock mode check (`MOMO_SANDBOX`)
- `packages/shared/src/mock-engine/loadFixture.ts` — Fixture loader with `_mock: true` injection
- `packages/shared/src/test-helpers/` — createTestClient and callTool for integration testing
- `packages/shared/src/tool-naming.ts` — Tool name validator (momo_create_payment must pass)

### Architecture & patterns
- `.planning/research/ARCHITECTURE.md` — Monorepo layout, mock/real switcher pattern, data flow
- `.planning/research/PITFALLS.md` — Stdout pollution prevention, mock drift risk, signature field ordering gotchas
- `.planning/research/STACK.md` — MCP SDK version (1.27.x), Zod compatibility (3.25+), STDIO transport

### Phase 1 context
- `.planning/phases/01-monorepo-foundation/01-CONTEXT.md` — Package structure decisions, mock engine design, error handling pattern
- `packages/shared/src/__tests__/integration.test.ts` — Reference pattern for inline Zod schemas in tool handlers

### Project brief
- `brief.md` §3.2 — MCP Server Structure pattern (original vision for per-server layout)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `signHmacSha256(key, message)` — HMAC primitive for MoMo signature generation
- `isMockMode('momo')` — Checks `MOMO_SANDBOX` env var
- `loadFixture(fixturePath)` — Loads JSON fixture and injects `_mock: true`
- `McpApiError` + `formatToolError()` — Structured error handling with VN error code translation
- `createTestClient()` + `callTool()` — Integration test helpers using InMemoryTransport
- `validateToolName()` — Validates tool names match `{provider}_{action}` pattern

### Established Patterns
- ESM modules with `"type": "module"` — all imports use `.js` extensions
- TypeScript strict mode with project references — `tsconfig.json` extends `tsconfig.base.json`
- `console.error` only — no `console.log` (ESLint enforced, kills MCP stdio transport)
- Subpath exports in package.json for clean imports

### Integration Points
- `packages/shared` — import via `@vn-mcp/shared` workspace link
- `servers/mcp-momo-vn/` — new package directory
- Root `package.json` workspaces already includes `servers/*`
- MCP SDK `@modelcontextprotocol/sdk` — Server class, tool registration, STDIO transport

</code_context>

<specifics>
## Specific Ideas

- This is the template server — patterns proven here get replicated to 4 more servers. Extra care on clean structure.
- Mock responses should feel realistic enough for demo videos (VN phone numbers like 0912345678, VND amounts like 150000, Vietnamese merchant names)
- The `.mcp.json` entry should be copy-paste ready for Claude Code users
- Deterministic mock IDs mean a Claude Code conversation can create a payment, then query it, and get consistent results within the same session

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-momo-server*
*Context gathered: 2026-03-18*
