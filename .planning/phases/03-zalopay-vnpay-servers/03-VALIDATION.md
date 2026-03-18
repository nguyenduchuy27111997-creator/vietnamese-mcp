---
phase: 3
slug: zalopay-vnpay-servers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `servers/mcp-zalopay-vn/vitest.config.ts`, `servers/mcp-vnpay/vitest.config.ts` |
| **Quick run command** | `npm test --workspace=servers/mcp-zalopay-vn && npm test --workspace=servers/mcp-vnpay` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run server-specific `npm test --workspace=servers/{server}`
- **After every plan wave:** Run `npm test` (full monorepo suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ZPAY-05 | unit | `npm test --workspace=servers/mcp-zalopay-vn` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | ZPAY-01..04 | integration | `npm test --workspace=servers/mcp-zalopay-vn` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | VNPY-04 | unit | `npm test --workspace=servers/mcp-vnpay` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | VNPY-01..03 | integration | `npm test --workspace=servers/mcp-vnpay` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `servers/mcp-zalopay-vn/vitest.config.ts` — vitest config for ZaloPay server
- [ ] `servers/mcp-zalopay-vn/package.json` — with test script setting `ZALOPAY_SANDBOX=true`
- [ ] `servers/mcp-vnpay/vitest.config.ts` — vitest config for VNPAY server
- [ ] `servers/mcp-vnpay/package.json` — with test script setting `VNPAY_SANDBOX=true`

*Existing infrastructure covers framework (vitest installed at root).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claude Code can invoke ZaloPay tools via `.mcp.json` | ZPAY-01..04 | Requires Claude Code runtime | Add server to `.mcp.json`, invoke `zalopay_create_order` |
| Claude Code can invoke VNPAY tools via `.mcp.json` | VNPY-01..03 | Requires Claude Code runtime | Add server to `.mcp.json`, invoke `vnpay_create_payment_url` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
