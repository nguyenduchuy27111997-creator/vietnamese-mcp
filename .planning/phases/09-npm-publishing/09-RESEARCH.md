# Phase 9: npm Publishing - Research

**Researched:** 2026-03-23
**Domain:** npm scoped package publishing, monorepo package prep, tsdown build system
**Confidence:** HIGH

## Summary

This phase publishes 6 packages (@vn-mcp/shared + 5 servers) to npm under the @vn-mcp scoped org. The project uses npm workspaces (not pnpm/yarn), which has a critical implication: npm does NOT support the `workspace:` protocol at publish time and does not auto-replace it. However, the current repos use `"@vn-mcp/shared": "*"` (wildcard, not `workspace:`) which resolves to "latest published version" — this must be changed to `"^1.0.0"` before publishing.

The most important pre-publish changes are: (1) add `"files": ["build"]` to each package.json, (2) switch all `exports` from `./src/` to `./build/`, (3) change `@vn-mcp/shared` dep from `"*"` to `"^1.0.0"` in all 5 servers, (4) bump all versions to `1.0.0`, (5) add `"publishConfig": {"access": "public"}`. The `build/` folder is in `.gitignore` — without an explicit `"files"` field, npm uses `.gitignore` and would EXCLUDE `build/` from the tarball.

The existing build pipeline (tsdown) already copies JSON mock fixtures to `build/mock/` via static JSON imports. All 5 servers have the same shape. Only the momo server has a pre-existing build; the other 4 must be built before `npm pack --dry-run` can be verified.

**Primary recommendation:** Use `"files": ["build"]` in every package.json (not .npmignore). Publish @vn-mcp/shared first, then all 5 servers. Run `npm pack --dry-run` from each package directory to verify tarball contents and sizes.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- No npm account yet — plan includes: create npm account, create @vn-mcp org, npm login
- All packages published as scoped public: `npm publish --access public`
- 6 packages total: @vn-mcp/shared + 5 server packages
- Mock fixture JSON files included — users can run servers in mock mode out of the box
- Build output only in tarball (not src/) — use `"files"` field in package.json
- `exports` field must point to `./build/` (not `./src/`) for published packages
- `@vn-mcp/shared` must be a real versioned dependency (not workspace:*) in each server package.json
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NPM-01 | All 5 server packages published to npm under @vn-mcp scope | exports switch + files field + build all servers + npm publish --access public |
| NPM-02 | @vn-mcp/shared published as versioned dependency (not workspace:*) | Change `"*"` to `"^1.0.0"` in all 5 server package.json; publish shared first |
| NPM-03 | Each package installable standalone (npm install @vn-mcp/mcp-momo-vn) | exports point to ./build/; files field includes build; no workspace: refs in tarball |
| NPM-04 | npm pack --dry-run verification before publish | Run from each of 6 package dirs after build; verify no src/, check size < 50KB unpacked |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| npm CLI | 10.9.2 (current in repo) | Pack and publish packages | Already installed; native to project |
| tsdown | 0.21.4 (already in devDeps) | Build TypeScript to ESM + .d.ts | Already configured in all packages |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `"publishConfig"` (package.json field) | n/a (config, not library) | Declare scoped package as public permanently | Add to each package.json so `npm publish` never needs `--access public` flag |
| `"files"` (package.json field) | n/a | Whitelist what goes into the tarball | Required — .gitignore excludes build/ by default |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `"files"` field | `.npmignore` | .npmignore is more verbose (blacklist), "files" is safer (whitelist). Use "files". |
| Manual `npm publish` per package | `npm publish --workspaces` | Workspace flag publishes all at once but order is not guaranteed. Manual publish ensures shared goes first. |

**No additional installation required** — all tools already present.

---

## Architecture Patterns

### Publish Order (CRITICAL)
```
1. packages/shared       → npm publish (^1.0.0 must exist in registry first)
2. servers/mcp-momo-vn   → npm publish
3. servers/mcp-viettel-pay → npm publish
4. servers/mcp-vnpay     → npm publish
5. servers/mcp-zalo-oa   → npm publish
6. servers/mcp-zalopay-vn → npm publish
```

### Package.json Changes Per Package

**Every server package.json needs these 5 changes:**

```json
{
  "version": "1.0.0",
  "publishConfig": {
    "access": "public"
  },
  "files": ["build"],
  "exports": {
    ".": "./build/index.js",
    "./tools": "./build/tools/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "zod": "^3.25.76",
    "@vn-mcp/shared": "^1.0.0"
  }
}
```

**@vn-mcp/shared package.json needs these 4 changes:**

