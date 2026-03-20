# Phase 6: Auth & API Keys — Research

**Researched:** 2026-03-21
**Domain:** Supabase Auth + API key management + Cloudflare KV caching + dashboard UI on CF Pages
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **API Key Format:** Stripe-style prefixes `sk_test_` (mock mode) and `sk_live_` (real APIs, future). 32+ random hex chars after prefix. Sent via `Authorization: Bearer sk_test_...`. SHA-256 hash stored in DB — never raw key. Shown to user once on creation, masked after. 2 keys per user maximum.
- **Dashboard UI:** Minimal key manager on single page: sign up/login + API key list (create, revoke, copy). No usage charts or billing — those come in Phases 7 and 8. Hosted on Cloudflare Pages. Shows current tier, key count, upgrade CTA.
- **KV Cache Strategy:** CF Workers KV caches API key lookups with 60s TTL. Cache key = SHA-256 of API key → JSON `{user_id, tier, key_id}`. Cold start: miss → Supabase lookup → cache in KV. On revoke: delete KV entry immediately.
- **Supabase Schema:** SQL migrations in `apps/gateway/supabase/migrations/`. Tables: `api_keys` (key_hash, user_id, tier, name, created_at, revoked_at). RLS: users can only read/write their own keys. Tier stored on `api_keys` table (not user profile) — per-key tier flexibility.
- **Gateway integration point:** `index.ts` line `const tier = 'free'` → replace with auth middleware extracting tier from API key. KV binding in `wrangler.toml` → accessible via `c.env.API_KEYS` (or similar). Supabase client needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Worker secrets.

### Claude's Discretion
- Exact Supabase auth configuration (email confirmation on/off)
- Dashboard CSS framework / styling approach
- KV namespace naming convention
- Supabase client initialization pattern in CF Workers
- Whether to use `@supabase/ssr` or direct `@supabase/supabase-js`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up and log in via Supabase Auth (email/password) | Supabase Auth email/password flow + `signUp` / `signInWithPassword` JS API; dashboard on CF Pages uses `@supabase/supabase-js` anon key |
| AUTH-02 | User can generate API keys from dashboard | POST endpoint on gateway (`/keys`) or direct Supabase insert; `crypto.getRandomValues` to generate 32+ byte key; SHA-256 hash stored; raw key returned once |
| AUTH-03 | Gateway authenticates requests via API key in header | Hono middleware extracts `Authorization: Bearer` → sha256(key) → KV lookup → Supabase fallback; returns 401 on miss or revoked |
| AUTH-04 | API keys scoped to pricing tiers (free/starter/pro/business) | Tier stored as column on `api_keys` table; existing `checkTierAccess(serverName, tier)` wired to tier resolved from auth middleware |
| AUTH-05 | RLS isolation — users cannot access each other's keys or data | `ENABLE ROW LEVEL SECURITY` on `api_keys`; policy `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`; index on `user_id`; two-user isolation test required |
</phase_requirements>

---

## Summary

Phase 6 replaces the `const tier = 'free'` stub in `apps/gateway/src/index.ts` with a real Hono auth middleware that extracts a Bearer API key, hashes it with `crypto.subtle.digest("SHA-256")`, looks up the cached value in Cloudflare Workers KV (60s TTL), falls back to a Supabase `api_keys` table query on miss, and attaches `{userId, tier, keyId}` to the Hono context for downstream `checkTierAccess` and future metering. The gateway uses the **service role key** for its lookups (bypasses RLS intentionally — the gateway validates by hash, not by user session). A minimal dashboard on Cloudflare Pages uses the **anon key** + Supabase Auth for user-facing sign up, login, and key management, where RLS enforces tenant isolation.

The five deliverables for this phase are: (1) Supabase project creation + SQL migration files, (2) KV namespace creation and `wrangler.toml` binding, (3) `apps/gateway/src/middleware/auth.ts` Hono middleware, (4) `/keys` API route for key CRUD, and (5) a minimal Cloudflare Pages dashboard (React + Vite or vanilla HTML).

