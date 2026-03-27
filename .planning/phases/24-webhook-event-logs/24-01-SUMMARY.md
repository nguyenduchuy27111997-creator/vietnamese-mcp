---
phase: 24-webhook-event-logs
plan: "01"
subsystem: gateway
tags: [webhook, logging, stripe, momo, supabase, jwt-auth]
dependency_graph:
  requires: []
  provides: [webhook_logs table, logWebhookEvent utility, GET /webhook-logs endpoint]
  affects: [apps/gateway/src/routes/billing.ts, apps/gateway/src/index.ts]
tech_stack:
  added: []
  patterns: [fire-and-forget via waitUntil, JWT-authed Hono router, service-role Supabase insert]
key_files:
  created:
    - apps/gateway/supabase/migrations/004_webhook_logs.sql
    - apps/gateway/src/lib/webhookLogger.ts
    - apps/gateway/src/routes/webhookLogs.ts
  modified:
    - apps/gateway/src/routes/billing.ts
    - apps/gateway/src/index.ts
decisions:
  - "logWebhookEvent is fire-and-forget: no throw on insert failure so webhook processing is never blocked"
  - "GET /webhook-logs shows all logs (not scoped to user_id) — platform-wide debugging tool for v1"
  - "MoMo invalid-signature and invalid-extraData failures are logged before returning 400"
  - "Stripe handler wraps switch in try/catch to capture processing failures and log status=failed"
metrics:
  duration_seconds: 112
  tasks_completed: 2
  files_changed: 5
  completed_date: "2026-03-27"
---

# Phase 24 Plan 01: Webhook Event Logs — Backend Foundation Summary

**One-liner:** Persistent webhook_logs table + logWebhookEvent fire-and-forget helper + JWT-authed GET /webhook-logs endpoint with provider/status/limit/offset filters.

## What Was Built

### Task 1: Migration + Logger Utility

- **004_webhook_logs.sql**: `CREATE TABLE webhook_logs` with 8 columns (id UUID, event_id TEXT, provider TEXT, event_type TEXT, status TEXT, payload JSONB, created_at TIMESTAMPTZ, user_id UUID). Four indexes (provider, status, created_at DESC, user_id partial). RLS enabled with a user-scoped read policy (service role bypasses for inserts).
- **webhookLogger.ts**: `logWebhookEvent(env, params)` — imports `getServiceRoleClient`, inserts a row into `webhook_logs`, returns `Promise<void>`. No throw on failure.

### Task 2: Billing Route Logging + GET /webhook-logs

- **billing.ts**: Added `import { logWebhookEvent }`. Stripe-webhook handler now wraps the switch in try/catch to track `status: 'success' | 'failed'` and extract `stripeUserId` where available. A single `waitUntil(logWebhookEvent(...))` fires after processing. MoMo-IPN handler logs `status: 'failed'` on invalid signature and invalid extraData (before returning 400), and `status: 'success'` with userId after successful tier upgrade.
- **webhookLogs.ts**: `webhookLogsRouter` (Hono) with GET `/` — accepts `provider`, `status`, `limit` (max 200, default 50), `offset` query params. Uses service role client, orders by `created_at DESC`, returns `{ logs, total, limit, offset }`.
- **index.ts**: Added import and three lines: `app.use('/webhook-logs', cors(corsConfig))`, `app.use('/webhook-logs', jwtAuthMiddleware)`, `app.route('/webhook-logs', webhookLogsRouter)`.

## Decisions Made

| Decision | Rationale |
|---|---|
| Fire-and-forget logging (no throw) | Logging must never break webhook processing — billing correctness takes priority |
| All logs visible to any authed user | Platform debugging tool for v1; user-scoped access can be added later |
| MoMo failures logged before 400 return | Preserves full audit trail of rejected requests |
| Stripe switch wrapped in try/catch | Captures unexpected processing errors as `status: failed` without losing original event |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- Migration SQL: `grep -c "CREATE TABLE" 004_webhook_logs.sql` → 1
- Logger utility: `grep -c "logWebhookEvent" webhookLogger.ts` → 1
- Billing imports: `logWebhookEvent` called at lines 169, 219, 246, 270 in billing.ts
- index.ts: `/webhook-logs` mounted with jwtAuthMiddleware confirmed
- TypeScript: no errors in new files (pre-existing errors in test mocks and unrelated routes are out of scope)