```json
{
  "version": "1.0.0",
  "publishConfig": {
    "access": "public"
  },
  "files": ["build"],
  "exports": {
    ".": "./build/index.js",
    "./errors": "./build/errors/index.js",
    "./http-client": "./build/http-client/index.js",
    "./mock-engine": "./build/mock-engine/index.js",
    "./test-helpers": "./build/test-helpers/index.js"
  }
}
```

### Build Before Pack — Wave Structure

**Wave 0 (account setup):** Create npm account, create @vn-mcp org on npmjs.com, `npm login`

**Wave 1 (package.json prep):** Apply the 5-change pattern to all 6 package.json files

**Wave 2 (build all):** `npm run build --workspaces --if-present` from repo root, or per-package; verify all 6 have build/ output

**Wave 3 (verify):** `npm pack --dry-run` from each package directory; confirm no src/, confirm size < 50KB unpacked

**Wave 4 (publish):** Publish shared first, then 5 servers in any order

### Anti-Patterns to Avoid
- **Relying on .gitignore exclusion:** The repo `.gitignore` has `build/` — without `"files"` field, npm WILL exclude the build directory and produce an empty/broken package. Always use `"files": ["build"]`.
- **Publishing before building:** 4 of 5 servers have no build/ yet (only momo-vn has one). Publishing without building first will fail or publish empty packages.
- **Setting exports to ./src/ in published package:** The monorepo uses `"./src/index.ts"` exports for workspace-internal resolution with tsx/ts-node. These MUST be changed to `"./build/index.js"` before publish.
- **Publishing @vn-mcp/shared last:** Server packages depend on it. If shared is published after servers, installing a server would fail to resolve @vn-mcp/shared from registry.
- **Using npm publish --workspaces:** Does not guarantee order. Publish manually in sequence.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tarball content control | Custom script to exclude files | `"files"` field in package.json | npm natively handles whitelist; "files" entries override .gitignore |
| Scoped package access | Custom registry config | `"publishConfig": {"access": "public"}` | Standard npm field; persists across publish commands |
| Workspace dep resolution | Custom pre-publish transform script | Manually set `"^1.0.0"` in deps | npm does NOT auto-replace `workspace:` or `*` with versions; manual is correct |
| Build verification | Custom tarball inspection script | `npm pack --dry-run` | Built-in; shows exact tarball contents and size |

**Key insight:** npm (unlike pnpm/yarn) does NOT implement the `workspace:` protocol at publish time. The current `"*"` wildcard in server deps also needs manual replacement — `*` resolves to "latest" from registry at install time, which is safe only after shared is published, but pinning to `^1.0.0` is correct practice.

---

## Common Pitfalls

### Pitfall 1: .gitignore Excludes build/ from Tarball
**What goes wrong:** `npm pack --dry-run` shows 0 or very few files; no build/ in tarball; installed package is broken (no JS to execute).
**Why it happens:** npm uses `.gitignore` as fallback when no `"files"` field and no `.npmignore`. The root `.gitignore` contains `build/`.
**How to avoid:** Add `"files": ["build"]` to each package.json BEFORE running npm pack. The `"files"` field takes priority over `.gitignore`.
**Warning signs:** `npm pack --dry-run` output shows only `package.json`, `README.md`, `CLAUDE.md` — no build/ entries.

### Pitfall 2: exports Still Point to ./src/ in Published Package
**What goes wrong:** After `npm install @vn-mcp/mcp-momo-vn`, `import` fails with "Cannot find module './src/index.ts'" — TypeScript source files are not included in the tarball.
**Why it happens:** Current package.json has `"exports": {".": "./src/index.ts"}`. This works in-monorepo with tsx but breaks for npm consumers.
**How to avoid:** Switch exports to `./build/index.js` in all package.json files. The `bin` field already correctly points to `./build/index.js`.
**Warning signs:** `npm pack --dry-run` shows no src/ (good!) but exports map still shows ./src/ paths.

### Pitfall 3: @vn-mcp/shared Not Yet Published When Server Packages Are Installed
**What goes wrong:** `npm install @vn-mcp/mcp-momo-vn` succeeds but `@vn-mcp/shared` can't be found: `npm ERR! 404 Not Found`.
**Why it happens:** Server packages depend on `@vn-mcp/shared` which must exist on registry before servers are installed.
**How to avoid:** Always publish @vn-mcp/shared first. Verify it's live on npmjs.com before publishing server packages.
**Warning signs:** Publishing servers before verifying shared is published; check with `npm view @vn-mcp/shared`.

