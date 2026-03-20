# Architecture Research

**Domain:** Hosted MCP Gateway Platform — Vietnamese Fintech SaaS (v1.1)
**Researched:** 2026-03-21
**Confidence:** HIGH (MCP SDK source verified, official transport docs, existing codebase inspected)

---

## What Changed: v1.0 vs v1.1

v1.0 was a local stdio monorepo — each server runs as a subprocess in Claude Code. v1.1 adds a cloud layer: a Cloudflare Workers gateway that hosts all 5 MCP servers over HTTP, with auth, metering, and billing layered on top.

The 5 existing servers are **not rewritten**. Their tool logic, schemas, client.ts, and mock engine are unchanged. The gateway wraps them at the transport layer.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Claude Code (MCP Client)                           │
│                  connects via: npx mcp-momo-vn (stdio, free)                │
│                           OR: https://api.vn-mcp.com/mcp/momo (HTTP, paid)  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │  HTTP POST/GET (Streamable HTTP transport)
                                    │  Authorization: Bearer <api-key>
                                    │  MCP-Protocol-Version: 2025-03-26
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers — mcp-gateway                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Hono.js Router                                │   │
│  │   POST /mcp/:server  ─── auth middleware ─── rate limit middleware    │   │
│  │   GET  /mcp/:server  ─── auth middleware ─── SSE stream handler       │   │
│  │   POST /webhooks/stripe                                                │   │
│  │   POST /webhooks/momo                                                  │   │
│  └──────────┬───────────────────────────────────────────────────────────┘   │
│             │                                                                │
│  ┌──────────▼───────────────────────────────────────────────────────────┐   │
│  │                      Request Handler Pipeline                          │   │
│  │                                                                        │   │
│  │  1. Extract Bearer token from Authorization header                     │   │
│  │  2. Validate API key → Supabase (cached in KV for 60s)                 │   │
│  │  3. Resolve tier + rate limit from cached key metadata                 │   │
│  │  4. Route to correct McpServer instance (by :server param)             │   │
│  │  5. Hand request to WebStandardStreamableHTTPServerTransport           │   │
│  │  6. Fire-and-forget: POST usage event to Tinybird                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ McpServer│  │ McpServer│  │McpServer│  │ McpServer│  │  McpServer   │   │
│  │  momo   │  │ zalopay  │  │  vnpay  │  │ zalo-oa  │  │ viettel-pay  │   │
│  │(in-mem) │  │ (in-mem) │  │(in-mem) │  │ (in-mem) │  │  (in-mem)    │   │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └────┬─────┘  └──────┬───────┘   │
│       │            │             │             │               │            │
│  ┌────▼────────────▼─────────────▼─────────────▼───────────────▼──────┐    │
│  │             packages/shared (mock-engine, errors, hmac)              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐  ┌───────────────────┐  ┌──────────────────────────┐
│   Supabase       │  │    Tinybird        │  │   Stripe / MoMo          │
│   ─────────      │  │    ────────        │  │   ─────────────          │
│  users table     │  │  api_calls DS      │  │  Webhooks → tier update  │
│  api_keys table  │  │  /events endpoint  │  │  Subscription upsert     │
│  subscriptions   │  │  (real-time OLAP)  │  │  in Supabase             │
└─────────────────┘  └───────────────────┘  └──────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │   npm / Mintlify / Landing page        │
                    │   ──────────────────────────────       │
                    │  npm publish (5 packages, free tier)   │
                    │  docs.vn-mcp.com (Mintlify)            │
                    │  vn-mcp.com (marketing, pricing)       │
                    └──────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `workers/mcp-gateway` | HTTP entry point, auth, routing, metering dispatch | Hono.js on Cloudflare Workers (new package) |
