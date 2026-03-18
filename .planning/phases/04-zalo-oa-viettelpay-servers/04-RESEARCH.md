# Phase 4: Zalo OA + ViettelPay Servers — Research

**Researched:** 2026-03-18
**Domain:** MCP servers for Zalo OA messaging (OAuth 2.0) and ViettelPay payment (low-confidence mock)
**Confidence:** HIGH (Zalo OA patterns) / MEDIUM (Zalo OA exact endpoints) / LOW (ViettelPay real API — mock-only by design)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Zalo OA OAuth & token refresh**
- Stateless per-call: access token via `ZALO_OA_ACCESS_TOKEN` env var. If expired, Claude Code calls `zalo_oa_refresh_token` to get a new one
- No in-memory token caching — server is stateless like all other MCP servers
- 4 env vars: `ZALO_OA_APP_ID`, `ZALO_OA_APP_SECRET`, `ZALO_OA_ACCESS_TOKEN`, `ZALO_OA_REFRESH_TOKEN`. Sandbox fallbacks for all
- `zalo_oa_refresh_token` reads `ZALO_OA_REFRESH_TOKEN` from env (no tool param) — credentials stay in env, not in Claude's context
- Mock mode returns deterministic token: `{ access_token: 'mock_access_token_xxxxx', expires_in: 3600, refresh_token: 'mock_refresh_token_xxxxx' }`

**Zalo OA messaging tool design**
- One tool `zalo_oa_send_message` with required `userId` + `type` (text/image/file) + content fields. Type determines required fields
- Image/file messages accept URL only (imageUrl/fileUrl) — no base64 upload
- `zalo_oa_list_followers` uses offset pagination: optional `offset` (default 0) + `count` (default 50). Returns `{ followers: [...], total, offset }`
- Mock follower data: 3-5 realistic Vietnamese profiles (Nguyễn Văn A, Trần Thị B, etc.) with placeholder avatar URLs and realistic userIds
- Zalo OA has no payment amount — no error trigger by amount. Error scenarios: invalid userId, expired token (mock can use special userId like `invalid_user` to trigger error)

**ViettelPay mock assumptions**
- MOCK_DEVIATIONS.md with per-field assumption table: `| Field | Assumed Value | Source | Confidence | Note |`
- Every mock response field documents where the assumption came from (official docs, third-party blog, inference)
- Auth scheme assumed HMAC-SHA256 like MoMo (documented as 'inferred from VN payment API industry pattern')
- 3 env vars: `VIETTEL_PAY_PARTNER_CODE`, `VIETTEL_PAY_SECRET_KEY`, `VIETTEL_PAY_ENDPOINT`. All documented as 'assumed'
- Error trigger: `amount=99999999` → insufficient balance with ViettelPay-specific error code (documented as 'assumed')
- Same server structure as MoMo/ZaloPay/VNPAY — credentials.ts, signatures.ts, client.ts, tools/, mock/

**Per-server documentation**
- **CLAUDE.md** per server: tool catalog with descriptions, required env vars, how to enable mock mode, common workflows
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ZLOA-01 | `zalo_oa_send_message` — send text/image/file to follower by userId | Zalo OA v3.0 message endpoint research; stateless tool pattern matches MoMo template |
| ZLOA-02 | `zalo_oa_get_follower_profile` — get profile info by userId | Zalo OA v3.0 getprofile endpoint confirmed; follows same GET query param pattern |
| ZLOA-03 | `zalo_oa_list_followers` — paginated follower list | Zalo OA v3.0 getfollowers with offset/count pagination confirmed |
| ZLOA-04 | `zalo_oa_refresh_token` — refresh expired access token | OAuth v4 refresh endpoint confirmed: `oauth.zaloapp.com/v4/oa/access_token`; header+body pattern documented |
| ZLOA-05 | Sandbox mock mode for all Zalo OA tools | Same isMockMode('zalo_oa') pattern as other servers; ZALO_OA_SANDBOX env var |
| VTPAY-01 | `viettel_pay_create_payment` — initiate payment request | Mock-only; MOCK_DEVIATIONS.md documents all assumptions |
| VTPAY-02 | `viettel_pay_query_status` — check transaction status | Mock-only; assumption table in MOCK_DEVIATIONS.md |
| VTPAY-03 | `viettel_pay_refund` — refund transaction | Mock-only; assumption table in MOCK_DEVIATIONS.md |
| VTPAY-04 | Sandbox mock mode for all ViettelPay tools | Same isMockMode('viettelpay') pattern; already in VN_ERROR_CODES in error-codes.ts |
| INFRA-07 | CLAUDE.md context file per server | Pattern defined: tool catalog + env vars + mock mode instructions + workflows |
| INFRA-08 | README.md with setup instructions per server | Pattern defined: quick start + full reference sections |
| INFRA-09 | Integration tests in mock mode per server | Pattern established: 6-8 vitest tests using createTestClient + callTool, INFRA-09 extends to cross-server test |
</phase_requirements>

