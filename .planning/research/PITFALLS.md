# Pitfalls Research

**Domain:** MCP servers wrapping Vietnamese fintech and messaging APIs
**Researched:** 2026-03-16
**Confidence:** HIGH (MCP pitfalls) / MEDIUM (VN API specifics — limited English-language post-mortems)

---

## Critical Pitfalls

### Pitfall 1: stdout Pollution Kills the stdio Transport

**What goes wrong:**
MCP servers using the stdio transport (the default for Claude Code's `.mcp.json` integration) require that stdout carries **only** JSON-RPC messages. Any `console.log()`, third-party library startup banner, or debug print that goes to stdout silently corrupts the protocol stream. The client disconnects immediately, often with a cryptic `-32000 connection closed` error that gives no indication of the real cause.

**Why it happens:**
Developers default to `console.log` for debugging. Many npm packages also emit startup messages to stdout. The error appears as a connection failure, not a logging error, so the root cause is non-obvious.

**How to avoid:**
- Replace every `console.log` with `console.error` in server code before any testing.
- Audit all imported packages on startup — check if they print banners or warnings to stdout.
- Add a lint rule or grep CI check: `grep -r "console\.log" packages/*/src` fails the build.
- Use `process.stderr.write` for any raw output.

**Warning signs:**
- MCP server connects but immediately closes with no meaningful error.
- `-32000` or `Connection closed` errors in Claude Code.
- Server works in isolation (tested with MCP Inspector) but fails when loaded by the client.

**Phase to address:** Phase 1 — Monorepo foundation setup. Establish the `console.error`-only rule in the shared ESLint config and CLAUDE.md before writing any server code.

---

### Pitfall 2: Mock Drift — Mock Behavior Diverges From Real APIs

**What goes wrong:**
Because all five servers are mock-first (no real API accounts yet), the mock layer becomes the de facto specification. When real API accounts are obtained, the real APIs behave differently: different field names, different error codes, different signature field ordering, different HTTP status codes on failures. The MCP tool implementations, error handling, and Claude Code prompts all assume the mock behavior and break against real endpoints.

**Why it happens:**
Mocks are written from incomplete documentation, guesses, or outdated API docs. Vietnamese fintech APIs (MoMo, ZaloPay, VNPAY) are heavily documented in Vietnamese, and English documentation is often months behind. The gap widens during development as mocks are updated for convenience but real APIs are not consulted.

**How to avoid:**
- Treat official API documentation as the source of truth for every field, not the mock implementation.
- Structure mocks to match documented response schemas exactly — no invented fields or error codes.
- Add a `MOCK_DEVIATIONS.md` per server that explicitly lists any known difference between mock and real.
- When real accounts become available, run the real API first, record responses, then update the mock to match.
- Build integration tests against the mock that can be replayed against real endpoints with a single env-var toggle.

**Warning signs:**
- Mock returns fields not mentioned in official documentation.
- Error codes in mock don't match the numeric error code table in the vendor's docs.
- Real sandbox testing (when accounts arrive) causes tool schema validation failures.

**Phase to address:** Phase 1 and all server implementation phases. The monorepo structure should enforce a `schema/` directory per server that mirrors official API shapes.

---

### Pitfall 3: Signature String Field Order Errors in VN Payment APIs

**What goes wrong:**
MoMo, ZaloPay, and VNPAY all use HMAC-SHA256 signatures, but each defines a unique field concatenation order and separator. Even within a single gateway, different endpoints use different field orderings. A single transposed field or wrong separator produces an invalid signature that the gateway rejects with a generic "invalid signature" error, giving no indication which field is wrong.

**Why it happens:**
The signature string is not a standard format — it is a custom concatenation defined per-endpoint in each gateway's documentation. Developers assume a consistent ordering across endpoints (e.g., always alphabetical, or always matching the JSON request order) when it is in fact arbitrary.

- **ZaloPay**: Field order varies by endpoint. Query order uses `app_id|partner_order_id|time`. TopUp uses `[appId, paymentId, partnerOrderId, mUId, amount, description, partnerEmbedData, extraInfo, time]`.
- **VNPAY**: Uses URL-encoded query string sorted alphabetically — but only after stripping `vnp_SecureHash` and `vnp_SecureHashType` fields.
- **MoMo**: Concatenates with `&` as key=value pairs in a documented field order, not alphabetical.

**How to avoid:**
- Implement a separate `buildSignatureString(endpoint: string, params: object): string` function per gateway, per endpoint type — not a generic HMAC utility.
- Write a unit test for each signature implementation using the exact test vector provided in the official docs. Many VN gateway docs include example request/expected signature pairs.
- Never reuse a signature builder across different gateways or endpoints without verification.

**Warning signs:**
- API returns error code 9000 (MoMo), "invalid mac" (ZaloPay), or checksum errors (VNPAY) consistently.
- Tests pass in mock mode but would fail against real sandbox — because the mock doesn't verify the signature.

**Phase to address:** Each server implementation phase. The shared utilities package should contain only the HMAC primitive (`createHmacSha256(key, message)`), never a "build payment signature" function — that logic belongs per-server.

---

### Pitfall 4: Tool Descriptions That Are Too Vague or Too Long

**What goes wrong:**
Claude's ability to choose the right MCP tool and populate its parameters correctly depends entirely on tool name and description quality. Vague names like `createPayment` across five different servers cause Claude to call the wrong server's tool. Descriptions that are too long bloat the context window. Overlapping tool descriptions cause Claude to call multiple tools for a single user intent.

**Why it happens:**
Developers write tool descriptions that are accurate from an API perspective, not from a "what would Claude understand" perspective. The description reads like API documentation, not an intent description.

**How to avoid:**
- Include the gateway name in every tool name: `momo_create_payment`, `zalopay_create_order` — never just `create_payment`.
- Tool descriptions should answer: "When should Claude call this tool?" not "What does this endpoint do?"
- Keep descriptions under 200 words. Use the `inputSchema` descriptions for parameter-level detail.
- Test descriptions iteratively by asking Claude Code to perform common tasks and observing which tool it selects.
- The `CLAUDE.md` file per server should explain the business domain, not repeat the tool descriptions.

**Warning signs:**
- Claude selects the wrong server's tool when multiple MCP servers are loaded.
- Claude asks for clarification on parameters that have clear input schemas.
- Claude calls two tools in sequence when one tool should suffice.

**Phase to address:** Each server implementation phase. Build a "tool description review" step before marking any server complete.

---

### Pitfall 5: Zalo OA Access Token Expiry Not Handled

**What goes wrong:**
Zalo OA uses short-lived OAuth access tokens (typically valid for 1 hour) backed by a refresh token. If the MCP server stores the access token at startup and reuses it indefinitely, all Zalo OA tool calls start failing after the token expires. Unlike payment gateways that use static HMAC keys, Zalo OA requires an active token refresh loop.

**Why it happens:**
Payment gateway patterns (static key-based auth) are applied to the messaging API (token-based OAuth). Developers treat `ZALO_OA_ACCESS_TOKEN` like an API key rather than a session credential.

**How to avoid:**
- The `mcp-zalo-oa` server must implement proactive token refresh: refresh every 23 hours regardless of expiry, before the 1-hour window is exhausted.
- Store both `access_token` and `refresh_token` in environment config.
- Wrap every Zalo OA API call in a retry-with-refresh pattern: on `401`, refresh the token and retry once.
- In mock mode, simulate token expiry: emit a mock 401 response after N calls to force the refresh flow to be tested.

**Warning signs:**
- Zalo OA tools work for the first hour of a Claude Code session, then fail with authentication errors.
- No token refresh logic exists in the `mcp-zalo-oa` source.
- Token refresh is only tested manually, not covered by integration tests.

**Phase to address:** Zalo OA server implementation phase. Token refresh must be implemented as a first-class feature, not a follow-up fix.

---

### Pitfall 6: IPN / Webhook Callbacks Cannot Reach a Local MCP Server

**What goes wrong:**
VNPAY, ZaloPay, and MoMo all send asynchronous payment result notifications (IPN/webhook) to a URL you provide. During local development, these callbacks cannot reach `localhost`. Developers assume they can test the full payment lifecycle locally and discover only later — or never, in mock mode — that the webhook handling code is untested.

**Why it happens:**
The happy path (create payment → get payment URL → check status) works locally. The IPN flow requires an internet-accessible server and is easy to skip when all tests pass in mock mode.

**How to avoid:**
- The IPN handler is a separate concern from the MCP server. Document this explicitly: MCP tools handle outbound API calls, IPN handling requires a separate HTTP server deployed somewhere accessible.
- In mock mode, implement a `simulate_payment_result` tool that triggers the IPN callback flow internally without requiring a real external HTTP call.
- Write integration tests that test the IPN handler directly (call the handler function with a mock payload) independently of the public URL requirement.

**Warning signs:**
- No IPN/webhook handler code exists in the server implementation.
- Integration tests only test the `create_payment` path, not the `payment_confirmed` path.
- The README does not document IPN URL requirements.

**Phase to address:** Each payment server implementation phase. Add "webhook handler stub" as an explicit deliverable for each payment gateway server.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single shared HMAC utility for all gateways | Less code, faster to write | Wrong signature for any endpoint that deviates from the assumed pattern — silent failures | Never — each gateway's signature must be isolated |
| Copy-paste server structure instead of shared package | Faster to bootstrap each server | Inconsistent error handling, auth patterns diverge across servers, bugs fixed in one aren't fixed in others | Never — monorepo shared package is the whole point |
| Skip Zod validation on mock responses | Faster mock development | Real API responses won't be validated; schema mismatches go undetected until real integration | Never — Zod schemas should validate both inputs and mock outputs |
| Hard-code test credentials in source | Faster local dev setup | Credentials get committed to git, exposed in logs, or emitted to stdout via debug code | Never — `.env` files from day one |
| 1:1 REST endpoint → MCP tool mapping | Seems systematic | Too many low-level tools overwhelm Claude; Claude calls multiple tools when one higher-level tool would suffice | Never — design tools around user intent, not API surface |
| Omit `requestId`/`txnRef` uniqueness enforcement in mock | Simpler mock implementation | Real APIs reject duplicate IDs — if mock allows them, duplicate ID bugs are invisible until production | Acceptable only if mock clearly documents this gap |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| VNPAY | Multiplying amount by 100 in your code — the SDK already does this | Pass raw VND amount; the library applies the `*100` conversion internally |
| VNPAY | IPN URL set in code but not registered in VNPAY merchant portal | The IPN URL must be configured in both the code AND the VNPAY sandbox/production portal |
| VNPAY | Production credentials tested in sandbox or vice versa | Maintain separate `.env.sandbox` and `.env.production`, never mix |
| MoMo | Using the same `requestId` for retried requests | `requestId` must be globally unique per request — generate a UUID, never reuse |
| MoMo | Assuming sandbox callbacks work the same as production | Sandbox callbacks don't work without a physical device; use the endpoint to simulate PIN entry |
| ZaloPay | Using a single signature builder for all endpoints | Signature field order is endpoint-specific — build per-endpoint signature functions |
| ZaloPay | Using app_id as a string vs. integer | The `app_id` field type varies in ZaloPay docs; verify the expected type for each endpoint |
| Zalo OA | Treating access_token as a permanent API key | Zalo OA access tokens expire in ~1 hour; implement proactive refresh every 23 hours |
| Zalo OA | Calling Zalo OA API without prior user follow (zuid) | Zalo OA can only send proactive messages to users who have followed the OA — this is a hard constraint |
| ViettelPay | Limited English documentation — guessing field behavior | Use the Vietnamese documentation; translate rather than guess |
| All VN gateways | Assuming sandbox and production have identical behavior | VN payment sandboxes frequently have reduced feature sets; budget time for production-only testing |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No timeout on VN API calls | Claude Code hangs waiting for a gateway that is rate-limiting or down | Set explicit `AbortController` timeouts (5s for queries, 10s for payment creation) on every HTTP call | Immediately if a gateway is slow; always visible in poor network conditions |
| Synchronous Zalo OA token refresh blocking the tool call | First Zalo OA tool call after token expiry takes 2-3 extra seconds, Claude Code appears stuck | Refresh tokens proactively on a timer; never refresh inside a synchronous tool handler path | After first hour of use |
| Large transaction history responses returned as MCP tool output | Response exceeds Claude's context window for large accounts | Paginate all list tools; never return more than 20 records without a `cursor` parameter | At 50+ transactions in a history query |
| Constructing Zod schemas with `.refine()` on every tool call | Validation is slow when schemas are complex | Build schemas once at module load time, not inside tool handler functions | At high-frequency tool usage |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| `console.log(apiKey)` or `console.log(requestBody)` during debugging | Credentials visible in Claude Code's stderr output, shell logs, CI logs | Log only safe fields; use a `sanitize(obj)` utility that redacts keys matching `/(key|secret|token|password)/i` |
| Storing credentials in `.mcp.json` as plaintext | `.mcp.json` is committed to git — credentials exposed to anyone with repo access | Use `env` field in `.mcp.json` to reference OS environment variables, never inline values |
| Trusting IPN/webhook payloads without signature verification | Attacker sends fake "payment success" IPN — order fulfilled without payment | Always verify IPN signature using the same HMAC logic as outbound requests; reject any IPN that fails verification |
| Shared state between tool calls (global variables for request context) | Tool B reads state set by Tool A from a different user session | Keep all request state inside the tool handler's local scope; never store transaction state in module-level variables |
| Logging full payment responses including card/wallet tokens | PCI-scope data in logs | Log only `transactionId`, `status`, `amount` — strip any token, card, or account number fields |
| Using `http://` for IPN callback URLs | Traffic interceptable; some gateways reject non-HTTPS | Always use `https://` for any callback URL registered with a payment gateway |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| MCP tool returns raw API error codes ("Error 9000") | Developer has no idea what went wrong; must look up vendor error table | Map every known error code to a human-readable message in the tool's error response |
| Tool returns full API response object | Claude uses verbose output in its reply, burying the important result | Return a flat, minimal object with only the fields relevant to the user's intent |
| No distinction between "payment pending" and "payment failed" in tool output | Ambiguous status causes developer to take wrong action | Normalize all gateway statuses to a consistent enum: `pending`, `success`, `failed`, `cancelled` |
| Mock mode not clearly signalled in tool responses | Developer assumes real transaction occurred; confusion when switching to real mode | Every mock response includes `"_mock": true` field and a disclaimer in the tool description |
| Tool names that don't indicate which gateway they belong to | When multiple MCP servers are loaded, Claude calls wrong server | Prefix all tool names with gateway identifier: `momo_`, `zalopay_`, `vnpay_`, `zalo_oa_`, `viettelpay_` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Signature implementation:** Unit test with the exact test vector from the official docs — not just "it returns a string." Verify the expected value matches.
- [ ] **Mock mode flag:** Every mock response includes `"_mock": true` — verify this field is present in integration test assertions.
- [ ] **Error code mapping:** Every gateway error code in the official docs has a corresponding human-readable message — not just a catch-all "API error."
- [ ] **Zalo OA token refresh:** Refresh logic has a test that simulates a 401 response and verifies the retry succeeds — not just "I added a refresh function."
- [ ] **IPN handler:** Webhook signature verification has a test with a tampered payload that must be rejected — not just a test that accepts valid payloads.
- [ ] **stdout cleanliness:** CI runs `grep -r "console\.log" packages/*/src` and fails if any are found — not just a code review note.
- [ ] **Tool descriptions:** A real Claude Code session is used to test tool selection with natural language requests — not just "descriptions look good in code review."
- [ ] **Amount handling:** A test verifies that a 100,000 VND payment is transmitted as `100000` (MoMo/ZaloPay) and that VNPAY receives the correct multiplied value — not just "the library handles it."
- [ ] **Unique ID enforcement:** `requestId`/`orderId`/`txnRef` generation uses UUID v4 or timestamp + random suffix — not an incrementing counter that resets on server restart.
- [ ] **Environment separation:** The server fails to start with a clear error if required env vars are missing — not just undefined behavior when they're absent.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| stdout pollution discovered after servers are built | LOW | Global search-and-replace `console.log` → `console.error`; add lint rule; re-test all servers |
| Mock drift discovered when real accounts arrive | HIGH | Audit every mock response against real API documentation; rebuild schemas that diverged; rewrite affected tool handlers |
| Wrong signature implementation discovered in production | MEDIUM | Identify the affected endpoint; write the correct test vector; fix the `buildSignatureString` function; no schema changes needed |
| Zalo OA token refresh not implemented | LOW | Wrap existing API calls in retry-on-401 pattern; add proactive refresh timer; add integration test |
| IPN handler missing | MEDIUM | IPN handler is a separate HTTP server concern; document the gap, build a stub, write direct unit tests for the handler function |
| Credentials committed to git | HIGH | Rotate all credentials immediately; remove from git history with `git filter-repo`; audit all logs for credential exposure |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| stdout pollution | Phase 1 — Monorepo setup | CI grep check passes; MCP Inspector connects without errors |
| Mock drift | Phase 1 (schema design) + each server phase | Official API doc fields match every field in mock response schema |
| Signature field order errors | Each payment server phase | Unit test with official test vector passes |
| Vague tool descriptions | Each server phase (review step) | Claude Code selects correct tool for natural-language payment requests |
| Zalo OA token expiry | Zalo OA server phase | Integration test simulates 401 and verifies retry succeeds |
| IPN/webhook untestable locally | Each payment server phase | `simulate_payment_result` mock tool exists; IPN handler function has direct unit tests |
| Hard-coded credentials | Phase 1 — Monorepo setup | Server fails with clear error when env vars missing; no credentials in source |
| 1:1 REST → MCP tool mapping | Each server phase (tool design review) | Number of tools per server ≤ 8; no tool name is a raw API endpoint name |
| No error code mapping | Each server phase | Every error response returns `message` in English, not a raw numeric code |

---

## Sources

- [MCP Security Survival Guide — Towards Data Science](https://towardsdatascience.com/the-mcp-security-survival-guide-best-practices-pitfalls-and-real-world-lessons/)
- [State of MCP Server Security 2025 — Astrix](https://astrix.security/learn/blog/state-of-mcp-server-security-2025/)
- [Common Challenges in MCP Server Development — DEV Community](https://dev.to/nishantbijani/common-challenges-in-mcp-server-development-and-how-to-solve-them-35ne)
- [MCP Implementation Tips, Tricks and Pitfalls — Nearform](https://nearform.com/digital-community/implementing-model-context-protocol-mcp-tips-tricks-and-pitfalls/)
- [15 Best Practices for Building MCP Servers in Production — The New Stack](https://thenewstack.io/15-best-practices-for-building-mcp-servers-in-production/)
- [MCP is Not the Problem, It's Your Server — philschmid.de](https://www.philschmid.de/mcp-best-practices)
- [MCP Server stdio Corruption — claude-flow GitHub Issue #835](https://github.com/ruvnet/claude-flow/issues/835)
- [VNPAY Node.js Library Troubleshooting — vnpay.js.org](https://vnpay.js.org/en/troubleshooting)
- [ZaloPay Secure Data Transmission — ZaloPay Docs](https://beta-docs.zalopay.vn/docs/developer-tools/security/secure-data-transmission/)
- [ZaloPay Query Order Status — ZaloPay Docs](https://docs.zalopay.vn/docs/specs/disbursement-query-order/)
- [Automated Zalo OA Token Management — n8n workflow template](https://n8n.io/workflows/8675-automated-zalo-oa-token-management-with-oauth-and-webhook-integration/)
- [MoMo Digital Signature — MoMo Developers](https://developers.momo.vn/v3/docs/payment/api/other/signature/)
- [MoMo Sandbox Q&A — MoMo Dev Community](https://momodevelopercommunity.mtn.com/momo-api-sand-box-q-a-6)
- [Managing Secrets in MCP Servers — Infisical](https://infisical.com/blog/managing-secrets-mcp-servers)
- [Mock API vs Real API divergence — Confluent](https://www.confluent.io/blog/choosing-between-mock-api-and-real-backend/)
- [MCP Best Practices for Using Tools — Speakeasy](https://www.speakeasy.com/mcp/using-mcp/use-cases)

---
*Pitfalls research for: Vietnamese MCP Hub — MCP servers wrapping VN fintech and messaging APIs*
*Researched: 2026-03-16*
