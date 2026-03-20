# Phase 4: Zalo OA + ViettelPay Servers - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Final two MCP servers — `mcp-zalo-oa` (4 messaging tools with OAuth token refresh) and `mcp-viettel-pay` (3 payment tools with all assumptions documented). Plus CLAUDE.md, README.md per server, root README, and full integration test suite across all 5 servers. After this phase, the hub is shippable.

</domain>

<decisions>
## Implementation Decisions

### Zalo OA OAuth & token refresh
- Stateless per-call: access token via `ZALO_OA_ACCESS_TOKEN` env var. If expired, Claude Code calls `zalo_oa_refresh_token` to get a new one
- No in-memory token caching — server is stateless like all other MCP servers
- 4 env vars: `ZALO_OA_APP_ID`, `ZALO_OA_APP_SECRET`, `ZALO_OA_ACCESS_TOKEN`, `ZALO_OA_REFRESH_TOKEN`. Sandbox fallbacks for all
- `zalo_oa_refresh_token` reads `ZALO_OA_REFRESH_TOKEN` from env (no tool param) — credentials stay in env, not in Claude's context
- Mock mode returns deterministic token: `{ access_token: 'mock_access_token_xxxxx', expires_in: 3600, refresh_token: 'mock_refresh_token_xxxxx' }`

### Zalo OA messaging tool design
- One tool `zalo_oa_send_message` with required `userId` + `type` (text/image/file) + content fields. Type determines required fields
- Image/file messages accept URL only (imageUrl/fileUrl) — no base64 upload
- `zalo_oa_list_followers` uses offset pagination: optional `offset` (default 0) + `count` (default 50). Returns `{ followers: [...], total, offset }`
- Mock follower data: 3-5 realistic Vietnamese profiles (Nguyễn Văn A, Trần Thị B, etc.) with placeholder avatar URLs and realistic userIds
- Zalo OA has no payment amount — no error trigger by amount. Error scenarios: invalid userId, expired token (mock can use special userId like `invalid_user` to trigger error)

### ViettelPay mock assumptions
- MOCK_DEVIATIONS.md with per-field assumption table: `| Field | Assumed Value | Source | Confidence | Note |`
- Every mock response field documents where the assumption came from (official docs, third-party blog, inference)
- Auth scheme assumed HMAC-SHA256 like MoMo (documented as 'inferred from VN payment API industry pattern')
- 3 env vars: `VIETTEL_PAY_PARTNER_CODE`, `VIETTEL_PAY_SECRET_KEY`, `VIETTEL_PAY_ENDPOINT`. All documented as 'assumed'
- Error trigger: `amount=99999999` → insufficient balance with ViettelPay-specific error code (documented as 'assumed')
- Same server structure as MoMo/ZaloPay/VNPAY — credentials.ts, signatures.ts, client.ts, tools/, mock/

### Per-server documentation
- **CLAUDE.md** per server: tool catalog with descriptions, required env vars, how to enable mock mode, common workflows (e.g., "create payment then query status")
- **README.md** per server: quick start (5 lines: install, configure env, add to .mcp.json, test) + full reference (all tools, params, env vars, mock mode)
- **Root README.md**: overview of all 5 servers with one-liner descriptions and links to per-server READMEs. Shows the project as a cohesive toolkit
- Root `.mcp.json` updated with all 5 server entries

### Claude's Discretion
- Exact Zalo OA API endpoint URLs and request body structure
- Zalo OA error code mapping
- ViettelPay exact endpoint URLs and request/response structure
- ViettelPay error code values (all documented as 'assumed' in MOCK_DEVIATIONS.md)
- Mock message confirmation format for zalo_oa_send_message
- CLAUDE.md and README.md exact prose and formatting

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Template servers (patterns to replicate)
- `servers/mcp-momo-vn/` — Original template: credentials, signatures, client, tools, mock, tests
- `servers/mcp-zalopay-vn/` — Dual-key HMAC pattern (relevant for understanding credential diversity)
- `servers/mcp-vnpay/` — URL-parameter signing (different auth paradigm)

### Shared infrastructure
- `packages/shared/src/http-client/hmac.ts` — HMAC-SHA256/512 primitives
- `packages/shared/src/errors/error-codes.ts` — VN_ERROR_CODES (needs Zalo OA + ViettelPay entries added)
- `packages/shared/src/mock-engine/` — `isMockMode()` and `loadFixture()`
- `packages/shared/src/test-helpers/` — `createTestClient` and `callTool`
- `packages/shared/src/tool-naming.ts` — Validates `zalo_oa_send_message`, `viettel_pay_create_payment` etc.

### Architecture & pitfalls
- `.planning/research/ARCHITECTURE.md` — Monorepo layout, mock/real switcher pattern
- `.planning/research/PITFALLS.md` — Stdout pollution, mock drift, signature field ordering

### Prior phase contexts
- `.planning/phases/02-momo-server/02-CONTEXT.md` — MoMo template decisions
- `.planning/phases/03-zalopay-vnpay-servers/03-CONTEXT.md` — Multi-server patterns, tool naming, response consistency

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All shared utilities: `signHmacSha256`, `isMockMode`, `loadFixture`, `McpApiError`, `formatToolError`, `createTestClient`, `callTool`, `validateToolName`
- 3 complete server templates to reference (MoMo, ZaloPay, VNPAY)
- `.mcp.json` already has 3 server entries — add 2 more

### Established Patterns
- Server structure: `src/index.ts`, `src/tools/`, `src/client.ts`, `src/credentials.ts`, `src/signatures.ts`, `src/mock/`
- `registerAll(server)` before `server.connect(transport)`
- Inline Zod schemas per tool, curated responses with `_mock: true`
- Per-server `vitest.config.ts` with `{SERVICE}_SANDBOX=true` test script
- Provider-native tool names and params

### Integration Points
- Root `package.json` workspaces: `servers/*` includes new packages
- `packages/shared/src/errors/error-codes.ts` — add Zalo OA and ViettelPay error codes
- `.mcp.json` — add `zalo-oa` and `viettel-pay` entries
- Root `npm test` should run all 5 servers' tests

</code_context>

<specifics>
## Specific Ideas

- Zalo OA is fundamentally different from the 3 payment servers — it's a messaging platform with OAuth. This proves the monorepo pattern works for non-payment APIs too
- ViettelPay's MOCK_DEVIATIONS.md is a first — no other server needs one because they have better documentation. This sets the pattern for future low-confidence integrations
- The root README should make it immediately obvious this is the first Vietnamese MCP server collection — first-mover positioning
- All 5 servers working together in `.mcp.json` is the project's core deliverable — demo-ready

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-zalo-oa-viettelpay-servers*
*Context gathered: 2026-03-18*
