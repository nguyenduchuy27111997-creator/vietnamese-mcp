# Phase 5: Gateway - Research

**Researched:** 2026-03-21
**Domain:** Cloudflare Workers + Hono + MCP Streamable HTTP transport
**Confidence:** HIGH (SDK source verified in local node_modules, codebase inspected, architecture research cross-referenced)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Per-server routes: `/mcp/momo`, `/mcp/zalopay`, `/mcp/vnpay`, `/mcp/zalo-oa`, `/mcp/viettel-pay`
- Each route is a standalone MCP Streamable HTTP endpoint
- Base domain: `api.mcpvn.dev` (requires mcpvn.dev domain purchase + Cloudflare DNS)
- Client configures one URL per server in `.mcp.json` — matches existing local config pattern
- Free tier: MoMo + ZaloPay only (2 servers); Starter: all 5 servers; Pro/Business: all 5 servers
- Free-tier user hitting restricted server: return MCP JSON-RPC error (code -32001) with upgrade link and tier info — not HTTP 403
- Per-connection McpServer instantiation (stateless, no shared state between requests)
- Gateway lives in `apps/gateway/` — new `apps/` directory for deployable services
- `wrangler.toml` with `usage_model = "unbound"` (mandatory — 10ms CPU limit kills SSE)
- Local dev via `wrangler dev` (closest to production CF Workers behavior)
- Import only `tools/index.ts` from each server (never `index.ts` — StdioServerTransport crashes Workers)
- SSE heartbeat: `: ping` comment every 30 seconds
- Idle connection timeout: 5 minutes (close SSE stream, client can reconnect)
- All errors returned as MCP JSON-RPC format (not plain HTTP errors)

### Claude's Discretion
- Exact Hono middleware structure and ordering
- CORS header specifics (which origins to allow)
- McpServer instantiation pooling strategy (if any)
- Error code numbering for gateway-specific errors
- Wrangler project naming convention

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GATE-01 | All 5 MCP servers accessible via Streamable HTTP transport on a single Cloudflare Workers endpoint | `WebStandardStreamableHTTPServerTransport` verified in local SDK v1.27.1; supports CF Workers natively; Hono routes `app.all('/mcp/:server', ...)` |
| GATE-02 | MCP `tools/list` returns all 18 tools from all 5 servers | Tool inventory confirmed: momo(4) + zalopay(4) + vnpay(3) + zalo-oa(4) + viettel-pay(3) = 18; all `registerAll()` exports verified |
| GATE-03 | Tool calls execute correctly through the gateway and return mock responses | `registerAll()` pattern from existing servers reused; `isMockMode()` works in Workers via env bindings; mock engine in `@vn-mcp/shared` has no Node.js deps |
| GATE-04 | CORS headers allow browser-based MCP clients | Hono CORS middleware (`hono/cors`); OPTIONS preflight handled; specific origins to be determined per discretion |
| GATE-05 | Per-connection McpServer instantiation (stateless, no shared state) | `sessionIdGenerator: undefined` in transport options = stateless mode; new transport per request; McpServer pre-registered at module scope |
</phase_requirements>

---

## Summary

Phase 5 builds `apps/gateway/` — a Cloudflare Workers application using Hono that exposes all 5 existing MCP servers over Streamable HTTP transport. The core integration is well-understood: import `registerAll()` from each server's `tools/index.ts`, instantiate McpServer instances once at module scope, and create a new `WebStandardStreamableHTTPServerTransport` (stateless) per incoming request. The MCP SDK v1.27.1 is already installed in the project and explicitly supports Cloudflare Workers.

The gateway is Phase 5 scope only — no auth, no metering, no billing. Those come in Phases 6-8. This phase delivers: routing by `:server` path parameter, CORS headers, stateless SSE via the Streamable HTTP transport, SSE heartbeat to keep connections alive, and a tier-access stub that returns MCP JSON-RPC error -32001 for free-tier users hitting restricted servers.

