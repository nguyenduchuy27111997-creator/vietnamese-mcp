---
phase: 08-billing
plan: 02
subsystem: payments
tags: [stripe, webhooks, checkout, billing, subscription, idempotency]

# Dependency graph
requires:
  - phase: 08-billing/08-01
    provides: PaymentProvider interface, checkIdempotency, handleTierUpgrade, GatewayEnv types with billing fields, stripe_customer_id column on api_keys

provides:
  - StripeProvider implementing PaymentProvider (createCheckoutUrl with mode=subscription)
  - verifyStripeWebhook using constructEventAsync + createSubtleCryptoProvider (CF Workers compatible)
  - POST /billing/create-checkout route
  - POST /billing/stripe-webhook with idempotency + checkout.session.completed + invoice.paid + customer.subscription.deleted handlers
  - GET /billing/portal — Stripe Customer Portal session URL
  - billingRouter mounted at /billing in index.ts with correct auth routing
  - 12 real tests replacing all Wave 0 it.todo stubs

affects: [08-03-momo, phase-09, phase-10]

# Tech tracking
tech-stack:
  added: [stripe@17+]
  patterns:
    - Stripe client instantiated per-request (not module scope) — required for CF Workers env binding access
    - constructEventAsync + createSubtleCryptoProvider — async WebCrypto for CF Workers webhook signature verification
    - c.req.text() (not json()) for webhook raw body — required for Stripe signature verification
    - invoice.parent.subscription_details — Stripe v17+ API for renewal tier metadata
    - Vi.mock factory uses inline vi.fn() to avoid hoisting ReferenceError; access via constructor properties

key-files:
  created:
    - apps/gateway/src/billing/stripe.ts
    - apps/gateway/src/routes/billing.ts
    - apps/gateway/src/__tests__/billing-stripe.test.ts
  modified:
    - apps/gateway/src/index.ts
    - apps/gateway/package.json
    - package.json
    - package-lock.json

key-decisions:
  - "Stripe client created per-request via createStripeClient(env.STRIPE_SECRET_KEY) — CF Workers env only available inside handler"
  - "invoice.paid uses invoice.parent.subscription_details.metadata for tier (Stripe v17+ API) — avoids extra subscriptions.retrieve() call when metadata is present"
  - "invoice.paid falls back to subscriptions.retrieve() when subscription_details.metadata is null — handles edge cases"
  - "JWT auth on /billing/create-checkout and /billing/portal only — /billing/stripe-webhook and /billing/momo-ipn use their own signature auth"
  - "vi.mock factory stores mock fns on constructor via Object.assign — avoids hoisting ReferenceError for accessing them in tests"

patterns-established:
  - "Stripe webhook pattern: text() body → constructEventAsync → checkIdempotency first → switch on event.type"
  - "Per-request Stripe client: createStripeClient(env.STRIPE_SECRET_KEY) inside handlers, never module scope"

requirements-completed: [BILL-01, BILL-02]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 8 Plan 02: Stripe Provider Summary

**Stripe Checkout sessions, webhook handler (checkout + invoice.paid renewal + subscription.deleted), Customer Portal, and 12 real tests replacing Wave 0 todos**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-23T10:22:42Z
- **Completed:** 2026-03-23T10:28:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- StripeProvider implements PaymentProvider with createCheckoutUrl using mode=subscription
- Webhook handler processes 3 event types: checkout.session.completed (stores stripe_customer_id + upgrades tier), invoice.paid (re-confirms tier on renewal per RESEARCH.md Pitfall 4), customer.subscription.deleted (downgrades to free)
- All 12 Stripe tests pass; zero it.todo remaining; full 77-test gateway suite green

## Task Commits

Each task was committed atomically:

1. **Task 1: StripeProvider + billing routes + index.ts wiring** - `269b934` (feat)
2. **Task 2: Replace Wave 0 Stripe test todos** - `de5eedc` (feat)
3. **Task 2 TS fix: as unknown as cast** - `4078af2` (fix)

## Files Created/Modified

- `apps/gateway/src/billing/stripe.ts` - StripeProvider, verifyStripeWebhook, createPortalSession, createStripeClient
- `apps/gateway/src/routes/billing.ts` - Hono router: /create-checkout, /stripe-webhook, /portal
- `apps/gateway/src/__tests__/billing-stripe.test.ts` - 12 real tests (was 12 it.todo stubs)
- `apps/gateway/src/index.ts` - Added billingRouter import + /billing/* CORS + JWT auth on checkout/portal
- `apps/gateway/package.json` - Added stripe dependency

## Decisions Made

- **Stripe client per-request:** `createStripeClient(env.STRIPE_SECRET_KEY)` inside handlers. CF Workers env bindings only available during request handling.
- **invoice.paid uses Stripe v17+ API:** `invoice.parent.subscription_details.metadata` for tier — skips extra `subscriptions.retrieve()` call when metadata is present, falls back when null.
- **Test mock strategy:** `vi.mock` factory stores mock fns on constructor via `Object.assign` to avoid hoisting `ReferenceError`. Access via `StripeMock._checkoutCreate` etc.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated invoice.paid to use Stripe v17+ API (parent.subscription_details)**
- **Found during:** Task 1 (billing routes implementation)
- **Issue:** Plan referenced `invoice.subscription` but Stripe v17+ moved subscription reference to `invoice.parent.subscription_details.subscription`. TypeScript error: `Property 'subscription' does not exist on type 'Invoice'`.
- **Fix:** Use `invoice.parent.subscription_details.metadata` for tier (avoids extra API call). Fall back to `subscriptions.retrieve()` only when metadata is null.
- **Files modified:** apps/gateway/src/routes/billing.ts
- **Verification:** TypeScript compiles without billing errors; invoice.paid tests pass
- **Committed in:** 269b934 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Fixed TypeScript cast in billing tests**
- **Found during:** Task 2 post-commit verification
- **Issue:** `{ from: mockFrom } as ReturnType<typeof createClient>` fails TS strict check — same pre-existing issue in auth-middleware.test.ts line 41
- **Fix:** Use `as unknown as ReturnType<typeof createClient>` intermediate cast
- **Files modified:** apps/gateway/src/__tests__/billing-stripe.test.ts
- **Verification:** No billing-stripe TypeScript errors
- **Committed in:** 4078af2

---

**Total deviations:** 2 auto-fixed (1 bug/API change, 1 TypeScript cast)
**Impact on plan:** Both fixes required for compilation and correctness. The invoice.paid change improves efficiency by using inline metadata where available.

## Issues Encountered

None — both deviations were caught and fixed inline during task execution.

## User Setup Required

**External services require manual configuration.** See Stripe setup requirements in plan frontmatter:
- `STRIPE_SECRET_KEY` — Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — `stripe listen --forward-to localhost:8787/billing/stripe-webhook`
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` — Create products in Stripe Dashboard
- Enable Customer Portal in Stripe Dashboard → Settings → Billing → Customer portal

## Next Phase Readiness

- Stripe billing complete — ready for Plan 03 (MoMo provider)
- billingRouter at /billing accepts POST /momo-ipn route (Plan 03 will add it)
- All Stripe functionality tested and verified

## Self-Check: PASSED

All created files exist. All task commits verified.

---
*Phase: 08-billing*
*Completed: 2026-03-23*
