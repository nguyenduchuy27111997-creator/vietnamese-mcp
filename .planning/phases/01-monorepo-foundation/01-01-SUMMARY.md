---
phase: 01-monorepo-foundation
plan: 01
subsystem: infra
tags: [npm-workspaces, typescript, eslint, vitest, tsdown, tsx, monorepo]

# Dependency graph
requires: []
provides:
  - npm workspaces monorepo with packages/* and servers/* directories
  - tsconfig.base.json with strict mode and Node16 module resolution
  - ESLint flat config enforcing no-console.log (error), allowing console.error/warn
  - vitest configured for Node environment with globals
  - packages/shared (@vn-mcp/shared) scaffold with subpath exports and tsdown build
  - Node.js >=20 enforced via engines field and .nvmrc
affects:
  - 01-02
  - 01-03
  - 02-momo
  - 03-zalopay
  - 04-zalo-oa
  - 05-vnpay
  - 06-viettel-pay

# Tech tracking
tech-stack:
  added:
    - typescript@^5.8 (5.9.3 installed)
    - tsx@^4.21.0
    - tsdown@^0.21.4
    - vitest@^3.2.4
    - @types/node@^20.19.37
    - eslint@^9.39.4
    - @eslint/js@^9.39.4
    - typescript-eslint@^8.57.1
  patterns:
    - ESM-only codebase ("type": "module" at root)
    - npm workspaces for package linking (no pnpm, no Turborepo)
    - ESLint flat config format (eslint.config.js, not .eslintrc)
    - tsdown for bundling (not tsup — tsup is unmaintained)
    - tsx for development execution
    - TypeScript composite mode for workspace packages (enables project references)

key-files:
  created:
    - package.json (root workspace config)
    - tsconfig.base.json (shared TS compiler options)
    - .nvmrc (Node 20 enforcement)
    - .gitignore (node_modules, build, dist, .env patterns)
    - vitest.config.ts (Node environment, globals)
    - servers/.gitkeep (placeholder for server packages)
    - eslint.config.js (flat config, no-console rule)
    - packages/shared/package.json (@vn-mcp/shared with subpath exports)
    - packages/shared/tsconfig.json (extends base, composite:true)
    - packages/shared/src/index.ts (barrel export with VERSION constant)
  modified: []

key-decisions:
  - "ESLint ignores include .claude/** and .planning/** — GSD tooling uses CJS require() which would fail ESM linting rules"
  - "tsdown builds to dist/ (not build/) for packages/shared — tsdown default output dir"
  - "packages/shared exports map uses source .ts paths for workspace development"

patterns-established:
  - "Pattern: All workspace packages use type:module and engines:>=20"
  - "Pattern: ESLint flat config at repo root covers all packages, with .claude/** and .planning/** excluded"
  - "Pattern: Per-package tsconfig.json extends ../../tsconfig.base.json with composite:true"
  - "Pattern: tsdown as the build tool for workspace packages (format:esm, --dts)"

requirements-completed: [INFRA-01, INFRA-10]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 1 Plan 01: Monorepo Foundation Summary

**npm workspaces monorepo with TypeScript strict/Node16, ESLint no-console-log enforcement, vitest, and @vn-mcp/shared scaffold — the foundation all 5 MCP servers depend on**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T00:55:48Z
- **Completed:** 2026-03-18T00:57:51Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Working npm workspaces monorepo — `npm install` links packages/shared as @vn-mcp/shared
- TypeScript foundation with strict mode, Node16 module resolution, composite mode for project references
- ESLint flat config that errors on console.log but allows console.error/warn (critical for MCP stdio transport)
- vitest configured and runnable (exits 0 when test files exist)
- packages/shared builds cleanly with tsdown producing ESM output

## Task Commits

Each task was committed atomically:

1. **Task 1: Create monorepo root with npm workspaces, TypeScript base config, and tooling configs** - `650dde8` (chore)
2. **Task 2: Create packages/shared scaffold and ESLint no-console-log rule** - `41f5503` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `package.json` - npm workspaces root config (packages/*, servers/*), type:module, engines>=20, scripts
- `tsconfig.base.json` - Shared TS compiler options: strict, Node16, ES2022, declaration, sourceMap
- `.nvmrc` - Node 20 enforcement
- `.gitignore` - Ignores: node_modules, build, dist, *.tsbuildinfo, .env, .env.*
- `vitest.config.ts` - Node environment, globals enabled
- `servers/.gitkeep` - Placeholder for MCP server packages
- `eslint.config.js` - Flat config with no-console rule (error, allow: [error, warn])
- `packages/shared/package.json` - @vn-mcp/shared with subpath exports for errors, http-client, mock-engine, test-helpers
- `packages/shared/tsconfig.json` - Extends ../../tsconfig.base.json, composite:true
- `packages/shared/src/index.ts` - Barrel export placeholder with VERSION constant

## Decisions Made
- Added `.claude/**` and `.planning/**` to ESLint ignores — GSD tooling files are CommonJS (use require()) which violates the no-require-imports TypeScript-ESLint rule. These directories are tooling infrastructure, not project source code.
- tsdown output goes to `dist/` by default (tsdown convention), not `build/` as specified in tsconfig.base.json outDir — for published packages tsdown handles bundling; tsc outDir is for direct compilation use
- packages/shared exports map references source `.ts` files for workspace development (TypeScript project references resolve these directly)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended ESLint ignores to cover .claude/** and .planning/** directories**
- **Found during:** Task 2 (ESLint verification)
- **Issue:** ESLint linted the GSD tooling files in `.claude/` which are CommonJS (use `require()`) — generated 271 lint errors unrelated to project source code
- **Fix:** Added `.claude/**` and `.planning/**` to the `ignores` array in eslint.config.js
- **Files modified:** `eslint.config.js`
- **Verification:** `npm run lint` passes cleanly on clean codebase; `console.log` in a temp .ts file still triggers lint error
- **Committed in:** `41f5503` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix — `.claude/` tooling is pre-existing CJS infrastructure that is not project source. No scope creep.

## Issues Encountered
- Node v23.11.0 is installed locally (project enforces >=20). ESLint visitor keys package has a strict engine constraint requiring `^20.19.0 || ^22.13.0 || >=24` — generates a warning on npm install with v23. Not an error; npm install still succeeds. Node 20 LTS is the target runtime per project requirements.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo foundation is complete and all tooling is verified
- packages/shared is registered as @vn-mcp/shared in the workspace and builds cleanly
- ESLint no-console-log enforcement active from day one
- Ready for Phase 1 Plan 02: packages/shared implementation (HMAC, errors, mock-engine, http-client, test-helpers)

## Self-Check: PASSED

All files exist and commits are verified:
- package.json: FOUND
- tsconfig.base.json: FOUND
- .nvmrc: FOUND
- .gitignore: FOUND
- vitest.config.ts: FOUND
- servers/.gitkeep: FOUND
- eslint.config.js: FOUND
- packages/shared/package.json: FOUND
- packages/shared/tsconfig.json: FOUND
- packages/shared/src/index.ts: FOUND
- Commit 650dde8: FOUND (Task 1)
- Commit 41f5503: FOUND (Task 2)

---
*Phase: 01-monorepo-foundation*
*Completed: 2026-03-18*
