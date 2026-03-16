# Feature Research

**Domain:** MCP servers wrapping Vietnamese payment gateways and messaging APIs
**Researched:** 2026-03-16
**Confidence:** MEDIUM (payment API operations verified via official docs; MCP tool design patterns verified; ViettelPay public API docs are sparse)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create payment / order | Core payment action — without it the server is useless | LOW | MoMo: `captureWallet` + `payWithATM` + `payWithCC`; ZaloPay: `create order`; VNPAY: `buildPaymentUrl`; returns payUrl / deeplink / QR |
| Query transaction status | Every payment integration needs polling or verification | LOW | MoMo: `POST /v2/gateway/api/query`; ZaloPay: `query order`; VNPAY: `verifyReturnUrl`; critical for IPN fallback pattern |
| IPN / webhook handling helper | APIs push results via callback — Claude needs context on how to implement | MEDIUM | Not a server-side listener, but tool that validates incoming IPN signature + parses payload; MoMo uses HMAC_SHA256, ZaloPay uses key2 |
| Refund (full and partial) | Expected by any serious integration | LOW-MEDIUM | MoMo: `POST /v2/gateway/api/refund`; ZaloPay: `POST /v2/refund`; partial refund supported on both; amount range 1,000–50,000,000 VND |
| Sandbox / mock mode | Developers have no live API accounts — can't test without it | MEDIUM | MoMo has TEST app + sandbox creds; ZaloPay has `sb-openapi.zalopay.vn`; VNPAY has sandbox; mock-first is the project requirement |
| Error code translation | Vietnamese API error codes are numeric and undocumented in English | LOW | Map resultCode / return_code to human-readable descriptions; MoMo has 40+ result codes |
| Zod schema validation on all inputs | MCP SDK contract requires validated inputs; protects against bad tool calls | LOW | Required by project spec; all tool inputs must have Zod schemas |
| CLAUDE.md context file per server | Claude Code awareness of what the server does and how to use it | LOW | Required by project spec; explains auth, sandbox mode, tool catalog |
| Consistent tool naming: `{service}_{verb}_{noun}` | MCP best practice — prevents confusion when multiple servers loaded | LOW | e.g., `momo_create_payment`, `zalopay_query_order`, `zalo_oa_send_message` |
| Zalo OA: send message to user | Core messaging action — Zalo OA is for customer communication | LOW | Supports text, image, file, list template, and "request user info" message types |
| Zalo OA: get follower profile | Any CRM integration needs follower data | LOW | `getProfileOfFollower` by userId; returns name, avatar, phone if user granted permission |
| Zalo OA: list followers | Needed for broadcast targeting | LOW | Paginated; returns follower user IDs; required before sending to specific segments |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but high value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Realistic mock responses matching real API schema | Enables full development cycle without API accounts; competitors have no VN mocks at all | MEDIUM | Mock must mirror real response shape: resultCode, transId, payUrl fields must match docs exactly |
| Zalo ZNS (Zalo Notification Service) tool | Send transactional notifications via phone number — no follower relationship needed; 100k+ OA accounts use ZNS | HIGH | Requires template creation + approval workflow; ZNS templates must be pre-approved by Zalo; add as v1.x after OA basics |
| QR code generation tool | Payment via QR is dominant in Vietnam; returning qrCodeUrl enables physical/display use cases | LOW | MoMo and VNPAY both return QR data in payment creation response; just expose as a discrete tool or field |
| Multi-method payment creation | MoMo supports wallet, ATM card, credit card, BNPL in one AIO flow — expose each as separate tool | MEDIUM | Lets Claude choose appropriate payment type based on customer context |
| Payment link sharing via Zalo OA | Combine payment + messaging: create MoMo link, send via Zalo OA message — cross-server workflow Claude can orchestrate | LOW (orchestration) | Tools are independent; Claude orchestrates; great demo of monorepo value |
| VietQR generation | VNPAY-QR + ZaloPay both support NAPAS VietQR — works with all Vietnamese bank apps | LOW | Return vietqr-compatible QR string; 500k+ merchant locations use VNPAY-QR |
| VNPAY bank list tool | Allow Claude to present available banks before payment — improves UX in AI-guided checkout | LOW | `getBankList()` endpoint available in lehuygiang28/vnpay library |
| Idempotent request handling | Payment APIs require unique requestId/orderId per call — helper that generates stable IDs prevents double-charge | LOW | UUID v4 generation + logging; critical correctness feature disguised as infrastructure |
| Structured audit logging as MCP resource | Claude can read log of past tool calls — enables "what payments did I make?" queries | MEDIUM | Implement as MCP resource (not tool); follows Stripe MCP pattern |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 1:1 REST endpoint mapping | Seems complete and comprehensive | Produces 50+ tools per server; confuses AI agents; MCP best practice is 5–15 curated tools per server | Group by workflow: create, query, refund, notify — 4–6 tools per server |
| Storing API credentials in tool call args | Flexible, no config needed | Security disaster — credentials appear in Claude context window and logs | Require credentials at server init via env vars; never accept as tool parameters |
| Webhook server / IPN listener built into MCP server | Developers want a complete solution | MCP servers are stdio/process-based; they cannot listen on ports; adds wrong-layer complexity | Provide IPN validation tool (validates signature of incoming payload) + implementation guide in CLAUDE.md |
| Real-time transaction streaming | Appealing for live dashboards | Payment APIs are request-response only; no streaming; polling is the correct pattern | Expose query_status tool; guide on polling interval (once/minute per ZaloPay docs) |
| Automatic retry with exponential backoff inside tools | Makes tools "smarter" | Hides failures from Claude; agent cannot reason about or recover from retried failures | Return errors immediately with clear error messages; let Claude decide to retry |
| Multi-currency support | Seems future-proof | All five Vietnamese APIs are VND-only; adding currency layer adds schema complexity for zero benefit | Document VND-only constraint in Zod schema (hardcode currency or omit) |
| Browser-based OAuth flow for Zalo OA | Standard OAuth pattern | MCP servers run in CLI context; cannot open browser; OAuth redirect flow breaks | Pre-generate access_token + refresh_token via Zalo Developer Portal; store in env; provide refresh_token tool |
| Zalo broadcast to all followers at once | Useful for marketing | Zalo OA API requires follower opt-in; mass broadcast is rate-limited and can get OA suspended | Support targeted send by userId; guide on segmented sends in CLAUDE.md |