**Primary recommendation:** Wire auth middleware before anything else — the stub replacement is the critical path. Build the dashboard last since it depends on the gateway `/keys` endpoint being live.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.x (already in monorepo devDeps) | Supabase client for CF Workers (service role) and dashboard (anon key) | Isomorphic — no Node.js-only imports; CF Workers compatible; handles auth + DB in one SDK |
| Hono | 4.x (already installed) | Auth middleware + `/keys` route in existing gateway | Already in use; middleware chain pattern already established |
| Cloudflare Workers KV | Runtime binding | 60s TTL cache for API key lookups | Native CF binding; zero added latency; `env.KV_NAMESPACE.get/put` already understood |
| `crypto.subtle` (Web Crypto API) | Built-in CF Workers | SHA-256 hash of raw API key before storage and lookup | Part of Workers runtime — no npm package needed |
| Vite + React | Latest (Vite 5.x, React 18.x) | Dashboard SPA on Cloudflare Pages | CF Pages has first-class Vite build support; React provides component reuse for key list |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/ssr` | 0.5.x+ | Edge-compatible Supabase auth helpers | Use if dashboard needs server-side auth (e.g., Astro SSR or Next.js). For a pure React SPA on CF Pages, direct `@supabase/supabase-js` + `createClient` is sufficient — `@supabase/ssr` is optional. |
| `wrangler` | 3.x (already installed) | KV namespace creation, Worker secrets management | `wrangler kv namespace create`, `wrangler secret put` |
| `supabase` CLI | Latest | Local Supabase stack for development + migration management | `supabase start` (Docker required); `supabase migration new`; `supabase db push` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React + Vite SPA | Plain HTML + vanilla JS | HTML/JS is simpler to deploy but harder to maintain if dashboard grows in Phase 7/8; React SPA adds ~20KB but provides component model for key list |
| `@supabase/supabase-js` direct in gateway | `@supabase/ssr` | `@supabase/ssr` designed for cookie-based SSR sessions; overkill for service role key usage in a stateless Worker — direct client is correct here |
| `crypto.subtle.digest` (Web Crypto) | Node `crypto.createHash` | Node crypto is unavailable in CF Workers; `crypto.subtle` is native and has identical behavior for SHA-256 hex generation |

**Installation:**

```bash
# Gateway — add Supabase client (not already in gateway's package.json)
cd apps/gateway && npm install @supabase/supabase-js

# KV namespace creation (run once; paste returned ID into wrangler.toml)
npx wrangler kv namespace create API_KEYS
npx wrangler kv namespace create API_KEYS --preview  # for wrangler dev

# Dashboard (new package in apps/dashboard or apps/dashboard-ui)
npm create vite@latest apps/dashboard -- --template react-ts
cd apps/dashboard && npm install @supabase/supabase-js
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 6 additions)

```
apps/
├── gateway/
│   ├── src/
│   │   ├── index.ts           # MODIFY: wire auth middleware
│   │   ├── middleware/
│   │   │   └── auth.ts        # NEW: Bearer → SHA-256 → KV → Supabase
│   │   ├── routes/
│   │   │   └── keys.ts        # NEW: POST /keys (create), DELETE /keys/:id (revoke)
│   │   ├── lib/
│   │   │   └── supabase.ts    # NEW: createClient helper for service role
│   │   ├── router.ts          # UNCHANGED
│   │   ├── serverRegistry.ts  # UNCHANGED
│   │   ├── tierAccess.ts      # UNCHANGED
│   │   └── cors.ts            # UNCHANGED
│   ├── supabase/
│   │   └── migrations/
│   │       ├── 001_api_keys.sql     # NEW: api_keys table + RLS
│   │       └── 002_subscriptions.sql # NEW: subscriptions table (Phase 8 placeholder)
│   └── wrangler.toml          # MODIFY: add [[kv_namespaces]] binding
│
└── dashboard/                 # NEW: Cloudflare Pages app
    ├── package.json           # React + Vite; @supabase/supabase-js
    ├── vite.config.ts
    ├── public/
    │   └── _redirects         # CF Pages SPA redirect: /* /index.html 200
    └── src/
        ├── main.tsx
        ├── supabase.ts        # createClient with anon key + env vars
        ├── App.tsx            # Route: /auth → AuthPage, / → DashboardPage
        ├── pages/
        │   ├── AuthPage.tsx   # Sign up + login form
        │   └── DashboardPage.tsx  # API key list + create + revoke + copy
        └── hooks/
            └── useKeys.ts     # Fetch/create/revoke keys via /keys gateway endpoint
```

