---
phase: 07
slug: metering
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | apps/gateway/vitest.config.ts |
| **Quick run command** | `npm test --workspace=apps/gateway` |
| **Full suite command** | `npm test --workspace=apps/gateway` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=apps/gateway`
- **After every plan wave:** Run `npm test --workspace=apps/gateway`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | METR-01 | unit | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 07-01-02 | 01 | 1 | METR-04 | unit | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 2 | METR-03 | unit | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 07-02-02 | 02 | 2 | METR-02 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/gateway/src/__tests__/metering.test.ts` — stubs for METR-01, METR-04 (event ingestion, non-blocking)
- [ ] `apps/gateway/src/__tests__/usageLimits.test.ts` — stubs for METR-02, METR-03 (usage query, tier limits)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tinybird event appears within 5s | METR-01 | Requires live Tinybird workspace | Deploy, call tool, check Tinybird UI for event row |
| Gateway latency unchanged | METR-04 | Requires timing comparison | Compare curl response times before/after metering code |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
