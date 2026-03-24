---
phase: 09-npm-publishing
verified: 2026-03-25T00:00:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "NPM-01 marked complete in REQUIREMENTS.md and STATE.md reflects phase 09 done"
    status: failed
    reason: "Plan 09-02 docs commit (99f7fad) updated ROADMAP and SUMMARY but did NOT update REQUIREMENTS.md NPM-01 from [ ] to [x], and STATE.md still shows stopped_at: Completed 09-01-PLAN.md with stale progress counters"
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "NPM-01 still shows '- [ ] **NPM-01**: All 5 server packages published to npm under @vn-mcp scope' — should be [x]"
      - path: ".planning/STATE.md"
        issue: "stopped_at shows 'Completed 09-01-PLAN.md'; completed_phases: 4; last_activity references phase 8. Needs update to reflect phase 09 complete."
    missing:
      - "Update REQUIREMENTS.md: change '- [ ] **NPM-01**' to '- [x] **NPM-01**' and update traceability table 'NPM-01 | Phase 9 | Pending' to 'Complete'"
      - "Update STATE.md: stopped_at, completed_phases (5), completed_plans (14), percent (100), last_activity, current focus to Phase 10"
human_verification:
  - test: "Add published server to .mcp.json and run a tool call"
    expected: "Running a tool call through @vn-mcp/mcp-momo-vn (installed via npm, not local workspace) completes end-to-end without errors or import failures"
    why_human: "Cannot verify Claude Code MCP client behavior or .mcp.json runtime execution programmatically"
---

# Phase 9: npm Publishing Verification Report

**Phase Goal:** All 5 server packages are published to npm under @vn-mcp scope and installable standalone outside the monorepo, enabling the self-hosted free tier
**Verified:** 2026-03-25
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | All 6 package.json files have version, publishConfig access public, files ["build"], exports to ./build/, and prepublishOnly | VERIFIED | All 6 package.json confirmed: version 1.0.0 (shared) / 1.0.2 (servers), publishConfig.access=public, files=["build"], exports=./build/, prepublishOnly="npm run build" |
| 2  | All 5 server packages depend on @vn-mcp/shared ^1.0.0 (not * or workspace:*) | VERIFIED | All 5 servers have `"@vn-mcp/shared": "^1.0.0"` in dependencies; grep for `workspace:` returns no matches across all 6 package.json files |
| 3  | All 6 packages have build/index.js present | VERIFIED | All 6 `build/index.js` files exist on disk |
| 4  | All 6 packages are published on npm registry | VERIFIED | `npm view` returns: @vn-mcp/shared@1.0.0, @vn-mcp/mcp-momo-vn@1.0.2, @vn-mcp/mcp-viettel-pay@1.0.2, @vn-mcp/mcp-vnpay@1.0.2, @vn-mcp/mcp-zalo-oa@1.0.2, @vn-mcp/mcp-zalopay-vn@1.0.2 |
| 5  | npm install @vn-mcp/mcp-momo-vn succeeds standalone and server binary runs | VERIFIED | 09-02-SUMMARY.md documents standalone install smoke test passed (exit 0, transitive @vn-mcp/shared resolved, npx mcp-momo-vn starts without import errors) |
| 6  | NPM-01 tracking artifacts updated (REQUIREMENTS.md + STATE.md reflect phase complete) | FAILED | NPM-01 still shows `[ ]` in REQUIREMENTS.md; traceability table still shows "Pending"; STATE.md shows stopped_at 09-01, completed_phases: 4 |