### Pattern 1: Auth Middleware — Bearer → SHA-256 → KV → Supabase

**What:** Hono middleware that resolves an incoming Bearer token to `{userId, tier, keyId}` with KV caching.

**When to use:** Applied to all `/mcp/:server` routes and `/keys` routes. NOT applied to `/health`.

**Example:**

```typescript
// apps/gateway/src/middleware/auth.ts
import type { MiddlewareHandler } from 'hono';
import type { GatewayEnv } from '../types.js';

export type AuthContext = { userId: string; tier: string; keyId: string };

export const authMiddleware: MiddlewareHandler<GatewayEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }
  const rawKey = authHeader.slice(7);

  // 1. SHA-256 hash the raw key (Web Crypto — CF Workers native)
  const keyHash = await sha256hex(rawKey);

  // 2. KV cache lookup
  const cached = await c.env.API_KEYS.get(keyHash, 'json') as AuthContext | null;
  if (cached) {
    c.set('auth', cached);
    return next();
  }

  // 3. Supabase fallback
  const supabase = getServiceRoleClient(c.env);
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, tier, revoked_at')
    .eq('key_hash', keyHash)
    .single();

  if (error || !data || data.revoked_at !== null) {
    return c.json({ error: 'Invalid or revoked API key' }, 401);
  }

  const authCtx: AuthContext = { userId: data.user_id, tier: data.tier, keyId: data.id };

  // 4. Write to KV with 60s TTL
  await c.env.API_KEYS.put(keyHash, JSON.stringify(authCtx), { expirationTtl: 60 });

  c.set('auth', authCtx);
  return next();
};

async function sha256hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Pattern 2: GatewayEnv Type Extension

**What:** Extend `GatewayEnv` to include KV binding and Supabase secret bindings, and typed Hono context variables.

**When to use:** Required for TypeScript to accept `c.env.API_KEYS`, `c.env.SUPABASE_URL`, etc.

**Example:**

```typescript
// apps/gateway/src/types.ts (new file)
import type { KVNamespace } from '@cloudflare/workers-types';
import type { AuthContext } from './middleware/auth.js';

export type GatewayEnv = {
  Bindings: {
    API_KEYS: KVNamespace;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
  };
  Variables: {
    auth: AuthContext;
  };
};
```

```typescript
// apps/gateway/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import type { GatewayEnv } from '../types.js';
import type { Context } from 'hono';

// Called inside a request handler — env is per-request in CF Workers
export function getServiceRoleClient(env: GatewayEnv['Bindings']) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
```

### Pattern 3: KV Namespace Binding in wrangler.toml

**What:** Uncomment and fill in the placeholder KV block; add Supabase secrets as `[vars]` (non-secret) or Worker secrets.

**When to use:** Before running `wrangler dev` or deploying.

**Example:**

```toml
# apps/gateway/wrangler.toml
name = "vn-mcp-gateway"
main = "src/index.ts"
compatibility_date = "2025-01-01"
usage_model = "unbound"

[vars]
MOCK_MODE = "true"

[[kv_namespaces]]
binding = "API_KEYS"
id = "<PRODUCTION_KV_ID>"          # from: wrangler kv namespace create API_KEYS
preview_id = "<PREVIEW_KV_ID>"     # from: wrangler kv namespace create API_KEYS --preview
```

```bash
# Supabase credentials stored as Worker secrets (never in wrangler.toml)
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

### Pattern 4: SQL Migration — api_keys Table + RLS

**What:** Versioned SQL migration file with full RLS setup.

**When to use:** Run via `supabase db push` or directly in Supabase SQL editor.

**Example:**

