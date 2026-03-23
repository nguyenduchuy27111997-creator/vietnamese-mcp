---
phase: 08
slug: billing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 08 — Validation Strategy

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
| 08-01-01 | 01 | 1 | BILL-05 | unit | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | BILL-01, BILL-02 | unit | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 2 | BILL-03, BILL-04 | unit | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 3 | BILL-01, BILL-06 | integration | `npm test --workspace=apps/gateway` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/gateway/src/__tests__/billing-stripe.test.ts` — stubs for BILL-01, BILL-02 (Stripe checkout, webhooks)
- [ ] `apps/gateway/src/__tests__/billing-momo.test.ts` — stubs for BILL-03, BILL-04 (MoMo IPN, HMAC verify)
- [ ] `apps/gateway/src/__tests__/tier-upgrade.test.ts` — stubs for BILL-05 (PaymentProvider abstraction)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout completes and webhook fires | BILL-01 | Requires Stripe test mode + browser | Create checkout session, complete with test card 4242..., verify tier upgrade |
| MoMo IPN delivery with valid HMAC | BILL-04 | Requires MoMo sandbox (pending KYC) | Send test IPN to webhook endpoint, verify tier upgrade |
| Free tier requires no credit card | BILL-06 | UX verification | Sign up new user, verify tool calls work without any payment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
