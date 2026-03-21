// AUTH-01 stubs: Supabase sign-up and sign-in flows
// Wave 0: stubs only — require a live Supabase project to implement fully.
// Phase 6 UI plan (Plan 04) will replace these stubs with real tests.

import { describe, it } from 'vitest';

describe('AUTH-01: User can sign up with email + password', () => {
  it.todo('POST /auth/signup returns 200 and sets a session cookie');
  it.todo('duplicate email returns 400 with error: "User already registered"');
});

describe('AUTH-01: User can sign in with email + password', () => {
  it.todo('POST /auth/signin returns 200 and sets a session cookie');
  it.todo('wrong password returns 400 with error: "Invalid login credentials"');
});
