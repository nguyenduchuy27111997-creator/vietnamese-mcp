---
phase: 05
slug: gateway
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | apps/gateway/vitest.config.ts (Wave 0 creates) |
| **Quick run command** | `npm test --workspace=apps/gateway` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test --workspace=apps/gateway`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | GATE-01 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | GATE-02 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | GATE-03 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | GATE-04 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 05-02-03 | 02 | 1 | GATE-05 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/gateway/vitest.config.ts` — test config for gateway workspace
- [ ] `apps/gateway/src/__tests__/integration.test.ts` — stubs for GATE-01 through GATE-05
- [ ] `apps/gateway/package.json` — workspace package with vitest dev dependency

*Existing vitest infrastructure in monorepo covers framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE connection alive 60s idle | GATE-04 | Requires real CF Workers runtime with timing | Deploy to preview, open SSE connection, wait 60s, verify heartbeat received |
| Browser CORS preflight | GATE-05 | Requires real browser origin header | Use curl with -H "Origin: http://localhost:3000" to verify Access-Control headers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
