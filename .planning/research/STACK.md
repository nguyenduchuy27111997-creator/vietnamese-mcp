# Stack Research

**Domain:** MCP servers wrapping Vietnamese fintech/messaging APIs (MoMo, ZaloPay, Zalo OA, ViettelPay, VNPAY)
**Researched:** 2026-03-16
**Confidence:** HIGH (core MCP stack verified via official GitHub, npm, and MCP docs; monorepo tooling verified via multiple credible sources)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 20 LTS | Runtime | LTS with full ESM support; required by MCP SDK; project constraint confirmed |
| TypeScript | 5.8+ | Language | MCP SDK is TypeScript-first; enables type inference from Zod schemas; tsdown requires 5.x |
| @modelcontextprotocol/sdk | 1.27.x | MCP protocol implementation | Tier 1 official SDK; Anthropic-maintained; latest stable is 1.27.1 (Feb 2025); v2 pre-alpha, not ready |
| Zod | 3.25+ or 4.x | Schema validation + type inference | Required peer dependency of MCP SDK; SDK imports from `zod/v4` but supports 3.25+; use 3.25+ for broadest compatibility |

**Critical Zod note:** The MCP SDK v1.17.5 had a breaking incompatibility with Zod v4 (`_parse is not a function`). Current 1.27.x resolves this but maintains backward compat with Zod 3.25+. Use `zod@^3.25.0` to avoid surprise breakage from future Zod v4 changes. Confidence: MEDIUM (resolved in current version, but Zod v4 API churn is real — single source confirmed).

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsdown | latest | Build/bundle TypeScript to ESM | Use for all 5 servers; tsup is no longer maintained; tsdown sits on Rolldown (Vite's bundler), handles ESM correctly, rewrites imports automatically |
| tsx | latest | Run TypeScript without compiling | Dev-time only: `tsx watch src/index.ts` for fast iteration; not a build tool |
| msw (Mock Service Worker) | 2.x | HTTP API mocking for tests | Mock all 5 Vietnamese APIs in test suite; intercepts fetch/axios at network layer; no real API accounts needed |
| vitest | 2.x | Test runner | Native ESM support; TypeScript-first; fast; pairs cleanly with msw for integration tests |
| axios | 1.x | HTTP client for API calls | Vietnamese APIs (MoMo, ZaloPay, VNPAY) use REST over HTTPS with HMAC signatures; axios handles headers cleanly; built-in timeout |
| @types/node | 20.x | Node.js type definitions | Required for TypeScript to know the Node.js API surface |

### Monorepo Tools

| Tool | Version | Purpose | Why |
|------|---------|---------|-----|
| npm workspaces | npm 9+ (built-in) | Package linking across 5 servers + shared package | Project constraint is npm; workspaces is sufficient for 5 packages; no need for Turborepo at this scale |
| TypeScript project references | TS 5.x built-in | Incremental type checking across workspace | Avoids re-checking unchanged packages; speeds up `tsc --build` |

**On pnpm vs npm:** The project explicitly constrains npm (target audience expects `npm install` workflow). pnpm workspaces are technically superior for large monorepos, but 5 packages is not a scale problem. npm workspaces + project references is the correct trade-off here. Confidence: HIGH.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| @modelcontextprotocol/inspector | Visual test/debug UI for MCP tools | Run `npx @modelcontextprotocol/inspector`; opens at localhost:6274; Postman equivalent for MCP; no install needed |
| MCP Inspector | Same tool, official | Run against each server during development to verify tool schemas and responses without a full Claude Code session |

---

## Transport Choice: STDIO Only

For this project, all 5 servers use **STDIO transport** exclusively. Do not implement StreamableHTTP or SSE.

**Why STDIO:**
- Claude Code spawns MCP servers as child processes over stdio — this is the standard local developer workflow
- No network overhead, no authentication complexity, microsecond latency
- StreamableHTTP is for remote/cloud-hosted servers (future phase, out of scope)
- SSE is deprecated in the MCP spec (superseded by StreamableHTTP); don't use it

**When to revisit:** If Phase 2 requires sharing servers across teams or hosting on Cloudflare Workers, add StreamableHTTP transport. The SDK supports both; STDIO servers can be proxied later.

---

## Installation

```bash
# Monorepo root — create workspaces structure
npm init -y
npm install --save-dev typescript@5.8 tsx tsdown vitest @types/node@20

# Each MCP server package (repeat for all 5)
npm install @modelcontextprotocol/sdk zod@^3.25.0 axios

# Test mocking
npm install --save-dev msw

# Run inspector without installing
npx @modelcontextprotocol/inspector
```

---

## TypeScript Configuration

**Root `tsconfig.json` (workspace base):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Why `Node16` not `NodeNext`:** With `NodeNext`, all relative imports require explicit `.js` extensions (ESM requirement). `Node16` is more forgiving during development while still producing correct ESM output. tsdown handles the final import rewriting.

**Each server `tsconfig.json`:**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./build",
    "rootDir": "./src"
  },
  "references": [{ "path": "../../packages/shared" }]
}
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| @modelcontextprotocol/sdk 1.27.x | fastmcp framework | When you want auth, CORS, sessions out-of-box for remote HTTP servers. Overkill for local STDIO servers; adds abstraction lag behind official spec |
| npm workspaces | Turborepo + pnpm | When monorepo has 20+ packages and CI cache is a bottleneck. 5 packages doesn't need orchestration overhead |
| tsdown | tsup | tsup is no longer maintained; tsdown is the successor built on Rolldown |
| tsdown | plain tsc | tsc produces `.js` files that still need import path rewriting for ESM; tsdown handles this automatically for published packages |
| vitest | jest | Jest requires additional ESM configuration; vitest is ESM-native and TypeScript-native; no additional transforms needed |
| msw | nock | msw works at the fetch/network layer, not by monkey-patching http module; cleaner isolation and works across axios and fetch |
| axios | node-fetch / native fetch | Vietnamese API docs show curl examples with headers and HMAC signatures; axios interceptors simplify auth middleware per-server |
| Zod 3.25+ | Zod 4.x | v4 had a breaking change with MCP SDK 1.17.5 (now fixed, but risk of future churn). 3.25+ is stable and fully compatible |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| tsup | No longer maintained; author recommends tsdown | tsdown |
| SSE transport | Deprecated in MCP spec 2025-03-26 | STDIO (local) or StreamableHTTP (remote) |
| fastmcp | Adds abstraction on top of official SDK; lags spec updates; designed for remote HTTP servers, not local STDIO tools | Raw `@modelcontextprotocol/sdk` |
| Turborepo / Nx | Unnecessary complexity for 5-package monorepo | npm workspaces + TypeScript project references |
| CommonJS (`require`) | MCP SDK is ESM; mixing CJS creates dual-module hazard | `"type": "module"` + ESM throughout |
| `ts-node` | Not maintained for modern ESM; requires complex configuration | `tsx` for dev execution |
| Zod v4.x directly | API instability risk with peer dependency interaction | `zod@^3.25.0` until SDK explicitly recommends v4 |
| jest | Requires `babel-jest` or `ts-jest` transforms for TypeScript + ESM; significant config overhead | vitest |