---

## Feature Dependencies

```
momo_create_payment
    └──requires──> HMAC signature helper (shared utility)
                       └──requires──> partnerCode + accessKey (env vars)

zalopay_create_order
    └──requires──> HMAC_SHA256 mac generation (shared utility)
    └──produces──> zp_trans_token
                       └──enables──> zalopay_query_order
                       └──enables──> zalopay_refund

momo_create_payment
    └──produces──> transId (from IPN or query)
                       └──enables──> momo_refund
                       └──enables──> momo_query_status

zalo_oa_list_followers
    └──enables──> zalo_oa_send_message (targeted by userId)

zalo_oa_send_message ──enhances──> momo_create_payment
    (Claude can orchestrate: create payment link → send via Zalo OA)

zalo_oa_zns_send ──requires──> pre-approved ZNS template ID
    (template approval is external dependency — blocks ZNS tool until template exists)

sandbox_mode_flag ──enables──> all tools (mock responses when env=sandbox)
    └──requires──> realistic mock data matching real API response schemas

validate_ipn_signature ──requires──> secret_key (per-provider env var)
    └──enables──> secure IPN processing guidance
```

### Dependency Notes

- **momo_refund requires transId:** The MoMo transId comes from either IPN callback or query_status response — refund cannot happen without first querying or receiving the original transaction result.
- **zalopay_refund requires zp_trans_token:** ZaloPay refund needs the transaction code from callback or query response, not the merchant's app_trans_id.
- **ZNS tools require template approval:** Zalo ZNS templates must be submitted and approved by the Zalo team before they can be sent — this is an external dependency with unknown lead time; ZNS tools should be deferred to v1.x.
- **Zalo OA OAuth requires pre-generated tokens:** The `access_token` for Zalo OA expires and must be refreshed using `refresh_token`; a `zalo_oa_refresh_token` tool should be included alongside core messaging tools.
- **Sandbox mode enables all tools:** Every tool must check a `SANDBOX_MODE` env var and return realistic mock data when true — this is a cross-cutting concern implemented in shared utility layer.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — validates that Claude Code can drive VN payment/messaging integrations end-to-end with zero boilerplate.