### Pitfall 4: build/__tests__ Included in Tarball
**What goes wrong:** Tarball includes compiled test files (`build/__tests__/integration.test.js` etc.) — waste of space, confusing for consumers.
**Why it happens:** `"files": ["build"]` includes the entire build/ directory including __tests__.
**How to avoid:** Use `"files": ["build", "!build/__tests__"]` OR exclude test-helpers from @vn-mcp/shared's files (test-helpers is internal use only). Alternatively, configure tsdown to exclude test files from build output.
**Warning signs:** `npm pack --dry-run` shows `build/__tests__/` entries.

### Pitfall 5: npm Org Does Not Exist Yet
**What goes wrong:** `npm publish` fails with `403 Forbidden — you must be a member of the @vn-mcp org`.
**Why it happens:** Scoped packages require the npm org (@vn-mcp) to exist and the publishing account to be a member.
**How to avoid:** Wave 0 must create npm account AND create the @vn-mcp org at npmjs.com before any publish command runs.
**Warning signs:** Any `npm publish` error mentioning 403 or org not found.

### Pitfall 6: bin Script Not Executable
**What goes wrong:** Running `npx mcp-momo-vn` after install fails with "permission denied".
**Why it happens:** Built JS files may not have executable bit set; npm should handle this for `bin` entries, but worth verifying.
**How to avoid:** The `bin` field in package.json is handled by npm at install time — npm sets executable permissions automatically. Just ensure the `bin` path (`./build/index.js`) exists in the tarball.
**Warning signs:** Install succeeds but `npx @vn-mcp/mcp-momo-vn` fails.

---

## Code Examples

Verified patterns from npm documentation and project inspection:

### Final package.json Shape for a Server Package
```json
{
  "name": "@vn-mcp/mcp-momo-vn",
  "version": "1.0.0",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "files": ["build"],
  "bin": {
    "mcp-momo-vn": "./build/index.js"
  },
  "exports": {
    ".": "./build/index.js",
    "./tools": "./build/tools/index.js"
  },
  "scripts": {
    "build": "tsdown src/index.ts --format esm --dts",
    "dev": "tsx src/index.ts",
    "test": "MOMO_SANDBOX=true vitest run",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "zod": "^3.25.76",
    "@vn-mcp/shared": "^1.0.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

### Final package.json Shape for @vn-mcp/shared
```json
{
  "name": "@vn-mcp/shared",
  "version": "1.0.0",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "files": ["build"],
  "exports": {
    ".": "./build/index.js",
    "./errors": "./build/errors/index.js",
    "./http-client": "./build/http-client/index.js",
    "./mock-engine": "./build/mock-engine/index.js",
    "./test-helpers": "./build/test-helpers/index.js"
  },
  "scripts": {
    "build": "tsdown src/index.ts --format esm --dts",
    "dev": "tsx watch src/index.ts",
    "prepublishOnly": "npm run build"
  },
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "zod": "^3.25.76"
  }
}
```

### npm pack --dry-run Verification Command
```bash
# Run from each package directory
cd packages/shared && npm pack --dry-run
cd servers/mcp-momo-vn && npm pack --dry-run
cd servers/mcp-viettel-pay && npm pack --dry-run
cd servers/mcp-vnpay && npm pack --dry-run
cd servers/mcp-zalo-oa && npm pack --dry-run
cd servers/mcp-zalopay-vn && npm pack --dry-run
```

Pass criteria per package:
- No `src/` entries in tarball output
- `build/` entries present
- Unpacked size < 50KB

### Publish Sequence
```bash
# 1. Login (once)
npm login

# 2. Publish shared first
cd packages/shared
npm run build
npm publish

# 3. Verify shared exists on registry
npm view @vn-mcp/shared version

# 4. Publish each server
for srv in mcp-momo-vn mcp-viettel-pay mcp-vnpay mcp-zalo-oa mcp-zalopay-vn; do
  cd /path/to/servers/$srv
  npm run build
  npm pack --dry-run
  npm publish
