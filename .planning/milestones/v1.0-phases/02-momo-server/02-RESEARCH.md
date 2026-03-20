# Phase 02: MoMo Server - Research

**Researched:** 2026-03-18
**Domain:** MoMo Payment API v2, MCP STDIO server, mock-first implementation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**MoMo API signature scheme**
- Hardcoded per-endpoint field ordering for HMAC-SHA256 signature strings — each tool knows its own signature field order matching MoMo v2 docs exactly
- V2 API only — no v3 support needed (most documented, widely used, stable)
- Credentials via environment variables: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY` — set in `.mcp.json` env block. Mock mode uses built-in test values if not set
- Use `signHmacSha256()` from `@vn-mcp/shared` for the HMAC primitive; field concatenation/ordering lives in the MoMo server code

**Mock fixture realism**
- Fake but structured URLs: `https://test-payment.momo.vn/pay/MOMO_abc123` — looks real, uses MoMo's test domain, doesn't resolve
- Error scenarios triggered by amount: `amount=99999999` → insufficient balance, `amount=0` → invalid amount. No env var changes needed between tests
- Realistic numeric transIds: 10-digit numeric like real MoMo (e.g., `2350000001`) — helps catch string/number type bugs
- All documented MoMo response fields included in fixtures — makes the mock a complete API reference
- Deterministic IDs from input: `orderId` = `MOMO_` + hash(amount + description). Same input always produces same ID — tests are reproducible
- Every mock response includes `"_mock": true` field

**Tool input/output design**
- `momo_create_payment`: Required params: `amount`, `orderInfo`. Optional: `redirectUrl`, `ipnUrl`, `extraData`, `requestType`. Server generates `orderId`, `requestId`, `partnerCode` internally
- Default payment method: `captureWallet` (QR code — most common). Optional `requestType` param for `payWithATM`, `payWithCC`, etc.
- Curated response objects: `{ orderId, payUrl, transId, status, amount }` — not raw MoMo response. Claude gets what it needs without parsing nested structures
- `momo_query_status`: Accepts `orderId` only (MoMo v2 primary query key). No transId lookup
- `momo_refund`: Accepts `transId` and `amount` for full/partial refund
- Zod schemas inline with each tool (per Phase 1 decision)

**IPN validation approach**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOMO-01 | `momo_create_payment` — create QR/wallet/ATM payment with payUrl output | MoMo v2 `/v2/gateway/api/create` endpoint, captureWallet requestType, signature field order verified |
| MOMO-02 | `momo_query_status` — check transaction by orderId | MoMo v2 `/v2/gateway/api/query` endpoint, 4-field signature verified |
| MOMO-03 | `momo_refund` — full and partial refund by transId | MoMo v2 `/v2/gateway/api/refund` endpoint, 7-field signature verified |
| MOMO-04 | `momo_validate_ipn` — validate + parse incoming IPN payload signature | IPN 13-field alphabetical signature verified from official PHP sample |
| MOMO-05 | Sandbox mock mode for all MoMo tools | `isMockMode('momo')` checks `MOMO_SANDBOX` env var; `loadFixture()` injects `_mock: true` |
</phase_requirements>

---

## Summary

Phase 2 builds `mcp-momo-vn`, the first complete MCP server in the monorepo. All scaffolding from Phase 1 is in place: `@vn-mcp/shared` provides `signHmacSha256()`, `isMockMode()`, `loadFixture()`, `formatToolError()`, `createTestClient()`, and `callTool()`. This phase is purely additive — create `servers/mcp-momo-vn/` and wire it up.

The MoMo v2 API signature field orderings are verified from official documentation and the official `momo-wallet/payment` GitHub repository. Each of the four endpoints has a distinct field order: create uses 10 fields, query uses 4 fields, refund uses 7 fields, IPN uses 13 fields — all alphabetically sorted within their documented set. This phase runs in mock mode only (`MOMO_SANDBOX=true`), so real HTTP calls are never made; the mock layer exercises the signature logic using known test credentials.