```sql
-- apps/gateway/supabase/migrations/001_api_keys.sql
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,    -- sha256(raw_key) — raw key never stored
  key_prefix   TEXT NOT NULL,           -- first 12 chars for display: 'sk_test_a1b2'
  name         TEXT NOT NULL DEFAULT 'My API Key',
  tier         TEXT NOT NULL DEFAULT 'free',  -- free | starter | pro | business
  revoked_at   TIMESTAMPTZ,             -- NULL = active
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance: policies reference user_id — must be indexed
CREATE INDEX idx_api_keys_user_id ON api_keys (user_id);
-- Gateway lookups by hash — must be indexed
CREATE INDEX idx_api_keys_key_hash ON api_keys (key_hash);

-- RLS: every user sees only their own keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_keys" ON api_keys
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Pattern 5: Key Generation Endpoint

**What:** `POST /keys` route on the gateway creates a new API key; `DELETE /keys/:id` revokes (sets `revoked_at` + deletes KV entry).

**When to use:** Called from the dashboard after the user is authenticated.

**Key generation logic:**

```typescript
// apps/gateway/src/routes/keys.ts
import { Hono } from 'hono';
import type { GatewayEnv } from '../types.js';
import { getServiceRoleClient } from '../lib/supabase.js';

export const keysRouter = new Hono<GatewayEnv>();

keysRouter.post('/', async (c) => {
  // Auth enforced by authMiddleware applied in index.ts
  const auth = c.get('auth');

  // Generate: sk_test_ + 32 random hex bytes
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const suffix = [...randomBytes].map(b => b.toString(16).padStart(2, '0')).join('');
  const rawKey = `sk_test_${suffix}`;
  const keyPrefix = rawKey.slice(0, 16);  // 'sk_test_' + 8 chars

  // Hash for storage
  const keyHash = await sha256hex(rawKey);

  const supabase = getServiceRoleClient(c.env);
  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: auth.userId, key_hash: keyHash, key_prefix: keyPrefix, tier: auth.tier })
    .select('id, key_prefix, tier, created_at')
    .single();

  if (error) return c.json({ error: 'Failed to create key' }, 500);

  // Return raw key ONCE — never retrievable again
  return c.json({ ...data, key: rawKey }, 201);
});

keysRouter.delete('/:id', async (c) => {
  const auth = c.get('auth');
  const keyId = c.req.param('id');
  const supabase = getServiceRoleClient(c.env);

  // Fetch hash before revoking (need it to invalidate KV)
  const { data } = await supabase
    .from('api_keys')
    .select('key_hash')
    .eq('id', keyId)
    .eq('user_id', auth.userId)  // Extra guard — prevent cross-user revoke
    .single();

  if (!data) return c.json({ error: 'Key not found' }, 404);

  // Revoke in DB
  await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId);

  // Invalidate KV immediately (don't wait for TTL)
  await c.env.API_KEYS.delete(data.key_hash);

  return c.json({ success: true }, 200);
});
```

### Pattern 6: index.ts — Wiring Auth Middleware

**What:** Replace the `const tier = 'free'` stub and apply auth middleware to protected routes.

**When to use:** This is the core integration — Phase 6's main deliverable.

**Example (full replacement):**

```typescript
// apps/gateway/src/index.ts  (Phase 6 replacement)
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcpRequest } from './router.js';
import { corsConfig } from './cors.js';
import { authMiddleware } from './middleware/auth.js';
import { keysRouter } from './routes/keys.js';
import type { GatewayEnv } from './types.js';

const app = new Hono<GatewayEnv>();

app.use('/mcp/*', cors(corsConfig));

// Auth middleware on all MCP and key routes
app.use('/mcp/*', authMiddleware);
app.use('/keys/*', authMiddleware);

// MCP routes — tier now comes from auth context, not stub
app.all('/mcp/:server', async (c) => {
  const serverName = c.req.param('server');
  const { tier } = c.get('auth');
  return handleMcpRequest(serverName, c.req.raw, tier);
});

// Key management routes
app.route('/keys', keysRouter);

// Health check (no auth)
app.get('/health', (c) =>
  c.json({ status: 'ok', servers: 5, tools: 18 }),
);

