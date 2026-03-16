# Architecture Research

**Domain:** MCP Server Monorepo — Vietnamese Fintech/Messaging APIs
**Researched:** 2026-03-16
**Confidence:** HIGH (MCP SDK docs + verified community patterns)

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Claude Code (MCP Client)                        │
└────────────────────────────┬───────────────────────────────────────────┘
                             │ stdio / JSON-RPC 2.0
          ┌──────────────────┼──────────────────────────────────┐
          │                  │                                  │
┌─────────▼──────┐  ┌────────▼───────┐  ┌──────────────────────▼──────┐
│  mcp-momo-vn   │  │ mcp-zalopay-vn │  │     (+ 3 more servers)       │
│  McpServer     │  │  McpServer     │  │  mcp-zalo-oa                 │
│  ─────────     │  │  ──────────    │  │  mcp-viettel-pay             │
│  tools/        │  │  tools/        │  │  mcp-vnpay                   │
│  client.ts     │  │  client.ts     │  │                              │
│  schemas.ts    │  │  schemas.ts    │  │  (same internal structure)   │
│  mock/         │  │  mock/         │  │                              │
└────────┬───────┘  └────────┬───────┘  └──────────────────────┬───────┘
         │                   │                                  │
         └───────────────────┴──────────────────────────────────┘
                                      │
                          ┌───────────▼───────────┐
                          │   packages/shared      │
                          │   ────────────────     │
                          │   errors/              │
                          │   http-client/         │
                          │   mock-engine/         │
                          │   test-helpers/        │
                          │   types/               │
                          └───────────┬────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
          ┌─────────▼───┐  ┌──────────▼──┐  ┌──────────▼──┐
          │  MoMo API   │  │ ZaloPay API  │  │  Zalo OA    │
          │  (sandbox)  │  │  (sandbox)  │  │  (sandbox)  │
          └─────────────┘  └─────────────┘  └─────────────┘
                   (or mock layer when sandbox unavailable)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| McpServer (per server) | Register tools, handle stdio transport, lifecycle | `@modelcontextprotocol/sdk` McpServer class |
| tools/ (per server) | One file per tool group; register tool + handler | Zod schema + async handler function |
| client.ts (per server) | HTTP calls to the upstream API (or mock) | axios/fetch wrapper with auth headers |
| schemas.ts (per server) | All Zod input/output schemas for this server's tools | Zod objects exported for reuse |
| mock/ (per server) | Realistic fake responses matching real API shape | Static JSON fixtures + response builder |
| packages/shared/errors | Canonical error classes, isError response builder | McpError subclasses, formatToolError() |
| packages/shared/http-client | Signed HTTP client factory for VN APIs (HMAC, RSA) | Returns pre-configured axios instance |
| packages/shared/mock-engine | Mode switcher: real vs mock; fixture loader | MOCK_MODE env var; loads from mock/ |
| packages/shared/test-helpers | MCP client stub, call-tool helper, assertion utils | In-memory transport wiring |
| packages/shared/types | Cross-server TypeScript types (Currency, TxnStatus…) | Pure type files, no runtime code |

## Recommended Project Structure