The most critical constraint — already decided — is `usage_model = "unbound"` in `wrangler.toml`. Without it, the 10ms CPU limit on Bundled plan terminates any SSE session immediately. The second critical constraint is importing only `tools/index.ts`, never `index.ts`, from each server — `index.ts` imports `StdioServerTransport` which pulls in Node.js `process.stdin`/`process.stdout` and crashes the Worker at module evaluation time.

**Primary recommendation:** Scaffold `apps/gateway/` first, verify the workspace plumbing (`apps/*` in root `package.json` workspaces), confirm Hono + wrangler install cleanly, then wire one server route end-to-end before doing all five. Use `wrangler dev` throughout — never test SSE with Node.js vitest directly.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | 4.x (latest) | HTTP framework for CF Workers | Purpose-built for edge runtimes; `app.all()` for MCP's POST+GET on same endpoint; `hono/cors` for CORS middleware; `hono/streaming` for SSE; ~15KB bundle |
| wrangler | 3.x (latest) | CF Workers CLI — local dev + deploy | Official CF tooling; `wrangler dev` provides KV, D1, DO emulation; `wrangler deploy` for production |
| @cloudflare/workers-types | 4.x | TypeScript types for CF Workers globals | Required — `ExecutionContext`, `KVNamespace`, `Env` are not in `@types/node` |
| @modelcontextprotocol/sdk | 1.27.1 (already installed) | `McpServer`, `WebStandardStreamableHTTPServerTransport` | Already in project; `WebStandardStreamableHTTPServerTransport` explicitly supports CF Workers |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hono/cors | built into hono 4.x | CORS middleware for OPTIONS preflight + response headers | Apply to all `/mcp/*` routes so browser-based MCP clients can connect |
| hono/streaming | built into hono 4.x | SSE streaming helpers | Use `streamSSE()` for the GET standalone SSE endpoint if needed; transport handles SSE internally for POST responses |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hono | itty-router | itty-router lacks TypeScript inference quality, middleware chain, SSE helpers; Hono is de facto standard |
| Hono | Express + compat flag | Express requires Node.js compat flag which restricts CF Worker APIs; Hono is edge-native |
| Stateless transport | Stateful sessions (sessionIdGenerator set) | Stateful sessions break across CF Worker instances (no shared in-memory state); stateless is correct for this architecture |

**Installation (in `apps/gateway/`):**
```bash
npm install hono
npm install -D wrangler @cloudflare/workers-types
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/
└── gateway/
    ├── package.json          # name: "@vn-mcp/gateway"; wrangler scripts
    ├── wrangler.toml         # usage_model = "unbound"; routes; KV bindings placeholder
    ├── tsconfig.json         # target: "ES2022"; moduleResolution: "Bundler"; types: @cloudflare/workers-types
    └── src/
        ├── index.ts          # Hono app + CF Worker export default { fetch }
        ├── serverRegistry.ts # Pre-register all 5 McpServer instances at module scope
        ├── router.ts         # handleMcpRequest() — param routing + transport per request
        ├── cors.ts           # CORS config (origins, headers, methods)
        └── tierAccess.ts     # Free-tier server access check → MCP error -32001
```

Root `package.json` workspaces must be updated from `["packages/*", "servers/*"]` to `["packages/*", "servers/*", "apps/*"]`.

### Pattern 1: Module-Scope Server Registry

**What:** Instantiate and register all 5 McpServer instances once at module evaluation time. CF Workers reuse the same module instance across requests within a Worker instance — no cold-start registration overhead after first request.

**When to use:** Always. Never instantiate McpServer inside a request handler.