| `workers/mcp-gateway/middleware/auth.ts` | Validate Bearer API key via Supabase, cache in KV | Reads `api_keys` table; 60s KV cache |
| `workers/mcp-gateway/middleware/rateLimit.ts` | Enforce per-tier call limits (req/min) | Cloudflare KV counters, sliding window |
| `workers/mcp-gateway/router.ts` | Map `:server` path param to McpServer instance | Static map; servers pre-instantiated at Worker startup |
| `workers/mcp-gateway/metering.ts` | Fire-and-forget POST to Tinybird Events API | `ctx.waitUntil(fetch(...))` — non-blocking |
| `workers/mcp-gateway/webhooks/stripe.ts` | Handle Stripe subscription lifecycle | Verify signature, upsert `subscriptions` in Supabase |
| `workers/mcp-gateway/webhooks/momo.ts` | Handle MoMo payment confirmation | Verify HMAC, upsert subscription record |
| Existing `servers/mcp-*` | All tool logic — unchanged | Only transport wiring changes (stdio → shared in-memory) |
| `packages/shared` | HMAC signing, errors, mock-engine — unchanged | No changes needed for gateway |
| Supabase Postgres | Users, API keys, subscriptions, tier metadata | Managed Postgres + Row Level Security |
| Supabase Auth | User identity (signup, login, JWT) | Used by dashboard/landing page; gateway uses API keys only |
| Cloudflare KV | API key cache (60s TTL) + rate limit counters | Avoids Supabase round-trip on every request |
| Tinybird | Real-time usage analytics per API key | ClickHouse-backed Events API |
| Stripe | USD subscription billing + webhook lifecycle | Webhooks update Supabase subscription rows |
| MoMo Payment (as billing) | VND subscription billing (domestic users) | MoMo `momo_create_payment` tool re-used for self-billing |

---

## New Package / Directory Layout

The existing monorepo gains one new workspace and one new package:

```
vietnamese-mcp/
├── package.json                   # workspaces: ["packages/*", "servers/*", "workers/*"]
│                                  # ADD workers/* to workspaces
│
├── packages/
│   └── shared/                    # UNCHANGED — no modifications needed
│
├── servers/
│   ├── mcp-momo-vn/               # UNCHANGED — tool logic intact
│   ├── mcp-zalopay-vn/            # UNCHANGED
│   ├── mcp-vnpay/                 # UNCHANGED
│   ├── mcp-zalo-oa/               # UNCHANGED
│   └── mcp-viettel-pay/           # UNCHANGED
│
├── workers/
│   └── mcp-gateway/               # NEW — Cloudflare Workers entry point
│       ├── package.json           # name: "@vn-mcp/mcp-gateway"; wrangler scripts
│       ├── wrangler.toml          # CF Worker config: routes, KV bindings, env vars
│       ├── tsconfig.json          # extends ../../tsconfig.base.json; target: "ES2022"
│       └── src/
│           ├── index.ts           # Hono app + CF Worker export default fetch
│           ├── router.ts          # /mcp/:server routes; server registry map
│           ├── serverRegistry.ts  # Pre-instantiate all 5 McpServer instances
│           ├── middleware/
│           │   ├── auth.ts        # Bearer token → Supabase lookup → KV cache
│           │   └── rateLimit.ts   # Per-tier sliding window via KV
│           ├── metering.ts        # Tinybird Events API fire-and-forget
│           └── webhooks/
│               ├── stripe.ts      # Stripe webhook handler
│               └── momo.ts        # MoMo payment callback handler
│
├── apps/
│   └── dashboard/                 # NEW (optional v1.1 scope) — API key management UI
│       ├── package.json           # Astro or Next.js; connects to Supabase Auth
│       └── src/
│
├── supabase/
│   ├── migrations/                # NEW — SQL migration files
│   │   ├── 001_users.sql
│   │   ├── 002_api_keys.sql
│   │   └── 003_subscriptions.sql
│   └── seed.sql
│
└── .planning/                     # Existing planning docs
```

---

## MCP Transport: How Streamable HTTP Works with Cloudflare Workers

This is the most critical technical integration point. The MCP SDK (v1.27+, as used) ships `WebStandardStreamableHTTPServerTransport` — verified in the installed node_modules — which uses Web Standard APIs (`Request`, `Response`, `ReadableStream`) and runs natively on Cloudflare Workers without any Node.js shim.

**How the transport handles requests:**