export default app;
```

### Anti-Patterns to Avoid

- **Service role key in client-side code:** The `SUPABASE_SERVICE_ROLE_KEY` must never appear in the dashboard frontend. Dashboard uses the anon key + user JWT. Gateway uses service role. They are separate clients.
- **RLS without `WITH CHECK`:** A policy that has only `USING (...)` allows reads but doesn't prevent inserts/updates with a different `user_id`. Always add `WITH CHECK (user_id = auth.uid())`.
- **Missing index on `user_id` and `key_hash`:** Without these indexes, every auth middleware lookup does a full table scan. Add both indexes in the migration.
- **Supabase client created per-request:** The `createClient()` call is lightweight but adds object allocation. Create it lazily from env per request (acceptable in CF Workers where module scope doesn't persist env). Do NOT create at module scope — `env` is only available inside request handlers.
- **Storing raw API key in KV:** KV cache entries should contain `{userId, tier, keyId}`, keyed by the SHA-256 hash of the key. Never cache the raw key string anywhere.
- **Skipping KV deletion on revoke:** If `DELETE /keys/:id` only updates the DB but doesn't call `c.env.API_KEYS.delete(keyHash)`, the revoked key remains valid for up to 60 more seconds. Always delete the KV entry synchronously before returning.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cryptographic key hashing | Custom base64 hash function | `crypto.subtle.digest('SHA-256', ...)` | Web Crypto is CF Workers native; timing-safe; hardware-accelerated |
| User authentication (sign up/login) | Custom JWT/session system | Supabase Auth (`supabase.auth.signUp`, `.signInWithPassword`) | Handles JWT refresh, email confirmation, sessions — months of work |
| Multi-tenant DB isolation | Manual `WHERE user_id = ?` on every query | Supabase RLS policies | RLS enforced at Postgres level — immune to application-layer bugs |
| KV TTL management | Background job to expire stale cache entries | CF KV `expirationTtl: 60` on `.put()` | Platform handles expiry; no cron job needed |
| API key generation randomness | `Math.random()` or timestamp-based keys | `crypto.getRandomValues(new Uint8Array(32))` | `Math.random()` is not cryptographically secure; Web Crypto is |
| Cloudflare Pages SPA routing | Express server | `_redirects` file with `/* /index.html 200` | CF Pages handles SPA fallback natively |

**Key insight:** The entire auth system is three components — Web Crypto (hashing), Supabase Auth (identity), and CF KV (caching). Don't build any of these from scratch.

---

## Common Pitfalls

### Pitfall 1: Service Role Key Bypasses RLS — Gateway Queries Must Use Explicit `user_id` Filter

**What goes wrong:** The gateway uses the service role key (which bypasses RLS). If a developer writes `supabase.from('api_keys').select('*').eq('key_hash', hash)` without verifying `revoked_at`, any key — including revoked ones — can authenticate.

**Why it happens:** Service role queries silently return all rows including soft-deleted/revoked. RLS does not protect gateway lookups.

**How to avoid:** Always include `.is('revoked_at', null)` (or check `revoked_at !== null`) in the gateway lookup. The migration sets `revoked_at` NULL for active keys.

**Warning signs:** A revoked key still authenticates after DB update but before KV TTL expiry.

### Pitfall 2: KV Namespace ID Not Set — Silent Failure in `wrangler dev`

**What goes wrong:** The existing `wrangler.toml` has the KV block commented out with `id = "PLACEHOLDER"`. If left with a placeholder ID, `wrangler dev` will fail to start, or KV operations will throw.

**Why it happens:** The placeholder was left intentionally for Phase 6. A developer might miss the creation step.

**How to avoid:** Task Wave 0 must include: `wrangler kv namespace create API_KEYS` (get real ID), `wrangler kv namespace create API_KEYS --preview` (get preview ID), update both in `wrangler.toml`.

**Warning signs:** `wrangler dev` error: "No KV namespace found with the given binding name."

### Pitfall 3: `createClient` Called at Module Scope — `env` Not Available

**What goes wrong:** In CF Workers, `env` (Bindings) is only available within request handler scope. If `createClient(env.SUPABASE_URL, ...)` is called at module level (outside any function), `env` is `undefined` and the call throws.

**Why it happens:** The Supabase client is often created as a module-level singleton in Node.js apps. This pattern doesn't apply to CF Workers.

**How to avoid:** Create the Supabase client inside the request handler or pass `env` as a parameter to a factory function (`getServiceRoleClient(env)`).

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'SUPABASE_URL')` on Worker startup.

### Pitfall 4: RLS Policy Missing `WITH CHECK` — Cross-Tenant Writes Allowed

**What goes wrong:** A policy with only `USING (user_id = auth.uid())` correctly isolates SELECT queries. But INSERT/UPDATE operations are not restricted — a user could insert a row with someone else's `user_id`.

**Why it happens:** Developers write the SELECT policy and assume it covers all operations.

**How to avoid:** The migration SQL above uses `FOR ALL ... USING (...) WITH CHECK (...)` which covers all operations. Verify with `SELECT * FROM pg_policies WHERE tablename = 'api_keys'`.

**Warning signs:** Policy shows only `USING` clause in `pg_policies.qual` with no `pg_policies.with_check` value.

### Pitfall 5: Dashboard Uses Service Role Key

**What goes wrong:** The dashboard SPA bundles `SUPABASE_SERVICE_ROLE_KEY` as a `VITE_` env var. Service role key is exposed in browser network requests → anyone can access all users' data.

**Why it happens:** Quick implementation copies the gateway's Supabase client setup.

**How to avoid:** Dashboard uses only `VITE_SUPABASE_ANON_KEY` (safe to expose — RLS protects data). Service role key stays only in Worker secrets. Enforce this in code review.

**Warning signs:** `VITE_SUPABASE_SERVICE_ROLE_KEY` in dashboard `.env` file.

### Pitfall 6: Key CRUD Routes Called Without Auth — Missing Middleware Application

**What goes wrong:** The `keysRouter` is mounted at `/keys` but auth middleware is applied with `app.use('/mcp/*', authMiddleware)` — the `/keys` prefix is not covered.

**Why it happens:** The middleware glob is copied from the existing MCP route and not extended.

**How to avoid:** Apply auth middleware to both `/mcp/*` AND `/keys/*` in `index.ts`. See Pattern 6 above.

**Warning signs:** `GET /keys` returns 200 without an Authorization header.

### Pitfall 7: Email Confirmation Blocks Immediate Testing (AUTH-01)

**What goes wrong:** By default, Supabase Auth requires email confirmation before a user can log in. In development, this means `signUp` succeeds but `signInWithPassword` returns `Email not confirmed`. Tests and QA loops stall.

**Why it happens:** Supabase Auth defaults to email confirmation enabled for new projects.

**How to avoid:** For the initial development phase, disable email confirmation in Supabase Dashboard → Authentication → Providers → Email → "Confirm email" toggle. Re-enable before production launch. Document this in the Wave 0 task.

**Warning signs:** `signInWithPassword` returns `{ error: { message: 'Email not confirmed' } }` after a successful `signUp`.

---

## Code Examples

### SHA-256 Hash Helper (Web Crypto — CF Workers Native)

```typescript
// Source: Cloudflare Workers docs — https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Supabase Client in Dashboard (React SPA — anon key)

```typescript
// apps/dashboard/src/supabase.ts
// Source: https://supabase.com/docs/guides/auth/passwords
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// Sign up
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

// Sign in
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}
```

### CF Pages `_redirects` for SPA Routing

```
# apps/dashboard/public/_redirects
/* /index.html 200
```

### Two-User RLS Isolation Test (Vitest)

```typescript
// Test that User B cannot read User A's API key
it('AUTH-05: User B cannot read User A api_keys via anon client', async () => {
  // userAClient = createClient(url, anonKey, { headers: { Authorization: `Bearer ${userA.jwt}` } })
  // userBClient = createClient(url, anonKey, { headers: { Authorization: `Bearer ${userB.jwt}` } })
  const { data } = await userBClient.from('api_keys').select('*').eq('user_id', userAId);
  expect(data).toHaveLength(0);  // RLS returns empty, not error
});
```

### KV Put/Get/Delete Pattern

```typescript
// Source: https://developers.cloudflare.com/kv/concepts/kv-bindings/
// Write with TTL
await env.API_KEYS.put(keyHash, JSON.stringify(authCtx), { expirationTtl: 60 });

// Read (typed)
const cached = await env.API_KEYS.get<AuthContext>(keyHash, { type: 'json' });

// Delete immediately on revoke
await env.API_KEYS.delete(keyHash);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-*` packages | `@supabase/ssr` for server-side; direct `@supabase/supabase-js` for workers | 2023-2024 | auth-helpers-nextjs deprecated; use `@supabase/ssr` or direct client |
| Storing raw API keys in DB | Store SHA-256 hash only; return key once | Industry standard circa 2020+ | Database breach does not expose all keys |
| RLS without `WITH CHECK` | Always `USING + WITH CHECK` | Supabase docs recommendation | Prevents cross-tenant write attacks |
| Module-level Supabase client in Workers | Per-request factory `getServiceRoleClient(env)` | CF Workers pattern | Module scope doesn't have access to `env` bindings |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs` — replaced by `@supabase/ssr`
- SSE-only MCP transport — already using Streamable HTTP (done in Phase 5)

---

## Open Questions

1. **Supabase project creation: cloud or local-first development?**
   - What we know: CONTEXT.md says "Supabase project not yet created — plan should include setup instructions." The `supabase` CLI can run a full local stack via Docker.
   - What's unclear: Does the team have Docker available for local Supabase? If not, cloud project must be created first.
   - Recommendation: Plan should cover both paths: (a) create Supabase cloud project first for simplicity, (b) optionally add local dev setup as a follow-on task.

2. **Dashboard framework: React + Vite vs. plain HTML**
   - What we know: CONTEXT.md says "Claude's discretion." The gateway already uses TypeScript. CF Pages deploys Vite builds natively.
   - What's unclear: Intended complexity of the dashboard — Phase 7/8 will add usage charts. React gives better extensibility.
   - Recommendation: React + Vite SPA. The component model pays off when Phase 7 adds usage charts. Adds ~5KB to implementation complexity.

3. **Email confirmation: on or off for launch?**
   - What we know: Default Supabase is email-confirm-required. This is a blocker in dev and adds friction at launch.
   - What's unclear: Is there a real email sending setup (SMTP/Resend) planned for Phase 6?
   - Recommendation: Disable email confirmation for development; plan to enable for production launch with a transactional email service (Resend free tier or Supabase's built-in email). Document the toggle explicitly.

4. **API key endpoint: on gateway Worker vs. separate Supabase Edge Function?**
   - What we know: CONTEXT.md says "POST /keys — internal, called by dashboard." The gateway is the natural host.
   - What's unclear: Whether to expose key management on the same Worker as the MCP routes, or a separate deployment.
   - Recommendation: Keep on the same gateway Worker. The auth middleware is already there; adding a `/keys` Hono router costs nothing in complexity.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.x (already configured in `apps/gateway/vitest.config.ts`) |
| Config file | `apps/gateway/vitest.config.ts` |
| Quick run command | `cd apps/gateway && npm test` |
| Full suite command | `cd apps/gateway && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | User can sign up + sign in via Supabase Auth | integration (Supabase local or mocked) | `npm test -- --reporter=verbose` (auth.test.ts) | ❌ Wave 0 |
| AUTH-02 | User can generate API key via `/keys` endpoint | unit + integration | `npm test -- --reporter=verbose` (keys.test.ts) | ❌ Wave 0 |
| AUTH-03 | Gateway rejects missing/invalid Bearer key with 401 | unit | `npm test -- --reporter=verbose` (auth-middleware.test.ts) | ❌ Wave 0 |
| AUTH-03 | Gateway passes valid key and attaches tier to context | unit | same file | ❌ Wave 0 |
| AUTH-04 | Free-tier key blocked from restricted servers (existing test covers tier logic) | unit | existing `integration.test.ts` GATE-04 | ✅ exists |
| AUTH-04 | Auth middleware extracts correct tier from mock KV entry | unit | auth-middleware.test.ts | ❌ Wave 0 |
| AUTH-05 | User B cannot read User A's keys via anon Supabase client | integration | rls-isolation.test.ts | ❌ Wave 0 |

**Note on AUTH-05 (RLS test):** Full RLS tests require a real Supabase instance (local Docker or cloud project). These should be tagged as integration tests and run separately from unit tests. Unit tests can verify the SQL policy definitions are present in migration files, but actual RLS enforcement requires Postgres to run.

### Sampling Rate

- **Per task commit:** `cd apps/gateway && npm test`
- **Per wave merge:** `cd apps/gateway && npm test`
- **Phase gate:** Full suite green (including manual `wrangler dev` smoke test: valid key → 200, invalid key → 401, revoked key → 401 within 60s) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/gateway/src/__tests__/auth-middleware.test.ts` — unit tests for `authMiddleware` with mocked KV and mocked Supabase; covers AUTH-03, AUTH-04
- [ ] `apps/gateway/src/__tests__/keys.test.ts` — unit tests for `POST /keys`, `DELETE /keys/:id`; covers AUTH-02
- [ ] `apps/gateway/src/__tests__/rls-isolation.test.ts` — integration test for AUTH-05 (requires Supabase local stack or mocked RLS behavior)
- [ ] `apps/gateway/src/__tests__/auth-supabase.test.ts` — integration test for AUTH-01 (sign up + sign in flow via Supabase client; may use mocked client)
- [ ] `apps/gateway/src/types.ts` — `GatewayEnv` type definition needed by all new files
- [ ] `apps/gateway/supabase/migrations/001_api_keys.sql` — schema migration
- [ ] `apps/dashboard/` directory and Vite scaffold

---

## Sources

### Primary (HIGH confidence)

- Cloudflare Workers Web Crypto API — [https://developers.cloudflare.com/workers/runtime-apis/web-crypto/](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/) — SHA-256 digest + hex conversion pattern
- Cloudflare KV bindings docs — [https://developers.cloudflare.com/kv/concepts/kv-bindings/](https://developers.cloudflare.com/kv/concepts/kv-bindings/) — `[[kv_namespaces]]` wrangler.toml structure, `expirationTtl`
- Supabase Row Level Security — [https://supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security) — `USING + WITH CHECK`, `auth.uid()`, `TO authenticated` pattern, index requirement
- Supabase Password Auth — [https://supabase.com/docs/guides/auth/passwords](https://supabase.com/docs/guides/auth/passwords) — `signUp`, `signInWithPassword` JS API
- Cloudflare Pages React deploy — [https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) — SPA build config, `_redirects`
- `.planning/research/ARCHITECTURE.md` — Auth middleware design, KV cache pattern (HIGH — project-specific, already verified)
- `.planning/research/STACK.md` — `@supabase/supabase-js` v2.x, `@supabase/ssr`, Hono 4.x versions (HIGH — verified in existing package.json)
- `.planning/research/PITFALLS.md` — RLS silent failure modes, service role bypass, API key hash-only storage (HIGH — project-specific, detailed)
- Existing codebase — `apps/gateway/src/index.ts`, `tierAccess.ts`, `router.ts`, `serverRegistry.ts`, `wrangler.toml` (HIGH — directly inspected)

### Secondary (MEDIUM confidence)

- Supabase + CF Workers integration — [https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/](https://developers.cloudflare.com/workers/databases/third-party-integrations/supabase/) — confirmed `@supabase/supabase-js` works in Workers runtime
- `createClient` per-request vs. module scope pattern for CF Workers — multiple community sources + official Supabase integration guide

### Tertiary (LOW confidence)

- Email confirmation behavior for new Supabase projects (defaults) — training data; verify in actual Supabase dashboard before implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed or well-documented for CF Workers
- Architecture: HIGH — exact integration points verified from codebase inspection; stub replacement location confirmed in `index.ts:17`
- Pitfalls: HIGH — RLS and service role bypass patterns from official Supabase docs; KV creation from CF docs
- Validation: MEDIUM — test file paths proposed based on existing pattern; actual test logic needs implementation in Wave 0

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable ecosystem — Supabase JS v2, Hono 4.x, CF KV are not fast-moving)
