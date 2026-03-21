// AUTH-03 + AUTH-04 unit tests for authMiddleware
// Wave 0: stubs only — all tests intentionally fail (implementations don't exist yet).
// Wave 2 (Plan 02) replaces these stubs with real implementations.

import { describe, it, expect } from 'vitest';

// These imports will fail until Plan 02 creates the files — that is expected (red).
// import { authMiddleware } from '../middleware/auth.js';
// import type { AuthContext } from '../types.js';

describe('AUTH-03: Gateway rejects requests with missing/invalid API key', () => {
  it.todo('missing Authorization header → 401');
  it.todo('malformed header (not Bearer prefix) → 401');
  it.todo('unknown key hash (not in KV or Supabase) → 401');
  it.todo('revoked key (revoked_at non-null in Supabase) → 401');
});

describe('AUTH-03: Gateway passes valid API key and attaches auth context', () => {
  it.todo('valid key found in KV cache → c.set("auth", {userId, tier, keyId}) and next() called');
  it.todo('valid key not in KV → Supabase lookup → KV write with 60s TTL → next() called');
});

describe('AUTH-04: Auth middleware attaches correct tier from key record', () => {
  it.todo('free tier key → c.get("auth").tier === "free"');
  it.todo('starter tier key → c.get("auth").tier === "starter"');
});