---

## Summary

Phase 4 adds two very different servers to the monorepo: `mcp-zalo-oa` (messaging with OAuth) and `mcp-viettel-pay` (payment with no confirmed public API documentation). Both follow the established template pattern from MoMo/ZaloPay/VNPAY, differing only in their domain-specific auth and API surface.

**Zalo OA** is the most researched of the two. The v3.0 API base URL is `https://openapi.zalo.me/v3.0/oa/` with token refresh via `https://oauth.zaloapp.com/v4/oa/access_token`. The stateless design decision is already locked: the server reads `ZALO_OA_ACCESS_TOKEN` per-call from the environment. This avoids the token-expiry pitfall documented in PITFALLS.md (Pitfall 5) by delegating refresh to Claude Code calling `zalo_oa_refresh_token` explicitly. Access tokens expire in 3600 seconds (1 hour) — confirmed from multiple sources.

**ViettelPay** has no accessible public REST API documentation in English. A Go third-party client reveals ViettelPay's real enterprise API uses SOAP + RSA — not the REST + HMAC pattern assumed by the monorepo. This is expected and by design: the MOCK_DEVIATIONS.md approach makes all assumptions explicit. The mock uses the same HMAC-SHA256 structure as MoMo for internal consistency; `MOCK_DEVIATIONS.md` flags the auth scheme as assumed.

The phase also delivers INFRA-07, INFRA-08, and INFRA-09: per-server CLAUDE.md and README.md for all 5 servers (2 new + 3 retroactively) and a full integration test suite. The root README.md positions the project as the first Vietnamese MCP server collection.

**Primary recommendation:** Build `mcp-zalo-oa` first (better-documented API); then `mcp-viettel-pay` (pure mock, fully self-contained); finish with documentation files and cross-server integration tests.

---

## Standard Stack

### Core (same as Phases 2 and 3 — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | ^1.27.1 | MCP server + stdio transport | Project standard since Phase 1 |
| `zod` | ^3.25.76 | Inline tool schema validation | Project standard; validated pattern |
| `@vn-mcp/shared` | workspace:* | HMAC utils, mock engine, test helpers, error formatting | All shared utilities already built |

### New Dependencies
None. Both new servers use only the existing shared infrastructure. The project's monorepo pattern means zero new `npm install` steps for the server code itself.

### Installation

```bash
# No new packages needed — existing workspace dependencies cover everything
# Each new server package.json mirrors mcp-momo-vn / mcp-zalopay-vn exactly
```

---

## Architecture Patterns

### Established Pattern (Replicate Exactly)

```
servers/mcp-zalo-oa/
├── package.json          # name: "@vn-mcp/mcp-zalo-oa"; same scripts as momo
├── tsconfig.json         # same composite references pattern
├── vitest.config.ts      # same config as momo/zalopay
├── CLAUDE.md             # NEW: tool catalog + env vars + workflows
├── README.md             # NEW: quick start + full reference
└── src/
    ├── index.ts          # McpServer bootstrap — registerAll(server) BEFORE connect
    ├── credentials.ts    # getZaloOaCredentials() with env var fallbacks
    ├── client.ts         # zaloOaClient — isMockMode('zalo_oa') switcher
    ├── tools/
    │   ├── sendMessage.ts
    │   ├── getFollowerProfile.ts
    │   ├── listFollowers.ts
    │   ├── refreshToken.ts
    │   └── index.ts      # registerAll barrel
    └── mock/
        ├── sendMessage.json
        ├── getFollowerProfile.json
        ├── listFollowers.json
        └── refreshToken.json

servers/mcp-viettel-pay/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── MOCK_DEVIATIONS.md    # NEW: per-field assumption table
├── CLAUDE.md             # NEW
├── README.md             # NEW
└── src/
    ├── index.ts
    ├── credentials.ts
    ├── signatures.ts     # assumed HMAC-SHA256 — documented in MOCK_DEVIATIONS.md
    ├── client.ts
    ├── tools/
    │   ├── createPayment.ts
    │   ├── queryStatus.ts
    │   ├── refund.ts
    │   └── index.ts
    └── mock/
        ├── createPayment.json
        ├── queryStatus.json
        ├── refund.json
        └── errorInsufficientBalance.json
```

