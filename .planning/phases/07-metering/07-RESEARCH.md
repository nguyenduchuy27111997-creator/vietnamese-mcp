# Phase 7: Metering - Research

**Researched:** 2026-03-22
**Domain:** Tinybird Events API, Cloudflare Workers KV counters, Hono ctx.executionCtx
**Confidence:** HIGH

## Summary

Phase 7 adds usage metering to the gateway: every tool call is logged to Tinybird non-blocking via `ctx.waitUntil`, a KV counter tracks monthly usage per key, and the gateway hard-stops requests when a tier limit is reached with a JSON-RPC `-32002` error.

The architecture is settled in CONTEXT.md. The only open technical question is whether KV read-modify-write for counters is reliable enough for billing purposes. Research confirms KV is eventually consistent and does NOT support atomic increment — race conditions are possible at high concurrency. For this project's scale (free: 1k/mo, ~33 calls/day), the risk is acceptable. The counter's job is only limit enforcement, not billing precision, and Tinybird provides the authoritative event log for any disputes.

The Tinybird integration is a simple HTTP POST of NDJSON events with a Bearer token. Setup requires creating a workspace, defining a data source schema, and storing the token as a Worker secret. Regional host is chosen at workspace creation time — the token itself encodes the region so the host must match.

**Primary recommendation:** Implement KV counter as designed — eventually consistent is acceptable for soft limits at this scale. Use Tinybird Events API at `https://api.tinybird.co/v0/events?name=tool_calls` (or region-specific host). Fire via `c.executionCtx.waitUntil(fetch(...))` in the Hono route handler, not inside `handleMcpRequest()`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Event Pipeline**
- Fire-and-forget via `ctx.waitUntil` — zero latency impact on MCP responses
- Minimal payload: `api_key_id`, `server`, `tool`, `timestamp`, `response_status`
- Hook point: after tool execution — only counts successful tool calls, not auth failures or tier blocks
- On Tinybird ingestion failure: silent drop with `console.error` — metering is best-effort, never blocks user requests

**Limit Enforcement**
- KV counter per key per month: key format `usage:{keyId}:YYYY-MM`, increment on each call
- Check order: tier access → usage check → tool execution
- MCP JSON-RPC error code `-32002` when limit hit — consistent with existing `-32001` tier error, includes limit info + upgrade URL
- Business tier (`unlimited`): skip KV counter read/write entirely — zero overhead for premium users
- Tier limits: free 1k/mo, starter 10k/mo, pro 100k/mo, business unlimited

**Usage Query API**
- `GET /usage` endpoint on gateway — reads KV counter, same JWT auth as `/keys`
- Response: `{used, limit, period, tier, resetsAt}` — summary only, no per-server breakdown
- Dashboard: add minimal usage bar to DashboardPage — "847 / 1,000 calls this month" with progress bar

**Tinybird Setup**
- No account yet — plan includes full setup: create workspace, define data source, create API pipe, set auth token
- Start with Tinybird free tier (1k events/day ≈ 30k/month) — upgrade when needed
- Auth token stored as Worker secret: `wrangler secret put TINYBIRD_TOKEN`

### Claude's Discretion
- Tinybird data source schema column types and sorting key
- KV counter key naming convention details
- Exact usage bar UI styling in dashboard
- Whether to create a Tinybird API pipe for analytics queries (beyond what KV provides)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| METR-01 | Every tool call is logged to Tinybird with API key, server, tool, timestamp | Tinybird Events API POST `/v0/events`, NDJSON body, Bearer token auth |
| METR-02 | Usage counts are queryable per API key per billing period | KV counter `usage:{keyId}:YYYY-MM` read by `GET /usage`; Tinybird Query API available as fallback |
| METR-03 | Gateway enforces tier call limits (free: 1k, starter: 10k, pro: 100k, business: unlimited) | KV counter read before tool execution; `-32002` JSON-RPC error if exceeded |
| METR-04 | Metering is non-blocking (ctx.waitUntil) | `c.executionCtx.waitUntil(fetch(...))` in Hono handler — confirmed working pattern |
</phase_requirements>

---

## Standard Stack