**Example:**
```typescript
// Source: local node_modules + ARCHITECTURE.md verified pattern
// apps/gateway/src/serverRegistry.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAll as registerMomo } from '@vn-mcp/mcp-momo-vn/tools';
import { registerAll as registerZaloPay } from '@vn-mcp/mcp-zalopay-vn/tools';
import { registerAll as registerVnpay } from '@vn-mcp/mcp-vnpay/tools';
import { registerAll as registerZaloOa } from '@vn-mcp/mcp-zalo-oa/tools';
import { registerAll as registerViettelPay } from '@vn-mcp/mcp-viettel-pay/tools';

function makeServer(name: string, version: string, register: (s: McpServer) => void): McpServer {
  const s = new McpServer({ name, version });
  register(s);
  return s;
}

export const servers: Record<string, McpServer> = {
  'momo':        makeServer('mcp-momo-vn',     '1.1.0', registerMomo),
  'zalopay':     makeServer('mcp-zalopay-vn',  '1.1.0', registerZaloPay),
  'vnpay':       makeServer('mcp-vnpay',        '1.1.0', registerVnpay),
  'zalo-oa':     makeServer('mcp-zalo-oa',      '1.1.0', registerZaloOa),
  'viettel-pay': makeServer('mcp-viettel-pay',  '1.1.0', registerViettelPay),
};

// Tier access map: which servers each tier can access
export const FREE_SERVERS = new Set(['momo', 'zalopay']);
export const ALL_SERVERS = new Set(Object.keys(servers));
```

### Pattern 2: Stateless Transport Per Request

**What:** Create a new `WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined })` on every incoming HTTP request. Connect it to the pre-existing McpServer, handle the request, return the Response.

**When to use:** Every MCP request, on every route. No exceptions.

**Example:**
```typescript
// Source: verified from node_modules/...sdk/dist/esm/server/webStandardStreamableHttp.d.ts
// apps/gateway/src/router.ts
import { WebStandardStreamableHTTPServerTransport } from
  '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { servers, FREE_SERVERS } from './serverRegistry.js';

export async function handleMcpRequest(serverName: string, req: Request, tier: string): Promise<Response> {
  const server = servers[serverName];
  if (!server) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0', id: null,
      error: { code: -32600, message: `Unknown server: ${serverName}` }
    }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Phase 5: stub tier check (no real auth yet — always 'free' in mock mode)
  if (!FREE_SERVERS.has(serverName) && tier === 'free') {
    return new Response(JSON.stringify({
      jsonrpc: '2.0', id: null,
      error: {
        code: -32001,
        message: 'Server access restricted. Upgrade to Starter at https://mcpvn.dev/pricing',
        data: { server: serverName, requiredTier: 'starter', currentTier: tier }
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,  // stateless: no session IDs, no in-memory state
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}
```

### Pattern 3: Hono App Entry Point

**What:** Export a Hono app as the CF Workers `fetch` handler. Apply CORS middleware globally, then route `/mcp/:server` to `handleMcpRequest`.

**Example:**
```typescript
// Source: Hono official docs pattern; SDK docstring confirms app.all() usage
// apps/gateway/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcpRequest } from './router.js';

type Env = { Bindings: Record<string, string> };

const app = new Hono<Env>();

app.use('/mcp/*', cors({
  origin: ['https://claude.ai', 'http://localhost:*'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'MCP-Protocol-Version', 'Mcp-Session-Id'],
  exposeHeaders: ['MCP-Protocol-Version', 'Mcp-Session-Id'],
}));

app.all('/mcp/:server', async (c) => {
  const serverName = c.req.param('server');
  // Phase 5: no auth yet; tier stub always 'free' in dev, expand in Phase 6
  const tier = 'free';
  return handleMcpRequest(serverName, c.req.raw, tier);
});

app.get('/health', (c) => c.json({ status: 'ok', servers: 5, tools: 18 }));

export default app;
```

### Pattern 4: SSE Heartbeat via MCP Ping Comment

The user decided the heartbeat format is `: ping` (SSE comment, not a data event). This is the lowest-overhead heartbeat — it keeps the connection alive without triggering MCP client message handlers. The `WebStandardStreamableHTTPServerTransport` manages its own SSE stream internally, so the heartbeat must be injected at a level the transport supports or via a wrapper `ReadableStream` transformer.

