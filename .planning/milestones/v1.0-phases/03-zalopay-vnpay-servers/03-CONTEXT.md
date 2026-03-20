# Phase 3: ZaloPay + VNPAY Servers - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Two additional MCP payment servers — `mcp-zalopay-vn` (4 tools) and `mcp-vnpay` (3 tools) — running in mock mode. Each proves a distinct auth/signing scheme against the shared infrastructure: ZaloPay uses HMAC-SHA256 with dual keys (key1 for requests, key2 for callbacks), VNPAY uses HMAC-SHA512 on sorted URL query parameters. Both follow the template patterns established by MoMo in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### ZaloPay auth & signature scheme
- HMAC-SHA256 only — no RSA. STATE.md concern about HMAC vs RSA discrepancy resolved: implement what's documented, adjust later if needed (mock-first)
- Dual-key model: `key1` signs outgoing requests, `key2` verifies incoming callbacks
- 4 env vars: `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, `ZALOPAY_ENDPOINT`. Sandbox fallbacks built into `credentials.ts`
- Hardcoded per-endpoint signature field ordering (same pattern as MoMo `signatures.ts`)
- `app_trans_id` format: `YYMMDD_` + hash(amount + description) — deterministic, date-prefixed to match ZaloPay format
- `zalopay_validate_callback` follows MoMo IPN pattern: accept raw callback JSON string, verify MAC using key2, return `{ valid: true/false, ...parsed fields }`. Real HMAC in mock mode.

### VNPAY URL-based signing
- Dedicated URL signer: `buildVnpaySecureHash(params, secretKey)` sorts params alphabetically, builds query string, signs with HMAC-SHA512 via `signHmacSha512()` from shared
- 3 env vars: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_ENDPOINT`. Sandbox fallbacks built in
- `vnpay_create_payment_url` returns curated object: `{ paymentUrl, orderId, amount, bankCode, _mock }` — URL is primary output but wrapped for consistency
- `vnpay_verify_return` accepts full URL or query string — tool extracts params either way. Returns `{ valid: true/false, ...parsed fields }`
- This is fundamentally different from MoMo/ZaloPay (URL params vs POST body), proving the shared HMAC primitives work for both patterns

### Tool naming & parameters
- Provider-native tool names: `zalopay_create_order`, `zalopay_query_order`, `zalopay_refund`, `zalopay_validate_callback`, `vnpay_create_payment_url`, `vnpay_verify_return`, `vnpay_query_transaction` — matches provider docs and REQUIREMENTS.md
- Provider-native parameter names: ZaloPay uses `app_trans_id`, `zp_trans_id`; VNPAY uses `vnp_TxnRef`, `vnp_Amount`. Matches API documentation
- Curated responses with consistent core: every create response has `{ orderId, paymentUrl, amount, _mock }` + provider-specific extras (ZaloPay: `app_trans_id`, VNPAY: `vnp_SecureHash`)
- Same error trigger across all servers: `amount=99999999` = insufficient balance. Provider-specific error codes: MoMo 1005, ZaloPay -54, VNPAY 51

### Testing & .mcp.json
- Per-server integration tests only (no cross-server tests) — servers are independent, matches Phase 2 pattern
- ~6-8 tests per server covering: create (success + deterministic ID), query, refund, validate (valid + tampered), error path
- Both `zalopay-vn` and `vnpay` entries added to `.mcp.json` alongside existing `momo-vn`
- Each server has its own `vitest.config.ts` and `ZALOPAY_SANDBOX=true` / `VNPAY_SANDBOX=true` test scripts