### Pattern 1: Tool Registration (Identical to Phases 2 & 3)

```typescript
// src/tools/sendMessage.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { zaloOaClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalo_oa_send_message',
    'Send a message to a Zalo OA follower. Supports text, image (URL), and file (URL) types.',
    {
      userId: z.string().describe('Zalo user ID of the follower'),
      type: z.enum(['text', 'image', 'file']).describe('Message type'),
      text: z.string().optional().describe('Text content (required if type=text)'),
      imageUrl: z.string().url().optional().describe('Image URL (required if type=image)'),
      fileUrl: z.string().url().optional().describe('File URL (required if type=file)'),
    },
    async (args) => {
      try {
        const result = await zaloOaClient.sendMessage(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
```

### Pattern 2: Mock Mode Switcher for Zalo OA

```typescript
// src/client.ts
import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, 'mock');

export const zaloOaClient = {
  async sendMessage(args: { userId: string; type: string; text?: string; imageUrl?: string; fileUrl?: string }) {
    // Error scenario: special userId triggers mock error
    if (args.userId === 'invalid_user') {
      throw new McpApiError('210', 'User not found or not a follower', 'zalo_oa', 'Check userId is valid OA follower');
    }

    if (isMockMode('zalo_oa')) {
      const fixture = loadFixture<{ message_id: string; _mock: true }>(join(MOCK_DIR, 'sendMessage.json'));
      return {
        success: true,
        message_id: fixture.message_id,
        userId: args.userId,
        type: args.type,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set ZALO_OA_SANDBOX=true');
  },
};
```

### Pattern 3: Zalo OA Token Refresh Tool

This tool is unique — it reads `ZALO_OA_REFRESH_TOKEN` from env (no tool param) and returns a new `access_token`. In mock mode it returns a deterministic token without network calls.

```typescript
// src/tools/refreshToken.ts
export function register(server: McpServer): void {
  server.tool(
    'zalo_oa_refresh_token',
    'Refresh the Zalo OA access token using the refresh token from environment. Call this when other Zalo OA tools return token-expired errors.',
    {}, // No params — credentials come from env only
    async () => {
      try {
        const result = await zaloOaClient.refreshToken();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
```

### Pattern 4: MOCK_DEVIATIONS.md for ViettelPay

```markdown
# ViettelPay Mock Deviations

This server is mock-only. All API behavior is assumed. This file documents every
assumption made when building the mock responses.

| Field | Assumed Value | Source | Confidence | Note |
|-------|---------------|--------|------------|------|
| Auth scheme | HMAC-SHA256 | Inferred from VN payment API industry pattern (MoMo, ZaloPay) | LOW | Real ViettelPay enterprise API uses SOAP+RSA per giautm/viettelpay Go client |
| Endpoint base URL | https://mtom.viettelpay.vn/vtpay-api | Third-party reference | LOW | Not confirmed from official docs |
| Error code for success | '00' | Matches VN_ERROR_CODES stub in error-codes.ts | LOW | Assumed, not confirmed |
| Error code for insufficient balance | '06' | Matches VN_ERROR_CODES stub in error-codes.ts | LOW | Assumed |
| transactionId format | 10-digit numeric | Inferred from MoMo/ZaloPay patterns | LOW | Not confirmed |
...
```

### Anti-Patterns to Avoid