```
Client POST /mcp/momo
  Body: { jsonrpc: "2.0", method: "tools/call", ... }
  Headers: Authorization: Bearer <key>
           Accept: application/json, text/event-stream
           MCP-Protocol-Version: 2025-03-26
           Mcp-Session-Id: <session-id or absent on init>
                 │
                 ▼
         Hono auth middleware
         → validate Bearer token
         → KV cache hit/miss
         → resolve tier
                 │
                 ▼
         transport.handleRequest(c.req.raw)
         → WebStandardStreamableHTTPServerTransport
         → routes to correct McpServer (momo instance)
         → McpServer invokes registered tool handler
         → tool returns { content: [{ type: "text", ... }] }
                 │
                 ├── simple call → returns application/json response
                 └── streaming call → returns text/event-stream SSE response
                       (Worker SSE: ReadableStream + TransformStream, CF-native)
```

**Key facts verified from MCP SDK source (`webStandardStreamableHttp.d.ts`):**

1. `WebStandardStreamableHTTPServerTransport` explicitly supports Cloudflare Workers — listed in its own docstring alongside Node.js 18+, Deno, and Bun.
2. Hono usage example is in the SDK docstring: `app.all('/mcp', async (c) => transport.handleRequest(c.req.raw))`.
3. The transport handles both GET (standalone SSE stream) and POST (JSON-RPC request) on the same endpoint.
4. **Stateless mode** (`sessionIdGenerator: undefined`) is recommended for the gateway. Sessions add in-memory state that doesn't survive Worker cold starts or cross-instance routing. Stateless mode means each Worker invocation is self-contained.
5. SSE streaming works on Cloudflare Workers via `ReadableStream` — CF Workers support long-lived streaming responses. The platform's CPU time limit is per-request, not wall-clock, so tool executions that return quickly are fine. (Note: CF's 30s HTTP response timeout applies to non-Enterprise plans — tool calls must complete within 30s.)

**Server instance strategy:**

Each McpServer is instantiated once in `serverRegistry.ts` at Worker module evaluation time (module-level scope, not per-request). Cloudflare Workers reuse the same module instance across requests within a Worker instance. This means:
- All 5 McpServer instances share one Worker module
- No cold-start tool registration overhead after first request
- Per-request: only auth check + transport.handleRequest() + metering

```typescript
// workers/mcp-gateway/src/serverRegistry.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAll as registerMomo } from '@vn-mcp/mcp-momo-vn/tools';
import { registerAll as registerZaloPay } from '@vn-mcp/mcp-zalopay-vn/tools';
// ... all 5

export const servers: Record<string, McpServer> = {};

function createServer(name: string, version: string, registerFn: (s: McpServer) => void) {
  const s = new McpServer({ name, version });
  registerFn(s);
  return s;
}

servers['momo'] = createServer('mcp-momo-vn', '1.1.0', registerMomo);
servers['zalopay'] = createServer('mcp-zalopay-vn', '1.1.0', registerZaloPay);
servers['vnpay'] = createServer('mcp-vnpay', '1.1.0', registerVnpay);
servers['zalo-oa'] = createServer('mcp-zalo-oa', '1.1.0', registerZaloOa);
servers['viettel-pay'] = createServer('mcp-viettel-pay', '1.1.0', registerViettelPay);
```

**Required change to existing servers:** The current `index.ts` in each server bundles both tool registration AND transport connection (stdio). For the gateway, only the `registerAll` function is needed — the transport is provided by the gateway. This means each server's `tools/index.ts` (which already exports `registerAll`) can be imported directly. The server `index.ts` files are unchanged; the gateway just doesn't use them.

---

