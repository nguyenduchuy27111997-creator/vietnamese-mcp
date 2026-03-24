---
phase: 10
slug: landing-page-docs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | mintlify dev (local preview) + file existence checks |
| **Config file** | apps/docs/docs.json |
| **Quick run command** | `ls apps/docs/docs.json && ls apps/docs/quickstart.mdx` |
| **Full suite command** | `cd apps/docs && npx mintlify dev --port 3333` (manual visual check) |
| **Estimated runtime** | ~5 seconds (file checks), ~30 seconds (local preview startup) |

---

## Sampling Rate

- **After every task commit:** File existence checks
- **After every plan wave:** Local preview visual check
- **Before `/gsd:verify-work`:** Full site accessible via public URL
- **Max feedback latency:** 5 seconds (file checks)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SITE-01, SITE-04 | file | `ls apps/docs/docs.json apps/docs/index.mdx` | N/A | ⬜ pending |
| 10-01-02 | 01 | 1 | SITE-02 | file | `ls apps/docs/quickstart.mdx` | N/A | ⬜ pending |
| 10-01-03 | 01 | 1 | SITE-03 | file | `ls apps/docs/servers/momo.mdx` | N/A | ⬜ pending |
| 10-02-01 | 02 | 2 | SITE-04 | manual | Visual check of deployed site | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*No test framework needed — Mintlify uses MDX files verified by local preview.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Site loads at public URL | SITE-04 | External deployment | Visit Mintlify subdomain URL |
| Pricing table shows 4 tiers with USD/VND toggle | SITE-01 | Visual verification | Check landing page pricing section |
| Quickstart tabs work (hosted/self-hosted) | SITE-02 | Interactive UI element | Click both tabs, verify content |
| 5-minute quickstart achievable | SITE-02 | End-to-end UX test | Follow quickstart from scratch |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
