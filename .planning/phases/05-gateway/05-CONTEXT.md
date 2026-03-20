# Phase 5: Gateway - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose all 5 existing MCP servers via Streamable HTTP transport on a single Cloudflare Workers endpoint. Each server gets its own route. Clients connect via SSE instead of running servers locally. Auth, metering, and billing are separate phases — this phase delivers a working gateway with CORS and stateless connections.

</domain>

<decisions>
## Implementation Decisions

### URL Routing
- Per-server routes: `/mcp/momo`, `/mcp/zalopay`, `/mcp/vnpay`, `/mcp/zalo-oa`, `/mcp/viettel-pay`
- Each route is a standalone MCP Streamable HTTP endpoint
- Base domain: `api.mcpvn.dev` (requires mcpvn.dev domain purchase + Cloudflare DNS)
- Client configures one URL per server in `.mcp.json` — matches existing local config pattern

### Server Selection & Tier Access
- Free tier: MoMo + ZaloPay only (2 servers)
- Starter: all 5 servers
- Pro/Business: all 5 servers (differentiated by call limits, not server access)
- When free-tier user hits restricted server: return MCP JSON-RPC error (code -32001) with upgrade link and tier info — not HTTP 403
- Per-connection McpServer instantiation (stateless, no shared state between requests)

### Deployment & Structure
- Gateway lives in `apps/gateway/` — new `apps/` directory for deployable services
- `wrangler.toml` with `usage_model = "unbound"` (mandatory — 10ms CPU limit kills SSE)
- Local dev via `wrangler dev` (closest to production CF Workers behavior)
- Import only `tools/index.ts` from each server (never `index.ts` — StdioServerTransport crashes Workers)

### Error & Heartbeat
- SSE heartbeat: `: ping` comment every 30 seconds
- Idle connection timeout: 5 minutes (close SSE stream, client can reconnect)
- All errors returned as MCP JSON-RPC format (not plain HTTP errors)

### Claude's Discretion
- Exact Hono middleware structure and ordering
- CORS header specifics (which origins to allow)
- McpServer instantiation pooling strategy (if any)
- Error code numbering for gateway-specific errors
- Wrangler project naming convention

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MCP Transport
- `.planning/research/ARCHITECTURE.md` — Full system diagram, data flow, CF Workers constraints, `WebStandardStreamableHTTPServerTransport` usage
- `.planning/research/STACK.md` — Hono 4.x, MCP SDK transport class, package versions

### Pitfalls
- `.planning/research/PITFALLS.md` — CF Workers CPU limits, per-connection instantiation requirement, stdio import danger

### Existing Server Integration
- `servers/mcp-momo-vn/src/tools/index.ts` — Reference `registerAll` pattern used by all 5 servers
- `servers/mcp-momo-vn/src/index.ts` — Reference stdio entry point (DO NOT import in gateway)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `registerAll(server: McpServer)` in each server's `tools/index.ts` — clean integration point, import directly into gateway
- `@vn-mcp/shared` package — error formatting, mock engine (isMockMode), HMAC signing all usable from Workers
- MCP SDK v1.27.1 already installed — includes `WebStandardStreamableHTTPServerTransport` with explicit CF Workers support

### Established Patterns
- Each server follows identical structure: credentials.ts, signatures.ts, client.ts, tools/, mock/
- `isMockMode()` checks env vars — works in CF Workers via `env` bindings
- Tool registration pattern: individual `register(server)` functions composed into `registerAll(server)`

### Integration Points
- Gateway imports `registerAll` from `servers/*/src/tools/index.ts` (5 imports)
- Gateway creates McpServer per connection, registers tools, connects to Streamable HTTP transport
- Environment variables for mock mode need mapping from `wrangler.toml` vars to `process.env` equivalents

</code_context>

<specifics>
## Specific Ideas

- `.mcp.json` for hosted mode should look natural — same structure as local, just URL instead of command
- mcpvn.dev domain — developer-facing, clean, memorable

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-gateway*
*Context gathered: 2026-03-21*