- **No isMockMode check in refreshToken (real API branch):** The refresh token tool must always work in mock mode. Real API implementation throws clearly: `throw new Error('Real API not implemented — set ZALO_OA_SANDBOX=true')`.
- **Storing credentials in tool args:** `zalo_oa_refresh_token` takes zero params — the refresh token stays in env, never in Claude's context or logs.
- **Inventing ViettelPay field behavior:** Every field must have a row in MOCK_DEVIATIONS.md. No field can be added "because it makes sense" without documenting the assumption source.
- **Sharing error code logic across servers:** ViettelPay error codes are already stubbed in `packages/shared/src/errors/error-codes.ts` under `'viettelpay'` key — add new codes there, not in server code.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC signing | Custom crypto code | `signHmacSha256()` from `@vn-mcp/shared` | Already battle-tested across MoMo, ZaloPay |
| Mock mode detection | `process.env.ZALO_OA_SANDBOX === 'true'` inline | `isMockMode('zalo_oa')` | Consistent pattern; handles edge cases |
| Test fixture loading + mock injection | `JSON.parse(readFileSync(...))` inline | `loadFixture(path)` | Automatically injects `_mock: true` |
| Error formatting | `return { isError: true, content: [...] }` inline | `formatToolError(err)` | MCP-compliant; consistent error shape |
| Test client setup | `InMemoryTransport` manual wiring | `createTestClient(server)` + `callTool(client, name, args)` | Established pattern from Phases 2 & 3 |
| Tool name validation | Manual regex | `validateToolName()` | Already handles `zalo_oa_send_message` format |

**Key insight:** Phases 2 and 3 validated every shared utility. Phase 4 should import and use them without modification. Any need to change shared utilities is a signal to re-examine the approach.

---

## Zalo OA API Reference (MEDIUM confidence)

### Base URLs

| Domain | Base URL |
|--------|----------|
| OpenAPI (tools) | `https://openapi.zalo.me/v3.0/oa/` |
| OAuth (token) | `https://oauth.zaloapp.com/v4/oa/` |

### Endpoints (MEDIUM confidence — multiple SDK sources cross-referenced)

| Tool | Method | Path | Auth Header |
|------|--------|------|-------------|
| Send message | POST | `/v3.0/oa/message/{messageType}` | `access_token: <token>` |
| Get follower profile | GET | `/v3.0/oa/getprofile?user_id=<id>` | `access_token: <token>` |
| List followers | GET | `/v3.0/oa/getfollowers?offset=0&count=50` | `access_token: <token>` |
| Refresh token | POST | `/v4/oa/access_token` (oauth domain) | `secret_key: <app_secret>` in header |

### Send Message Request Body (MEDIUM confidence)

```json
// Text message
{
  "recipient": { "user_id": "USER_ID" },
  "message": { "text": "Hello" }
}

// Image message (consulting type)
{
  "recipient": { "user_id": "USER_ID" },
  "message": {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "media",
        "elements": [{ "media_type": "image", "url": "IMAGE_URL" }]
      }
    }
  }
}
```

**Discretion note:** The exact request body for image/file messages at v3.0 is not confirmed from official docs (inaccessible to web crawlers). The mock implementation only needs to simulate the behavior, not the exact wire format. The `type` parameter in the MCP tool maps to the appropriate real-API message type internally.

### Token Refresh Request (HIGH confidence — multiple sources agree)

```
POST https://oauth.zaloapp.com/v4/oa/access_token
Header: secret_key: <ZALO_OA_APP_SECRET>
Content-Type: application/x-www-form-urlencoded

Body:
  refresh_token=<ZALO_OA_REFRESH_TOKEN>
  app_id=<ZALO_OA_APP_ID>
  grant_type=refresh_token
```

Response:
```json
{
  "access_token": "new_access_token",
  "refresh_token": "new_refresh_token",
  "expires_in": 3600
}
```

Key constraint: **A refresh token can only be used once** (validity 3 months). After refresh, both the new access_token AND new refresh_token must be returned to Claude Code so it can update its env knowledge.

---

## ViettelPay Real API Findings (LOW confidence — for MOCK_DEVIATIONS.md)

A Go third-party client (`giautm/viettelpay`) reveals the real ViettelPay enterprise API uses:
- **SOAP protocol** (not REST JSON)
- **RSA asymmetric crypto** (partner private key + Viettel public key)
- **Username/password/serviceCode** authentication envelope
- **Gzip-compressed JSON** payloads

This confirms ViettelPay has no simple REST+HMAC pattern like MoMo. The mock server's decision to use REST+HMAC is purely an internal convention — MOCK_DEVIATIONS.md must prominently document this as a LOW confidence assumption diverging from the known real API architecture.

