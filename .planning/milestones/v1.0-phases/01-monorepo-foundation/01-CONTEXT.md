# Phase 1: Monorepo Foundation - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Shared infrastructure — npm workspaces monorepo skeleton with `packages/shared` library (HMAC signing, error formatting, mock engine) and tooling (TypeScript, ESLint, vitest). All 5 MCP servers depend on this foundation. No server implementation in this phase.

</domain>

<decisions>
## Implementation Decisions

### Package structure
- Two top-level directories: `packages/` (shared libraries) and `servers/` (MCP server packages)
- npm scope: `@vn-mcp/` — e.g., `@vn-mcp/shared`, `@vn-mcp/momo`, `@vn-mcp/zalopay`
- Minimal shared package: only HMAC signing, error formatter, mock engine flag. Each server owns its own Zod schemas, fixtures, and API client.
- Simplified per-server structure: `src/index.ts`, `src/tools/`, `src/client.ts` — schemas inline with tools, mock logic in client

### Mock engine design
- Per-server env var activation: `MOMO_SANDBOX=true`, `ZALOPAY_SANDBOX=true`, etc. — granular control per server
- Schema-accurate mock responses: exact field names, types, structure matching real API responses, with realistic Vietnamese values (VN phone numbers, VND amounts, Vietnamese text)
- Every mock response includes `"_mock": true` field so Claude Code knows it's not real data
- Mock fixtures live in per-server `src/__fixtures__/` directories with JSON files matching real API response shapes

### Error handling pattern
- Structured error objects returned: `{ error_code: "MOMO_1005", message: "Insufficient balance", provider: "momo", suggestion: "Check account balance" }`
- Full error code translation tables shipped per provider — map every known numeric code to English description
- English only — no Vietnamese text in error messages (Claude Code works best with English)
- Use MCP protocol's `isError: true` flag + return structured error object as the content

### Dev workflow
- Both MCP Inspector (`npx @modelcontextprotocol/inspector`) and direct Claude Code testing documented in README
- tsdown for bundling (not tsup — tsup is unmaintained per research)
- Standard npm scripts at root: `build`, `test`, `lint`, `dev` (watch mode) — each runs across all workspaces
- Node.js version enforced via `engines: ">=20"` in package.json + `.nvmrc` file

### Claude's Discretion
- Exact ESLint rule configuration (beyond the mandatory no-console-log rule)
- vitest configuration details
- TypeScript strictness level and tsconfig options
- Whether to use TypeScript project references or simple workspace resolution

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### MCP SDK
- `.planning/research/STACK.md` — MCP SDK version (1.27.x), Zod compatibility (3.25+), transport choice (STDIO), bundler choice (tsdown)

### Architecture
- `.planning/research/ARCHITECTURE.md` — Monorepo layout patterns, component boundaries, mock/real switcher pattern, data flow

### Pitfalls
- `.planning/research/PITFALLS.md` — stdout pollution prevention, mock drift risk, signature field ordering gotchas

### Project brief
- `brief.md` §3.2 — MCP Server Structure pattern (original vision for per-server layout)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — pure greenfield project, no existing application code

### Established Patterns
- None — this phase establishes the patterns

### Integration Points
- MCP SDK `@modelcontextprotocol/sdk` — entry point for all servers
- npm workspaces — links packages/shared to each server

</code_context>

<specifics>
## Specific Ideas

- Package naming follows `@vn-mcp/` scope consistently across all packages
- Mock responses should feel realistic enough that a demo video using mock mode looks convincing (VN phone numbers like 0912345678, VND amounts like 150000, Vietnamese merchant names)
- Research flagged that `console.log` in any file must fail the lint check — this is a hard requirement, not a nice-to-have (stdout pollution kills MCP stdio transport)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-monorepo-foundation*
*Context gathered: 2026-03-17*