```
vietnamese-mcp/
├── package.json                  # npm workspaces root
├── tsconfig.base.json            # Shared TS compiler options
├── packages/
│   └── shared/                   # Internal shared library
│       ├── package.json          # name: "@vn-mcp/shared"
│       ├── tsconfig.json         # extends ../../tsconfig.base.json
│       └── src/
│           ├── errors/
│           │   ├── McpApiError.ts        # Base error class
│           │   ├── formatToolError.ts    # Returns { isError: true, content: [...] }
│           │   └── index.ts
│           ├── http-client/
│           │   ├── createHttpClient.ts   # Factory: baseURL + auth headers
│           │   ├── hmac.ts               # HMAC-SHA256 signing (MoMo, ViettelPay)
│           │   ├── rsa.ts                # RSA signing (ZaloPay)
│           │   └── index.ts
│           ├── mock-engine/
│           │   ├── isMockMode.ts         # Reads MOCK_MODE env var
│           │   ├── loadFixture.ts        # Loads JSON fixture by path
│           │   └── index.ts
│           ├── test-helpers/
│           │   ├── createTestClient.ts   # Wires in-memory transport
│           │   ├── callTool.ts           # Helper: invoke tool by name
│           │   └── index.ts
│           └── types/
│               ├── currency.ts           # VND, amounts, formatting
│               ├── transaction.ts        # TxnStatus, TxnResult
│               └── index.ts
│
├── servers/
│   ├── mcp-momo-vn/
│   │   ├── package.json          # name: "@vn-mcp/mcp-momo-vn"; bin entry
│   │   ├── tsconfig.json         # references: [../../packages/shared]
│   │   ├── CLAUDE.md             # MCP server context for Claude Code
│   │   ├── README.md
│   │   └── src/
│   │       ├── index.ts          # McpServer init + stdio transport
│   │       ├── client.ts         # MoMo HTTP client (real or mock)
│   │       ├── schemas.ts        # All Zod schemas for MoMo tools
│   │       ├── tools/
│   │       │   ├── createPayment.ts
│   │       │   ├── queryTransaction.ts
│   │       │   ├── refund.ts
│   │       │   └── index.ts      # Registers all tools on server
│   │       └── mock/
│   │           ├── createPayment.json
│   │           ├── queryTransaction.json
│   │           └── refund.json
│   │
│   ├── mcp-zalopay-vn/           # Same structure as mcp-momo-vn
│   ├── mcp-zalo-oa/              # Same structure
│   ├── mcp-viettel-pay/          # Same structure
│   └── mcp-vnpay/                # Same structure
│
└── .mcp.json                     # Local dev: registers all 5 servers
```

### Structure Rationale

- **packages/shared/:** Extracted once, used by all 5 servers. Auth signing logic (HMAC, RSA) differs per API but the factory pattern lives here — servers only provide credentials and base URL. Test utilities live here so every server gets the same integration test harness.
- **servers/[name]/src/tools/:** One file per logical tool group. Each file exports a `register(server: McpServer)` function — index.ts calls all of them. This keeps tool logic isolated and testable without importing the server instance.
- **servers/[name]/src/mock/:** JSON fixtures named identically to tool files. Mock engine picks them up by name. When real API access arrives, only `client.ts` changes — tools and schemas stay untouched.
- **servers/[name]/src/schemas.ts:** All Zod schemas in one file per server. This prevents circular imports between tool files and gives a single source of truth for what each tool accepts/returns.

## Architectural Patterns

### Pattern 1: Tool-as-Function with Centralized Registration

**What:** Each tool is an exported async function. A central `registerAll(server)` function in `tools/index.ts` calls `server.tool(name, description, zodSchema, handler)` for each one.
**When to use:** Always — this is the MCP SDK's native pattern.
**Trade-offs:** Clean separation; the server instance is never imported inside individual tool files, making them unit-testable.

**Example:**
```typescript
// servers/mcp-momo-vn/src/tools/createPayment.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CreatePaymentSchema } from "../schemas.js";
import { momoClient } from "../client.js";
import { formatToolError } from "@vn-mcp/shared/errors";

export function register(server: McpServer) {
  server.tool(
    "momo_create_payment",
    "Create a MoMo payment link. Returns a deeplink and QR URL.",
    CreatePaymentSchema.shape,
    async (args) => {
      try {
        const result = await momoClient.createPayment(args);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    }
  );
}
```

### Pattern 2: Client/Mock Switcher

**What:** `client.ts` exports a single client object. Internally it checks `isMockMode()` and either returns a real HTTP client or a mock that loads JSON fixtures.
**When to use:** During Phase 1 (no real API accounts). The switch is transparent to tool handlers.
**Trade-offs:** Tools never know if they're talking to real or mock APIs — good for testability. Fixtures must stay in sync with real API shapes.