**mcp-momo-vn:**
- [ ] `momo_create_payment` — core payment creation with payUrl + QR code output
- [ ] `momo_query_status` — check transaction by orderId
- [ ] `momo_refund` — full and partial refund by transId
- [ ] `momo_validate_ipn` — validate + parse incoming IPN payload signature
- [ ] Sandbox mock mode for all 4 tools

**mcp-zalopay-vn:**
- [ ] `zalopay_create_order` — create order with redirect URL + zp_trans_token
- [ ] `zalopay_query_order` — check status by app_trans_id
- [ ] `zalopay_refund` — refund by zp_trans_id
- [ ] `zalopay_validate_callback` — validate callback MAC key2
- [ ] Sandbox mock mode for all 4 tools

**mcp-vnpay:**
- [ ] `vnpay_create_payment_url` — build signed payment URL
- [ ] `vnpay_verify_return` — verify return URL signature after redirect
- [ ] `vnpay_get_bank_list` — list supported banks for ATM card flow
- [ ] `vnpay_query_transaction` — query transaction status (IPN fallback)
- [ ] Sandbox mock mode for all 4 tools

**mcp-zalo-oa:**
- [ ] `zalo_oa_send_message` — send text/image/file message to follower by userId
- [ ] `zalo_oa_get_follower_profile` — get profile info by userId
- [ ] `zalo_oa_list_followers` — paginated list of OA followers
- [ ] `zalo_oa_refresh_token` — refresh expired Zalo OA access token
- [ ] Sandbox mock mode for all 4 tools

**mcp-viettel-pay:**
- [ ] `viettel_pay_create_payment` — initiate payment request
- [ ] `viettel_pay_query_status` — check transaction status
- [ ] `viettel_pay_refund` — refund transaction
- [ ] Sandbox mock mode for all 3 tools
- [ ] Note: ViettelPay public API docs are sparse; mock schemas may need adjustment when real docs become available (LOW confidence on exact fields)

**Shared (all servers):**
- [ ] HMAC signature generation utility
- [ ] Error code translation tables per provider
- [ ] Zod schemas for all tool inputs and outputs
- [ ] CLAUDE.md per server
- [ ] Integration tests in mock mode

### Add After Validation (v1.x)

Features to add once core is working and real API accounts are obtained.

