// AUTH-02 + AUTH-05 unit/integration tests for /keys route
// Wave 0: stubs only — all tests intentionally fail (implementations don't exist yet).
// Wave 3 (Plan 03) replaces these stubs with real implementations.

import { describe, it, expect } from 'vitest';

// These imports will fail until Plan 03 creates the files — that is expected (red).
// import { keysRouter } from '../routes/keys.js';

describe('AUTH-02: POST /keys creates a new API key', () => {
  it.todo('returns 201 with { id, key_prefix, tier, created_at, key } where key starts with "sk_test_"');
  it.todo('key field is 72 chars: "sk_test_" (8) + 64 hex chars (32 bytes)');
  it.todo('second call with same auth returns second key (up to 2 per user)');
  it.todo('third call when user already has 2 keys returns 409');
});

describe('AUTH-02: DELETE /keys/:id revokes an existing key', () => {
  it.todo('revoke sets revoked_at in DB and deletes KV entry → returns 200');
  it.todo('revoking nonexistent key returns 404');
  it.todo('cannot revoke another user\'s key → 404 (guard: .eq("user_id", auth.userId))');
});

describe('AUTH-05: RLS isolation — User B cannot read User A keys', () => {
  it.todo('User B anon client selecting api_keys with user_id = userA.id returns empty array');
  it.todo('User B anon client cannot insert a row with user_id = userA.id');
});