**Implementation approach:** The transport controls the SSE stream body. To inject heartbeats, wrap the transport's `Response` body in a `TransformStream` that passes all chunks through and injects `: ping\n\n` on a 30-second interval using the CF Workers `alarm` primitive or a `setInterval` polyfill inside the stream controller. Test this approach first with `wrangler dev` — if the transport doesn't expose a heartbeat hook, a thin SSE wrapper may be needed.

### Anti-Patterns to Avoid

- **Importing `index.ts` from any server:** `StdioServerTransport` imports `process.stdin`/`process.stdout`. This crashes the Worker at module evaluation — not at request time. No error handling can catch it.
- **Setting `sessionIdGenerator` in the transport:** Stateful sessions require in-memory state. CF Workers can route requests to different Worker instances — session state from instance A is invisible to instance B.
- **Creating McpServer inside the request handler:** `registerAll()` registers ~18 closures per request. At module scope this runs once per Worker instance.
- **Using `c.json()` to respond to an SSE request:** Hono's `c.json()` sets `Content-Type: application/json` and closes the response. SSE requires keeping the stream open with `Content-Type: text/event-stream`.
- **Using `@types/node` in the gateway tsconfig:** Type conflicts with `@cloudflare/workers-types`. The gateway must not reference Node.js type globals.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP routing in CF Workers | Custom `if/switch` on URL paths | Hono `app.all('/mcp/:server', ...)` | Route params, middleware chain, type safety |
| CORS preflight handling | Manual OPTIONS handler | `hono/cors` middleware | Handles all edge cases: preflight caching, credential cookies, exposed headers |
| SSE formatting | `"data: " + JSON.stringify(...) + "\n\n"` manual strings | `WebStandardStreamableHTTPServerTransport` manages SSE internally | MCP protocol framing, error responses, protocol version negotiation |
| MCP JSON-RPC envelope | Custom `{ jsonrpc: "2.0", id, result }` builder | McpServer + transport pipeline | Protocol version negotiation, batch requests, error wrapping all handled |
| TypeScript CF Workers types | Manually type `env`, `ExecutionContext` | `@cloudflare/workers-types` | Official types, updated with CF runtime changes |

**Key insight:** The MCP SDK's `WebStandardStreamableHTTPServerTransport` is the entire SSE/HTTP layer. Its `handleRequest(req: Request)` method accepts a Web Standard `Request` and returns a Web Standard `Response` — it handles GET (standalone SSE), POST (JSON-RPC), and DELETE (session termination). There is almost nothing to build at the transport layer.

---

## Common Pitfalls

### Pitfall 1: Bundled Usage Model (10ms CPU limit) Kills SSE

**What goes wrong:** The default CF Workers Bundled plan enforces a 10ms CPU time limit. SSE connections are terminated immediately. `wrangler dev` does NOT enforce this limit — the problem only appears in production.

**Why it happens:** Default `wrangler.toml` template uses Bundled model. Developer tests locally, deploys, every SSE connection drops.

**How to avoid:** Set `usage_model = "unbound"` in `wrangler.toml` before any other work. This must be in the file from the first commit. Requires Workers Paid plan ($5/month).

**Warning signs:** SSE connections dropped after exactly 10ms of CPU activity. Works locally via `wrangler dev`, fails immediately in production.

### Pitfall 2: Importing `index.ts` From Any Server Package

**What goes wrong:** Worker crashes at startup with "process is not defined" or "stdin is not a function" — before any request is processed.

**Why it happens:** Server `index.ts` contains `import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'` which references `process.stdin`. CF Workers has no `process` global.

**How to avoid:** Import path must end in `/tools` or `/tools/index.ts` — never the package root. In `serverRegistry.ts`: `import { registerAll } from '@vn-mcp/mcp-momo-vn/tools'`.

**Warning signs:** Worker fails to start at all; CF dashboard shows module evaluation error, not a request error.

