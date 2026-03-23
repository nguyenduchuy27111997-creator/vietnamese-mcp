---
phase: 09
slug: npm-publishing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | npm pack --dry-run + npm test |
| **Config file** | package.json (each package) |
| **Quick run command** | `npm pack --dry-run` (per package) |
| **Full suite command** | `npm test` (root — runs all workspaces) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm pack --dry-run` in modified package
- **After every plan wave:** Run full test suite
- **Before `/gsd:verify-work`:** Full suite + npm pack --dry-run on all 6 packages
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | NPM-02 | pack | `npm pack --dry-run` | N/A | ⬜ pending |
| 09-01-02 | 01 | 1 | NPM-01, NPM-03, NPM-04 | pack | `npm pack --dry-run` (all 5 servers) | N/A | ⬜ pending |
| 09-02-01 | 02 | 2 | NPM-01, NPM-03 | integration | `npm install` from temp dir | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing npm tooling covers all needs. No test framework installation required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| npm publish succeeds | NPM-01 | Requires npm account + 2FA | Run npm publish --access public for each package |
| Package usable from .mcp.json | NPM-03 | Requires end-to-end MCP client | Install from npm, add to .mcp.json, run tool call |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
