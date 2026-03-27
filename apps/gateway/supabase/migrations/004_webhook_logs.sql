-- Migration: 004_webhook_logs
-- Persistent log of all webhook events (Stripe and MoMo) with full payload.
-- Separate from webhook_events (idempotency table) — this is for debugging.
-- Run via: supabase db push  OR  paste into Supabase SQL editor.

CREATE TABLE IF NOT EXISTS webhook_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     TEXT        NOT NULL,
  provider     TEXT        NOT NULL CHECK (provider IN ('stripe', 'momo')),
  event_type   TEXT        NOT NULL,
  status       TEXT        NOT NULL CHECK (status IN ('success', 'failed')),
  payload      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id      UUID
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider   ON webhook_logs (provider);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status     ON webhook_logs (status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_id    ON webhook_logs (user_id) WHERE user_id IS NOT NULL;

-- RLS: service role bypasses RLS (gateway uses service role key, so inserts work).
-- The read policy below is a safe default for any future anon/user-scoped access.
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_logs_user_read ON webhook_logs
  FOR SELECT
  USING (auth.uid() = user_id);