**Example:**
```typescript
// servers/mcp-momo-vn/src/client.ts
import { isMockMode, loadFixture } from "@vn-mcp/shared/mock-engine";
import { createHttpClient } from "@vn-mcp/shared/http-client";

const real = createHttpClient({ baseURL: "https://payment.momo.vn", signWith: "hmac" });

export const momoClient = {
  createPayment: async (args: unknown) => {
    if (isMockMode()) return loadFixture("momo/createPayment");
    return real.post("/v2/gateway/api/create", args);
  },
};
```

### Pattern 3: Structured Error Response (isError flag)

**What:** All tool handlers catch errors and return `{ isError: true, content: [{ type: "text", text: "..." }] }` rather than throwing. Protocol-level errors (bad JSON-RPC) are separate from tool-level errors.
**When to use:** Every tool handler, without exception.
**Trade-offs:** Claude Code receives a readable error message and can decide whether to retry. Server stays alive after any single tool failure.

**Example:**
```typescript
// packages/shared/src/errors/formatToolError.ts
export function formatToolError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[tool-error]", err); // stderr for debugging
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: `Error: ${message}` }],
  };
}
```

## Data Flow

### Request Flow (Claude Code → Tool → API/Mock → Claude Code)

```
Claude Code
    │  calls tool via MCP (JSON-RPC over stdio)
    ▼
McpServer (SDK)
    │  validates JSON-RPC envelope
    │  routes to registered tool by name
    ▼
Tool Handler (tools/createPayment.ts)
    │  receives Zod-validated args (SDK validates automatically)
    │  calls client method
    ▼
client.ts
    │  isMockMode()? → load fixture from mock/
    │  else → createHttpClient() → HMAC/RSA sign → HTTP POST
    ▼
API Response (real or fixture JSON)
    │
    ▼
Tool Handler
    │  formats response as { content: [{ type: "text", text: JSON.stringify(result) }] }
    ▼
McpServer (SDK)
    │  wraps in JSON-RPC response envelope
    ▼
Claude Code
    (receives structured result or isError response)
```

### Key Data Flows

1. **Tool registration flow (startup):** `index.ts` creates McpServer → imports `registerAll` from `tools/index.ts` → each tool file registers itself → server connects stdio transport. Tools must be registered before transport connects.

2. **Mock mode flow:** `MOCK_MODE=true` env var → `isMockMode()` returns true → `loadFixture("momo/createPayment")` reads `src/mock/createPayment.json` → returns fixture as-if it were an API response. No network calls.

3. **Auth signing flow (real API):** `createHttpClient({ signWith: "hmac" })` → axios interceptor → before each request, computes HMAC-SHA256 of `(partnerCode + orderId + amount + ...)` using `MOMO_SECRET_KEY` env var → attaches signature to request body.

4. **Error propagation flow:** Any throw in tool handler → caught by `formatToolError()` → returns `{ isError: true }` response → Claude Code reads the error text and decides next step. McpServer never crashes.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1 developer, local | Current monorepo structure is correct. All 5 servers run via local `.mcp.json`. |
| Team of 5-10, npm published | Add Changesets for versioned releases. Each server gets independent semver. `@vn-mcp/shared` is internal dep, not published. |
| Production API traffic | Move from stdio to Streamable HTTP transport (MCP SDK supports both). Add rate limiting in shared http-client layer. |

### Scaling Priorities

1. **First bottleneck:** stdio transport is process-per-user — fine for local dev and small teams. If serving multiple concurrent Claude Code sessions remotely, switch to Streamable HTTP.
2. **Second bottleneck:** Mock fixtures become stale when real APIs change. Introduce contract testing (record real API responses to update fixtures) before going live.

## Anti-Patterns

### Anti-Pattern 1: Tool Logic in index.ts

**What people do:** Register all tools inline in the server's `index.ts` entry point.
**Why it's wrong:** index.ts becomes a 500-line file. Tools can't be unit-tested without spinning up the full server. Merge conflicts on every new tool.
**Do this instead:** One file per tool or tool group in `tools/`. index.ts only does server init + `registerAll(server)`.

### Anti-Pattern 2: Direct API Calls Inside Tool Handlers

