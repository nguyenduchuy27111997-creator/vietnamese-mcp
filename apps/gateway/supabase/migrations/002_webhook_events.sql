-- Migration: 002_webhook_events
-- Idempotency table for Stripe and MoMo webhook deduplication.
-- Also adds stripe_customer_id to api_keys for Stripe Customer Portal
-- and subscription lifecycle event correlation (used by Plan 02 webhook handler).
-- Run via: supabase db push  OR  paste into Supabase SQL editor.

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id     TEXT PRIMARY KEY,
  provider     TEXT NOT NULL CHECK (provider IN ('stripe', 'momo')),
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- stripe_customer_id: stored on checkout.session.completed, used by
-- customer.subscription.deleted and invoice.paid to look up user,
-- and by GET /billing/portal to create Customer Portal session.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for webhook lookup: find user by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_customer ON api_keys (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