### Claude's Discretion
- Exact ZaloPay v2 endpoint URLs and request body structure
- Exact VNPAY parameter names beyond the core ones (vnp_Version, vnp_Command, etc.)
- ZaloPay and VNPAY sandbox credential values
- Mock fixture data values (Vietnamese merchant names, bank codes, amounts)
- Integration test assertion details beyond the patterns above
- Whether VNPAY `vnp_TxnRef` format should be deterministic like MoMo/ZaloPay orderId

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Template server (MoMo — the pattern to replicate)
- `servers/mcp-momo-vn/src/credentials.ts` — Credential pattern with env var overrides + sandbox fallbacks
- `servers/mcp-momo-vn/src/signatures.ts` — Per-endpoint HMAC signature builders with hardcoded field ordering
- `servers/mcp-momo-vn/src/client.ts` — Mock/real client switcher with `isMockMode()`, `loadFixture()`, deterministic IDs, error amount trigger
- `servers/mcp-momo-vn/src/tools/` — 4 tool handlers with inline Zod schemas, `registerAll` barrel
- `servers/mcp-momo-vn/src/index.ts` — MCP server bootstrap: `registerAll(server)` before `server.connect(transport)`
- `servers/mcp-momo-vn/src/__tests__/integration.test.ts` — 8 integration tests using `createTestClient` + `callTool`
- `servers/mcp-momo-vn/src/mock/` — JSON fixtures with `_mock: true`, numeric transIds, realistic Vietnamese data

### Shared infrastructure
- `packages/shared/src/http-client/hmac.ts` — `signHmacSha256()` and `signHmacSha512()` primitives
- `packages/shared/src/errors/error-codes.ts` — VN_ERROR_CODES with `translateErrorCode()` — needs ZaloPay + VNPAY entries added
- `packages/shared/src/mock-engine/isMockMode.ts` — Per-service env var check (`ZALOPAY_SANDBOX`, `VNPAY_SANDBOX`)
- `packages/shared/src/mock-engine/loadFixture.ts` — Fixture loader with `_mock: true` injection
- `packages/shared/src/test-helpers/` — `createTestClient` and `callTool` for integration testing

### Architecture & pitfalls
- `.planning/research/ARCHITECTURE.md` — Monorepo layout, mock/real switcher pattern
- `.planning/research/PITFALLS.md` — Signature field ordering gotchas, stdout pollution, mock drift
- `.planning/research/STACK.md` — MCP SDK 1.27.x, Zod 3.25+, STDIO transport

### Prior phase contexts
- `.planning/phases/01-monorepo-foundation/01-CONTEXT.md` — Package structure, mock engine design, error handling
- `.planning/phases/02-momo-server/02-CONTEXT.md` — MoMo patterns that Phase 3 replicates

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `signHmacSha256(key, message)` — For ZaloPay request signing (key1) and callback verification (key2)
- `signHmacSha512(key, message)` — For VNPAY URL parameter signing
- `isMockMode(service)` — Works for `'zalopay'` and `'vnpay'` out-of-the-box
- `loadFixture(path)` — Injects `_mock: true` into JSON fixtures
- `McpApiError` + `formatToolError()` — Structured error handling (needs ZaloPay/VNPAY error codes added to VN_ERROR_CODES)
- `createTestClient()` + `callTool()` — Integration test helpers
- `validateToolName()` — Validates `zalopay_create_order`, `vnpay_create_payment_url` etc.

### Established Patterns (from MoMo server)
- Server structure: `src/index.ts`, `src/tools/`, `src/client.ts`, `src/credentials.ts`, `src/signatures.ts`, `src/mock/`
- ESM with `.js` imports, TypeScript composite project references
- `registerAll(server)` before `server.connect(transport)` — MCP bootstrap ordering
- Deterministic IDs via SHA-256 hash of input params
- Error trigger: `amount===99999999` → `McpApiError` with provider error code
- `console.error` only — ESLint enforced

### Integration Points
- Root `package.json` workspaces: `servers/*` already includes new packages
- `.mcp.json` — add `zalopay-vn` and `vnpay` entries alongside `momo-vn`
- `packages/shared/src/errors/error-codes.ts` — add ZaloPay and VNPAY error codes to `VN_ERROR_CODES` map

</code_context>

<specifics>
## Specific Ideas

- Both servers should be immediately recognizable as "the same architecture as MoMo" — a developer looking at the MoMo server can understand ZaloPay/VNPAY without relearning
- VNPAY's URL-signing approach is the key architectural proof point — it validates that the shared HMAC primitives work for fundamentally different signing strategies (POST body vs URL params)
- The `VN_ERROR_CODES` map in shared should grow with each new server — ZaloPay and VNPAY error codes added alongside existing MoMo codes
- `.mcp.json` should show all 3 payment servers side by side, making it obvious this is a cohesive payment toolkit

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-zalopay-vnpay-servers*
*Context gathered: 2026-03-18*
