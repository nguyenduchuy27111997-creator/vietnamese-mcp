// AUTH-05 RLS isolation tests — two-user Supabase anon client isolation.
// Wave 0: stubs only — require a live Supabase project with two test users.
// Plan 03 (keys route) covers the application-layer guard; these stubs verify the DB layer.

import { describe, it } from 'vitest';

describe('AUTH-05: RLS isolation — User B cannot access User A rows via anon client', () => {
  it.todo('User B anon client: SELECT from api_keys WHERE user_id = userA.id returns empty array (RLS filtered)');
  it.todo('User B anon client: INSERT api_keys with user_id = userA.id throws RLS policy violation');
});