**Score:** 5/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/package.json` | version 1.0.0, publishConfig, files, build exports | VERIFIED | All fields present and correct |
| `servers/mcp-momo-vn/package.json` | version 1.0.2, publishConfig, @vn-mcp/shared ^1.0.0 | VERIFIED | All fields present; version advanced to 1.0.2 after two post-publish fixes |
| `servers/mcp-viettel-pay/package.json` | version 1.0.2, publishConfig, @vn-mcp/shared ^1.0.0 | VERIFIED | All fields present |
| `servers/mcp-vnpay/package.json` | version 1.0.2, publishConfig, @vn-mcp/shared ^1.0.0 | VERIFIED | All fields present |
| `servers/mcp-zalo-oa/package.json` | version 1.0.2, publishConfig, @vn-mcp/shared ^1.0.0 | VERIFIED | All fields present |
| `servers/mcp-zalopay-vn/package.json` | version 1.0.2, publishConfig, @vn-mcp/shared ^1.0.0 | VERIFIED | All fields present |
| `packages/shared/build/index.js` | Built artifact for @vn-mcp/shared | VERIFIED | Exists on disk |
| `servers/mcp-momo-vn/build/index.js` | Built artifact with shebang | VERIFIED | Exists; begins with `#!/usr/bin/env node` |
| `.planning/REQUIREMENTS.md` (NPM-01) | NPM-01 marked [x] complete | FAILED | Still shows `[ ]` — not updated after 09-02 completion |
| `.planning/STATE.md` | Reflects phase 09 complete, progress counters current | FAILED | stopped_at shows 09-01; completed_phases: 4; stale last_activity |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| servers/*/package.json | packages/shared/package.json | `"@vn-mcp/shared": "^1.0.0"` dependency | WIRED | All 5 servers have pinned semver dep; no workspace:* refs |
| @vn-mcp/mcp-momo-vn (npm) | @vn-mcp/shared (npm) | npm dependency resolution at install time | WIRED | Confirmed via npm view @vn-mcp/mcp-momo-vn dependencies showing @vn-mcp/shared: ^1.0.0 |
| build/index.js | Node.js binary execution | `#!/usr/bin/env node` shebang | WIRED | Shebang present in all 5 server src/index.ts and built artifacts |
| src/client.ts | JSON mock fixtures | `import ... with { type: 'json' }` | WIRED | All server client.ts files use JSON import attributes (Node.js 23+ compatible) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| NPM-01 | 09-02-PLAN.md | All 5 server packages published to npm under @vn-mcp scope | SATISFIED (not reflected in tracking) | npm view confirms all 5 servers live at 1.0.2 under @vn-mcp scope; REQUIREMENTS.md checkbox not updated |
| NPM-02 | 09-01-PLAN.md | @vn-mcp/shared published as versioned dependency (not workspace:*) | SATISFIED | @vn-mcp/shared@1.0.0 on npm; all server deps use ^1.0.0 |
| NPM-03 | 09-01-PLAN.md, 09-02-PLAN.md | Each package installable standalone | SATISFIED | 09-02 smoke test: npm install succeeds, transitive dep resolved, npx binary runs |
| NPM-04 | 09-01-PLAN.md | npm pack --dry-run verification before publish | SATISFIED | 09-01-SUMMARY confirms all 6 packages dry-run verified: build/ present, src/ absent, sizes 22-38 kB |

**Orphaned requirements check:** No requirements mapped to Phase 9 in REQUIREMENTS.md that are missing from plans. All 4 NPM requirements (NPM-01 through NPM-04) claimed by plans 09-01 and 09-02.

**Tracking gap:** NPM-01 shows `[ ]` (pending) in REQUIREMENTS.md and "Pending" in the traceability table despite the requirement being satisfied. The 09-02 docs commit (99f7fad) updated ROADMAP.md and created 09-02-SUMMARY.md but skipped REQUIREMENTS.md and STATE.md.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | NPM-01 checkbox not updated after publish | Warning | Misleading tracking state; `[ ]` implies work not done |
| `.planning/STATE.md` | stopped_at, completed_phases, last_activity are stale | Warning | Orchestrator picking up state would see phase 09 as incomplete |

No anti-patterns found in code artifacts (build files, package.json files, source files are clean).

### Human Verification Required

#### 1. End-to-end tool call via published npm package

**Test:** Install `@vn-mcp/mcp-momo-vn` via npm (not the local workspace copy) in a fresh `.mcp.json` config, then issue a `momo_create_payment` tool call from Claude Code.
**Expected:** Tool call completes and returns a mock payment URL with `_mock: true` in the response — no import errors, no module resolution failures.
**Why human:** Cannot verify Claude Code MCP client runtime behavior or `.mcp.json` execution flow programmatically.

### Gaps Summary

The phase goal is substantively achieved: all 5 servers are live on npm, installable standalone, tarballs are clean (build/ only, no src/, under 50 kB), and the binary runs without errors. The post-publish version bumps (1.0.0 → 1.0.2) correctly addressed the shebang and JSON import attribute issues.

The single gap is documentation tracking: the 09-02 docs commit neglected to update REQUIREMENTS.md (NPM-01 checkbox) and STATE.md (phase progress). This leaves the project tracking in a misleading state — NPM-01 shows "Pending" when the requirement is actually satisfied and all packages are live on npmjs.com.

The fix is mechanical: mark NPM-01 `[x]` in REQUIREMENTS.md, update the traceability table to "Complete", and update STATE.md to reflect phase 09 complete with accurate progress counters.

---

_Verified: 2026-03-25_
_Verifier: Claude (gsd-verifier)_