## Data Flow: Full Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. CLIENT REQUEST                                                           │
│     Claude Code → POST https://api.vn-mcp.com/mcp/momo                     │
│     Headers: Authorization: Bearer vnmcp_sk_abc123                          │
│              Accept: application/json, text/event-stream                     │
│              MCP-Protocol-Version: 2025-03-26                                │
│     Body: { jsonrpc: "2.0", id: 1, method: "tools/call",                    │
│             params: { name: "momo_create_payment", arguments: {...} } }      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. AUTH MIDDLEWARE (auth.ts)                                                │
│     a. Extract token: "vnmcp_sk_abc123"                                     │
│     b. KV.get("apikey:vnmcp_sk_abc123") → HIT: { userId, tier, rateLimit } │
│        or MISS → SELECT * FROM api_keys WHERE key_hash = sha256(token)      │
│                → store in KV with 60s TTL                                    │
│     c. Verify is_active = true, not expired                                 │
│     d. Attach { userId, tier } to request context                           │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. RATE LIMIT MIDDLEWARE (rateLimit.ts)                                    │
│     KV.get("ratelimit:vnmcp_sk_abc123:minute") → current count             │
│     If count >= tier.requests_per_minute → return 429                       │
│     Else → KV atomic increment (1-minute sliding window)                    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. ROUTER (router.ts)                                                      │
│     :server param = "momo" → servers['momo'] (pre-instantiated McpServer)  │
│     Create new WebStandardStreamableHTTPServerTransport({ stateless })     │
│     server.connect(transport)                                                │
│     response = await transport.handleRequest(c.req.raw)                     │
│     → McpServer validates JSON-RPC envelope                                 │
│     → routes to registered tool "momo_create_payment"                       │
│     → tool handler runs (mock mode: loads fixture, real mode: HTTP to MoMo) │
│     → returns { content: [{ type: "text", text: JSON.stringify(result) }] } │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. METERING (metering.ts) — non-blocking                                   │
│     ctx.waitUntil(                                                           │
│       fetch("https://api.tinybird.co/v0/events?name=api_calls", {           │
│         method: "POST",                                                      │
│         headers: { Authorization: "Bearer <TB_TOKEN>" },                    │
│         body: JSON.stringify({                                               │
│           api_key_id: keyId,                                                │
│           user_id: userId,                                                  │
│           server: "momo",                                                   │
│           tool: "momo_create_payment",                                      │
│           tier: "starter",                                                  │
│           status: 200,                                                      │
│           latency_ms: 142,                                                  │
│           timestamp: new Date().toISOString()                               │
│         })                                                                   │
│       })                                                                    │
│     )                                                                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. RESPONSE TO CLIENT                                                      │
│     Content-Type: application/json (simple tools)                           │
│     or text/event-stream (streaming, progress notifications)                │
│     Body: { jsonrpc: "2.0", id: 1, result: { content: [...] } }             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Supabase Schema

```sql
-- api_keys: one API key per user-tier (can generate multiple)
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash    TEXT NOT NULL UNIQUE,   -- sha256(raw_key); raw_key shown once at creation
  key_prefix  TEXT NOT NULL,          -- first 12 chars for display: "vnmcp_sk_abc"
  tier        TEXT NOT NULL DEFAULT 'free',  -- free | starter | pro | business
  is_active   BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ             -- NULL = no expiry
);

-- subscriptions: maps user to paid tier
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier            TEXT NOT NULL DEFAULT 'free',
  provider        TEXT NOT NULL,      -- stripe | momo
  provider_sub_id TEXT,               -- Stripe subscription ID or MoMo order ID
  status          TEXT NOT NULL DEFAULT 'active',  -- active | past_due | canceled
  current_period_end TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only read their own keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own keys" ON api_keys FOR ALL USING (user_id = auth.uid());
```

---

## Stripe + MoMo Billing Flow

```
User upgrades on landing page
    │
    ├── USD path: Stripe Checkout redirect
    │       → Stripe webhook: checkout.session.completed
    │       → workers/webhooks/stripe.ts
    │       → upsert subscriptions (tier=starter, provider=stripe)
    │       → update api_keys SET tier=starter WHERE user_id=X
    │
    └── VND path: MoMo payment link (via hosted momo server)
            → MoMo IPN callback: POST /webhooks/momo
            → workers/webhooks/momo.ts
            → verify HMAC (using @vn-mcp/shared signHmacSha256)
            → upsert subscriptions (tier=starter, provider=momo)
            → update api_keys SET tier=starter WHERE user_id=X
```

Note: The MoMo webhook handler re-uses `signHmacSha256` from `@vn-mcp/shared` — this is a clean reuse of existing code in the gateway.

---

## Build Order (Dependency-Driven)

Phase ordering is dictated by dependencies. Nothing in the gateway can be built before its dependencies exist.

