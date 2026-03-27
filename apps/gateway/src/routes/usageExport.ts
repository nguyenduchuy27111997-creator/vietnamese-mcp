import { Hono } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getServiceRoleClient } from '../lib/supabase.js';

export const usageExportRouter = new Hono<GatewayEnv>();

// UUID regex for sanitizing key IDs to prevent SQL injection
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse and validate a date string in YYYY-MM-DD format.
 * Returns a Date set to midnight UTC or null if invalid.
 */
function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Add days to a date, returning a new Date.
 */
function addDays(d: Date, days: number): Date {
  const result = new Date(d.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Format a Date as YYYY-MM-DD (UTC).
 */
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

usageExportRouter.get('/', async (c) => {
  const startParam = c.req.query('start');
  const endParam = c.req.query('end');

  // Validate presence
  if (!startParam) {
    return c.json({ error: 'Missing required query param: start (YYYY-MM-DD)' }, 400);
  }
  if (!endParam) {
    return c.json({ error: 'Missing required query param: end (YYYY-MM-DD)' }, 400);
  }

  // Parse dates
  const startDate = parseDate(startParam);
  const endDate = parseDate(endParam);

  if (!startDate) {
    return c.json({ error: 'Invalid start date format — expected YYYY-MM-DD' }, 400);
  }
  if (!endDate) {
    return c.json({ error: 'Invalid end date format — expected YYYY-MM-DD' }, 400);
  }

  // Validate start <= end
  if (startDate > endDate) {
    return c.json({ error: 'start must not be after end' }, 400);
  }

  // Validate range <= 366 days
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays > 366) {
    return c.json({ error: 'Date range must not exceed 366 days' }, 400);
  }

  const { userId } = c.get('auth');

  // Look up active API keys for user
  const supabase = getServiceRoleClient(c.env);
  const { data: keys } = await supabase
    .from('api_keys')
    .select('id')
    .eq('user_id', userId)
    .is('revoked_at', null);

  const filename = `usage-export-${endParam}.csv`;
  const responseHeaders = {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store',
  };

  // If no keys, return empty CSV (header only)
  if (!keys || keys.length === 0) {
    return new Response('date,server,tool,call_count\n', { headers: responseHeaders });
  }

  // Sanitize key IDs (UUIDs only) to prevent SQL injection
  const safeKeyIds = (keys as Array<{ id: string }>)
    .map((k) => k.id)
    .filter((id) => UUID_RE.test(id));

  if (safeKeyIds.length === 0) {
    return new Response('date,server,tool,call_count\n', { headers: responseHeaders });
  }

  // Build the "next day after end" for exclusive upper bound
  const endPlusOne = formatDate(addDays(endDate, 1));

  // Comma-separated quoted key IDs for SQL IN clause
  const keyIdList = safeKeyIds.map((id) => `'${id}'`).join(',');

  const sql = `
SELECT
  toDate(timestamp) AS date,
  server,
  tool,
  count() AS call_count
FROM tool_calls
WHERE api_key_id IN (${keyIdList})
  AND timestamp >= '${startParam} 00:00:00'
  AND timestamp < '${endPlusOne} 00:00:00'
GROUP BY date, server, tool
ORDER BY date, server, tool
FORMAT CSVWithNames
  `.trim();

  const host = c.env.TINYBIRD_HOST ?? 'https://api.tinybird.co';

  try {
    const tbRes = await fetch(`${host}/v0/sql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.TINYBIRD_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `q=${encodeURIComponent(sql)}`,
    });

    if (tbRes.ok) {
      // Stream Tinybird's CSV response directly (already CSVWithNames format)
      return new Response(tbRes.body, { headers: responseHeaders });
    }

    // Tinybird returned an error — fall through to fallback
    console.error(`Tinybird export query failed: ${tbRes.status}`);
  } catch (err) {
    // Tinybird unreachable — fall through to fallback
    console.error('Tinybird unreachable for export:', err);
  }

  // Fallback: return empty CSV with header only
  return new Response('date,server,tool,call_count\n', { headers: responseHeaders });
});