The critical correctness check is the `momo_validate_ipn` tool: it must perform real HMAC verification even in mock mode, using the known sandbox secretKey. This proves the signature logic is correct before any real API account exists.

**Primary recommendation:** Build in wave order — package scaffold, then tool skeletons with Zod schemas, then mock fixtures, then HMAC signature functions, then integration tests. Each wave is independently testable.

---

## Standard Stack

### Core (all from Phase 1 — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | `^1.27.1` | McpServer, tool registration, STDIO transport | Already installed; Phase 1 pattern proven |
| `zod` | `^3.25.76` | Inline tool input schemas | Already installed; per INFRA-05 decision |
| `@vn-mcp/shared` | `0.0.1` (workspace) | HMAC signing, mock engine, error handling, test helpers | Built in Phase 1 |
| `vitest` | `^3.2.4` | Integration test runner | Already at monorepo root devDependencies |
| `typescript` | `^5.9.3` | Language | Already installed |
| `tsx` | `^4.21.0` | Run server without compile step | Already installed |
| `tsdown` | `^0.21.4` | Build ESM output | Already installed |

### New server-level dependencies

None. The MoMo server needs only `@modelcontextprotocol/sdk`, `zod`, and `@vn-mcp/shared` — all already available via npm workspaces.

**Installation for new server package:**
```bash
# From servers/mcp-momo-vn/
npm install
# No new top-level installs needed — workspace resolves everything
```

---

## Architecture Patterns

### Recommended Project Structure

```
servers/mcp-momo-vn/
├── package.json          # name: "@vn-mcp/mcp-momo-vn"; bin: "node build/index.js"
├── tsconfig.json         # extends ../../tsconfig.base.json; references: [../../packages/shared]
└── src/
    ├── index.ts          # McpServer init + StdioServerTransport
    ├── client.ts         # Mock/real switcher — momoClient object
    ├── tools/
    │   ├── createPayment.ts   # momo_create_payment
    │   ├── queryStatus.ts     # momo_query_status
    │   ├── refund.ts          # momo_refund
    │   ├── validateIpn.ts     # momo_validate_ipn
    │   └── index.ts           # registerAll(server)
    ├── mock/
    │   ├── createPayment.json
    │   ├── queryStatus.json
    │   ├── refund.json
    │   └── errorInsufficientBalance.json
    └── __tests__/
        └── integration.test.ts
```

### Pattern 1: Server Bootstrap (index.ts)

**What:** Create `McpServer`, call `registerAll(server)`, connect `StdioServerTransport`.
**When to use:** Always — server entry point is always this pattern.
**Example:**
```typescript
// Source: @modelcontextprotocol/sdk pattern; see packages/shared/src/__tests__/integration.test.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAll } from './tools/index.js';

const server = new McpServer({
  name: 'mcp-momo-vn',
  version: '0.0.1',
});

registerAll(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Pattern 2: Tool Registration with Inline Zod Schema

**What:** Each tool file exports a `register(server)` function. Schema is inline, NOT in a shared schemas.ts file (per Phase 1 INFRA-05 decision).
**When to use:** Every tool, without exception.
**Example:**
```typescript
// Source: Phase 1 integration test reference pattern
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared/errors';
import { momoClient } from '../client.js';