```
PHASE 1: Gateway Foundation
  ├── workers/mcp-gateway/ scaffold (Hono + wrangler.toml)
  ├── Import existing tool registries from servers/* (no server changes)
  ├── WebStandardStreamableHTTPServerTransport wiring (stateless)
  └── Deploy to CF Workers — verify all 5 servers respond to MCP init
      [GATE: MCP tools/list returns correct tools for each :server param]

PHASE 2: Auth + API Keys
  ├── Supabase project + migrations (api_keys, subscriptions tables)
  ├── auth.ts middleware (Bearer → Supabase → KV cache)
  ├── rateLimit.ts (KV sliding window per tier)
  └── API key generation endpoint (POST /keys — internal, called by dashboard)
      [GATE: Authenticated requests pass; invalid keys return 401]

PHASE 3: Metering
  ├── Tinybird workspace + api_calls Data Source schema
  ├── metering.ts (fire-and-forget ctx.waitUntil)
  └── Tinybird Pipe: usage per key per day (query endpoint for dashboard)
      [GATE: Tool calls appear in Tinybird within 5 seconds]

PHASE 4: Billing
  ├── Stripe product + pricing objects (4 tiers)
  ├── webhooks/stripe.ts (checkout.session.completed + invoice.paid)
  ├── MoMo self-payment flow (use existing momo server tools)
  └── webhooks/momo.ts (IPN → tier upgrade)
      [GATE: Test Stripe webhook upgrades api_key tier in Supabase]

PHASE 5: npm Publishing
  ├── Add publishConfig to each server's package.json
  ├── GitHub Actions publish workflow (on release tag)
  └── Test: npx @vn-mcp/mcp-momo-vn works from npm
      [GATE: npm install + .mcp.json stdio usage works end-to-end]

PHASE 6: Landing Page + Docs
  ├── Mintlify docs site (vn-mcp.com/docs)
  ├── Marketing landing page with pricing table
  └── Signup → Supabase Auth → API key generation flow
      [GATE: New user can sign up, get API key, connect Claude Code in <5 min]
```

**Why this order:**
- Phase 1 before Phase 2: Can't auth-protect an endpoint that doesn't exist
- Phase 2 before Phase 3: Metering is keyed by api_key_id which requires auth schema
- Phase 3 before Phase 4: Need usage data before building billing enforcement (quota checks query Tinybird)
- Phase 4 before Phase 5: npm publish is independent but gated on billing being testable
- Phase 5 and Phase 6 can run in parallel; both depend on Phase 4 completion

---

## Architectural Patterns

### Pattern 1: Stateless Transport per Request

**What:** Create a new `WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })` per incoming HTTP request. Connect it to the pre-instantiated McpServer, handle the request, then let the transport go out of scope.
**When to use:** Always for the gateway. Stateful sessions require in-memory state that doesn't survive Worker instance boundaries (requests can be routed to different Worker instances).
**Trade-offs:** No server-initiated notifications across requests. For tool calls (which are request-response), this is fine — MCP server-initiated notifications are not used in this architecture.

```typescript
// workers/mcp-gateway/src/router.ts
import { WebStandardStreamableHTTPServerTransport } from
  '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { servers } from './serverRegistry.js';

export async function handleMcpRequest(c: Context): Promise<Response> {
  const serverName = c.req.param('server');
  const server = servers[serverName];
  if (!server) return c.json({ error: 'Unknown server' }, 404);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // stateless
  });

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
}
```

### Pattern 2: KV Cache for Auth

**What:** Hash the raw API key (sha256) on arrival. Check Cloudflare KV for cached auth result (60s TTL). On miss, query Supabase, then write back to KV.
**When to use:** Every authenticated request — avoids a Supabase round-trip (20-50ms) on every tool call.
**Trade-offs:** 60s window where a revoked key still works. Acceptable for API-key auth (not session tokens). On key revocation, write a tombstone to KV immediately.

```typescript
async function resolveApiKey(env: Env, rawKey: string): Promise<KeyMetadata | null> {
  const keyHash = await sha256(rawKey);
  const cacheKey = `apikey:${keyHash}`;

  const cached = await env.KV.get(cacheKey, 'json');
  if (cached) return cached as KeyMetadata;

  const { data } = await env.SUPABASE.from('api_keys')
    .select('user_id, tier, is_active')
    .eq('key_hash', keyHash)
    .single();

  if (!data || !data.is_active) return null;

  await env.KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 });
  return data;
}
```

