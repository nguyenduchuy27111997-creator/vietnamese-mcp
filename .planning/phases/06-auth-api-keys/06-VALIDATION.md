---
phase: 06
slug: auth-api-keys
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | apps/gateway/vitest.config.ts (existing from Phase 5) |
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
| 06-01-01 | 01 | 1 | AUTH-01 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | AUTH-02 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | AUTH-03 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | AUTH-04 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | AUTH-05 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/gateway/src/__tests__/auth.test.ts` — stubs for AUTH-01 through AUTH-05
- [ ] Supabase migration SQL file — schema for api_keys table with RLS

*Existing vitest infrastructure from Phase 5 covers framework.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS cross-tenant isolation | AUTH-05 | Requires two real Supabase users | Create two users, insert keys for each, verify neither can read the other's keys via Supabase client |
| Dashboard sign up/login flow | AUTH-01 | Browser interaction | Open dashboard URL, sign up with email, verify login, check key creation UI |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
