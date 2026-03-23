import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';
import { handleTierUpgrade, checkIdempotency } from '../billing/tierUpgrade.js';
import type { GatewayEnv } from '../types.js';

function makeEnv(keys: Array<{ key_hash: string }>, updateResult = { error: null }) {
  const mockIs = vi.fn().mockReturnValue(/* select chain ends */ { data: keys, error: null });
  const mockEqSelect = vi.fn().mockReturnValue({ is: mockIs });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });

  const mockIsUpdate = vi.fn().mockResolvedValue(updateResult);
  const mockEqUpdate = vi.fn().mockReturnValue({ is: mockIsUpdate });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

  const mockInsert = vi.fn();

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'webhook_events') return { insert: mockInsert };
    return { select: mockSelect, update: mockUpdate };
  });

  vi.mocked(createClient).mockReturnValue({ from: mockFrom } as any);

  const kv = {
    get: vi.fn(), put: vi.fn(), delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(), getWithMetadata: vi.fn(),
  };

  const env: GatewayEnv['Bindings'] = {
    API_KEYS: kv as any,
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'srk',
    TINYBIRD_TOKEN: 'tb',
  } as unknown as GatewayEnv['Bindings'];

  return { env, kv, mockFrom, mockInsert };
}

describe('handleTierUpgrade', () => {
  it('fetches key hashes, updates tier, deletes KV entries', async () => {
    const { env, kv } = makeEnv([{ key_hash: 'hash1' }, { key_hash: 'hash2' }]);
    await handleTierUpgrade('user-1', 'pro', env);
    expect(kv.delete).toHaveBeenCalledWith('hash1');
    expect(kv.delete).toHaveBeenCalledWith('hash2');
    expect(kv.delete).toHaveBeenCalledTimes(2);
  });

  it('handles user with no active keys gracefully', async () => {
    const { env, kv } = makeEnv([]);
    await handleTierUpgrade('user-2', 'starter', env);
    expect(kv.delete).not.toHaveBeenCalled();
  });
});

describe('checkIdempotency', () => {
  it('returns false for new event (insert succeeds)', async () => {
    const { env, mockInsert } = makeEnv([]);
    mockInsert.mockResolvedValue({ error: null });
    const isDuplicate = await checkIdempotency('evt_123', 'stripe', env);
    expect(isDuplicate).toBe(false);
  });

  it('returns true for duplicate event (23505 conflict)', async () => {
    const { env, mockInsert } = makeEnv([]);
    mockInsert.mockResolvedValue({ error: { code: '23505' } });
    const isDuplicate = await checkIdempotency('evt_123', 'stripe', env);
    expect(isDuplicate).toBe(true);
  });
});