### Pattern 3: ctx.waitUntil for Metering

**What:** Wrap the Tinybird event POST in `ctx.waitUntil()`. This lets the Worker return the MCP response immediately while the metering call completes in the background.
**When to use:** All metering and analytics writes. Never block the MCP response on metering.
**Trade-offs:** Metering can fail silently — implement Tinybird's batch endpoint or a queue (Cloudflare Queues) if loss is unacceptable at scale.

```typescript
// workers/mcp-gateway/src/metering.ts
export function recordUsage(ctx: ExecutionContext, event: UsageEvent): void {
  ctx.waitUntil(
    fetch('https://api.tinybird.co/v0/events?name=api_calls', {
      method: 'POST',
      headers: { Authorization: `Bearer ${TINYBIRD_TOKEN}` },
      body: JSON.stringify(event),
    }).catch(() => {/* swallow; metering loss is acceptable */})
  );
}
```

---

## Anti-Patterns

### Anti-Pattern 1: Stateful Sessions in the Gateway

**What people do:** Use `sessionIdGenerator: () => crypto.randomUUID()` in the transport so clients can resume sessions.
**Why it's wrong:** Cloudflare Workers can route the same client to different Worker instances. In-memory session state (stream mappings, message history) is not shared across instances. Session IDs from instance A are unknown to instance B — clients get 404 on reconnect.
**Do this instead:** Use stateless mode. Each POST is an independent operation. If resumability is needed later, implement the `EventStore` interface backed by Cloudflare KV or Durable Objects.

### Anti-Pattern 2: Importing server index.ts in the Gateway

**What people do:** `import { server } from '@vn-mcp/mcp-momo-vn'` — importing the server's `index.ts` which contains `StdioServerTransport` and `server.connect(transport)`.
**Why it's wrong:** `StdioServerTransport` imports Node.js `process.stdin`/`process.stdout`. These don't exist in Cloudflare Workers. The import itself crashes the Worker at module evaluation.
**Do this instead:** Import only `registerAll` from `tools/index.ts`. The gateway constructs its own `McpServer` and connects its own transport. The server's `index.ts` is only used for the npm-published stdio binary.

### Anti-Pattern 3: Raw API Key Storage in Supabase

**What people do:** Store the full API key string in the database for lookup.
**Why it's wrong:** If the database is compromised, all keys are exposed.
**Do this instead:** Store `sha256(raw_key)` in the database. Show the raw key once at creation (in the dashboard response). The gateway receives the raw key in the Authorization header and hashes it locally before the DB lookup. KV cache is keyed by hash, not raw key.

### Anti-Pattern 4: Synchronous Metering Blocking Response

**What people do:** `await fetch(tinybirdUrl, ...)` before returning the MCP response.
**Why it's wrong:** Adds 20-80ms latency to every tool call. Metering failures return 500s to the MCP client.
**Do this instead:** `ctx.waitUntil(fetch(...))` — the Cloudflare runtime guarantees this runs after the response is sent, within the Worker's lifetime.

### Anti-Pattern 5: Per-Request McpServer Instantiation

**What people do:** `const server = new McpServer(...); registerAll(server);` inside the request handler.
**Why it's wrong:** Tool registration calls (`server.tool(...)`) run on every request. With 18 total tools across 5 servers, this is ~18 function calls and closure allocations per request.
**Do this instead:** Instantiate and register tools once at module scope (`serverRegistry.ts`). The Worker module is evaluated once per Worker instance and reused across requests.

---

## Integration Points

### External Services