**For the mock, use:**
- Partner code / secret key credentials (simplified vs. real RSA key pairs)
- Standard JSON request/response (not SOAP)
- HMAC-SHA256 signature scheme (consistent with other mock servers)
- Error codes `'00'` (success) and `'06'` (insufficient balance) — already in VN_ERROR_CODES

---

## Common Pitfalls

### Pitfall 1: Zalo OA Token in Tool Params
**What goes wrong:** Developer passes `access_token` as a tool parameter, exposing it in Claude's context and logs.
**How to avoid:** Access token is read from `ZALO_OA_ACCESS_TOKEN` env var inside `credentials.ts`. Tool schemas have zero credential fields.
**Decision already locked:** Per 04-CONTEXT.md, all 4 env vars are environment-only.

### Pitfall 2: isMockMode('zalo_oa') vs isMockMode('ZALO_OA')
**What goes wrong:** `isMockMode` converts the service name to uppercase: `${service.toUpperCase()}_SANDBOX`. So `isMockMode('zalo_oa')` checks `ZALO_OA_SANDBOX`. But if you pass `'zalo-oa'`, it checks `ZALO-OA_SANDBOX` which is an invalid env var name on some shells.
**How to avoid:** Always use snake_case: `isMockMode('zalo_oa')` → checks `ZALO_OA_SANDBOX`.

### Pitfall 3: vitest script env var naming
**What goes wrong:** The `package.json` test script must set the right env var. MoMo uses `MOMO_SANDBOX=true vitest run`. For Zalo OA, it must be `ZALO_OA_SANDBOX=true vitest run`.
**How to avoid:** Verify the test script in `package.json` matches the env var `isMockMode` will read.

### Pitfall 4: ViettelPay MOCK_DEVIATIONS.md Missing Fields
**What goes wrong:** Mock response has fields not documented in MOCK_DEVIATIONS.md. Future developers can't tell what's assumed vs. verified.
**How to avoid:** Write MOCK_DEVIATIONS.md first, before implementing `client.ts`. Every mock response field must have a corresponding row.

### Pitfall 5: Zalo OA Error Code Mapping Missing
**What goes wrong:** `packages/shared/src/errors/error-codes.ts` has no `zalo_oa` key. `translateErrorCode('zalo_oa', '210')` returns undefined, breaking structured error responses.
**How to avoid:** Add `zalo_oa` section to `VN_ERROR_CODES` in the same task that implements the server. Known codes from research: `210` (user not found), `400` (invalid access token).

### Pitfall 6: Root README Not Written Last
**What goes wrong:** Root README is written before all servers are complete, causing inconsistent tool counts or outdated info.
**How to avoid:** Root README is the final deliverable of the phase, written after all 5 servers' individual READMEs exist.

---

## Code Examples

### credentials.ts for Zalo OA

```typescript
// Source: established pattern from mcp-momo-vn/src/credentials.ts
export type ZaloOaCredentials = {
  appId: string;
  appSecret: string;
  accessToken: string;
  refreshToken: string;
};

export function getZaloOaCredentials(): ZaloOaCredentials {
  return {
    appId: process.env.ZALO_OA_APP_ID ?? 'demo_app_id',
    appSecret: process.env.ZALO_OA_APP_SECRET ?? 'demo_app_secret',
    accessToken: process.env.ZALO_OA_ACCESS_TOKEN ?? 'demo_access_token',
    refreshToken: process.env.ZALO_OA_REFRESH_TOKEN ?? 'demo_refresh_token',
  };
}
```

### Mock follower fixture (listFollowers.json)

```json
{
  "followers": [
    {
      "user_id": "3512267360915248000",
      "display_name": "Nguyễn Văn A",
      "avatar": "https://s120-ava-talk.zadn.vn/placeholder/avatar1.jpg",
      "user_gender": 1,
      "user_id_by_app": "app_user_001"
    },
    {
      "user_id": "6523148079241364992",
      "display_name": "Trần Thị B",
      "avatar": "https://s120-ava-talk.zadn.vn/placeholder/avatar2.jpg",
      "user_gender": 2,
      "user_id_by_app": "app_user_002"
    },
    {
      "user_id": "7841523096385710080",
      "display_name": "Lê Văn C",
      "avatar": "https://s120-ava-talk.zadn.vn/placeholder/avatar3.jpg",
      "user_gender": 1,
      "user_id_by_app": "app_user_003"
    }
  ],
  "total": 3,
  "offset": 0,
  "_mock": true
}
```

