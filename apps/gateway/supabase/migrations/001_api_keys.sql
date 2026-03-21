-- Migration: 001_api_keys
-- Creates the api_keys table with RLS isolation.
-- Run via: supabase db push  OR  paste into Supabase SQL editor.

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,   -- sha256(raw_key) hex — raw key never stored
  key_prefix   TEXT NOT NULL,          -- first 16 chars for display: 'sk_test_a1b2c3d4'
  name         TEXT NOT NULL DEFAULT 'My API Key',
  tier         TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'business')),
  revoked_at   TIMESTAMPTZ,            -- NULL = active; non-NULL = revoked
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance: auth middleware and dashboard queries reference user_id and key_hash
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys (key_hash);

-- RLS: every user sees and modifies only their own rows
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_keys" ON api_keys
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