done
```

### Smoke Test After Publish
```bash
# In a temp directory OUTSIDE the monorepo
mkdir /tmp/vn-mcp-test && cd /tmp/vn-mcp-test
npm init -y
npm install @vn-mcp/mcp-momo-vn
MOMO_SANDBOX=true npx mcp-momo-vn
# Expect: MCP server starts on stdio or exits cleanly (no import errors)
```

### .mcp.json Integration Test
```json
{
  "mcpServers": {
    "momo": {
      "command": "npx",
      "args": ["-y", "@vn-mcp/mcp-momo-vn"],
      "env": {
        "MOMO_SANDBOX": "true"
      }
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.npmignore` for exclusions | `"files"` field (whitelist) | ~2016+ | Safer: whitelist is explicit; accidentally including secrets is harder |
| `"main"` field only | `"exports"` field (subpath exports) | Node 12+, npm 7+ | Enables package encapsulation; subpath imports work properly |
| `"access": "public"` flag on CLI | `"publishConfig": {"access": "public"}` in package.json | Long-standing best practice | Prevents accidentally publishing as private; config is version-controlled |
| Publish from root with hoisting | Publish from each package directory | Current standard | Ensures correct package.json context is used (npm CLI bug with workspace publish paths) |

**Deprecated/outdated:**
- `"main"` field alone: Still works but superseded by `"exports"` map for subpath exports. All packages already use `"exports"`.
- `.npmignore`: Blacklist approach; more error-prone than `"files"` whitelist. Not needed for this project.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.x (already configured per-package) |
| Config file | `vitest.config.ts` (each package has one) |
| Quick run command | `MOMO_SANDBOX=true vitest run` (from server package dir) |
| Full suite command | `npm test` (from repo root — runs all vitest configs) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NPM-01 | All 5 servers published under @vn-mcp scope | manual (publish action) | `npm view @vn-mcp/mcp-momo-vn version` (smoke) | ❌ Wave 0 — needs publish-verify script |
| NPM-02 | @vn-mcp/shared published, no workspace:* in tarballs | smoke | `npm pack --dry-run` + grep for "workspace:" | ❌ Wave 0 — pack verification script |
| NPM-03 | Package installable standalone | integration (manual) | Install in temp dir + run npx | ❌ Wave 0 — smoke test script |
| NPM-04 | npm pack --dry-run passes for all 6 packages | smoke | `npm pack --dry-run 2>&1 \| grep -v "src/"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm pack --dry-run` from modified package directory
- **Per wave merge:** Full pack verification on all 6 packages
- **Phase gate:** All 6 packages live on npmjs.com; standalone install smoke test passes

### Wave 0 Gaps
- [ ] `scripts/verify-packs.sh` — runs `npm pack --dry-run` on all 6 packages, checks for src/ absence and size
- [ ] No framework install needed — vitest already present
- [ ] Standalone install smoke test (manual step, documented in VERIFICATION.md)

---

## Open Questions

1. **test-helpers subpath in @vn-mcp/shared**
   - What we know: `./test-helpers` is a published subpath in shared; build output includes `build/test-helpers/`
   - What's unclear: Should test-helpers be excluded from published tarball? It exposes vitest helpers consumers likely won't need.
   - Recommendation: Include it (current exports declare it, some advanced users may want it). Keep `"files": ["build"]` simple; don't special-case it. Can always remove in 1.1.x.

2. **prepublishOnly vs manual build step**
   - What we know: Adding `"prepublishOnly": "npm run build"` auto-builds before publish
   - What's unclear: CONTEXT.md says "Build script adjustments (tsdown config)" is at Claude's discretion
   - Recommendation: Add `prepublishOnly` to each package.json — it's a safety net that prevents publishing stale builds. Low risk.

3. **4 servers have no build output yet**
   - What we know: Only `servers/mcp-momo-vn/build/` exists; other 4 servers have no build directory
   - What's unclear: Whether other servers compile cleanly (may have TS errors)
   - Recommendation: Wave 2 must include `npm run build` for all packages. If any server fails to build, it needs fixing before publish can proceed.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of project files (package.json, tsconfig, build outputs, mock dirs)
- npm CLI `npm pack --dry-run` output — actual tarball simulation run on momo-vn and shared
- npm version `10.9.2` — verified installed version

### Secondary (MEDIUM confidence)
- [npm Docs — Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) — scoped publish flow
- [npm Docs — package.json files field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) — files whitelist behavior, always-included files
- [npm/cli Wiki — Files & Ignores](https://github.com/npm/cli/wiki/Files-&-Ignores) — "files" overrides .gitignore confirmed
- [npm Docs — npm-publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) — publish flags

### Tertiary (LOW confidence — flag for validation)
- [npm/cli issue #8845](https://github.com/npm/cli/issues/8845) — npm 11.6.4 throws EUNSUPPORTEDPROTOCOL for workspace: — confirms npm does not support workspace: protocol (relevant because project uses `"*"` not `workspace:`, but confirms manual version pinning is correct)
- [changesets/action issue #246](https://github.com/changesets/action/issues/246) — workspace:* not replaced at publish time — confirms behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct file inspection and npm pack dry-run
- Architecture: HIGH — derived from actual package.json state and npm CLI behavior
- Pitfalls: HIGH — Pitfalls 1-3 confirmed by dry-run output (src/ present, build excluded by .gitignore); others MEDIUM from docs/issues

**Research date:** 2026-03-23
**Valid until:** 2026-06-23 (stable npm publish behavior; 90 days)