### Integration test pattern for Zalo OA

```typescript
// Source: established pattern from mcp-momo-vn integration.test.ts
process.env.ZALO_OA_SANDBOX = 'true';

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../tools/index.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let client: Client;

beforeAll(async () => {
  const server = new McpServer({ name: 'mcp-zalo-oa', version: '0.0.1' });
  registerAll(server);
  client = await createTestClient(server);
});

function parseResult(result: { isError?: boolean; content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text);
}
```

### .mcp.json entries to add

```json
"zalo-oa": {
  "command": "node",
  "args": ["./servers/mcp-zalo-oa/build/index.js"],
  "env": {
    "ZALO_OA_SANDBOX": "true",
    "ZALO_OA_APP_ID": "demo_app_id",
    "ZALO_OA_APP_SECRET": "demo_app_secret",
    "ZALO_OA_ACCESS_TOKEN": "demo_access_token",
    "ZALO_OA_REFRESH_TOKEN": "demo_refresh_token"
  }
},
"viettel-pay": {
  "command": "node",
  "args": ["./servers/mcp-viettel-pay/build/index.js"],
  "env": {
    "VIETTELPAY_SANDBOX": "true",
    "VIETTEL_PAY_PARTNER_CODE": "VTPAY_DEMO",
    "VIETTEL_PAY_SECRET_KEY": "demo_secret_key_vtpay",
    "VIETTEL_PAY_ENDPOINT": "https://sandbox.viettelpay.vn/vtpay-api"
  }
}
```

**Note on isMockMode for ViettelPay:** `isMockMode('viettelpay')` checks `VIETTELPAY_SANDBOX`. But the `.mcp.json` env var convention from other servers (MOMO_SANDBOX, ZALOPAY_SANDBOX) suggests the env var should match the service string. Verify: `isMockMode('viettelpay')` → `VIETTELPAY_SANDBOX`. The `.mcp.json` entry must use `VIETTELPAY_SANDBOX: "true"` — not `VIETTEL_PAY_SANDBOX`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Proactive token refresh timer in server | Stateless: Claude Code calls refresh_token tool when needed | Phase 4 decision (04-CONTEXT.md) | Simpler server; Claude Code drives the refresh loop |
| Generic HMAC utility for all gateways | Per-server signature functions | Phase 1 PITFALLS.md | Phase 4 inherits: ViettelPay gets its own signatures.ts even though mock |
| Mock mode as afterthought | Mock mode as primary mode | Phase 1 decision | Phase 4 inherits: ViettelPay is permanently mock-only in Phase 4 |

**Deprecated/outdated:**
- Zalo OA v2.0 API (`openapi.zalo.me/v2.0/oa/`): v3.0 is current. Research found Postman references to v2.0 — use v3.0 endpoint paths for mock URL construction.

---

## Documentation Deliverables

### CLAUDE.md per server — Structure

```markdown
# mcp-{server} — Claude Code Context

## What This Server Does
[1-2 sentences]

## Tools
| Tool | Description |
|------|-------------|
| {tool_name} | {one-liner from tool description} |

## Required Environment Variables
| Variable | Description | Mock Fallback |
|----------|-------------|---------------|
| {VAR} | {purpose} | {fallback value} |

## Enabling Mock Mode
Set {SERVICE}_SANDBOX=true in your .mcp.json env block.

## Common Workflows
### Workflow: Send a message to a follower
1. `zalo_oa_list_followers` — get userId
2. `zalo_oa_send_message` with userId + type + content

### Workflow: Handle expired token
1. `zalo_oa_refresh_token` — returns new access_token and refresh_token
2. Update ZALO_OA_ACCESS_TOKEN and ZALO_OA_REFRESH_TOKEN in environment
```

### README.md per server — Structure

```markdown
# mcp-{server}

[One-line description]

## Quick Start (5 lines)
1. `npm install` from monorepo root
2. Configure env vars in `.mcp.json`
3. Add server entry to `.mcp.json`
4. `npm test` to verify

## Tools Reference
[All tools with params and return values]

## Environment Variables
[All env vars with descriptions]

## Mock Mode
[How mock mode works, what mock data looks like]
```

