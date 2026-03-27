// EXPORT-02 + EXPORT-04 unit tests for GET /usage/export route

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { GatewayEnv, AuthContext } from '../types.js';

// Mock Supabase service role client before importing routes
const mockSupabaseSelect = vi.fn();
vi.mock('../lib/supabase.js', () => ({
  getServiceRoleClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          is: mockSupabaseSelect,
        }),
      }),
    }),
  })),
}));

// Mock global fetch for Tinybird
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { usageExportRouter } from '../routes/usageExport.js';

const defaultAuth: AuthContext = { userId: 'user-abc', tier: 'free', keyId: 'key-existing' };

function makeApp(auth: AuthContext = defaultAuth) {
  const app = new Hono<GatewayEnv>();

  app.use('*', async (c, next) => {
    c.set('auth', auth);
    return next();
  });

  app.route('/', usageExportRouter);

  const originalFetch = app.fetch.bind(app);
  const fetchWithEnv = (req: Request) =>
    originalFetch(req, {
      API_KEYS: {} as unknown,
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-test',
      TINYBIRD_TOKEN: 'tb_test_token',
      TINYBIRD_HOST: 'https://api.tinybird.co',
    } as unknown as GatewayEnv['Bindings']);

  return { fetchWithEnv };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user has one active key
  mockSupabaseSelect.mockResolvedValue({
    data: [{ id: '11111111-1111-1111-1111-111111111111' }],
    error: null,
  });
  // Default: Tinybird returns success with CSV data
  mockFetch.mockResolvedValue(
    new Response('date,server,tool,call_count\n2026-03-01,payments,create_payment,5\n', {
      status: 200,
      headers: { 'Content-Type': 'text/csv' },
    }),
  );
});

// ─── Test 1: Missing start param returns 400 ────────────────────────────────

describe('GET /usage/export — validation', () => {
  it('returns 400 when start param is missing', async () => {
    const { fetchWithEnv } = makeApp();
    const res = await fetchWithEnv(new Request('http://localhost/?end=2026-03-27'));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/start/i);
  });

  // ─── Test 2: Missing end param returns 400 ────────────────────────────────
  it('returns 400 when end param is missing', async () => {
    const { fetchWithEnv } = makeApp();
    const res = await fetchWithEnv(new Request('http://localhost/?start=2026-03-01'));
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/end/i);
  });

  // ─── Test 3: start > end returns 400 ─────────────────────────────────────
  it('returns 400 when start is after end', async () => {
    const { fetchWithEnv } = makeApp();
    const res = await fetchWithEnv(
      new Request('http://localhost/?start=2026-03-27&end=2026-03-01'),
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/start.*end|range|after/i);
  });

  // ─── Test 4: Date range > 366 days returns 400 ───────────────────────────
  it('returns 400 when date range exceeds 366 days', async () => {
    const { fetchWithEnv } = makeApp();
    const res = await fetchWithEnv(
      new Request('http://localhost/?start=2024-01-01&end=2026-01-01'),
    );
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/366|range|exceed/i);
  });
});

// ─── Test 5: CSV response headers ────────────────────────────────────────────

describe('GET /usage/export — CSV response', () => {
  it('returns CSV with correct Content-Type and Content-Disposition headers', async () => {
    const { fetchWithEnv } = makeApp();
    const res = await fetchWithEnv(
      new Request('http://localhost/?start=2026-03-01&end=2026-03-27'),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toMatch(/text\/csv/);
    expect(res.headers.get('Content-Disposition')).toMatch(
      /attachment.*filename.*usage-export-2026-03-27\.csv/,
    );
  });

  // ─── Test 6: CSV contains correct header row and data ────────────────────
  it('CSV contains header row "date,server,tool,call_count" followed by data rows', async () => {
    const { fetchWithEnv } = makeApp();
    const res = await fetchWithEnv(
      new Request('http://localhost/?start=2026-03-01&end=2026-03-27'),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('date,server,tool,call_count');
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  // ─── Test 7: Empty CSV (header only) when no data ────────────────────────
  it('returns empty CSV with header only when no data exists', async () => {
    mockFetch.mockResolvedValue(
      new Response('date,server,tool,call_count\n', {
        status: 200,
        headers: { 'Content-Type': 'text/csv' },
      }),
    );
    const { fetchWithEnv } = makeApp();
    const res = await fetchWithEnv(
      new Request('http://localhost/?start=2026-03-01&end=2026-03-27'),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('date,server,tool,call_count');
    expect(lines.length).toBe(1);
  });
});