**What people do:** `fetch("https://payment.momo.vn/...", { ... })` directly inside the tool handler function.
**Why it's wrong:** Authentication logic gets duplicated across tools. Mock mode can't be injected. Error handling for network failures is inconsistent.
**Do this instead:** All HTTP calls go through `client.ts`. Tool handlers only call `momoClient.createPayment(args)` — they don't know about HTTP.

### Anti-Pattern 3: Shared `node_modules` for API Clients

**What people do:** Put MoMo API client code in `packages/shared` alongside the generic utilities.
**Why it's wrong:** Shared package grows to include 5 API clients — every server imports the whole bundle including its competitors' clients.
**Do this instead:** API-specific code (auth, endpoints, mock fixtures) lives in `servers/[name]/`. Only truly generic utilities (error formatting, HMAC signing, test helpers) go in `packages/shared`.

### Anti-Pattern 4: Throwing Errors from Tool Handlers

**What people do:** `throw new Error("payment failed")` inside a tool handler.
**Why it's wrong:** Unhandled throws become protocol-level errors that may crash or confuse the MCP client. The MCP spec distinguishes tool-level errors (isError) from protocol errors.
**Do this instead:** Wrap every tool handler in try/catch. Return `formatToolError(err)` — never throw past the handler boundary.

## Integration Points

### External Services

| Service | Integration Pattern | Auth Scheme | Notes |
|---------|---------------------|-------------|-------|
| MoMo Payment | REST + HMAC-SHA256 signature | partnerCode + secretKey | Sandbox URL differs from prod |
| ZaloPay | REST + RSA-SHA256 MAC | app_id + key1/key2 | Two-key scheme, asymmetric |
| Zalo OA | REST + OAuth 2.0 access_token | OA access token (rotates) | Token refresh needed |
| ViettelPay | REST + HMAC or RSA (TBD) | merchantCode + secretKey | API docs sparse; verify before Phase 2 |
| VNPAY | REST + HMAC-SHA512 | vnp_HashSecret | Hash covers sorted query string |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| tool handler → client.ts | Direct function call (same process) | Never HTTP between tool and client |
| server → packages/shared | npm workspace dependency (`@vn-mcp/shared`) | TypeScript project references for incremental build |
| servers (between each other) | None — completely independent | Each server is a separate process; no inter-server calls |
| CLAUDE.md → Claude Code | Static file read at session start | Documents tool names, expected args, example prompts |

## Build Order (Phase Implications)

The dependency graph determines what must be built first:

```
1. packages/shared          ← no internal deps; build first
      │
      ├── 2a. mcp-momo-vn      ← depends on shared
      ├── 2b. mcp-zalopay-vn   ← depends on shared
      ├── 2c. mcp-zalo-oa      ← depends on shared
      ├── 2d. mcp-viettel-pay  ← depends on shared
      └── 2e. mcp-vnpay        ← depends on shared
```

**Roadmap implication:** Scaffold `packages/shared` with error helpers and mock engine before implementing any individual server. The 5 servers can be built in parallel once shared is stable. Build MoMo first (most documented VN payment API) to validate patterns, then replicate to the remaining 4.

## Sources

- [MCP TypeScript SDK — DeepWiki architecture overview](https://deepwiki.com/modelcontextprotocol/typescript-sdk)
- [MCP TypeScript SDK — Official GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [Building MCP Servers the Right Way — Mauro Canuto (production monorepo guide)](https://maurocanuto.medium.com/building-mcp-servers-the-right-way-a-production-ready-guide-in-typescript-8ceb9eae9c7f)
- [mcp-server-starter — Reference monorepo](https://github.com/maurocanuto/mcp-server-starter)
- [Error Handling in MCP Servers — MCPcat guide](https://mcpcat.io/guides/error-handling-custom-mcp-servers/)
- [Adding Custom Tools to MCP Server — MCPcat](https://mcpcat.io/guides/adding-custom-tools-mcp-server-typescript/)
- [npm Workspaces + TypeScript Project References](https://medium.com/@cecylia.borek/setting-up-a-monorepo-using-npm-workspaces-and-typescript-project-references-307841e0ba4a)

---
*Architecture research for: Vietnamese MCP Server Monorepo*
*Researched: 2026-03-16*