### Root README.md — Structure

```markdown
# Vietnamese MCP Server Collection

The first collection of MCP servers for Vietnamese fintech and messaging APIs.
Plug into Claude Code and interact with Vietnam's major payment gateways and
messaging platforms with zero integration boilerplate.

## Servers
| Server | Description | Tools |
|--------|-------------|-------|
| mcp-momo-vn | MoMo e-wallet payments | 4 |
| mcp-zalopay-vn | ZaloPay payments | 4 |
| mcp-vnpay | VNPAY payment gateway | 3 |
| mcp-zalo-oa | Zalo Official Account messaging | 4 |
| mcp-viettel-pay | ViettelPay payments (mock) | 3 |

[Links to per-server READMEs]

## Quick Start
[copy-paste .mcp.json block with all 5 servers]
```

### Retroactive CLAUDE.md and README.md for Phase 2 & 3 servers

INFRA-07 and INFRA-08 apply to all 5 servers. MoMo, ZaloPay, and VNPAY currently have no CLAUDE.md or README.md files (confirmed: `ls` shows no such files in their directories). Phase 4 must create them retroactively.

---

## Open Questions

1. **Zalo OA exact message type paths at v3.0**
   - What we know: Send message endpoint is `POST /v3.0/oa/message/{messageType}`. The `messageType` URL segment may be `cs` (consulting), `transaction`, or similar.
   - What's unclear: Whether the URL has a messageType segment or it's a body field. ChickenAI/zalo-node-oa shows `/v3.0/oa/message/{messageType}`.
   - Recommendation: Since this is mock-only in Phase 4, the mock client doesn't make real HTTP calls. Document the assumed endpoint URL in MOCK_DEVIATIONS-style inline comments in client.ts. If/when real API is needed, this is a single-field fix.

2. **ViettelPay endpoint URL for sandbox**
   - What we know: Real API is SOAP+RSA. No public REST sandbox URL found.
   - What's unclear: Whether any sandbox exists at all.
   - Recommendation: Use `https://sandbox.viettelpay.vn/vtpay-api` as a placeholder in credentials.ts. Document as 'assumed' in MOCK_DEVIATIONS.md. The endpoint is never called in mock mode.

3. **Zalo OA error code table**
   - What we know: Code `210` appears in multiple sources as "user not found or not a follower." Code `400` appears as "invalid access token."
   - What's unclear: Comprehensive error code table from official docs.
   - Recommendation: Add `zalo_oa` key to `VN_ERROR_CODES` with these two codes. Mark as LOW confidence. Additional codes can be added when real API is tested.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^3.2.4 (workspace-level, inherits from root vitest.config.ts) |
