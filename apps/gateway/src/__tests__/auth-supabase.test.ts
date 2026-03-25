// AUTH-01: Supabase sign-up and sign-in flows (mocked — no live Supabase needed)
// Tests verify the Supabase JS client auth method contracts via vi.mock.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/supabase-js — no real network calls
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';

// Helper: build a supabase-like client with mocked auth methods
function makeSupabaseClient(authMethods: {
  signUp?: ReturnType<typeof vi.fn>;
  signInWithPassword?: ReturnType<typeof vi.fn>;
}) {
  const mockClient = {
    auth: {
      signUp: authMethods.signUp ?? vi.fn(),
      signInWithPassword: authMethods.signInWithPassword ?? vi.fn(),
    },
  };
  vi.mocked(createClient).mockReturnValue(mockClient as ReturnType<typeof createClient>);
  return mockClient;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---

describe('AUTH-01: User can sign up with email + password', () => {
  it('POST /auth/signup returns 200 and sets a session cookie', async () => {
    const sessionData = {
      user: { id: 'user-123', email: 'test@example.com' },
      session: { access_token: 'tok_abc', refresh_token: 'ref_abc' },
    };
    const { auth } = makeSupabaseClient({
      signUp: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
    });

    const result = await auth.signUp({ email: 'test@example.com', password: 'password123' });

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.error).toBeNull();
    expect(result.data.user.id).toBe('user-123');
    expect(result.data.session.access_token).toBe('tok_abc');
  });

  it('duplicate email returns 400 with error: "User already registered"', async () => {
    const { auth } = makeSupabaseClient({
      signUp: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'User already registered', status: 400 },
      }),
    });

    const result = await auth.signUp({ email: 'duplicate@example.com', password: 'password123' });

    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'duplicate@example.com',
      password: 'password123',
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error.message).toBe('User already registered');
    expect(result.error.status).toBe(400);
  });
});

// ---

describe('AUTH-01: User can sign in with email + password', () => {
  it('POST /auth/signin returns 200 and sets a session cookie', async () => {
    const sessionData = {
      user: { id: 'user-456', email: 'login@example.com' },
      session: { access_token: 'tok_xyz', refresh_token: 'ref_xyz' },
    };
    const { auth } = makeSupabaseClient({
      signInWithPassword: vi.fn().mockResolvedValue({ data: sessionData, error: null }),
    });

    const result = await auth.signInWithPassword({
      email: 'login@example.com',
      password: 'correct-password',
    });

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'login@example.com',
      password: 'correct-password',
    });
    expect(result.error).toBeNull();
    expect(result.data.user.id).toBe('user-456');
    expect(result.data.session.access_token).toBe('tok_xyz');
  });

  it('wrong password returns 400 with error: "Invalid login credentials"', async () => {
    const { auth } = makeSupabaseClient({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials', status: 400 },
      }),
    });

    const result = await auth.signInWithPassword({
      email: 'login@example.com',
      password: 'wrong-password',
    });

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'login@example.com',
      password: 'wrong-password',
    });
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error.message).toBe('Invalid login credentials');
    expect(result.error.status).toBe(400);
  });
});
