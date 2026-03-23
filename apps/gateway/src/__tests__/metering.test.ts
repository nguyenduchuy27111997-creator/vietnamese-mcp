// METR-01 unit tests for sendTinybirdEvent (tinybird.ts)

import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendTinybirdEvent } from '../metering/tinybird.js';
import type { ToolCallEvent } from '../metering/tinybird.js';

const sampleEvent: ToolCallEvent = {
  api_key_id: 'key-abc',
  server: 'zalopay',
  tool: 'create_payment',
  timestamp: '2026-03-23T08:00:00.000Z',
  response_status: 'ok',
};

describe('sendTinybirdEvent', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs NDJSON to correct URL with Bearer token', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);

    await sendTinybirdEvent(sampleEvent, 'tb_token_123', 'https://custom.tinybird.co');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];

    // Correct URL
    expect(url).toBe('https://custom.tinybird.co/v0/events?name=tool_calls');

    // Bearer token auth
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer tb_token_123');

    // Body is NDJSON (JSON + trailing newline)
    const body = options.body as string;
    expect(body).toMatch(/\n$/);
    const parsed = JSON.parse(body.trimEnd());
    expect(parsed).toEqual(sampleEvent);
  });

  it('uses default host (https://api.tinybird.co) when not provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);

    await sendTinybirdEvent(sampleEvent, 'token');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/api\.tinybird\.co/);
  });

  it('does not throw on fetch network error; logs to console.error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', mockFetch);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendTinybirdEvent(sampleEvent, 'token')).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tinybird unreachable'),
      expect.any(Error),
    );
  });

  it('does not throw on non-ok response (400); logs to console.error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 400 });
    vi.stubGlobal('fetch', mockFetch);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendTinybirdEvent(sampleEvent, 'token')).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tinybird ingestion failed: 400'),
    );
  });
});
