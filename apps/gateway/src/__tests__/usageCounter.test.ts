// METR-03 + METR-04 unit tests for usageCounter.ts

import { describe, it, expect, vi } from 'vitest';
import type { KVNamespace } from '@cloudflare/workers-types';
import {
  getUsageCount,
  incrementUsageCounter,
  checkUsageLimit,
  usageLimitResponse,
  TIER_LIMITS,
} from '../metering/usageCounter.js';

function makeKv(getReturn: string | null = null) {
  return {
    get: vi.fn().mockResolvedValue(getReturn),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

// ---

describe('TIER_LIMITS', () => {
  it('exports correct limits', () => {
    expect(TIER_LIMITS['free']).toBe(1_000);
    expect(TIER_LIMITS['starter']).toBe(10_000);
    expect(TIER_LIMITS['pro']).toBe(100_000);
    expect(TIER_LIMITS['business']).toBe(Infinity);
  });
});

// ---

describe('getUsageCount', () => {
  it('returns 0 when no KV entry exists', async () => {
    const kv = makeKv(null);
    const result = await getUsageCount('key-abc', kv);
    expect(result).toBe(0);
  });

  it('returns parsed integer from KV string value', async () => {
    const kv = makeKv('42');
    const result = await getUsageCount('key-abc', kv);
    expect(result).toBe(42);
  });
});

// ---

describe('incrementUsageCounter', () => {
  it('writes "1" for a new key (no prior value)', async () => {
    const kv = makeKv(null);
    await incrementUsageCounter('key-abc', kv);

    expect(kv.put).toHaveBeenCalledOnce();
    const [key, value] = (kv.put as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(key).toMatch(/^usage:key-abc:\d{4}-\d{2}$/);
    expect(value).toBe('1');
  });

  it('increments existing value from "5" to "6"', async () => {
    const kv = makeKv('5');
    await incrementUsageCounter('key-abc', kv);

    const [, value] = (kv.put as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(value).toBe('6');
  });
});

// ---

describe('checkUsageLimit', () => {
  it('free tier: 999 calls → false (under limit)', () => {
    expect(checkUsageLimit(999, 'free')).toBe(false);
  });

  it('free tier: 1000 calls → true (at limit)', () => {
    expect(checkUsageLimit(1000, 'free')).toBe(true);
  });

  it('starter tier: 9999 calls → false', () => {
    expect(checkUsageLimit(9999, 'starter')).toBe(false);
  });

  it('starter tier: 10000 calls → true', () => {
    expect(checkUsageLimit(10000, 'starter')).toBe(true);
  });

  it('business tier: 999999 calls → false (unlimited)', () => {
    expect(checkUsageLimit(999999, 'business')).toBe(false);
  });

  it('unknown tier: defaults to 1000 limit → true at 1000', () => {
    expect(checkUsageLimit(1000, 'mystery')).toBe(true);
  });

  it('unknown tier: false at 999', () => {
    expect(checkUsageLimit(999, 'mystery')).toBe(false);
  });
});

// ---

describe('usageLimitResponse', () => {
  it('returns HTTP 200 with JSON-RPC -32002 error', async () => {
    const res = usageLimitResponse('free', 1000);
    expect(res.status).toBe(200);

    const body = await res.json() as {
      jsonrpc: string;
      error: {
        code: number;
        message: string;
        data: {
          used: number;
          limit: number;
          tier: string;
          upgradeUrl: string;
          resetsAt: string;
        };
      };
    };

    expect(body.jsonrpc).toBe('2.0');
    expect(body.error.code).toBe(-32002);
    // Message should reference used and limit counts
    expect(body.error.message).toContain('1000');
    expect(body.error.data.used).toBe(1000);
    expect(body.error.data.limit).toBe(1000);
    expect(body.error.data.tier).toBe('free');
    expect(body.error.data.upgradeUrl).toBe('https://mcpvn.dev/pricing');
    // resetsAt should be a valid ISO date string (first day of next month)
    expect(body.error.data.resetsAt).toMatch(/^\d{4}-\d{2}-01T00:00:00\.000Z$/);
  });
});