### Core
| Library/Service | Version | Purpose | Why Standard |
|-----------------|---------|---------|--------------|
| Tinybird Events API | v0 | Fire-and-forget event ingestion | Zero-dependency HTTP POST; built for high-throughput analytics |
| Cloudflare Workers KV | (platform) | Monthly usage counters per key | Already bound as `API_KEYS`; same namespace or new binding |
| Hono `c.executionCtx` | 4.x | Access `waitUntil` in route handlers | Standard Hono pattern for CF Workers background tasks |

### Supporting
| Library/Service | Version | Purpose | When to Use |
|-----------------|---------|---------|-------------|
| Tinybird Query API `/v0/sql` | v0 | Query events for analytics | Optional — only if building Tinybird-powered analytics pipe |
| `cloudflare:workers` `waitUntil` import | (2025) | Import waitUntil directly without ctx threading | Use if executionCtx becomes hard to thread deep into call stack |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| KV counter (eventually consistent) | Durable Objects (atomic) | DO costs more, overkill for soft limits at this scale |
| KV counter | Tinybird query for count | Tinybird query adds ~200ms latency; unsuitable for request-path enforcement |
| KV counter | Supabase RPC increment | Extra Supabase roundtrip; increases hot-path latency |

**Installation:** No new npm packages required. Tinybird integration is plain `fetch`. KV is already bound.

---

## Architecture Patterns

### How Metering Hooks In

The current MCP route in `index.ts`:
```typescript
app.all('/mcp/:server', async (c) => {
  const serverName = c.req.param('server');
  const { tier, keyId } = c.get('auth');
  return handleMcpRequest(serverName, c.req.raw, tier);
});
```

Must become:
```typescript
app.all('/mcp/:server', async (c) => {
  const serverName = c.req.param('server');
  const { tier, keyId } = c.get('auth');

  // 1. Tier access check (existing)
  // 2. Usage limit check (new — reads KV counter)
  const limitError = await checkUsageLimit(keyId, tier, c.env);
  if (limitError) return limitError;

  // 3. Execute tool
  const response = await handleMcpRequest(serverName, c.req.raw, tier);

  // 4. Fire-and-forget: log event to Tinybird + increment KV counter
  c.executionCtx.waitUntil(
    recordToolCall({ keyId, serverName, tier, env: c.env })
  );

  return response;
});
```

**Why this shape:**
- `handleMcpRequest` stays pure (no env dependencies) — avoids refactoring router.ts
- Metering fires AFTER successful tool execution per CONTEXT.md spec
- `c.executionCtx` is available in the Hono handler; no need to thread ctx through router.ts

### Recommended File Structure
```
apps/gateway/src/
├── middleware/
│   ├── auth.ts            # existing
│   └── jwtAuth.ts         # existing
├── routes/
│   ├── keys.ts            # existing
│   └── usage.ts           # NEW: GET /usage handler
├── metering/
│   ├── tinybird.ts        # NEW: sendEvent(payload, env) → Promise<void>
│   └── usageCounter.ts    # NEW: checkUsageLimit(), incrementCounter()
├── index.ts               # modified: add usage check + fire-and-forget
├── tierAccess.ts          # existing (unchanged)
└── types.ts               # modified: add TINYBIRD_TOKEN to GatewayEnv
```

### Pattern 1: Tinybird Fire-and-Forget
**What:** POST a single NDJSON event to Tinybird from `ctx.waitUntil`
**When to use:** After every successful tool call

```typescript
// Source: https://www.tinybird.co/docs/ingest/events-api
// apps/gateway/src/metering/tinybird.ts

export type ToolCallEvent = {
  api_key_id: string;
  server: string;
  tool: string;
  timestamp: string;    // ISO 8601: new Date().toISOString()
  response_status: string;
};

export async function sendTinybirdEvent(
  event: ToolCallEvent,
  token: string,
  host = 'https://api.tinybird.co',
): Promise<void> {
  try {
    const res = await fetch(`${host}/v0/events?name=tool_calls`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(event) + '\n',  // NDJSON requires trailing newline
    });
    if (!res.ok) {
      console.error(`Tinybird ingestion failed: ${res.status}`);
    }
  } catch (err) {
    console.error('Tinybird unreachable:', err);
  }
}
```

