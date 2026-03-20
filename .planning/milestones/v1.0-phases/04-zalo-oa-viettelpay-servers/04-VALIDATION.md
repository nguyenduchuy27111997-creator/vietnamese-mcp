---
phase: 4
slug: zalo-oa-viettelpay-servers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `servers/mcp-zalo-oa/vitest.config.ts`, `servers/mcp-viettel-pay/vitest.config.ts` |
| **Quick run command** | `npm test --workspace=servers/mcp-zalo-oa && npm test --workspace=servers/mcp-viettel-pay` |
| **Full suite command** | `npm test` (all 5 servers) |
| **Estimated runtime** | ~15 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run server-specific `npm test --workspace=servers/{server}`
- **After every plan wave:** Run `npm test` (full monorepo suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | ZLOA-05 | unit | `npm test --workspace=servers/mcp-zalo-oa` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | ZLOA-01..04 | integration | `npm test --workspace=servers/mcp-zalo-oa` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | VTPAY-04 | unit | `npm test --workspace=servers/mcp-viettel-pay` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | VTPAY-01..03 | integration | `npm test --workspace=servers/mcp-viettel-pay` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | INFRA-07..08 | file check | `ls servers/*/CLAUDE.md servers/*/README.md` | ❌ | ⬜ pending |
| 04-03-02 | 03 | 2 | INFRA-09 | e2e | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `servers/mcp-zalo-oa/vitest.config.ts` — vitest config
- [ ] `servers/mcp-zalo-oa/package.json` — with `ZALO_OA_SANDBOX=true` test script
- [ ] `servers/mcp-viettel-pay/vitest.config.ts` — vitest config
- [ ] `servers/mcp-viettel-pay/package.json` — with `VIETTEL_PAY_SANDBOX=true` test script

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code can invoke all 5 servers via `.mcp.json` | All | Requires Claude Code runtime | Add all servers to `.mcp.json`, test each |
| CLAUDE.md and README.md are accurate and readable | INFRA-07, INFRA-08 | Content quality requires human review | Read each doc, verify against actual tools |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