### Pitfall 3: Workspace Path Resolution for Tool Imports

**What goes wrong:** `import { registerAll } from '@vn-mcp/mcp-momo-vn/tools'` resolves correctly in node_modules during local dev but the bundle produced by wrangler may not follow workspace symlinks correctly.

**Why it happens:** wrangler uses esbuild internally for bundling. ESM workspace symlinks are generally handled correctly by esbuild, but the `exports` field in each server's `package.json` must expose the `./tools` subpath.

**How to avoid:** Before writing the gateway, verify each server's `package.json` has `"exports": { "./tools": "./src/tools/index.ts" }` (or pointing to the built output). If missing, add the subpath export. Run `wrangler deploy --dry-run` and inspect bundle output to confirm all 5 server tool registries are included.

**Warning signs:** `Cannot find module '@vn-mcp/mcp-momo-vn/tools'` at bundle time; bundle size much smaller than expected (tools not included).

### Pitfall 4: CORS `Access-Control-Allow-Origin: *` with Credentials

**What goes wrong:** Wildcard origin blocks credentialed requests (requests with `Authorization` header). Browser enforces this restriction — the MCP client cannot send its API key.

**Why it happens:** `cors({ origin: '*' })` is the quick default. It works for simple requests but the `Authorization` header makes all MCP requests "credentialed."

**How to avoid:** Specify exact allowed origins: `['https://claude.ai', 'http://localhost:5173', 'http://localhost:3000']`. The Hono cors middleware handles this correctly when `origin` is an array.

**Warning signs:** Browser console shows CORS error on credentialed requests even though OPTIONS preflight succeeds.

### Pitfall 5: SSE Connection Drops After ~60s Idle Without Heartbeat

**What goes wrong:** CF edge infrastructure and proxies silently close idle SSE connections after ~60 seconds of no data. The client receives no error — the stream just stops.

**Why it happens:** TCP keepalive is not enough at the HTTP layer. SSE requires data to flow periodically.

**How to avoid:** The user decision is `: ping` comment every 30 seconds. Implement a wrapper that injects heartbeat SSE comments into the stream body while the transport is active.

**Warning signs:** SSE connections that work for short tool calls fail for idle clients; connection drops appear exactly at 60-second boundary.

### Pitfall 6: Per-Server Package `exports` Field Missing `./tools` Subpath

**What goes wrong:** `import { registerAll } from '@vn-mcp/mcp-momo-vn/tools'` fails with a module resolution error even though `src/tools/index.ts` exists.

**Why it happens:** Node.js (and bundlers) enforce the `exports` field in `package.json` as the sole allowed import paths when it is defined. If `./tools` is not in `exports`, the import is blocked even though the file exists on disk.

**How to avoid:** Add `"./tools": "./src/tools/index.ts"` to the `exports` field of each server's `package.json` before attempting the gateway integration. Verify with a simple import test in a Node.js script before running wrangler.

---

## Code Examples

Verified patterns from SDK source and existing codebase:

### WebStandardStreamableHTTPServerTransport — Stateless Mode
```typescript
// Source: verified from node_modules/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.d.ts
const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,  // stateless: no Mcp-Session-Id header sent/checked
  enableJsonResponse: false,      // default false: SSE preferred for streaming
});
await server.connect(transport);
const response = await transport.handleRequest(req);
// transport.handleRequest() handles GET (SSE stream), POST (JSON-RPC), DELETE (session close)
```

### Existing Server Tool Registration Pattern (already works)
```typescript
// Source: servers/mcp-momo-vn/src/tools/index.ts (confirmed in codebase)
export function registerAll(server: McpServer): void {
  registerCreatePayment(server);  // 4 tools registered this way
  registerQueryStatus(server);
  registerRefund(server);
  registerValidateIpn(server);
}
// Same pattern in all 5 servers — identical API surface
```