export function register(server: McpServer) {
  server.tool(
    'momo_create_payment',
    'Create a MoMo payment link (QR code, wallet, or ATM). Returns payUrl for the customer to complete payment.',
    {
      amount: z.number().int().positive().describe('Payment amount in VND (10,000–50,000,000)'),
      orderInfo: z.string().describe('Order description shown to the customer'),
      redirectUrl: z.string().url().optional().default('https://momo.vn').describe('URL to redirect after payment'),
      ipnUrl: z.string().url().optional().default('https://momo.vn').describe('Server callback URL for payment result'),
      requestType: z.enum(['captureWallet', 'payWithATM', 'payWithCC']).optional().default('captureWallet'),
      extraData: z.string().optional().default(''),
    },
    async (args) => {
      try {
        const result = await momoClient.createPayment(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
```

### Pattern 3: Client Mock Switcher

**What:** `client.ts` exports a single `momoClient` object. Each method checks `isMockMode('momo')`.
**When to use:** All four operations — create, query, refund, IPN.

```typescript
// Source: ARCHITECTURE.md Pattern 2
import { isMockMode, loadFixture } from '@vn-mcp/shared/mock-engine';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, 'mock');

export const momoClient = {
  createPayment: async (args: CreatePaymentArgs) => {
    if (isMockMode('momo')) {
      return loadFixture(join(MOCK_DIR, 'createPayment.json'));
    }
    // Real HTTP call (Phase 2+ when real credentials exist)
    throw new Error('Real API not implemented — set MOMO_SANDBOX=true');
  },
  // ... queryStatus, refund, validateIpn
};
```

### Pattern 4: HMAC Signature per Endpoint

**What:** Each tool that needs signature has a local `buildSignatureString(params)` function. Uses `signHmacSha256()` from shared.
**When to use:** `momo_create_payment`, `momo_query_status`, `momo_refund`. For `momo_validate_ipn`, the signature is IN the payload — recompute and compare.
**Critical:** Field ordering is hardcoded per-endpoint. Never dynamically sort fields.

```typescript
// Source: Official MoMo docs + momo-wallet/payment GitHub repo
import { signHmacSha256 } from '@vn-mcp/shared/http-client';

// For create payment (captureWallet)
function buildCreateSignature(params: {
  accessKey: string; amount: number; extraData: string;
  ipnUrl: string; orderId: string; orderInfo: string;
  partnerCode: string; redirectUrl: string; requestId: string; requestType: string;
}, secretKey: string): string {
  const raw = `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}` +
    `&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}` +
    `&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}` +
    `&requestId=${params.requestId}&requestType=${params.requestType}`;
  return signHmacSha256(secretKey, raw);
}

// For query status
function buildQuerySignature(params: {
  accessKey: string; orderId: string; partnerCode: string; requestId: string;
}, secretKey: string): string {
  const raw = `accessKey=${params.accessKey}&orderId=${params.orderId}` +
    `&partnerCode=${params.partnerCode}&requestId=${params.requestId}`;
  return signHmacSha256(secretKey, raw);
}

// For refund
function buildRefundSignature(params: {
  accessKey: string; amount: number; description: string;
  orderId: string; partnerCode: string; requestId: string; transId: number;
}, secretKey: string): string {
  const raw = `accessKey=${params.accessKey}&amount=${params.amount}&description=${params.description}` +
    `&orderId=${params.orderId}&partnerCode=${params.partnerCode}` +
    `&requestId=${params.requestId}&transId=${params.transId}`;
  return signHmacSha256(secretKey, raw);
}

// For IPN validation (recompute from payload fields)
function buildIpnSignature(payload: {
  accessKey: string; amount: number; extraData: string; message: string;
  orderId: string; orderInfo: string; orderType: string; partnerCode: string;
  payType: string; requestId: string; responseTime: number; resultCode: number; transId: number;
}, secretKey: string): string {
  const raw = `accessKey=${payload.accessKey}&amount=${payload.amount}&extraData=${payload.extraData}` +
    `&message=${payload.message}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}` +
    `&orderType=${payload.orderType}&partnerCode=${payload.partnerCode}&payType=${payload.payType}` +
    `&requestId=${payload.requestId}&responseTime=${payload.responseTime}` +
    `&resultCode=${payload.resultCode}&transId=${payload.transId}`;
  return signHmacSha256(secretKey, raw);
}
```

### Pattern 5: Deterministic orderId Generation

**What:** `orderId` = `MOMO_` + first 12 chars of SHA-256 hex of `amount+orderInfo`. Reproducible from same inputs.

```typescript
import { createHash } from 'node:crypto';

function generateOrderId(amount: number, orderInfo: string): string {
  const hash = createHash('sha256')
    .update(`${amount}${orderInfo}`)
    .digest('hex')
    .substring(0, 12);
  return `MOMO_${hash}`;
}

function generateRequestId(): string {
  // Unique per call — timestamp + random
  return `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
```

### Anti-Patterns to Avoid

- **Alphabetical-sorting signature fields dynamically:** MoMo v2 is documented with a specific field set per endpoint. Dynamic sorting could include or exclude fields incorrectly. Hardcode each endpoint's string.
- **Returning raw MoMo response to Claude:** Raw responses have nested objects and Vietnamese error messages. Return curated `{ orderId, payUrl, transId, status, amount }` only.
- **Using transId as string:** Real MoMo transIds are `Long` (numeric). Treat as `number` in TypeScript. Fixture values like `2350000001` must be numbers, not strings.
- **Shared requestId across calls:** `requestId` must be globally unique per call. Never reuse. Generate fresh for every tool invocation.
- **console.log in any server code:** Kills stdio transport. All logging via `console.error` only. ESLint rule enforces this.
- **Hard-coding credentials in source:** Mock mode uses built-in sandbox values. Real credentials come from env vars only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC-SHA256 primitive | Custom crypto wrapper | `signHmacSha256()` from `@vn-mcp/shared` | Built in Phase 1; Node 20 crypto underneath |
| Mock JSON loading + `_mock` injection | Custom fixture loader | `loadFixture()` from `@vn-mcp/shared` | Built in Phase 1; handles `_mock: true` injection |
| Mock mode env check | `process.env.MOMO_SANDBOX === 'true'` inline | `isMockMode('momo')` from `@vn-mcp/shared` | Consistent with all other servers |
| Structured error formatting | `{ isError: true, content: [...] }` by hand | `formatToolError()` from `@vn-mcp/shared` | Translates MoMo error codes; wraps `McpApiError` |
| In-memory MCP test client | Custom test harness | `createTestClient()` + `callTool()` from `@vn-mcp/shared` | Built in Phase 1; InMemoryTransport wiring |
| Tool name validation | Regex check inline | `validateToolName()` from `@vn-mcp/shared` | Pattern `/^[a-z][a-z0-9]*(_[a-z][a-z0-9]*){2,}$/` |

**Key insight:** Phase 1 was specifically designed so Phase 2 only needs to implement business logic. All infrastructure primitives exist. Use them.

---

## Common Pitfalls

### Pitfall 1: Wrong Signature Field Set for IPN vs. Create

**What goes wrong:** The IPN signature uses 13 fields (`message`, `orderType`, `payType`, `responseTime`, `resultCode` etc.) that do not appear in the create payment signature. Developers copy the create signature function for IPN and get silent verification failures.
**Why it happens:** Both use `accessKey` + `amount` + `orderId` + `partnerCode`, making partial overlap seem like the same format.
**How to avoid:** Implement `buildIpnSignature()` as a completely separate function. Write a unit test using the exact test vector from `momo-wallet/payment` PHP sample with the known sandbox secretKey.
**Warning signs:** `momo_validate_ipn` always returns `{ valid: false }` even for correctly crafted payloads.

### Pitfall 2: Fixture Path Resolution with `loadFixture()`

**What goes wrong:** `loadFixture('mock/createPayment.json')` resolves relative to `process.cwd()`, not the source file. When tests run from the monorepo root, the path resolves to `vietnamese-mcp/mock/createPayment.json` instead of `servers/mcp-momo-vn/src/mock/createPayment.json`.
**Why it happens:** `loadFixture()` uses `resolve(fixturePath)` which is relative to `cwd`.
**How to avoid:** Always pass absolute paths using `import.meta.url`:
```typescript
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = loadFixture(join(__dirname, '../mock/createPayment.json'));
```
**Warning signs:** `ENOENT: no such file or directory` when running tests from repo root.

### Pitfall 3: transId Type Mismatch (string vs. number)

**What goes wrong:** Mock fixtures define `transId` as a string (`"2350000001"`). Real MoMo API returns it as a `Long`. If the Zod schema for refund accepts `transId: z.number()` but the fixture returns a string, the integration test fails validation.
**Why it happens:** JSON has no distinction between integer and float. Developers write `"transId": "2350000001"` in JSON thinking it's equivalent.
**How to avoid:** Define `transId` as `number` in all Zod schemas. In fixture JSON: `"transId": 2350000001` (no quotes). Write a test that asserts `typeof result.transId === 'number'`.
**Warning signs:** Zod validation errors on mock responses; downstream `momo_refund` calls pass a string where a number is expected.

### Pitfall 4: `MOMO_SANDBOX` vs. `SANDBOX_MODE`

**What goes wrong:** The success criteria says `SANDBOX_MODE=true`. The CONTEXT.md says `MOMO_SANDBOX`. The `isMockMode('momo')` function in shared checks `MOMO_SANDBOX`.
**Why it happens:** Two different naming conventions mentioned in different docs.
**How to avoid:** Use `MOMO_SANDBOX=true` consistently (what `isMockMode('momo')` checks). The success criteria's `SANDBOX_MODE=true` is from the requirements and should be treated as equivalent — the actual env var is `MOMO_SANDBOX`. The `package.json` test script should set `MOMO_SANDBOX=true`.
**Warning signs:** Tests run with `SANDBOX_MODE=true` but mock mode doesn't activate; all four tools try to make real HTTP calls.

### Pitfall 5: Missing `.js` Extension on Local Imports

**What goes wrong:** With `"module": "Node16"` in tsconfig, all local relative imports must use `.js` extension even when importing `.ts` files. `import { register } from './tools/createPayment'` fails at runtime.
**Why it happens:** Node16 ESM requires explicit extensions. TypeScript with Node16 module resolution enforces this.
**How to avoid:** All imports: `import { register } from './tools/createPayment.js'`. This is enforced by the existing ESLint config.
**Warning signs:** `ERR_MODULE_NOT_FOUND` at runtime for local imports.

### Pitfall 6: McpServer Connects Before Tools Are Registered

**What goes wrong:** If `server.connect(transport)` is called before `registerAll(server)`, the transport starts processing JSON-RPC before tools are available. Claude Code sends a `tools/list` request immediately on connect.
**Why it happens:** Async confusion — developers await the connect call first.
**How to avoid:** Always register all tools synchronously before calling `server.connect(transport)`. Pattern: `registerAll(server)` then `await server.connect(transport)`.
**Warning signs:** `tools/list` returns empty array; Claude says "no tools available."

---

## Code Examples

### Verified Signature Strings (from Official MoMo v2 Docs)

```typescript
// Source: developers.momo.vn/v3/docs/payment/api/wallet/onetime/
// Create payment — 10 fields, alphabetical order
const createRaw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
  `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
  `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
  `&requestId=${requestId}&requestType=${requestType}`;

// Source: developers.momo.vn/v3/docs/payment/api/payment-api/query/
// Query transaction — 4 fields
const queryRaw = `accessKey=${accessKey}&orderId=${orderId}` +
  `&partnerCode=${partnerCode}&requestId=${requestId}`;

// Source: developers.momo.vn/v3/docs/payment/api/payment-api/refund/
// Refund — 7 fields
const refundRaw = `accessKey=${accessKey}&amount=${amount}&description=${description}` +
  `&orderId=${orderId}&partnerCode=${partnerCode}` +
  `&requestId=${requestId}&transId=${transId}`;

// Source: github.com/momo-wallet/payment/blob/master/php/PayMoMo/ipn_momo.php
// IPN validation — 13 fields
const ipnRaw = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
  `&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}` +
  `&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}` +
  `&requestId=${requestId}&responseTime=${responseTime}` +
  `&resultCode=${resultCode}&transId=${transId}`;
```

### Sandbox Test Credentials (Built-in for Mock Mode)

```typescript
// Source: momo-wallet/payment GitHub repository (public sandbox values)
// These are published test credentials — safe to include in source for mock mode
const MOMO_SANDBOX_CREDENTIALS = {
  partnerCode: 'MOMOBKUN20180529',
  accessKey: 'klm05TvNBzhg7h7j',
  secretKey: 'at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa',
};
```

### Integration Test Pattern

```typescript
// Source: packages/shared/src/__tests__/integration.test.ts (Phase 1 reference)
import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../src/tools/index.js';

describe('mcp-momo-vn integration (mock mode)', () => {
  let client: Awaited<ReturnType<typeof createTestClient>>;

  beforeAll(async () => {
    process.env.MOMO_SANDBOX = 'true';
    const server = new McpServer({ name: 'mcp-momo-vn', version: '0.0.1' });
    registerAll(server);
    client = await createTestClient(server);
  });

  it('momo_create_payment returns payUrl with _mock:true', async () => {
    const result = await callTool(client, 'momo_create_payment', {
      amount: 150000,
      orderInfo: 'Test order from Nguyen Van A',
    });
    expect(result.isError).toBeFalsy();
    const data = JSON.parse((result.content as Array<{type:string;text:string}>)[0].text);
    expect(data._mock).toBe(true);
    expect(data.payUrl).toMatch(/^https:\/\/test-payment\.momo\.vn\/pay\//);
    expect(data.orderId).toMatch(/^MOMO_/);
  });

  it('momo_query_status returns matching transaction', async () => {
    // First create
    const createResult = await callTool(client, 'momo_create_payment', {
      amount: 150000,
      orderInfo: 'Consistent test',
    });
    const created = JSON.parse((createResult.content as Array<{type:string;text:string}>)[0].text);

    // Then query same orderId
    const queryResult = await callTool(client, 'momo_query_status', {
      orderId: created.orderId,
    });
    const queried = JSON.parse((queryResult.content as Array<{type:string;text:string}>)[0].text);
    expect(queried.orderId).toBe(created.orderId);
    expect(queried._mock).toBe(true);
  });

  it('momo_validate_ipn accepts correctly signed payload', async () => {
    // Craft a valid IPN payload using known sandbox secretKey
    // ... build and sign using buildIpnSignature with sandbox credentials
    const result = await callTool(client, 'momo_validate_ipn', {
      ipnBody: JSON.stringify(validIpnPayload),
    });
    const parsed = JSON.parse((result.content as Array<{type:string;text:string}>)[0].text);
    expect(parsed.valid).toBe(true);
  });

  it('momo_validate_ipn rejects tampered payload', async () => {
    const tamperedBody = JSON.stringify({ ...validIpnPayload, amount: 999999 });
    const result = await callTool(client, 'momo_validate_ipn', { ipnBody: tamperedBody });
    const parsed = JSON.parse((result.content as Array<{type:string;text:string}>)[0].text);
    expect(parsed.valid).toBe(false);
  });
});
```

### package.json for mcp-momo-vn

```json
{
  "name": "@vn-mcp/mcp-momo-vn",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "mcp-momo-vn": "./build/index.js"
  },
  "scripts": {
    "build": "tsdown src/index.ts --format esm --dts",
    "dev": "tsx src/index.ts",
    "test": "MOMO_SANDBOX=true vitest run"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "zod": "^3.25.76",
    "@vn-mcp/shared": "*"
  },
  "engines": {
    "node": ">=20"
  }
}
```

### .mcp.json Entry (copy-paste ready)

```json
{
  "mcpServers": {
    "momo-vn": {
      "command": "node",
      "args": ["/path/to/servers/mcp-momo-vn/build/index.js"],
      "env": {
        "MOMO_SANDBOX": "true",
        "MOMO_PARTNER_CODE": "MOMOBKUN20180529",
        "MOMO_ACCESS_KEY": "klm05TvNBzhg7h7j",
        "MOMO_SECRET_KEY": "at67qH6mk8w5Y1nAyMoYKMWACiEi2bsa"
      }
    }
  }
}
```

---

## MoMo v2 API Reference (Verified)

### Endpoints

| Operation | Method | URL |
|-----------|--------|-----|
| Create payment | POST | `https://test-payment.momo.vn/v2/gateway/api/create` (sandbox) |
| Query status | POST | `https://test-payment.momo.vn/v2/gateway/api/query` |
| Refund | POST | `https://test-payment.momo.vn/v2/gateway/api/refund` |
| IPN (incoming) | POST | Developer's own URL (MoMo calls this) |

### Signature Field Order (VERIFIED — HIGH confidence)

| Endpoint | Fields in signature (exact order) |
|----------|-----------------------------------|
| Create (`captureWallet`) | `accessKey`, `amount`, `extraData`, `ipnUrl`, `orderId`, `orderInfo`, `partnerCode`, `redirectUrl`, `requestId`, `requestType` |
| Query | `accessKey`, `orderId`, `partnerCode`, `requestId` |
| Refund | `accessKey`, `amount`, `description`, `orderId`, `partnerCode`, `requestId`, `transId` |
| IPN validation | `accessKey`, `amount`, `extraData`, `message`, `orderId`, `orderInfo`, `orderType`, `partnerCode`, `payType`, `requestId`, `responseTime`, `resultCode`, `transId` |

Format: `key1=value1&key2=value2...` (no trailing `&`), then `signHmacSha256(secretKey, rawString)`.

### Curated Tool Response Schemas

| Tool | Output fields |
|------|--------------|
| `momo_create_payment` | `{ orderId, payUrl, requestId, amount, orderInfo, _mock }` |
| `momo_query_status` | `{ orderId, transId, amount, resultCode, status, message, payType, _mock }` |
| `momo_refund` | `{ orderId, transId, amount, resultCode, message, responseTime, _mock }` |
| `momo_validate_ipn` | `{ valid, orderId, amount, transId, resultCode, message }` (no `_mock` — logic is real) |

### Mock Error Triggers (amount-based)

| Amount | Error triggered |
|--------|----------------|
| `0` | Invalid amount (Zod schema rejects before mock) |
| `99999999` | resultCode `1005` — Insufficient balance |
| Any valid VND | Success response |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSE MCP transport | STDIO transport for local; StreamableHTTP for remote | MCP spec 2025-03-26 | SSE is deprecated — don't use it |
| `tsup` bundler | `tsdown` (Rolldown-based) | 2024 | tsup unmaintained; tsdown handles ESM imports correctly |
| jest for Node.js TS | vitest | 2024+ | vitest is ESM-native; no transform config needed |
| Zod v4 directly | Zod `^3.25.0` | Post-1.17.5 MCP SDK | v4 had breaking change with SDK; 3.25+ is stable |

---

## Open Questions

1. **`partnerClientId` field in create payment**
   - What we know: MoMo v3 docs show this field in the initiate endpoint's signature string. The captureWallet (one-time payment) endpoint used by this phase does NOT include it in the 10-field signature.
   - What's unclear: Whether the v2 captureWallet endpoint ever needs `partnerClientId`.
   - Recommendation: Omit for Phase 2 — it's not in the verified captureWallet signature field list. Mock returns without it.

2. **`loadFixture()` path resolution for query with dynamic orderId**
   - What we know: `momo_query_status` should return data matching the `orderId` that was passed in. But `loadFixture()` returns a static JSON file — the orderId in the fixture won't match.
   - What's unclear: Should the tool handler post-process the fixture to replace orderId with the requested one?
   - Recommendation: Yes — after loading the fixture, overwrite `orderId` with the requested value before returning. This is the correct mock behavior for "consistent mock responses" per CONTEXT.md.

3. **vitest config location for server tests**
   - What we know: vitest is at the monorepo root. `npm test` from monorepo root runs all tests. The success criteria says `npm test` from the server package directory.
   - What's unclear: Does the server package need its own `vitest.config.ts`, or does the root vitest config pick up `servers/**/__tests__/**`?
   - Recommendation: Add a `vitest.config.ts` in `servers/mcp-momo-vn/` so `npm test` in that directory runs only its tests. Also ensure root vitest config glob includes `servers/**`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest `^3.2.4` |
| Config file | Root `vitest.config.ts` (none yet for server) — Wave 0 creates `servers/mcp-momo-vn/vitest.config.ts` |
| Quick run command | `cd servers/mcp-momo-vn && npm test` |
| Full suite command | `npm test` (monorepo root) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOMO-01 | `momo_create_payment` returns `payUrl` + `_mock: true` | integration | `cd servers/mcp-momo-vn && npm test` | ❌ Wave 0 |
| MOMO-02 | `momo_query_status` returns status matching prior orderId | integration | `cd servers/mcp-momo-vn && npm test` | ❌ Wave 0 |
| MOMO-03 | `momo_refund` returns successful mock refund response | integration | `cd servers/mcp-momo-vn && npm test` | ❌ Wave 0 |
| MOMO-04 | `momo_validate_ipn` accepts valid + rejects tampered payload | integration | `cd servers/mcp-momo-vn && npm test` | ❌ Wave 0 |
| MOMO-05 | All tools return `_mock: true` when `MOMO_SANDBOX=true` | integration | `cd servers/mcp-momo-vn && npm test` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `cd servers/mcp-momo-vn && npm test`
- **Per wave merge:** `npm test` (monorepo root — verifies shared package still passes too)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `servers/mcp-momo-vn/vitest.config.ts` — config for local `npm test` execution
- [ ] `servers/mcp-momo-vn/src/__tests__/integration.test.ts` — covers MOMO-01 through MOMO-05
- [ ] `servers/mcp-momo-vn/package.json` — `"test": "MOMO_SANDBOX=true vitest run"` script

---

## Sources

### Primary (HIGH confidence)
- [developers.momo.vn/v3/docs/payment/api/wallet/onetime/](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/) — create payment signature 10-field order verified
- [developers.momo.vn/v3/docs/payment/api/payment-api/query/](https://developers.momo.vn/v3/docs/payment/api/payment-api/query/) — query signature 4-field order verified
- [developers.momo.vn/v3/docs/payment/api/payment-api/refund/](https://developers.momo.vn/v3/docs/payment/api/payment-api/refund/) — refund signature 7-field order verified
- [github.com/momo-wallet/payment/blob/master/php/PayMoMo/ipn_momo.php](https://github.com/momo-wallet/payment/blob/master/php/PayMoMo/ipn_momo.php) — IPN 13-field order from official MoMo sample code
- Phase 1 source: `packages/shared/src/` — all shared utilities verified by reading actual files

### Secondary (MEDIUM confidence)
- [developers.momo.vn/v3/docs/payment/api/other/signature/](https://developers.momo.vn/v3/docs/payment/api/other/signature/) — signature algorithm overview (HMAC-SHA256, key=value& format confirmed)
- WebSearch cross-verification of sandbox credentials `MOMOBKUN20180529` / `klm05TvNBzhg7h7j` — multiple independent sources confirm these are MoMo's published test values

### Tertiary (LOW confidence)
- WebSearch summary for IPN field order — cross-verified against PHP sample above, upgraded to MEDIUM

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in Phase 1; no new dependencies
- Signature field orders: HIGH — verified from official MoMo v2 docs and official momo-wallet/payment repo
- Architecture patterns: HIGH — mirrors Phase 1 proven patterns
- Mock fixture design: HIGH — documented in CONTEXT.md decisions
- Test patterns: HIGH — mirrors Phase 1 integration.test.ts

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (MoMo v2 API is stable; signature format changes would be breaking)