| Config file | `servers/mcp-zalo-oa/vitest.config.ts` and `servers/mcp-viettel-pay/vitest.config.ts` (to be created, mirrors existing pattern) |
| Quick run command (per server) | `cd servers/mcp-zalo-oa && ZALO_OA_SANDBOX=true vitest run` |
| Full suite command | `npm test` from monorepo root (runs all workspace tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ZLOA-01 | `zalo_oa_send_message` returns `_mock:true` with messageId | integration | `ZALO_OA_SANDBOX=true vitest run --project mcp-zalo-oa` | ❌ Wave 0 |
| ZLOA-01 | Error path: `userId='invalid_user'` returns `isError:true` | integration | same | ❌ Wave 0 |
| ZLOA-02 | `zalo_oa_get_follower_profile` returns profile with `_mock:true` | integration | same | ❌ Wave 0 |
| ZLOA-03 | `zalo_oa_list_followers` returns paginated list with `_mock:true` | integration | same | ❌ Wave 0 |
| ZLOA-04 | `zalo_oa_refresh_token` returns mock token with `_mock:true` | integration | same | ❌ Wave 0 |
| ZLOA-05 | Mock mode active when `ZALO_OA_SANDBOX=true` (all tools succeed) | integration | same | ❌ Wave 0 |
| VTPAY-01 | `viettel_pay_create_payment` returns `_mock:true` with payment URL | integration | `VIETTELPAY_SANDBOX=true vitest run --project mcp-viettel-pay` | ❌ Wave 0 |
| VTPAY-01 | Error path: `amount=99999999` returns `isError:true` | integration | same | ❌ Wave 0 |
| VTPAY-02 | `viettel_pay_query_status` returns status with `_mock:true` | integration | same | ❌ Wave 0 |
| VTPAY-03 | `viettel_pay_refund` returns refund result with `_mock:true` | integration | same | ❌ Wave 0 |
| INFRA-07 | CLAUDE.md exists in all 5 server directories | file existence | `ls servers/*/CLAUDE.md` | ❌ Wave 0 |
| INFRA-08 | README.md exists in all 5 server directories | file existence | `ls servers/*/README.md` | ❌ Wave 0 |
| INFRA-09 | All 5 server integration tests pass | integration | `npm test` | ❌ Wave 0 (new servers) |

### Sampling Rate

- **Per task commit:** Run only the server under construction: `ZALO_OA_SANDBOX=true vitest run` (in the server directory)
- **Per wave merge:** `npm test` from monorepo root (all 5 servers + shared package)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `servers/mcp-zalo-oa/src/__tests__/integration.test.ts` — covers ZLOA-01 through ZLOA-05
- [ ] `servers/mcp-zalo-oa/vitest.config.ts` — mirrors existing pattern
- [ ] `servers/mcp-viettel-pay/src/__tests__/integration.test.ts` — covers VTPAY-01 through VTPAY-04
- [ ] `servers/mcp-viettel-pay/vitest.config.ts` — mirrors existing pattern
- [ ] All test infrastructure files are created as part of server scaffold tasks (not separate Wave 0 tasks), following Phase 2 & 3 precedent where tests are created alongside the server

---

## Sources

### Primary (HIGH confidence)

- Existing codebase: `servers/mcp-momo-vn/`, `servers/mcp-zalopay-vn/`, `servers/mcp-vnpay/` — established patterns verified by working tests
- `packages/shared/src/mock-engine/isMockMode.ts` — confirms `isMockMode('zalo_oa')` → `ZALO_OA_SANDBOX`; `isMockMode('viettelpay')` → `VIETTELPAY_SANDBOX`
- `packages/shared/src/errors/error-codes.ts` — confirms `viettelpay` key already exists with `'00'` and `'06'`; `zalo_oa` key absent (must be added)
- `.planning/phases/04-zalo-oa-viettelpay-servers/04-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)

- [ChickenAI/zalo-node-oa](https://github.com/ChickenAI/zalo-node-oa) — Zalo OA v3.0 endpoint paths: `/v3.0/oa/message/{messageType}`, `/v3.0/oa/getprofile`, `/v3.0/oa/getfollowers`
- Multiple WebSearch results cross-confirmed: Zalo OA token refresh at `oauth.zaloapp.com/v4/oa/access_token`, `secret_key` in header, `app_id`+`refresh_token`+`grant_type=refresh_token` in body
- Access token TTL: `expires_in: 3600` (1 hour) — confirmed by 3+ independent sources (search results, n8n workflow references, beehexa tutorial)
- Refresh token TTL: 3 months, single-use — confirmed from search result

### Tertiary (LOW confidence)

- [giautm/viettelpay Go package](https://pkg.go.dev/giautm.dev/viettelpay) — Real ViettelPay uses SOAP+RSA. Used only to populate MOCK_DEVIATIONS.md "real API contrast" rows.
- ViettelPay error codes `'00'`/`'06'` — from VN_ERROR_CODES stub already in codebase; original source not traceable
- ViettelPay endpoint URL `https://sandbox.viettelpay.vn/vtpay-api` — assumed placeholder, not from official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all tools verified across 3 prior servers
- Zalo OA architecture: HIGH — token pattern is locked by 04-CONTEXT.md; tool structure follows template
- Zalo OA exact API: MEDIUM — endpoint paths cross-verified via multiple SDKs; body structures inferred for mock
- ViettelPay: LOW — no public REST API docs; real API uses SOAP+RSA (not REST+HMAC); mock is fully assumed
- Documentation structure: HIGH — CLAUDE.md/README.md structure derived from context decisions + 3 existing server patterns

**Research date:** 2026-03-18
**Valid until:** 2026-06-18 (Zalo OA v3.0 API is stable; ViettelPay findings unlikely to change since mock-only)