### Existing Integration Test Pattern (reusable for gateway tests)
```typescript
// Source: servers/mcp-momo-vn/src/__tests__/integration.test.ts (existing)
// Pattern: McpServer + registerAll + createTestClient from @vn-mcp/shared
const server = new McpServer({ name: 'mcp-momo-vn', version: '0.0.1' });
registerAll(server);
const client = await createTestClient(server);
// callTool(client, 'momo_create_payment', args) → result
// Gateway tests can reuse createTestClient to verify tool routing
```

### wrangler.toml Baseline
```toml
# apps/gateway/wrangler.toml
name = "vn-mcp-gateway"
main = "src/index.ts"
compatibility_date = "2025-01-01"
usage_model = "unbound"

[vars]
MOCK_MODE = "true"

# KV namespace placeholder — required by Phase 6 auth
# [[kv_namespaces]]
# binding = "KV"
# id = "PLACEHOLDER"
```

### TypeScript Config for CF Workers
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "types": ["@cloudflare/workers-types"],
    "strict": true
  }
}
```
Note: Do NOT include `"@types/node"` — it conflicts with CF Workers globals and will cause type errors on `Request`, `Response`, `ReadableStream`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HTTP+SSE transport (two endpoints) | Streamable HTTP (single endpoint, POST+GET) | MCP spec 2025-03-26 | One route handles both JSON-RPC and SSE; clients send `Accept: application/json, text/event-stream` to indicate preference |
| SSEServerTransport | WebStandardStreamableHTTPServerTransport | SDK v1.6+ | New class uses Web Standard APIs; runs on CF Workers, Deno, Bun without Node.js shim |
| Stateful sessions by default | Stateless recommended for gateway deployments | SDK v1.27+ docstring | Explicitly documented: stateless mode for multi-instance deployments |

**Deprecated/outdated:**
- `SSEServerTransport`: Uses Node.js `http.ServerResponse` — does not run on CF Workers
- HTTP+SSE with `/sse` and `/message` split endpoints: Deprecated in MCP spec; replaced by single `/mcp` endpoint supporting both GET and POST

---

## Open Questions

1. **Heartbeat injection into transport-controlled SSE stream**
   - What we know: The transport's `handleRequest()` returns a `Response` with a `ReadableStream` body. CF Workers support `TransformStream` for wrapping streams.
   - What's unclear: Whether wrapping the transport's SSE `ReadableStream` with a heartbeat-injecting `TransformStream` interferes with MCP protocol framing (e.g., breaks SSE event boundary parsing).
   - Recommendation: Implement with a `TransformStream` wrapper; test with a real SSE client (curl or Claude Code) to verify `: ping\n\n` lines are ignored correctly by the MCP client.

2. **Server `package.json` `exports` field for `./tools` subpath**
   - What we know: Current `package.json` files for the 5 servers do not show an `exports` field in the output we've seen (only `bin` and `scripts`).
   - What's unclear: Whether the workspace package resolution bypasses the `exports` restriction during local dev (it usually does for TypeScript + tsx), but wrangler's esbuild bundler enforces it.
   - Recommendation: Check each server's `package.json` for an `exports` field; add `"./tools": "./src/tools/index.ts"` if missing. This is a Wave 0 gap.

3. **CORS `localhost:*` wildcard behavior in Hono**
   - What we know: `origin: ['http://localhost:*']` — the wildcard in port position may not be supported by Hono's cors middleware as a glob.
   - What's unclear: Whether Hono's cors middleware does glob matching or exact string matching on the origin array.
   - Recommendation: Use a function form: `origin: (origin) => origin?.startsWith('http://localhost:') ? origin : 'https://claude.ai'` for local dev flexibility.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — validation section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (root, environment: node) |
| Quick run command | `vitest run --reporter=verbose apps/gateway` |
| Full suite command | `vitest run` |

**Note on CF Workers testing:** CF Workers runtime cannot run inside Vitest's Node.js environment. Gateway tests must be structured as unit tests that test the Hono app logic (routing, tier checking, CORS) using `@hono/testing` or plain HTTP requests against a `Request` object — not via a live Workers runtime. The MCP tool routing tests can use the existing `createTestClient` pattern from `@vn-mcp/shared` (which runs in Node.js).

End-to-end SSE verification uses `wrangler dev` + curl or a real MCP client — this is a manual smoke test, not an automated Vitest test.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GATE-01 | POST `/mcp/momo` returns valid MCP response | integration | `vitest run apps/gateway/src/__tests__/routing.test.ts` | Wave 0 |
| GATE-02 | `tools/list` returns 18 tools across 5 routes | integration | `vitest run apps/gateway/src/__tests__/tools-list.test.ts` | Wave 0 |
| GATE-03 | `momo_create_payment` through gateway returns mock response | integration | `vitest run apps/gateway/src/__tests__/tool-call.test.ts` | Wave 0 |
| GATE-04 | OPTIONS preflight to `/mcp/momo` returns CORS headers | unit | `vitest run apps/gateway/src/__tests__/cors.test.ts` | Wave 0 |
| GATE-05 | Two concurrent McpServer instances have no shared state | unit | `vitest run apps/gateway/src/__tests__/isolation.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `vitest run apps/gateway/src/__tests__`
- **Per wave merge:** `vitest run`
- **Phase gate:** Full suite green + `wrangler dev` manual SSE smoke test (60s idle connection survives) before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/gateway/src/__tests__/routing.test.ts` — covers GATE-01
- [ ] `apps/gateway/src/__tests__/tools-list.test.ts` — covers GATE-02
- [ ] `apps/gateway/src/__tests__/tool-call.test.ts` — covers GATE-03
- [ ] `apps/gateway/src/__tests__/cors.test.ts` — covers GATE-04
- [ ] `apps/gateway/src/__tests__/isolation.test.ts` — covers GATE-05
- [ ] `apps/gateway/package.json` — workspace package creation
- [ ] `apps/gateway/wrangler.toml` — with `usage_model = "unbound"`
- [ ] `apps/gateway/tsconfig.json` — with `@cloudflare/workers-types`, no `@types/node`
- [ ] Root `package.json` workspaces: add `"apps/*"`
- [ ] Each server's `package.json` `exports` field: add `"./tools": "./src/tools/index.ts"`

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@modelcontextprotocol/sdk/dist/esm/server/webStandardStreamableHttp.d.ts` — verified `WebStandardStreamableHTTPServerTransport` API, options interface, CF Workers support in docstring
- `servers/mcp-momo-vn/src/tools/index.ts` — confirmed `registerAll(server: McpServer)` export pattern
- `servers/mcp-momo-vn/src/index.ts` — confirmed `StdioServerTransport` + `process.stdin` dependency (DO NOT import in gateway)
- `servers/*/src/tools/` — confirmed tool counts: momo(4), zalopay(4), vnpay(3), zalo-oa(4), viettel-pay(3) = 18 total
- `.planning/research/ARCHITECTURE.md` — full data flow, CF Workers constraints, server registry pattern
- `.planning/research/PITFALLS.md` — CPU limits, SSE stateless model, stdio import danger

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — Hono 4.x SSE helpers, `@cloudflare/workers-types`, wrangler 3.x usage
- Hono official docs pattern (docstring in SDK confirms `app.all('/mcp', async (c) => transport.handleRequest(c.req.raw))`)

### Tertiary (LOW confidence)
- Heartbeat injection via `TransformStream` wrapper — logical inference from CF Workers Web Streams API; not tested in this codebase yet

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — SDK source verified in local node_modules; existing codebase patterns confirmed
- Architecture: HIGH — `WebStandardStreamableHTTPServerTransport` API verified; stateless mode documented; CF Workers constraint from architecture research
- Pitfalls: HIGH for CPU limit + stdio import (confirmed via multiple sources); MEDIUM for heartbeat injection approach (open question)

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable stack; MCP SDK changes less frequently than fast-moving libraries)
