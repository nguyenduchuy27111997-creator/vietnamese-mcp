---
phase: 2
slug: momo-server
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `servers/mcp-momo-vn/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `cd servers/mcp-momo-vn && npm test` |
| **Full suite command** | `npm test --workspace=servers/mcp-momo-vn` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd servers/mcp-momo-vn && npm test`
- **After every plan wave:** Run `npm test --workspace=servers/mcp-momo-vn`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | MOMO-05 | unit | `cd servers/mcp-momo-vn && npm test` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | MOMO-05 | unit | `cd servers/mcp-momo-vn && npm test` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | MOMO-01 | integration | `cd servers/mcp-momo-vn && npm test` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | MOMO-02, MOMO-03 | integration | `cd servers/mcp-momo-vn && npm test` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | MOMO-04 | integration | `cd servers/mcp-momo-vn && npm test` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 3 | MOMO-01..05 | e2e | `cd servers/mcp-momo-vn && npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `servers/mcp-momo-vn/vitest.config.ts` — vitest config for server package
- [ ] `servers/mcp-momo-vn/package.json` — with test script setting `MOMO_SANDBOX=true`
- [ ] `servers/mcp-momo-vn/tsconfig.json` — extends base, composite:true

*Existing infrastructure covers framework (vitest installed at root).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code can invoke tools via `.mcp.json` | MOMO-01..04 | Requires Claude Code runtime | Add server to `.mcp.json`, ask Claude Code to create a payment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