### Pattern 2: KV Usage Counter
**What:** Read/increment a monthly counter per key; check limit before execution
**When to use:** Every MCP tool call; skip entirely for `business` tier

```typescript
// apps/gateway/src/metering/usageCounter.ts

const TIER_LIMITS: Record<string, number> = {
  free: 1_000,
  starter: 10_000,
  pro: 100_000,
  business: Infinity,
};

function usageKey(keyId: string): string {
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return `usage:${keyId}:${period}`;
}

export async function getUsageCount(
  keyId: string,
  kv: KVNamespace,
): Promise<number> {
  const raw = await kv.get(usageKey(keyId));
  return raw ? parseInt(raw, 10) : 0;
}

export async function incrementUsageCounter(
  keyId: string,
  kv: KVNamespace,
): Promise<void> {
  const key = usageKey(keyId);
  const current = await kv.get(key);
  const next = (current ? parseInt(current, 10) : 0) + 1;
  // No TTL — expire manually or via cron; keys auto-expire when next month's key is used
  await kv.put(key, String(next));
}

export function checkUsageLimit(
  used: number,
  tier: string,
): boolean {
  if (tier === 'business') return false; // unlimited — caller should skip entirely
  return used >= (TIER_LIMITS[tier] ?? 1_000);
}
```

### Pattern 3: -32002 Usage Limit Error
**What:** MCP JSON-RPC error when monthly limit exceeded; mirrors existing -32001 pattern
**When to use:** When `checkUsageLimit` returns true