| Service | Integration Pattern | Auth | Notes |
|---------|---------------------|------|-------|
| Supabase Postgres | `@supabase/supabase-js` client in gateway | `SUPABASE_SERVICE_ROLE_KEY` env var | Service role (bypass RLS) in gateway; client role in dashboard |
| Cloudflare KV | Native CF binding `env.KV` | Bound in wrangler.toml | 60s TTL for auth cache; sliding window for rate limits |
| Tinybird | REST Events API (NDJSON POST) | `Authorization: Bearer <TB_TOKEN>` | Fire-and-forget via ctx.waitUntil; batch up to 1000 events/post |
| Stripe | `stripe` npm package; webhook signature verify | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Webhook verify must happen before body is parsed |
| MoMo (as billing) | Uses existing `@vn-mcp/shared` signHmacSha256 | `MOMO_SECRET_KEY` env var | IPN callback verified with same HMAC logic as MCP tool |

### Internal Boundaries (New)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `mcp-gateway` → `servers/mcp-*/tools/index.ts` | Direct ESM import of `registerAll` | No HTTP; in-process function call |
| `mcp-gateway` → `packages/shared` | Direct ESM import | HMAC signing reused for MoMo webhook verify |
| `mcp-gateway` → Supabase | HTTPS REST via supabase-js | Service role key; keep out of client bundles |
| `servers/mcp-*` (existing) → none | No changes to inter-server communication | Servers remain independent; gateway is the only new consumer |

---

## Cloudflare Workers Constraints to Plan Around

| Constraint | Limit | Impact | Mitigation |
|------------|-------|--------|------------|
| HTTP response timeout | 30s (Workers Bundled plan) | Tool calls must complete in <30s | All tools are currently mock-only (instant); real API calls also <5s |
| CPU time per request | 10ms (Bundled), 30s (Paid) | Crypto (HMAC) is fast; no concern | Use Workers Paid plan ($5/mo) |
| KV eventual consistency | ~1s global propagation | Rate limit counters may slightly over-allow across regions | Acceptable; tier limits are soft quotas, not hard billing caps |
| KV write cost | $0.50/million writes | Rate limit = 1 write per request | At 100k req/day = 3M writes/month = $1.50/month; fine |
| No Node.js built-ins | No `process.stdin`, `fs`, etc. | Cannot import server `index.ts` (uses StdioServerTransport) | Import only `tools/index.ts` — confirmed it has no Node.js deps |
| Module bundle size limit | 25MB uncompressed | 5 MCP servers + shared + Hono is well under this | No action needed |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Single Cloudflare Worker; KV for cache + rate limits; Supabase free tier |
| 1k-10k users | Upgrade Supabase to Pro ($25/mo); add Tinybird Pro for higher event throughput |
| 10k-100k users | Move rate limit counters from KV to Durable Objects (consistent atomic counters); consider API key lookup cache in Durable Objects |
| 100k+ users | Tinybird for metering stays fine (ClickHouse scales horizontally); Supabase connection pooling via pgBouncer (included in Pro+) |

**First bottleneck:** KV rate limit counters are eventually consistent — at very high req/s, a single key can slightly exceed its rate limit across Worker instances. Durable Objects (stateful, co-located compute) solve this but add complexity. At <10k users this is not a real problem.

**Second bottleneck:** Supabase connection limits on the free tier (max 60 connections). At high traffic, use `@supabase/supabase-js` with the REST API (not direct Postgres) — which Supabase's serverless pooler handles automatically.

---

## Sources

- MCP Transports specification — `https://modelcontextprotocol.io/docs/concepts/transports` (fetched 2026-03-21, current)
- MCP SDK `WebStandardStreamableHTTPServerTransport` — verified in local `node_modules/@modelcontextprotocol/sdk@1.27.1` (HIGH confidence)
- MCP SDK `StreamableHTTPServerTransport` docstring — explicitly names Cloudflare Workers as supported runtime (HIGH confidence)
- Existing codebase inspection — `servers/mcp-momo-vn/src/index.ts`, `tools/index.ts`, `packages/shared/src/` (HIGH confidence)
- Cloudflare Workers limits — training data + official docs (MEDIUM confidence; verify CPU time limit for chosen plan)
- Tinybird Events API pattern — training data (MEDIUM confidence; verify NDJSON vs JSON body format against current docs)
- Supabase RLS + service role pattern — training data (HIGH confidence; well-established pattern)

---

*Architecture research for: VN MCP Hub v1.1 — Hosted Gateway Platform*
*Researched: 2026-03-21*
