# Phase 9: npm Publishing - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

All 5 server packages + @vn-mcp/shared published to npm under @vn-mcp scope. Each package installable standalone outside the monorepo. npm pack --dry-run verified before publish.

</domain>

<decisions>
## Implementation Decisions

### Package Scope & Access
- No npm account yet — plan includes: create npm account, create @vn-mcp org, npm login
- All packages published as scoped public: `npm publish --access public`
- 6 packages total: @vn-mcp/shared + 5 server packages

### What Gets Published
- Mock fixture JSON files included — users can run servers in mock mode out of the box
- Build output only in tarball (not src/) — use `"files"` field in package.json
- `exports` field must point to `./build/` (not `./src/`) for published packages
- `@vn-mcp/shared` must be a real versioned dependency (not workspace:*) in each server package.json

### Versioning
- Start at 1.0.0 for all 6 packages — signals stability and confidence
- Independent versions per package (not lockstep) — but all start at 1.0.0
- @vn-mcp/shared version pinned as `^1.0.0` in server dependencies

### Claude's Discretion
- Exact `"files"` array in each package.json
- .npmignore vs package.json files field approach
- Build script adjustments (tsdown config)
- Whether to add `"publishConfig": { "access": "public" }` to each package.json
- README content adjustments for npm listing
- Order of publish (shared first, then servers)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Package Configuration
- `servers/mcp-momo-vn/package.json` — Reference server package.json (exports, bin, scripts)
- `packages/shared/package.json` — Shared package (exports map with subpath exports)
- `package.json` (root) — Workspace configuration

### Build System
- `servers/mcp-momo-vn/tsconfig.json` — TypeScript config extending tsconfig.base.json
- `tsconfig.base.json` — Base compiler options (outDir: ./build)

### Mock Fixtures
- `servers/mcp-momo-vn/src/mock/*.json` — Example mock fixtures that must be included in tarball

### Prior Phase Context
- `.planning/phases/06-auth-api-keys/06-04-SUMMARY.md` — loadFixture refactored to use JSON imports (relevant to how mocks work in published packages)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tsdown` build script already configured in each package
- `bin` field already set in server packages (e.g., `"mcp-momo-vn": "./build/index.js"`)
- TypeScript `outDir: ./build` already configured in tsconfig.base.json

### Established Patterns
- All packages use `"type": "module"` (ESM)
- Exports point to `./src/` (source) — must change to `./build/` for npm
- Subpath exports on shared: `.`, `./errors`, `./http-client`, `./mock-engine`, `./test-helpers`

### Integration Points
- `exports` field in each package.json — switch from src to build
- `dependencies` in server packages — add `@vn-mcp/shared: ^1.0.0` (currently implicit via workspace)
- Root package.json workspace config — no changes needed (workspaces still work locally)
- Mock JSON files — currently in `src/mock/` — need to be copied to build output or included via files field

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-npm-publishing*
*Context gathered: 2026-03-23*