```typescript
// Source: mirrors tierAccess.ts pattern
function usageLimitError(tier: string, used: number): Response {
  const limit = TIER_LIMITS[tier] ?? 1_000;
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: null,
    error: {
      code: -32002,
      message: `Monthly call limit reached (${used}/${limit}). Upgrade at https://mcpvn.dev/pricing`,
      data: {
        used,
        limit,
        tier,
        upgradeUrl: 'https://mcpvn.dev/pricing',
        resetsAt: getMonthResetsAt(),
      },
    },
  });
  return new Response(body, {
    status: 200,  // MCP errors return 200 with error body, like -32001
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Pattern 4: GET /usage Endpoint
**What:** Returns current month's usage for the authenticated user
**When to use:** Dashboard calls this to render usage bar

```typescript
// apps/gateway/src/routes/usage.ts
import { Hono } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getUsageCount } from '../metering/usageCounter.js';

const TIER_LIMITS = { free: 1_000, starter: 10_000, pro: 100_000, business: Infinity };

export const usageRouter = new Hono<GatewayEnv>();

usageRouter.get('/', async (c) => {
  const { keyId, tier } = c.get('auth');
  const used = await getUsageCount(keyId, c.env.API_KEYS);
  const limit = TIER_LIMITS[tier as keyof typeof TIER_LIMITS] ?? 1_000;
  const now = new Date();
  const resetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return c.json({ used, limit, period, tier, resetsAt });
});
```

### Pattern 5: GatewayEnv Extension
**What:** Add TINYBIRD_TOKEN and optional TINYBIRD_HOST to environment bindings

```typescript
// apps/gateway/src/types.ts — modified
export type GatewayEnv = {
  Bindings: {
    API_KEYS: KVNamespace;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    TINYBIRD_TOKEN: string;           // NEW — wrangler secret put TINYBIRD_TOKEN
    TINYBIRD_HOST?: string;           // NEW — optional region override, defaults to api.tinybird.co
  };
  Variables: {
    auth: AuthContext;
  };
};
```

### Pattern 6: wrangler.toml KV Binding Decision
**What:** Reuse existing `API_KEYS` namespace for usage counters vs. new `USAGE_COUNTERS` namespace
**Recommendation (Claude's discretion):** Reuse `API_KEYS`. Counter keys use `usage:` prefix, auth keys use SHA-256 hex hashes — no collision risk. Avoids wrangler.toml changes.

### Anti-Patterns to Avoid
- **Blocking the response for Tinybird:** Never `await` the Tinybird fetch inside the response path. Always use `c.executionCtx.waitUntil(...)`.
- **Floating promises:** Do not `fetch(tinybirdUrl, ...)` without wrapping in `waitUntil`. The Worker may terminate before the fetch completes.
- **Logging auth failures to Tinybird:** Per CONTEXT.md, only log after successful tool execution. Don't log 401/tier-block events.
- **Throwing on KV failure:** If KV counter read fails, fail open (allow request, log error). Metering failures must never block users.
- **Using Tinybird query for limit enforcement:** Query API adds ~100-300ms to hot path. Use KV counter only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event ingestion reliability | Custom retry logic | Tinybird Events API (fire-and-forget) | Tinybird handles quarantine/backfill; our job is fire-and-forget |
| Atomic counter increment | Read-then-write with lock | KV read-modify-write (acceptable) | Durable Objects overkill; race risk acceptable at this scale |
| Monthly period calculation | Custom date math | `Date.UTC` + `getUTCMonth()` | UTC ensures consistent month boundary regardless of CF edge location |
| Regional host routing | Custom region detection | Single `TINYBIRD_HOST` env var | User picks region at workspace creation; no runtime detection needed |

**Key insight:** Tinybird's ingestion is fire-and-forget by design — the 202 response means "received, will process." Don't build retry logic; on failure, log and move on.

---

## Common Pitfalls

### Pitfall 1: KV Namespace — Reuse vs. New Binding
**What goes wrong:** If you add a new `[[kv_namespaces]]` binding in wrangler.toml without creating it first, `wrangler dev` and `wrangler deploy` will fail with "namespace not found."
**Why it happens:** KV namespaces must be created via `wrangler kv namespace create` before referencing them.
**How to avoid:** Reuse the existing `API_KEYS` namespace with a `usage:` key prefix — no wrangler.toml changes needed.
**Warning signs:** `wrangler dev` error mentioning KV namespace ID not found.

### Pitfall 2: Tinybird Regional Host Mismatch
**What goes wrong:** Events POST to `api.tinybird.co` but workspace is in EU/US region → 404 "workspace not found."
**Why it happens:** Tinybird token encodes region; host must match. The default `api.tinybird.co` only works for GCP Europe workspaces.
**How to avoid:** Store the correct host in `TINYBIRD_HOST` env var (e.g., `https://api.us-east.tinybird.co`). Document in wrangler.toml comments.
**Warning signs:** 404 responses from Tinybird with "workspace not found" or "token not found."

### Pitfall 3: `c.executionCtx` Not Available in `handleMcpRequest`
**What goes wrong:** Trying to call `ctx.waitUntil` inside `router.ts:handleMcpRequest()` which has no access to Hono's `c.executionCtx`.
**Why it happens:** `handleMcpRequest` receives only `(serverName, req, tier)` — no execution context.
**How to avoid:** Fire `c.executionCtx.waitUntil(...)` in the `app.all('/mcp/:server')` handler in `index.ts`, AFTER `handleMcpRequest` returns. Do not modify router.ts.
**Warning signs:** TypeScript error "Property 'waitUntil' does not exist on type Request."

### Pitfall 4: KV Counter Reads Stale Value
**What goes wrong:** Two concurrent requests read `999` from KV and both think they're at 999/1000. Both succeed, actual count becomes 1001.
**Why it happens:** KV is eventually consistent — no atomic increment.
**How to avoid:** Accept this behavior. Tier limits are soft limits for abuse prevention, not billing precision. Tinybird provides the authoritative count for disputes. At free-tier scale (33 calls/day average), concurrent requests at the limit boundary are rare.
**Warning signs:** KV counter shows slightly different value than Tinybird event count — expected discrepancy.

### Pitfall 5: Tinybird Data Source Schema Mismatch
**What goes wrong:** Sending `timestamp` as ISO 8601 string but data source expects `DateTime` — events land in quarantine.
**Why it happens:** Tinybird's `DateTime` column expects `YYYY-MM-DD HH:MM:SS` format, not ISO 8601 with `T` and `Z`.
**How to avoid:** Use `DateTime64(3)` column type which accepts ISO 8601, OR convert timestamp: `new Date().toISOString().replace('T', ' ').replace('Z', '')`.
**Recommendation:** Use `DateTime64(3)` for the timestamp column — supports millisecond precision and ISO 8601 format directly.
**Warning signs:** Tinybird UI shows "quarantined rows" after ingestion.

### Pitfall 6: MCP Error Response Format
**What goes wrong:** Returning HTTP 429 instead of MCP JSON-RPC error format for usage limits.
**Why it happens:** Treating usage limit as a standard HTTP concern.
**How to avoid:** Per CONTEXT.md, return `status: 200` with JSON-RPC error body using code `-32002`. Mirrors the existing `-32001` pattern in `tierAccess.ts`. HTTP 200 with error body is the MCP protocol convention.
**Warning signs:** Success criteria #3 fails — "not a plain HTTP 429."

---

## Code Examples

### Tinybird Data Source Schema (recommended)
```sql
-- Source: Tinybird docs + DateTime64 for ISO 8601 support
DATASOURCE tool_calls
(
  `api_key_id`     String,
  `server`         String,
  `tool`           String,
  `timestamp`      DateTime64(3),    -- supports ISO 8601 with milliseconds
  `response_status` String
)
ENGINE 'MergeTree'
ORDER BY (api_key_id, timestamp)    -- optimized for "count calls per key in period" queries
PARTITION BY toYYYYMM(timestamp);  -- monthly partitions for efficient range scans
```

**Sorting key recommendation (Claude's discretion):** `ORDER BY (api_key_id, timestamp)` — primary access pattern is "all calls for key X in month Y," so api_key_id as the first sort key eliminates full table scans.

### KV Counter Key Format
```
usage:{keyId}:YYYY-MM
```
Example: `usage:550e8400-e29b-41d4-a716-446655440000:2026-03`

The month resets naturally — the January key is a different string from the February key. No TTL needed; old keys are harmless and small.

### Tinybird Pipe for Monthly Count Query (optional — Claude's discretion)
If building a Tinybird analytics pipe beyond KV:
```sql
-- API pipe: tool_calls_by_key_month
SELECT
  api_key_id,
  toYYYYMM(timestamp) as period,
  COUNT() as call_count
FROM tool_calls
WHERE api_key_id = {{String(api_key_id, '')}}
  AND toYYYYMM(timestamp) = {{Int32(period, 202603)}}
GROUP BY api_key_id, period
```

### wrangler.toml Addition
```toml
# Tinybird token — store as secret, not var:
#   wrangler secret put TINYBIRD_TOKEN
# Tinybird host — depends on workspace region:
#   EU (GCP default): https://api.tinybird.co
#   US East (GCP):   https://api.us-east.tinybird.co
#   EU (AWS):        https://api.eu-central-1.aws.tinybird.co
[vars]
TINYBIRD_HOST = "https://api.tinybird.co"  # override to match your workspace region
```

### Usage Bar Component (React)
```tsx
// Minimal usage bar for DashboardPage.tsx
function UsageBar({ used, limit, period }: { used: number; limit: number; period: string }) {
  const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const label = limit === Infinity ? `${used} calls (unlimited)` : `${used.toLocaleString()} / ${limit.toLocaleString()} calls this month`;
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
        <span>{label}</span>
        <span>{period}</span>
      </div>
      <div style={{ height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#ef4444' : '#2563eb', borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `waitUntil` via ctx parameter | Import `waitUntil` from `cloudflare:workers` directly | Aug 2025 | Can call waitUntil from helper modules without threading ctx |
| `c.executionCtx.waitUntil()` in Hono | Same — still works (official pattern) | n/a | No migration needed |

**Deprecated/outdated:**
- Tinybird `usage_model` in wrangler.toml: already removed in Phase 6 — correct.

---

## Open Questions

1. **Tinybird workspace region**
   - What we know: Token and host must match region; free tier is 1k events/day
   - What's unclear: Which region the user will choose when creating the workspace
   - Recommendation: Document both options in plan. Store host as `TINYBIRD_HOST` wrangler var so it's overridable without code change.

2. **Separate KV namespace for usage counters?**
   - What we know: Reusing `API_KEYS` works (different key prefix); separate namespace requires wrangler.toml + `wrangler kv namespace create`
   - What's unclear: None — this is discretion
   - Recommendation: Reuse `API_KEYS` with `usage:` prefix. Simpler.

3. **KV counter accuracy vs. Tinybird event count**
   - What we know: KV is eventually consistent; race conditions possible but rare at this scale
   - What's unclear: Whether this matters for this project
   - Recommendation: Accept discrepancy. KV is for soft-limit enforcement; Tinybird is the authoritative record. Document this explicitly.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `apps/gateway/vitest.config.ts` |
| Quick run command | `cd apps/gateway && npm test` |
| Full suite command | `cd apps/gateway && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| METR-01 | `sendTinybirdEvent()` POSTs correct NDJSON payload with Bearer token | unit | `cd apps/gateway && npm test -- --reporter=verbose` | ❌ Wave 0 |
| METR-01 | Tinybird failure → `console.error`, no exception thrown | unit | same | ❌ Wave 0 |
| METR-02 | `GET /usage` returns `{used, limit, period, tier, resetsAt}` for authenticated user | unit | same | ❌ Wave 0 |
| METR-02 | `GET /usage` with no prior calls returns `used: 0` | unit | same | ❌ Wave 0 |
| METR-03 | Free key at 1000 calls → request returns JSON-RPC `-32002` error, HTTP 200 | unit | same | ❌ Wave 0 |
| METR-03 | Business tier key → counter never read/written (zero KV calls) | unit | same | ❌ Wave 0 |
| METR-03 | Key below limit → request proceeds normally | unit | same | ❌ Wave 0 |
| METR-04 | `handleMcpRequest` returns before Tinybird fetch resolves (fire-and-forget) | unit | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/gateway && npm test`
- **Per wave merge:** `cd apps/gateway && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/gateway/src/__tests__/metering.test.ts` — covers METR-01, METR-04 (tinybird.ts unit tests)
- [ ] `apps/gateway/src/__tests__/usageCounter.test.ts` — covers METR-03 (limit enforcement, KV counter)
- [ ] `apps/gateway/src/__tests__/usage-route.test.ts` — covers METR-02 (GET /usage endpoint)

---

## Sources

### Primary (HIGH confidence)
- Tinybird Events API docs (https://www.tinybird.co/docs/api-reference/events-api) — endpoint URL, NDJSON format, auth, response codes, 10MB free plan limit
- Tinybird Events API ingest guide (https://www.tinybird.co/docs/ingest/events-api) — JavaScript fetch example, NDJSON trailing newline requirement
- Cloudflare Workers Context API (https://developers.cloudflare.com/workers/runtime-apis/context/) — `waitUntil` semantics, 30s limit
- Hono Context API docs (https://hono.dev/docs/api/context) — `c.executionCtx.waitUntil()` pattern
- Cloudflare KV docs (https://developers.cloudflare.com/kv/) — eventually consistent, no atomic increment, 1 write/sec/key rate limit
- Existing codebase: `apps/gateway/src/tierAccess.ts` — `-32001` error pattern to mirror
- Existing codebase: `apps/gateway/src/types.ts` — GatewayEnv shape to extend
- Existing codebase: `apps/gateway/src/__tests__/auth-middleware.test.ts` — test patterns to follow

### Secondary (MEDIUM confidence)
- Cloudflare Workers waitUntil changelog (https://developers.cloudflare.com/changelog/post/2025-08-08-add-waituntil-cloudflare-workers/) — 2025 direct import feature; verified via official changelog
- Tinybird + Cloudflare Workers pattern blog (https://alasdairb.com/posts/serverless-webhooks-analytics-cloudflare-workers-tinybird/) — fetch call format confirmed against official docs

### Tertiary (LOW confidence)
- Tinybird regional host list — stated as `api.tinybird.co`, `api.us-east.tinybird.co`, `api.eu-central-1.aws.tinybird.co` — from search result snippets, not directly verified from the official regions page. User should confirm at workspace creation time.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Tinybird Events API is stable v0; Hono executionCtx is official; KV behavior is documented
- Architecture: HIGH — All integration points identified in actual codebase files; patterns verified against Hono/CF docs
- Pitfalls: HIGH for KV consistency and ctx threading (verified against official docs); MEDIUM for Tinybird schema (DateTime64 recommendation based on docs + known ClickHouse behavior)

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (Tinybird API is stable; Hono 4.x patterns stable)
