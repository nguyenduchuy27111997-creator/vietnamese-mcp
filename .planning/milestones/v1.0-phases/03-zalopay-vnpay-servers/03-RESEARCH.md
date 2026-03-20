# Phase 03: ZaloPay + VNPAY Servers - Research

**Researched:** 2026-03-18
**Domain:** ZaloPay v2 API (HMAC-SHA256 dual-key), VNPAY payment gateway (HMAC-SHA512 URL signing), MCP server replication from MoMo template
**Confidence:** HIGH (patterns verified from existing MoMo server code + official ZaloPay/VNPAY docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**ZaloPay auth & signature scheme:**
- HMAC-SHA256 only — no RSA. HMAC vs RSA discrepancy resolved: implement what's documented, adjust later if needed (mock-first)
- Dual-key model: `key1` signs outgoing requests, `key2` verifies incoming callbacks
- 4 env vars: `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, `ZALOPAY_ENDPOINT`. Sandbox fallbacks built into `credentials.ts`
- Hardcoded per-endpoint signature field ordering (same pattern as MoMo `signatures.ts`)
- `app_trans_id` format: `YYMMDD_` + hash(amount + description) — deterministic, date-prefixed to match ZaloPay format
- `zalopay_validate_callback` follows MoMo IPN pattern: accept raw callback JSON string, verify MAC using key2, return `{ valid: true/false, ...parsed fields }`. Real HMAC in mock mode.

**VNPAY URL-based signing:**
- Dedicated URL signer: `buildVnpaySecureHash(params, secretKey)` sorts params alphabetically, builds query string, signs with HMAC-SHA512 via `signHmacSha512()` from shared
- 3 env vars: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_ENDPOINT`. Sandbox fallbacks built in
- `vnpay_create_payment_url` returns curated object: `{ paymentUrl, orderId, amount, bankCode, _mock }` — URL is primary output but wrapped for consistency
- `vnpay_verify_return` accepts full URL or query string — tool extracts params either way. Returns `{ valid: true/false, ...parsed fields }`
- This is fundamentally different from MoMo/ZaloPay (URL params vs POST body), proving the shared HMAC primitives work for both patterns

**Tool naming & parameters:**
- Provider-native tool names: `zalopay_create_order`, `zalopay_query_order`, `zalopay_refund`, `zalopay_validate_callback`, `vnpay_create_payment_url`, `vnpay_verify_return`, `vnpay_query_transaction`
- Provider-native parameter names: ZaloPay uses `app_trans_id`, `zp_trans_id`; VNPAY uses `vnp_TxnRef`, `vnp_Amount`
- Curated responses with consistent core: every create response has `{ orderId, paymentUrl, amount, _mock }` + provider-specific extras (ZaloPay: `app_trans_id`, VNPAY: `vnp_SecureHash`)
- Same error trigger across all servers: `amount=99999999` = insufficient balance. Provider-specific error codes: MoMo 1005, ZaloPay -54, VNPAY 51

**Testing & .mcp.json:**
- Per-server integration tests only (no cross-server tests)
- ~6-8 tests per server: create (success + deterministic ID), query, refund, validate (valid + tampered), error path
- Both `zalopay-vn` and `vnpay` entries added to `.mcp.json` alongside existing `momo-vn`
- Each server has its own `vitest.config.ts` and `ZALOPAY_SANDBOX=true` / `VNPAY_SANDBOX=true` test scripts

### Claude's Discretion
- Exact ZaloPay v2 endpoint URLs and request body structure
- Exact VNPAY parameter names beyond the core ones (vnp_Version, vnp_Command, etc.)
- ZaloPay and VNPAY sandbox credential values
- Mock fixture data values (Vietnamese merchant names, bank codes, amounts)
- Integration test assertion details beyond the patterns above
- Whether VNPAY `vnp_TxnRef` format should be deterministic like MoMo/ZaloPay orderId

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ZPAY-01 | `zalopay_create_order` — create order with redirect URL | ZaloPay v2 POST /v2/create, HMAC-SHA256 with key1 over 7 pipe-delimited fields, app_trans_id format YYMMDD_hash |
| ZPAY-02 | `zalopay_query_order` — check status by app_trans_id | ZaloPay query endpoint POST /v2/query, mac = HMAC-SHA256(key1, app_id\|app_trans_id\|app_time), returns zp_trans_id + return_code |
| ZPAY-03 | `zalopay_refund` — refund by zp_trans_id | ZaloPay refund endpoint POST /v2/refund, zp_trans_id required, refund_trans_id generated, mac covers key fields |
| ZPAY-04 | `zalopay_validate_callback` — validate callback MAC | Accepts raw JSON string, re-computes HMAC-SHA256 with key2 over callback fields, returns valid/invalid + parsed data |
| ZPAY-05 | Sandbox mock mode for all ZaloPay tools | isMockMode('zalopay') checks ZALOPAY_SANDBOX env var — already works via shared isMockMode.ts |
| VNPY-01 | `vnpay_create_payment_url` — build signed payment URL | Constructs URL with vnp_ params, sorts alphabetically, HMAC-SHA512 with VNPAY_HASH_SECRET, returns paymentUrl wrapped in object |
| VNPY-02 | `vnpay_verify_return` — verify return URL signature | Accepts full URL or query string, extracts vnp_ params, strips vnp_SecureHash, re-sorts, re-hashes, compares |
| VNPY-03 | `vnpay_query_transaction` — query transaction status | VNPAY queryDr API call with vnp_RequestId, vnp_TxnRef, vnp_TransactionNo, vnp_TransactionDate fields |
| VNPY-04 | Sandbox mock mode for all VNPAY tools | isMockMode('vnpay') checks VNPAY_SANDBOX env var — already works via shared isMockMode.ts |
</phase_requirements>

---

## Summary

Phase 3 builds two new MCP payment servers — `mcp-zalopay-vn` and `mcp-vnpay` — by replicating the MoMo server template from Phase 2. The architectural patterns are fully established: same directory structure, same `registerAll(server)` bootstrap, same mock/real client switcher, same Zod-inline tool handlers, same integration test harness via `createTestClient`. The implementation work is primarily translation: mapping ZaloPay's dual-key HMAC-SHA256 scheme and VNPAY's URL-parameter-based HMAC-SHA512 scheme onto the shared primitives.

The key architectural proof point is VNPAY's fundamentally different signing approach. While MoMo and ZaloPay sign POST body fields with a fixed ordering, VNPAY signs sorted URL query parameters. The `buildVnpaySecureHash()` function — a new signatures.ts function specific to mcp-vnpay — uses `signHmacSha512()` from shared, proving the HMAC primitives work for both patterns without any modification to the shared package.

ZaloPay's dual-key model (key1 for outbound requests, key2 for inbound callback verification) is the other interesting pattern. The `zalopay_validate_callback` tool operates identically to `momo_validate_ipn`: accept raw JSON string, recompute HMAC using key2, return valid/invalid with parsed fields.

**Primary recommendation:** Scaffold both servers using exact file-for-file replication of the MoMo server directory structure, then adapt signatures.ts and client.ts to each provider's scheme. Add ZaloPay and VNPAY error codes to `VN_ERROR_CODES` in shared as a prerequisite step.

---

## Standard Stack

### Core (inherited from Phase 2 — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | ^1.27.1 | MCP server, tool registration, STDIO transport | Same as MoMo |
| zod | ^3.25.76 | Inline schema validation in tool handlers | Same as MoMo |
| @vn-mcp/shared | * | signHmacSha256, signHmacSha512, isMockMode, loadFixture, McpApiError, formatToolError, createTestClient, callTool | Already covers all needs |
| node:crypto | built-in | SHA-256 for deterministic ID generation | No external dep |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^3.2.4 | Integration test runner | Per-server, same pattern as momo-vn |
| tsdown | ^0.21.4 | Build/bundle server to ESM | Same build script as momo-vn |
| tsx | ^4.21.0 | Dev run without compiling | Dev-only, same as momo-vn |

**Installation (both new servers use same deps as momo-vn — no new packages):**
```bash
# From servers/mcp-zalopay-vn/ or servers/mcp-vnpay/
# package.json is identical in structure to mcp-momo-vn/package.json
# npm workspaces handles linking automatically
npm install  # from monorepo root after adding server directories
```

---

## Architecture Patterns

### Recommended Project Structure

Exact mirror of MoMo server. Two new servers added:

```
servers/
├── mcp-momo-vn/              # EXISTING — template to replicate
│
├── mcp-zalopay-vn/           # NEW — Phase 3
│   ├── package.json          # name: "@vn-mcp/mcp-zalopay-vn"; bin: mcp-zalopay-vn
│   ├── tsconfig.json         # extends ../../tsconfig.base.json; references shared
│   ├── vitest.config.ts      # identical to momo-vn
│   └── src/
│       ├── index.ts          # McpServer init + STDIO transport
│       ├── credentials.ts    # getZaloPayCredentials() with ZALOPAY_APP_ID, KEY1, KEY2, ENDPOINT
│       ├── signatures.ts     # buildCreateSignature, buildQuerySignature, buildRefundSignature, buildCallbackSignature
│       ├── client.ts         # zaloPayClient with createOrder, queryOrder, refund; isMockMode('zalopay')
│       ├── tools/
│       │   ├── createOrder.ts
│       │   ├── queryOrder.ts
│       │   ├── refund.ts
│       │   ├── validateCallback.ts
│       │   └── index.ts      # registerAll(server)
│       └── mock/
│           ├── createOrder.json
│           ├── queryOrder.json
│           ├── refund.json
│           └── errorInsufficientBalance.json
│
└── mcp-vnpay/                # NEW — Phase 3
    ├── package.json          # name: "@vn-mcp/mcp-vnpay"; bin: mcp-vnpay
    ├── tsconfig.json         # extends ../../tsconfig.base.json; references shared
    ├── vitest.config.ts      # identical to momo-vn
    └── src/
        ├── index.ts
        ├── credentials.ts    # getVnpayCredentials() with VNPAY_TMN_CODE, HASH_SECRET, ENDPOINT
        ├── signatures.ts     # buildVnpaySecureHash(params, secretKey) — sorts + HMAC-SHA512
        ├── client.ts         # vnpayClient with createPaymentUrl, verifyReturn, queryTransaction
        ├── tools/
        │   ├── createPaymentUrl.ts
        │   ├── verifyReturn.ts
        │   ├── queryTransaction.ts
        │   └── index.ts
        └── mock/
            ├── createPaymentUrl.json
            ├── queryTransaction.json
            └── errorInsufficientBalance.json
```

### Pattern 1: ZaloPay credentials.ts

**What:** Mirrors MoMo's `getMomoCredentials()` exactly. Returns typed object. Env vars fall back to published sandbox test values.
**When to use:** Every tool that needs to sign or verify.

```typescript
// servers/mcp-zalopay-vn/src/credentials.ts
export type ZaloPayCredentials = {
  appId: string;
  key1: string;
  key2: string;
  endpoint: string;
};

export function getZaloPayCredentials(): ZaloPayCredentials {
  return {
    appId: process.env.ZALOPAY_APP_ID ?? '2553',
    key1: process.env.ZALOPAY_KEY1 ?? 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
    key2: process.env.ZALOPAY_KEY2 ?? 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz',
    endpoint: process.env.ZALOPAY_ENDPOINT ?? 'https://sb-openapi.zalopay.vn',
  };
}
```

Sandbox credentials sourced from ZaloPay v2 documentation examples (MEDIUM confidence — these are documented test credentials, not production values).

### Pattern 2: ZaloPay signatures.ts (per-endpoint, hardcoded field order)

**What:** Four functions, each hardcoding the exact pipe-delimited field order ZaloPay expects per endpoint. Uses `signHmacSha256(key1, message)` from shared.
**When to use:** Always. Field ordering is endpoint-specific — never generalize.

```typescript
// servers/mcp-zalopay-vn/src/signatures.ts
import { signHmacSha256 } from '@vn-mcp/shared';

/**
 * MAC for create order request.
 * Field order (7 fields, pipe-delimited):
 * app_id|app_trans_id|app_user|amount|app_time|embed_data|item
 * Source: docs.zalopay.vn/docs/developer-tools/security/secure-data-transmission/
 */
export function buildCreateSignature(
  params: {
    appId: string;
    appTransId: string;
    appUser: string;
    amount: number;
    appTime: number;
    embedData: string;
    item: string;
  },
  key1: string,
): string {
  const raw = `${params.appId}|${params.appTransId}|${params.appUser}|${params.amount}|${params.appTime}|${params.embedData}|${params.item}`;
  return signHmacSha256(key1, raw);
}

/**
 * MAC for query order request.
 * Field order (3 fields, pipe-delimited):
 * app_id|app_trans_id|app_time
 * Source: docs.zalopay.vn/docs/specs/order-query/
 */
export function buildQuerySignature(
  params: { appId: string; appTransId: string; appTime: number },
  key1: string,
): string {
  const raw = `${params.appId}|${params.appTransId}|${params.appTime}`;
  return signHmacSha256(key1, raw);
}

/**
 * MAC for callback verification.
 * Uses key2 (not key1) — this is ZaloPay's inbound callback scheme.
 * Field order matches callback payload fields.
 * Source: docs.zalopay.vn/docs/developer-tools/security/secure-data-transmission/
 */
export function buildCallbackSignature(
  params: { appId: string; appTransId: string; appTime: number; amount: number; embedData: string; item: string; description: string },
  key2: string,
): string {
  const raw = `${params.appId}|${params.appTransId}|${params.appTime}|${params.amount}|${params.embedData}|${params.item}|${params.description}`;
  return signHmacSha256(key2, raw);
}
```

Note: Exact callback field order is LOW confidence — must be validated against official ZaloPay callback spec. The create order signature fields/order are HIGH confidence from official docs.

### Pattern 3: VNPAY signatures.ts (URL-parameter sort + HMAC-SHA512)

**What:** Single function that accepts a params object, removes `vnp_SecureHash` and `vnp_SecureHashType` if present, sorts remaining keys alphabetically, builds `key=value&key=value` query string, signs with `signHmacSha512()` from shared.
**When to use:** Both `createPaymentUrl` (build) and `verifyReturn` (verify) use this same function.

```typescript
// servers/mcp-vnpay/src/signatures.ts
import { signHmacSha512 } from '@vn-mcp/shared';

/**
 * Build VNPAY secure hash.
 * Algorithm: sort all vnp_ params alphabetically (excluding vnp_SecureHash,
 * vnp_SecureHashType), concatenate as query string, sign with HMAC-SHA512.
 *
 * Source: sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
 * "Checksum data is established by sorting parameter names in ascending order"
 */
export function buildVnpaySecureHash(
  params: Record<string, string | number>,
  hashSecret: string,
): string {
  const sorted = Object.entries(params)
    .filter(([k]) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
    .sort(([a], [b]) => a.localeCompare(b));

  const queryString = sorted
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  return signHmacSha512(hashSecret, queryString);
}
```

HIGH confidence on the algorithm (sort alphabetically, HMAC-SHA512, exclude SecureHash fields) — confirmed by VNPAY official docs and multiple community implementations.

MEDIUM confidence on whether URL encoding is applied before or after building the query string — the approach above applies `encodeURIComponent` which is the common pattern in community implementations. Some sources use raw values. The mock-first approach means this only matters when real API integration happens.

### Pattern 4: ZaloPay client.ts (dual-key mock switcher)

**What:** Mirrors MoMo's `momoClient` object with `isMockMode('zalopay')` check. Deterministic `app_trans_id` via date prefix + SHA-256 hash. Error trigger at `amount === 99999999`.

```typescript
// servers/mcp-zalopay-vn/src/client.ts
import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, 'mock');

function generateAppTransId(amount: number, description: string): string {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hash = createHash('sha256')
    .update(`${amount}${description}`)
    .digest('hex')
    .substring(0, 8);
  return `${yy}${mm}${dd}_${hash}`;
}

export const zaloPayClient = {
  async createOrder(args: { amount: number; description: string; appUser?: string; embedData?: string; item?: string }) {
    if (args.amount === 99999999) {
      throw new McpApiError('-54', 'Insufficient balance', 'zalopay', 'Try a smaller amount');
    }
    if (isMockMode('zalopay')) {
      const fixture = loadFixture<{ returnCode: number; returnMessage: string; zpTransToken: string; orderUrl: string; _mock: true }>(
        join(MOCK_DIR, 'createOrder.json'),
      );
      const appTransId = generateAppTransId(args.amount, args.description);
      return {
        orderId: appTransId,
        app_trans_id: appTransId,
        paymentUrl: `https://sbgateway.zalopay.vn/api/getRedirectUrl?zptoken=${fixture.zpTransToken}`,
        amount: args.amount,
        _mock: fixture._mock,
      };
    }
    throw new Error('Real API not implemented — set ZALOPAY_SANDBOX=true');
  },
  // ... queryOrder, refund follow same pattern
};
```

### Pattern 5: VNPAY client.ts (URL-output pattern)

**What:** `createPaymentUrl` builds the full VNPAY redirect URL in mock mode and returns a curated object. `verifyReturn` parses URL/query string, strips `vnp_SecureHash`, re-hashes, compares.

```typescript
// VNPAY createPaymentUrl — returns object wrapping the URL
if (isMockMode('vnpay')) {
  const fixture = loadFixture<{ paymentUrl: string; _mock: true }>(join(MOCK_DIR, 'createPaymentUrl.json'));
  const txnRef = generateTxnRef(args.amount, args.orderInfo);
  return {
    paymentUrl: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_TxnRef=${txnRef}&vnp_Amount=${args.amount * 100}`,
    orderId: txnRef,
    amount: args.amount,
    bankCode: args.bankCode ?? 'NCB',
    _mock: fixture._mock,
  };
}
```

### Pattern 6: registerAll + index.ts bootstrap

Identical to MoMo. Must call `registerAll(server)` before `server.connect(transport)`.

```typescript
// servers/mcp-zalopay-vn/src/index.ts  (and mcp-vnpay/src/index.ts)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAll } from './tools/index.js';

const server = new McpServer({ name: 'mcp-zalopay-vn', version: '0.0.1' });
registerAll(server);
const transport = new StdioServerTransport();
await server.connect(transport);
```

### Pattern 7: Integration test structure

Mirrors `momo-vn` integration test exactly. Set sandbox env var at top of file, `beforeAll` creates server + client, tests call `callTool` + `parseResult`.

```typescript
// servers/mcp-zalopay-vn/src/__tests__/integration.test.ts
process.env.ZALOPAY_SANDBOX = 'true';

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../tools/index.js';
import { getZaloPayCredentials } from '../credentials.js';
import { buildCallbackSignature } from '../signatures.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let client: Client;
beforeAll(async () => {
  const server = new McpServer({ name: 'mcp-zalopay-vn', version: '0.0.1' });
  registerAll(server);
  client = await createTestClient(server);
});
```

### Anti-Patterns to Avoid

- **Reusing MoMo signature builder for ZaloPay:** ZaloPay uses `|` (pipe) separators, MoMo uses `&key=value` format. Never share signature functions across providers.
- **Building VNPAY hash without sorting:** Alphabetical sort is mandatory. Any non-sorted hash produces a signature that will fail VNPAY validation.
- **Using `signHmacSha256` for VNPAY:** VNPAY requires SHA-512, not SHA-256. Both primitives are in shared — use the correct one.
- **Verifying ZaloPay callbacks with key1:** Callbacks MUST use key2. Using key1 will cause valid callbacks to be rejected.
- **Multiplying VNPAY amount by 100 manually in mock:** The mock fixture should store the raw VND amount. Only multiply when building the URL (`vnp_Amount = amount * 100`).
- **console.log in any server code:** Kills STDIO transport. ESLint enforced. `console.error` only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC-SHA256 primitive | Custom crypto | `signHmacSha256()` from `@vn-mcp/shared` | Already exists, tested |
| HMAC-SHA512 primitive | Custom crypto | `signHmacSha512()` from `@vn-mcp/shared` | Already exists, tested |
| Mock mode check | Env var logic | `isMockMode('zalopay')` / `isMockMode('vnpay')` | Already supports any service name |
| JSON fixture loading | `fs.readFileSync` inline | `loadFixture(path)` from `@vn-mcp/shared` | Injects `_mock: true` automatically |
| MCP error formatting | Custom error object | `McpApiError` + `formatToolError()` from shared | Returns correct `{ isError: true, content: [...] }` shape |
| Integration test client wiring | Manual transport setup | `createTestClient(server)` + `callTool(client, name, args)` | In-memory transport, already tested with MoMo |
| VN error code lookup | Custom map | Add codes to `VN_ERROR_CODES` in `packages/shared/src/errors/error-codes.ts` | Central map, translateErrorCode() already works |

**Key insight:** The shared package was intentionally designed for exactly this replication. Resist any impulse to add provider-specific logic to shared — all that belongs in the server packages.

---

## Common Pitfalls

### Pitfall 1: ZaloPay Callback MAC Field Order Unknown

**What goes wrong:** The exact pipe-delimited field order for ZaloPay callback verification (key2) differs from the create order field order (key1). Using the create order field order to verify callbacks produces wrong MACs, causing all callback verifications to return `valid: false`.
**Why it happens:** ZaloPay's documentation describes two different schemes, and the callback scheme has less English documentation available.
**How to avoid:** In mock mode, the `zalopay_validate_callback` tool constructs its own HMAC for the test payload using the same `buildCallbackSignature()` function — the test crafts a valid payload, signs it, then verifies it. This proves the round-trip works even if the exact field order is researched from Vietnamese docs later.
**Warning signs:** `valid: false` even for freshly-signed test payloads. Signature test vector from Vietnamese ZaloPay docs would resolve this definitively.
**Confidence:** MEDIUM — create order fields are verified (HIGH), callback fields are inferred from the security docs pattern.

### Pitfall 2: VNPAY Amount Units

**What goes wrong:** VNPAY stores amounts as VND * 100 (e.g., 100,000 VND becomes 10,000,000 in `vnp_Amount`). Storing the raw VND amount in the mock fixture, then forgetting to multiply when building the URL causes VNPAY to reject the payment as too small.
**Why it happens:** MoMo and ZaloPay use raw VND in their API bodies. VNPAY is the exception.
**How to avoid:** The `client.ts` for mcp-vnpay always multiplies: `vnp_Amount: args.amount * 100`. Mock fixtures store raw VND amounts. The conversion happens exactly once — in the URL builder.
**Warning signs:** VNPAY test transactions appear to succeed but the amount in the payment portal is 1/100 of the expected value.

### Pitfall 3: .mcp.json Not Updated

**What goes wrong:** Both new servers are built and tested but never added to `.mcp.json`, so Claude Code cannot discover or use them.
**Why it happens:** `.mcp.json` update is easy to overlook as a separate step from writing the server code.
**How to avoid:** Add `.mcp.json` update as an explicit task. The final `.mcp.json` should have three entries: `momo-vn`, `zalopay-vn`, `vnpay`.

### Pitfall 4: VN_ERROR_CODES Not Extended

**What goes wrong:** ZaloPay's `-54` and VNPAY's `51` error codes are not in `VN_ERROR_CODES`, causing `translateErrorCode('zalopay', '-54')` to return `undefined` and error messages to be unhelpful.
**Why it happens:** The shared error-codes.ts has stub entries but they may be incomplete (e.g., the current stub shows `-49` for ZaloPay insufficient balance, but the CONTEXT.md specifies `-54` as the error code to use).
**How to avoid:** Extend `VN_ERROR_CODES` for both providers before implementing the tools. The current stub already has `zalopay` and `vnpay` keys — only need to add the specific codes used.

### Pitfall 5: TypeScript composite build ordering

**What goes wrong:** `tsc --noEmit` in a new server package fails with "Cannot find module '@vn-mcp/shared'" because `packages/shared` has not been built yet.
**Why it happens:** TypeScript project references require the referenced package to have built declaration files in its `dist/` (or equivalent) directory first.
**How to avoid:** Run `npm run build --workspace=packages/shared` before `tsc --noEmit` in new server packages. This is the same issue documented in STATE.md from Phase 2.

### Pitfall 6: VNPAY verifyReturn — URL vs query string parsing

**What goes wrong:** `vnpay_verify_return` accepts either a full URL or a raw query string. Using `new URL(input)` on a bare query string (without `https://`) throws a parse error.
**Why it happens:** The tool description says it accepts "full URL or query string," but implementation needs to handle both cases.
**How to avoid:** Check if input starts with `http` — if yes, parse as URL and extract `search`. If no, assume it is a query string and prepend `?` for `URLSearchParams` parsing. Return `formatToolError` on parse failure.

---

## Code Examples

### ZaloPay create order MAC construction

```typescript
// Verified from: docs.zalopay.vn/docs/developer-tools/security/secure-data-transmission/
// Field order: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
const hmacInput = `${appId}|${appTransId}|${appUser}|${amount}|${appTime}|${embedData}|${item}`;
const mac = signHmacSha256(key1, hmacInput);
```

### VNPAY secure hash construction

```typescript
// Verified from: sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
// "Checksum data is established by sorting parameter names in ascending order"
const sorted = Object.entries(params)
  .filter(([k]) => k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType')
  .sort(([a], [b]) => a.localeCompare(b));
const queryString = sorted.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
const secureHash = signHmacSha512(hashSecret, queryString);
```

### ZaloPay app_trans_id deterministic generation

```typescript
// CONTEXT.md decision: YYMMDD_ + hash(amount + description)
const date = new Date();
const yy = String(date.getFullYear()).slice(-2);
const mm = String(date.getMonth() + 1).padStart(2, '0');
const dd = String(date.getDate()).padStart(2, '0');
const hash = createHash('sha256').update(`${amount}${description}`).digest('hex').substring(0, 8);
const appTransId = `${yy}${mm}${dd}_${hash}`;
```

### VN_ERROR_CODES extension

```typescript
// packages/shared/src/errors/error-codes.ts — MUST extend before implementing tools
zalopay: {
  '1': 'Success',
  '2': 'Failed',
  '-49': 'Insufficient balance',
  '-54': 'Insufficient balance',  // ADD: error trigger value per CONTEXT.md
  '-68': 'Duplicate app_trans_id',
},
vnpay: {
  '00': 'Success',
  '07': 'Transaction suspected fraud',
  '09': 'Transaction unsuccessful — card/account not registered for internet banking',
  '10': 'Customer verification failed more than 3 times',
  '11': 'Payment session expired',
  '12': 'Account locked',
  '13': 'Wrong OTP entered',
  '24': 'Customer cancelled transaction',
  '51': 'Insufficient balance',   // ADD: error trigger value per CONTEXT.md
  '65': 'Transaction limit exceeded for the day',
  '75': 'Payment bank under maintenance',
  '79': 'Wrong payment password more than allowed',
  '99': 'Other errors',
},
```

### .mcp.json final structure

```json
{
  "mcpServers": {
    "momo-vn": {
      "command": "node",
      "args": ["./servers/mcp-momo-vn/build/index.js"],
      "env": {
        "MOMO_SANDBOX": "true",
        "MOMO_PARTNER_CODE": "MOMOBKUN20180529",
        "MOMO_ACCESS_KEY": "klm05TvNBzhg7h7j",
        "MOMO_SECRET_KEY": "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa"
      }
    },
    "zalopay-vn": {
      "command": "node",
      "args": ["./servers/mcp-zalopay-vn/build/index.js"],
      "env": {
        "ZALOPAY_SANDBOX": "true",
        "ZALOPAY_APP_ID": "2553",
        "ZALOPAY_KEY1": "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
        "ZALOPAY_KEY2": "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
        "ZALOPAY_ENDPOINT": "https://sb-openapi.zalopay.vn"
      }
    },
    "vnpay": {
      "command": "node",
      "args": ["./servers/mcp-vnpay/build/index.js"],
      "env": {
        "VNPAY_SANDBOX": "true",
        "VNPAY_TMN_CODE": "SANDBOX_TMN",
        "VNPAY_HASH_SECRET": "SANDBOX_SECRET",
        "VNPAY_ENDPOINT": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
      }
    }
  }
}
```

Note: VNPAY sandbox credentials require registration at sandbox.vnpayment.vn/devreg — no public test credentials found. The planner should use placeholder values that implement will replace.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ZaloPay RSA signing (old docs) | ZaloPay HMAC-SHA256 (current docs) | Pre-2024 | CONTEXT.md resolved: use HMAC, simpler implementation |
| VNPAY MD5/SHA256 hash | VNPAY HMAC-SHA512 | ~2023 algorithm upgrade | signHmacSha512 already in shared — no new work needed |
| Separate API clients per server | Shared HMAC primitives, per-server field ordering | Phase 1 decision | All three servers use same crypto module; only field ordering differs |

**Deprecated/outdated:**
- ZaloPay RSA signing (`sig` field): Not needed for this phase. Mock-first means no real API account — HMAC is simpler and matches current docs.
- VNPAY MD5/SHA256: Do not use. Current API requires HMAC-SHA512.

---

## Open Questions

1. **ZaloPay callback MAC field order**
   - What we know: Create order uses `app_id|app_trans_id|app_user|amount|app_time|embed_data|item` (HIGH confidence)
   - What's unclear: Callback verification (key2) field order — Vietnamese official docs needed
   - Recommendation: Implement best-guess field order based on security doc pattern, verify with round-trip integration test (sign in test, verify in tool). Document in MOCK_DEVIATIONS.md if uncertain.

2. **VNPAY vnp_TxnRef determinism**
   - What we know: CONTEXT.md marks this as Claude's Discretion
   - What's unclear: Should vnp_TxnRef be deterministic like ZaloPay/MoMo orderId?
   - Recommendation: Make it deterministic via hash(amount + orderInfo) for test reproducibility. VNPAY only requires uniqueness within a day, so hash-based IDs are safe.

3. **VNPAY sandbox credentials**
   - What we know: No publicly documented test credentials found (unlike ZaloPay's documented 2553/key1/key2)
   - What's unclear: Whether there's a standard dev credential or each dev registers their own
   - Recommendation: Use placeholder values in `.mcp.json` with clear comment. In mock mode these are never used for real HMAC verification — only for the `credentials.ts` fallback display.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^3.2.4 |
| Config file | `servers/mcp-zalopay-vn/vitest.config.ts` and `servers/mcp-vnpay/vitest.config.ts` (identical to momo-vn pattern) |
| Quick run command | `ZALOPAY_SANDBOX=true vitest run` (from zalopay-vn dir) / `VNPAY_SANDBOX=true vitest run` (from vnpay dir) |
| Full suite command | `npm test` from monorepo root (runs all workspace test scripts) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ZPAY-01 | zalopay_create_order returns app_trans_id + paymentUrl + _mock:true | integration | `ZALOPAY_SANDBOX=true vitest run --reporter=verbose` | ❌ Wave 0 |
| ZPAY-01 | zalopay_create_order deterministic — same input yields same app_trans_id | integration | same | ❌ Wave 0 |
| ZPAY-02 | zalopay_query_order returns matching app_trans_id + return_code + _mock:true | integration | same | ❌ Wave 0 |
| ZPAY-03 | zalopay_refund returns successful mock refund with zp_trans_id | integration | same | ❌ Wave 0 |
| ZPAY-04 | zalopay_validate_callback accepts correctly-signed payload, returns valid:true | integration | same | ❌ Wave 0 |
| ZPAY-04 | zalopay_validate_callback rejects tampered payload, returns valid:false | integration | same | ❌ Wave 0 |
| ZPAY-05 | zalopay_create_order with amount=99999999 returns isError:true | integration | same | ❌ Wave 0 |
| VNPY-01 | vnpay_create_payment_url returns paymentUrl object with _mock:true | integration | `VNPAY_SANDBOX=true vitest run --reporter=verbose` | ❌ Wave 0 |
| VNPY-01 | vnpay_create_payment_url deterministic (optional — Claude's discretion) | integration | same | ❌ Wave 0 |
| VNPY-02 | vnpay_verify_return accepts correctly-signed params, returns valid:true | integration | same | ❌ Wave 0 |
| VNPY-02 | vnpay_verify_return rejects tampered params, returns valid:false | integration | same | ❌ Wave 0 |
| VNPY-03 | vnpay_query_transaction returns mock transaction data + _mock:true | integration | same | ❌ Wave 0 |
| VNPY-04 | vnpay_create_payment_url with amount=99999999 returns isError:true | integration | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `ZALOPAY_SANDBOX=true vitest run` or `VNPAY_SANDBOX=true vitest run` in respective server directory
- **Per wave merge:** `npm test` from monorepo root
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `servers/mcp-zalopay-vn/src/__tests__/integration.test.ts` — covers ZPAY-01 through ZPAY-05
- [ ] `servers/mcp-zalopay-vn/vitest.config.ts` — copied from mcp-momo-vn verbatim
- [ ] `servers/mcp-vnpay/src/__tests__/integration.test.ts` — covers VNPY-01 through VNPY-04
- [ ] `servers/mcp-vnpay/vitest.config.ts` — copied from mcp-momo-vn verbatim

---

## Sources

### Primary (HIGH confidence)
- `servers/mcp-momo-vn/src/` — Template pattern read directly from Phase 2 implementation
- `packages/shared/src/http-client/hmac.ts` — signHmacSha256, signHmacSha512 primitives verified
- `packages/shared/src/mock-engine/isMockMode.ts` — Already handles 'zalopay' and 'vnpay' service names
- `packages/shared/src/errors/error-codes.ts` — VN_ERROR_CODES map read directly; has zalopay and vnpay stubs
- [ZaloPay Secure Data Transmission](https://docs.zalopay.vn/docs/developer-tools/security/secure-data-transmission/) — HMAC-SHA256 algorithm, dual-key scheme, create order field order confirmed
- [VNPAY sandbox.vnpayment.vn API docs](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html) — HMAC-SHA512, alphabetical sort, vnp_ parameter names confirmed

### Secondary (MEDIUM confidence)
- [ZaloPay v2 API overview](https://docs.zalopay.vn/en/v2/general/overview.html) — Endpoint structure, app_trans_id format YYMMDD_
- [ZaloPay sandbox credentials from docs examples](https://developers.zalopay.vn/v2/start/) — app_id:2553, key1, key2 test values
- [vnpay.js.org create payment URL](https://vnpay.js.org/en/create-payment-url) — vnp_ parameter list, version 2.1.0, command "pay"
- [vnpay.js.org query transaction](https://vnpay.js.org/en/query-dr) — queryDr parameter names confirmed

### Tertiary (LOW confidence)
- ZaloPay callback field order — inferred from security docs pattern, not explicitly documented in English sources consulted
- VNPAY URL encoding approach (encodeURIComponent vs raw) — community pattern, not explicitly stated in official docs
- VNPAY sandbox test credentials — no public credentials found; registration required

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — exact same packages as Phase 2, no new dependencies
- ZaloPay signature scheme: HIGH (create order) / MEDIUM (callback field order) — official docs confirm algorithm and create fields
- VNPAY signature scheme: HIGH — algorithm, sort order, field exclusion all confirmed from official docs
- Architecture patterns: HIGH — direct replication of verified MoMo server
- Pitfalls: HIGH — sourced from existing PITFALLS.md + Phase 2 experience recorded in STATE.md

**Research date:** 2026-03-18
**Valid until:** 2026-04-17 (30 days — ZaloPay/VNPAY APIs are stable)