---

## Stack Patterns by Variant

**If a Vietnamese API uses HMAC-SHA256 signing (MoMo, ZaloPay, VNPAY):**
- Create a shared `packages/shared/src/crypto.ts` helper using Node.js built-in `crypto` module
- Import via workspace: `import { signHmac } from '@vn-mcp/shared'`
- Do not add `node-forge` or `crypto-js` — Node 20 crypto is sufficient

**If a Vietnamese API returns Vietnamese error messages:**
- Map codes to English in shared error constants file
- Vietnamese API error codes are numeric; maintain a `VN_ERROR_CODES` lookup in shared package
- Surface both raw code and translated message in MCP tool error responses

**If mock mode is needed (all 5 servers initially):**
- Use msw's `setupServer()` in Vitest setup file to intercept all outbound HTTP
- Define mock handlers per-server in `src/__mocks__/handlers.ts`
- Export a `MOCK_MODE` env flag checked in the API client class constructor
- Real API client and mock share the same interface — switching is env-variable only

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @modelcontextprotocol/sdk@1.27.x | zod@^3.25.0 | v4 compatibility exists but 3.25+ is safer; SDK imports from `zod/v4` subpath internally |
| @modelcontextprotocol/sdk@1.27.x | Node.js 18, 20, 22 | Node 20 LTS recommended; Node 22 works but not LTS yet |
| tsdown@latest | TypeScript@5.x | Requires TS 5.x; incompatible with TS 4.x |
| vitest@2.x | Node.js 18+ | Node 20 is fine |
| msw@2.x | vitest@2.x | Pair `msw/node` + `@mswjs/interceptors` for Node.js test environment |

---

## Sources

- [modelcontextprotocol/typescript-sdk GitHub](https://github.com/modelcontextprotocol/typescript-sdk) — version 1.27.1 confirmed, Zod peer dependency, Node16 module requirement. **HIGH confidence.**
- [MCP SDK Releases](https://github.com/modelcontextprotocol/typescript-sdk/releases) — latest release 1.27.1 (Feb 24, 2025) confirmed. **HIGH confidence.**
- [MCP Transports spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) — SSE deprecated, StreamableHTTP modern standard. **HIGH confidence.**
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector) — official tool, run via npx. **HIGH confidence.**
- [modelcontextprotocol.io/docs/sdk](https://modelcontextprotocol.io/docs/sdk) — TypeScript SDK is Tier 1 (Anthropic-maintained). **HIGH confidence.**
- [tsdown (Switching from tsup)](https://alan.norbauer.com/articles/tsdown-bundler/) — tsup deprecated in favor of tsdown. **MEDIUM confidence (single source, but consistent with tsup repo activity).**
- [Zod v4 MCP compatibility issue](https://github.com/modelcontextprotocol/typescript-sdk/issues/925) — confirmed breaking change in 1.17.5, resolved in later versions. **MEDIUM confidence.**
- [maurocanuto/mcp-server-starter](https://github.com/maurocanuto/mcp-server-starter) — real-world monorepo: tsdown + @modelcontextprotocol/sdk + zod + pnpm + turborepo. **MEDIUM confidence (single reference project).**
- [MSW official](https://mswjs.io/) — msw@2.x, Node.js support confirmed. **HIGH confidence.**
- [MCP Zod validation guide](https://www.byteplus.com/en/topic/541200) — SDK uses `zod/v4` subpath, supports 3.25+. **MEDIUM confidence (third-party source).**

---

*Stack research for: Vietnamese MCP servers (MoMo, ZaloPay, Zalo OA, ViettelPay, VNPAY)*
*Researched: 2026-03-16*
