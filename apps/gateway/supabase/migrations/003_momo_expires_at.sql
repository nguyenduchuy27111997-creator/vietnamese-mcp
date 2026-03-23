-- Migration: 003_momo_expires_at
-- Adds momo_expires_at to api_keys for tracking MoMo one-time payment expiry (30 days).
-- NOTE: stripe_customer_id was already added in 002_webhook_events.sql.
-- Run via: supabase db push  OR  paste into Supabase SQL editor.

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS momo_expires_at TIMESTAMPTZ;