- [ ] `zalo_oa_zns_send` — ZNS transactional notification by phone number (trigger: ZNS template approved by Zalo)
- [ ] `zalo_oa_broadcast_message` — send to all followers with opt-in filtering (trigger: OA has active follower base to test with)
- [ ] `momo_create_subscription_token` — tokenized recurring payment (trigger: merchant account active)
- [ ] Live API integration for all 5 servers (trigger: developer accounts approved)
- [ ] `vnpay_void_qr` — void failed QR payment (trigger: real VNPAY merchant account)
- [ ] Structured audit log MCP resource per server (trigger: user feedback requests history feature)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Banking API servers (Vietcombank, BIDV, VietinBank open banking) — Phase 2 per project scope
- [ ] E-commerce platform integrations (Shopee, Lazada webhooks) — Phase 2 per project scope
- [ ] npm publishing + MCP Registry listing — after local workflow validated
- [ ] Usage tracking / rate limiting per API key — platform concern, not server concern
- [ ] Multi-tenant credential management (Supabase) — platform concern, out of scope Phase 1

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| momo_create_payment | HIGH | LOW | P1 |
| momo_query_status | HIGH | LOW | P1 |
| zalopay_create_order | HIGH | LOW | P1 |
| zalopay_query_order | HIGH | LOW | P1 |
| vnpay_create_payment_url | HIGH | LOW | P1 |
| vnpay_verify_return | HIGH | LOW | P1 |
| zalo_oa_send_message | HIGH | LOW | P1 |
| zalo_oa_get_follower_profile | HIGH | LOW | P1 |
| Sandbox mock mode (all servers) | HIGH | MEDIUM | P1 |
| HMAC signature shared utility | HIGH | LOW | P1 |
| Zod schemas on all inputs | HIGH | LOW | P1 |
| Error code translation | MEDIUM | LOW | P1 |
| momo_refund | HIGH | LOW | P1 |
| zalopay_refund | HIGH | LOW | P1 |
| validate_ipn / validate_callback | HIGH | LOW | P1 |
| vnpay_get_bank_list | MEDIUM | LOW | P2 |
| zalo_oa_list_followers | MEDIUM | LOW | P2 |
| zalo_oa_refresh_token | HIGH | LOW | P2 |
| Audit log MCP resource | MEDIUM | MEDIUM | P3 |
| zalo_oa_zns_send | HIGH | HIGH | P2 (v1.x, blocked on template approval) |
| momo_create_subscription_token | MEDIUM | HIGH | P3 |

---

## Competitor Feature Analysis

No direct competitors exist — zero MCP servers for Vietnamese APIs on npm, GitHub, or MCP Registry as of March 2026. Comparison is against analogous MCP servers for international payment/messaging APIs.

| Feature Category | Stripe Official MCP | Twilio / WhatsApp MCP (community) | Our Approach |
|------------------|--------------------|------------------------------------|--------------|
| Payment creation | payment_intent_create, create_payment_link | N/A | momo_create_payment + zalopay_create_order + vnpay_create_payment_url |
| Transaction query | charge_list | N/A | query_status per provider |
| Refunds | refund_create | N/A | refund per provider (partial + full) |
| Customer management | customer_create/retrieve/update | send_message to phone | Minimal — userId-based for Zalo OA |
| Sandbox / mock | Uses Stripe test mode keys | N/A | Explicit SANDBOX_MODE env flag with realistic mock data |
| Tool count per server | 30+ tools | 5–10 tools | Target 4–6 tools per server (curated, not exhaustive) |
| Auth model | API key in env | API key in env | Per-provider env vars (partnerCode, accessKey, secretKey) |
| IPN/webhook handling | External — not in MCP scope | N/A | validate_ipn tool for signature verification; implementation guide in CLAUDE.md |
| Error messages | Stripe API errors surfaced as-is | N/A | VN error codes translated to English descriptions |

---

## Sources

- MoMo Developer Docs (developers.momo.vn/v3): One-time payment API, refund API, query API — HIGH confidence
- ZaloPay Developer Docs (docs.zalopay.vn): Create order, query order, refund, callback — HIGH confidence
- VNPAY lehuygiang28/vnpay library (github.com/lehuygiang28/vnpay): buildPaymentUrl, verifyReturnUrl, getBankList, queryDrRefund — MEDIUM confidence (library, not official VNPAY docs)
- Zalo For Developers (developers.zalo.me): OA messaging, follower management, ZNS — MEDIUM confidence (Vietnamese-language docs parsed via search)
- Stripe Official MCP Server (docs.stripe.com/mcp): MCP tool design reference — HIGH confidence
- MCP Best Practices (philschmid.de/mcp-best-practices): Tool naming, schema design, error handling — HIGH confidence
- Zuplo Learning Center: REST-to-MCP mapping patterns — MEDIUM confidence
- ViettelPay: No official public API docs found; only third-party PSP integration guides — LOW confidence on exact API operations

---

*Feature research for: Vietnamese MCP servers (MoMo, ZaloPay, Zalo OA, ViettelPay, VNPAY)*
*Researched: 2026-03-16*
