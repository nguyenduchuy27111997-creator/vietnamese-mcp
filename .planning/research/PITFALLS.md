# Pitfalls Research

**Domain:** Hosted MCP gateway platform — Cloudflare Workers SSE, Supabase auth/RLS, Stripe+MoMo metered billing, npm monorepo publishing
**Researched:** 2026-03-21
**Confidence:** HIGH (Cloudflare Workers, Stripe, Supabase RLS patterns) / MEDIUM (MoMo webhook specifics, Tinybird metering pipeline) / LOW (MoMo payment API from VN dev perspective — limited English post-mortems)

---

## Critical Pitfalls

### Pitfall 1: Cloudflare Workers CPU Time Limit Kills Long-Running SSE Sessions

**What goes wrong:**
Cloudflare Workers enforce a **CPU time limit of 30 seconds on the paid plan (Bundled usage model)** — and critically, this is *wall-clock CPU time consumed by JS execution*, not elapsed wall-clock time. An SSE connection that sits idle waiting for the next MCP message from a client consumes almost no CPU, but any CPU-intensive burst (HMAC signing, Zod schema parsing, response transformation) during an active session can push the worker over the limit and terminate the connection mid-session.

Worse: the **free plan enforces a 10ms CPU limit per request**. An SSE handler that tries to maintain a persistent connection on the free plan will be killed immediately.

**Why it happens:**
Developers conflate "request duration" with "CPU time." An SSE connection can stay alive for minutes with zero CPU (just idle streaming), but bursts of processing within that session accumulate toward the CPU cap. Also, developers testing locally never hit the limit because the local `wrangler dev` environment doesn't enforce CPU limits.

**How to avoid:**
- Use **Cloudflare Workers Paid plan (Unbound model)** for the gateway — this gives 30s CPU time per invocation and up to 15 minutes wall-clock time (with `waitUntil()`).
- For MCP SSE sessions, structure the worker to respond immediately with the SSE stream headers, then use `ReadableStream` with a controller to push events lazily — all HMAC computation and Zod validation must happen before yielding to the stream.
- Test CPU budget by profiling the full MCP tool call cycle (auth → rate-check → tool dispatch → VN API mock → response) in wrangler with `wrangler dev --local`.
- Set `wrangler.toml` to `[usage_model] = "unbound"` from day one — retrofitting is painful.

**Warning signs:**
- SSE connections drop after exactly 10–30 seconds of activity.
- `Worker exceeded CPU time limit` in Cloudflare dashboard logs.
- Connection works locally with `wrangler dev` but fails in production.

**Phase to address:** Cloudflare Workers gateway phase. Establish the Unbound usage model in `wrangler.toml` before writing any SSE handler code.

---

### Pitfall 2: Cloudflare Workers Has No Persistent TCP Connections — SSE Requires Careful Streaming

**What goes wrong:**
Cloudflare Workers does not support Node.js APIs. There is no `http.createServer`, no `EventEmitter`, no `setTimeout` that survives across requests, and no persistent in-memory state between invocations. SSE implementations that depend on maintaining a client registry in memory (a common pattern in Express/Node SSE tutorials) break completely — each worker invocation is stateless.

Additionally, Cloudflare terminates SSE connections on inactivity. Without periodic heartbeat pings, connections drop silently after ~60 seconds in some edge locations.

**Why it happens:**
Developers port Node.js SSE patterns to Workers without accounting for the stateless, V8-isolate execution model. Tutorials for "Node.js SSE server" use `res.write()` in a loop which has no equivalent in the Workers fetch handler model.

**How to avoid:**
- Use the **Web Streams API (`ReadableStream`, `TransformStream`)** exclusively — this is the Workers-native pattern for SSE.
- Structure the SSE handler as a `Response` with a `ReadableStream` body: the controller enqueues SSE-formatted chunks as MCP protocol events arrive.
- Send SSE heartbeat pings (`data: ping\n\n`) every 15 seconds via `setInterval` inside the stream controller.
- For Hono.js specifically: use `streamSSE()` from `hono/streaming`, which handles the SSE formatting and heartbeat internally.
- Do NOT store any session state in module-level variables — Workers instances are recycled unpredictably.

**Warning signs:**
- SSE connections drop silently after ~60 seconds without activity.
- MCP clients report "connection reset" with no error message.
- A session that works for short tool calls fails for tools that take >1 second (timeout waiting for next event).

**Phase to address:** Cloudflare Workers gateway phase. Write a minimal SSE smoke test (connect → receive 3 events → disconnect cleanly) before implementing any MCP routing logic.

---

### Pitfall 3: MCP `stdio` Tools Are Not Directly Portable to SSE/Streamable HTTP Transport

**What goes wrong:**
The existing five MCP servers use `StdioServerTransport`. Switching to `SSEServerTransport` or `StreamableHTTPServerTransport` is not a drop-in change. The transport layer change has ripple effects:

1. **Session management:** stdio assumes one process per client. SSE/HTTP transport must handle multiple concurrent clients with isolated sessions — the MCP SDK's `SSEServerTransport` creates one transport instance per connection, which must be tracked and disposed correctly.
2. **Tool registration timing:** stdio servers register tools at startup, before any client connects. In an HTTP handler, the `McpServer` instance may be recreated per request — all tools must be registered on each instance, not once globally.
3. **Environment variable injection:** stdio servers read env vars from the spawning process. In a Workers environment, env vars come from `wrangler.toml` secrets — the API keys for MoMo/ZaloPay/etc must be re-plumbed through the Workers env binding.

**Why it happens:**
The MCP SDK abstracts transport but not session lifecycle. Developers assume `new McpServer()` + `new SSEServerTransport()` is a straightforward swap for `new StdioServerTransport()`.

**How to avoid:**
- Refactor each server's tool registration into a standalone `registerTools(server: McpServer)` function that can be called on any server instance — this is already the recommended pattern from v1.0.
- In the Workers gateway, create a fresh `McpServer` per SSE connection and call `registerTools(server)` immediately before connecting the transport.
- Use a `Map<string, McpServer>` keyed by session ID (from the SSE URL or a generated UUID) to track active sessions. Clean up on SSE disconnect.
- Pass the Workers `env` binding into the tool registration function so API credentials flow through cleanly.

**Warning signs:**
- Tools appear registered but never respond (server instance was created but tools were never registered on it).
- Second SSE client to connect receives events intended for the first client (session state leakage).
- `env.MOMO_SECRET_KEY` is undefined in tool handlers (env binding not threaded through).

**Phase to address:** Cloudflare Workers gateway phase. This is the single highest-complexity integration point in the v1.1 milestone.

---

### Pitfall 4: Supabase RLS Policies That Are "Almost Correct" — Silent Data Leakage

**What goes wrong:**
Supabase RLS (Row Level Security) policies that look correct in isolation can leak data across tenant boundaries in subtle ways:

1. **`auth.uid()` used without `service_role` bypass awareness:** When Supabase's service role key is used (e.g., in a server-side Workers function), RLS is bypassed entirely. If the gateway uses the service role key to validate API keys, one missed `WHERE user_id = auth.uid()` in a query silently returns all users' data.
2. **API key table without RLS enabled:** A table created without `ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY` has no protection — all rows visible to all authenticated users.
3. **`WITH CHECK` omitted from UPDATE/INSERT policies:** A `SELECT` policy correctly isolates reads, but without a `WITH CHECK` clause on the `INSERT`/`UPDATE` policy, a tenant can overwrite another tenant's rows if they know the row ID.
4. **Indirect joins that bypass RLS:** A query that joins `api_keys` → `usage_records` may correctly filter `api_keys` by RLS but returns all `usage_records` rows that match — if `usage_records` doesn't have its own RLS policy, the join leaks cross-tenant usage data.

**Why it happens:**
RLS policies are written per-table in isolation. Developers test with their own user and see correct data. Cross-tenant leakage only surfaces when testing as a second user, which is rarely done in early development.

**How to avoid:**
- Enable RLS on **every table** that contains tenant-specific data — not just the primary tables but also junction/lookup tables and derived tables.
- Always use `anon` key (not `service_role`) for client-facing operations; reserve `service_role` only for trusted server-side admin operations (e.g., billing event writes).
- Write an explicit RLS test: create two test users, insert data for each, verify that User B cannot see or modify User A's rows using the `anon` key.
- Use `USING (auth.uid() = user_id)` AND `WITH CHECK (auth.uid() = user_id)` on every policy.
- Run `SELECT * FROM pg_policies` after setup and audit that every table has at least one policy.

**Warning signs:**
- Queries using the service role key return all rows (expected, but dangerous if service role leaks).
- A new table was added and its RLS status was not verified.
- There is no test that verifies cross-tenant isolation.

**Phase to address:** Supabase auth + API key management phase. RLS verification must be a required checklist item before any real data enters the system.

---

### Pitfall 5: API Key Validation in the Hot Path — Supabase Latency Kills SSE Throughput

**What goes wrong:**
If every incoming MCP tool call makes a synchronous Supabase query to validate the API key and check usage quota, the gateway adds 20–100ms of Supabase round-trip latency to every tool call. For MCP sessions where Claude Code calls tools in rapid succession (5–10 calls in a conversation turn), this compounds to 100–1000ms of avoidable delay.

**Why it happens:**
The simplest implementation validates the API key on every request because it's the most obviously correct approach. Caching is treated as an optimization to add later, but in a Workers stateless model there is no obvious place to cache.

**How to avoid:**
- Use **Cloudflare Workers KV** to cache API key validation results. On first request, validate against Supabase and store the result (tier, user_id, rate_limit) in KV with a 60-second TTL. Subsequent requests within the TTL skip the Supabase round-trip.
- Structure the KV key as `apikey:{hash(key)}` — never store the raw API key in KV.
- Invalidate the KV cache entry immediately when the user revokes or rotates their key (via a Supabase webhook → Workers KV write).
- For rate limiting, use **Cloudflare Rate Limiting** rules at the edge level instead of checking Supabase per-request.

**Warning signs:**
- Tool call response time in SSE sessions is consistently 200–500ms even for trivial tools.
- Supabase dashboard shows a high volume of identical queries for the same API key within a short window.
- `workers_kv_namespaces` is absent from `wrangler.toml`.

**Phase to address:** Cloudflare Workers gateway phase, during the auth integration step.

---

### Pitfall 6: Stripe Webhook Signature Verification Done Wrong

**What goes wrong:**
Stripe sends webhooks to a public HTTPS endpoint. Three common implementation mistakes lead to either security holes or false rejections:

1. **Body parsed before signature verification:** Stripe's webhook signature is computed over the raw request body bytes. If the framework (Hono, Express) parses the body into JSON before the signature check, the raw bytes are lost and the signature verification always fails.
2. **Missing idempotency key handling:** Stripe retries webhook delivery up to 72 hours on any non-2xx response. If the handler processes a `checkout.session.completed` event and then returns a 500 due to a downstream error, the handler fires again on retry — potentially double-crediting a subscription upgrade.
3. **Not verifying the `t` timestamp in the signature:** Stripe's signature includes a timestamp (`t=1234567890`) to prevent replay attacks. Ignoring the timestamp and only checking the hash allows an attacker to replay a legitimate webhook payload at any future time.

**Why it happens:**
1. Middleware body-parsing runs automatically in most frameworks — developers don't realize it's running before their handler.
2. Idempotency is an afterthought: "handle the webhook" feels done when the handler runs once without error.
3. Most tutorials show signature verification but skip the timestamp window check.

**How to avoid:**
- In Hono on Workers, receive the webhook body as raw text (`await c.req.text()`) BEFORE any JSON parsing, then verify with `stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)`.
- Store processed webhook event IDs in a Supabase `webhook_events` table keyed by `stripe_event_id`. Before processing, check if the event ID already exists — if yes, return 200 without re-processing.
- Use `stripe.webhooks.constructEvent()` which validates both the HMAC signature AND the timestamp (default: rejects events older than 300 seconds).
- Test webhook handling with the Stripe CLI: `stripe listen --forward-to localhost:8787/webhooks/stripe`.

**Warning signs:**
- Webhook signature verification always fails in production but works with the Stripe CLI locally (body parsing difference).
- Subscription upgrades occasionally credit twice during high traffic (Stripe retries due to downstream timeout).
- The webhook handler has no idempotency check.

**Phase to address:** Stripe billing integration phase. Set up idempotency before wiring any business logic to webhook events.

---

### Pitfall 7: MoMo Payment Callback/IPN Cannot Be Tested Without a Deployed URL

**What goes wrong:**
MoMo's IPN (Instant Payment Notification) requires a publicly accessible HTTPS URL. Unlike Stripe which has a CLI forwarder, MoMo's sandbox does not have an equivalent local tunnel tool. Developers discover this late: the payment creation works, the redirect works, but the IPN handler code is never actually invoked in development — the callback goes to `https://your-workers-url.workers.dev/webhooks/momo` which doesn't exist yet.

Additionally, MoMo sandbox IPNs sometimes behave differently from production IPNs:
- The sandbox may not send IPNs for all payment scenarios.
- MoMo sandbox IPN signatures use the same HMAC-SHA256 scheme as outbound requests but the field order in the IPN payload differs from the payment creation response.

**Why it happens:**
MoMo's developer documentation for the IPN callback is thinner than for the payment creation flow. Developers focus on the "create payment → return URL" happy path and treat IPN as a minor detail.

**How to avoid:**
- Deploy the MoMo IPN endpoint to Cloudflare Workers **before** attempting any sandbox payment testing — the Workers subdomain (`*.workers.dev`) is immediately publicly accessible.
- Write a `POST /webhooks/momo` handler as the first Workers route, before any SSE/MCP routing, so it can be tested independently.
- Implement MoMo IPN signature verification using the documented field order for the IPN payload — verify with the MoMo sandbox test payment flow and log the raw IPN body to confirm field names.
- Add a `POST /webhooks/momo/simulate` internal-only endpoint (guarded by a secret header) that accepts a mock IPN payload for local testing via `wrangler dev`.

**Warning signs:**
- The MoMo IPN URL in payment creation requests points to localhost or a placeholder URL.
- There are no tests for the MoMo IPN handler function.
- Paid/completed status is only checked via `momo_query_status` polling rather than IPN push.

**Phase to address:** Billing integration phase. The IPN endpoint must be deployed before any real or sandbox MoMo payment testing.

---

### Pitfall 8: npm Monorepo Publishing — Workspace Protocol Leaking into Published Packages

**What goes wrong:**
When a package in an npm workspace declares a dependency using the workspace protocol (`"@vn-mcp/shared": "workspace:*"`), npm does NOT automatically replace this with the resolved version when publishing. The published package on npm contains `"workspace:*"` as a literal dependency value, which is meaningless to consumers outside the monorepo — they cannot install it.

This is a pnpm-origin protocol that npm workspaces does not recognize. With npm workspaces, the workspace package `@vn-mcp/shared` is internal and should NOT be in the published `dependencies` of the server packages.

**Why it happens:**
pnpm users know to run `pnpm publish` which rewrites `workspace:*` to the resolved version. npm has no equivalent. The problem only surfaces when a consumer runs `npm install @vn-mcp/mcp-momo-vn` and gets an installation failure for `@vn-mcp/shared`.

**How to avoid:**
- Keep `@vn-mcp/shared` as a **private, non-published** internal package. Each published server must bundle its dependencies from shared, not declare `@vn-mcp/shared` as a runtime dependency.
- Use `tsdown` to bundle each server into a self-contained output that inlines the shared package code — this is already the correct pattern for CLI tools published on npm.
- If shared code truly should not be inlined, publish `@vn-mcp/shared` as a public scoped package first, then reference it as a versioned dependency (e.g., `"@vn-mcp/shared": "^1.0.0"`), never as a workspace reference.
- Run `npm pack --dry-run` on each server package before `npm publish` to inspect the published file list and `package.json` dependency values.

**Warning signs:**
- `package.json` of a server package shows `"@vn-mcp/shared": "workspace:*"` in dependencies.
- `npm install @vn-mcp/mcp-momo-vn` from outside the monorepo fails with "not found: @vn-mcp/shared".
- The published tarball includes references to local file paths.

**Phase to address:** npm publishing phase. Resolve the bundle-vs-publish strategy for shared code before publishing any package.

---

### Pitfall 9: Missing `files` Field in `package.json` — Publishing Source + Build Artifacts Together

**What goes wrong:**
Without an explicit `files` field in each server's `package.json`, `npm publish` includes everything not in `.npmignore` — including `src/` TypeScript source, `__tests__/`, fixture JSON files, `.env.example`, and `CLAUDE.md`. This bloats the package size (a 15KB server becomes 200KB) and leaks internal implementation details and mock fixture structures.

Additionally, if `tsconfig.json` is included in the published package, consumers who run `tsc` in their project may pick up the server's TypeScript configuration, causing unexpected compilation errors.

**Why it happens:**
Developers add a `build` script but forget to configure `files`. The default npm publish behavior is "publish everything except things in .npmignore," which is maximally permissive.

**How to avoid:**
- Add `"files": ["dist/", "README.md"]` to every server's `package.json`. Only the compiled output and public docs are published.
- Set `"main": "dist/index.js"` and `"bin": { "mcp-momo-vn": "dist/index.js" }` pointing to the compiled output.
- Run `npm pack --dry-run` and verify the file list contains only `dist/` and `README.md`.
- Add `src/` and `__tests__/` to `.npmignore` as a belt-and-suspenders measure.

**Warning signs:**
- `npm pack --dry-run` lists `src/**/*.ts` files.
- Published package size is >1MB (should be <50KB for these servers).
- Consumers see TypeScript compilation errors originating from the server's `tsconfig.json`.

**Phase to address:** npm publishing phase. Configure `files` and verify with `npm pack` before the first `npm publish`.

---

### Pitfall 10: Tinybird Usage Events Dropped Due to Wrong Ingestion Schema

**What goes wrong:**
Tinybird uses a columnar schema (defined in `.tinyb` datasource files) for the Events API. If the JSON payload sent to the ingestion endpoint has extra fields, wrong types, or missing required fields, Tinybird silently **drops the event** rather than returning an error. Events that fail schema validation are discarded with no alert — usage data appears correct in dashboards but is actually missing events.

For the billing pipeline: if `api_call_events` datasource drops events, Tinybird-based metering underreports usage, causing under-billing. Worse, the underreporting is invisible until a billing reconciliation reveals the gap.

**Why it happens:**
Tinybird's Events API is a streaming fire-and-forget endpoint. It accepts 202 for well-formed HTTP requests even if the payload fails schema validation. Developers test with a few events, see 202 responses, and assume all events are being ingested.

**How to avoid:**
- Define the Tinybird datasource schema strictly before writing the ingestion code. Every field sent must be in the schema with the correct type.
- After ingestion, always verify with `SELECT count() FROM api_call_events WHERE date = today()` — if count is lower than expected, schema validation is dropping events.
- Send a test batch of 100 known events and verify exactly 100 appear in the datasource.
- Log ingestion errors explicitly in the Workers code by parsing the Tinybird API response body — a 202 with `{"quarantined_rows": 5}` in the body means 5 events were dropped.
- Add an alert: if `quarantined_rows > 0` in any ingestion response, log to Cloudflare Workers logpush.

**Warning signs:**
- Tinybird API returns 202 but the event count in the datasource doesn't increase.
- Dashboard shows fewer API calls than the gateway access logs record.
- Ingestion response body contains `"quarantined_rows": N` with N > 0.

**Phase to address:** Usage metering (Tinybird) phase. Schema validation and ingestion verification must be completed before billing is wired to Tinybird counts.

---

### Pitfall 11: MoMo as a Payment Processor — Account Approval Required, Not Just API Keys

**What goes wrong:**
MoMo payment integration (as a payment gateway for collecting subscription fees, not just for wrapping the MoMo API as an MCP tool) requires a **merchant business account** with MoMo approval. The sandbox API keys available on the developer portal allow testing the payment creation flow but cannot process real money. Real merchant access requires:
- A registered Vietnamese business entity (MST — mã số thuế).
- KYC document submission.
- A 3–7 business day approval process.

Developers who plan to use MoMo for billing without accounting for this approval timeline ship a Stripe-only billing system initially, or delay the MoMo billing phase.

**Why it happens:**
The MoMo developer docs present sandbox integration as the primary path. The merchant account requirements are documented separately under "business onboarding" and are easy to miss when following the integration tutorial.

**How to avoid:**
- Start the MoMo merchant account application **at the beginning of the billing phase**, not at the end.
- Build the billing system with a clear abstraction layer: `PaymentProvider` interface with two implementations — `StripePaymentProvider` and `MoMoPaymentProvider`. Stripe launches first; MoMo is added when merchant approval arrives.
- Plan for a "VND billing via bank transfer" fallback if MoMo approval is delayed: accept bank transfer manually and credit accounts manually until MoMo is live.

**Warning signs:**
- MoMo billing phase is planned to start after Stripe billing is complete, with no merchant application submitted yet.
- The architecture assumes MoMo can be used immediately after API key configuration with no approval step.
- No "MoMo pending approval" contingency plan exists.

**Phase to address:** Billing architecture phase. Create the `PaymentProvider` abstraction before any billing code is written. Submit MoMo merchant application at milestone start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Use service role key everywhere in Workers | Bypasses RLS complexity during dev | Any bug in auth middleware exposes all tenant data; impossible to enforce RLS later without refactor | Never — use anon key for tenant operations from day one |
| Skip API key caching (validate against Supabase per request) | Simpler implementation | 50–100ms added to every MCP tool call; Supabase connection pool exhausted under load | Acceptable for first 100 users — add KV cache when p95 latency exceeds 200ms |
| Single `McpServer` instance shared across SSE connections | Simpler code | Tool handlers share state across tenants; session isolation breaks | Never — create one McpServer per connection |
| Publish without `files` field in package.json | Zero config | Leaks source, tests, fixtures; bloated package | Never — `files` takes 5 minutes to configure |
| Stripe webhooks processed synchronously in handler | Simpler | Downstream errors (Supabase write fails) cause Stripe to retry → double processing | Never — use idempotency table from the start |
| Hard-code free tier limits in Workers code | No database dependency | Changing tier limits requires code deploy; no per-tenant overrides | Acceptable for MVP — externalize to Supabase config table after first enterprise inquiry |
| Single Tinybird datasource for all five servers | Simpler schema | Cannot analyze per-server usage; cannot attribute billing to specific MCP servers | Never — use server_id column; costs nothing to add upfront |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Cloudflare Workers + Hono SSE | Using `c.json()` or `c.text()` for SSE route — closes connection immediately | Use `streamSSE(c, async (stream) => {...})` from `hono/streaming` to keep connection open |
| Cloudflare Workers + Supabase | Creating a new `createClient()` on every request — leaks connections | Create the Supabase client once in the module scope with the `anon` key; pass JWT per-request via `auth.setSession()` |
| Supabase RLS + API key auth | Validating API key but using service role key for the subsequent query — RLS bypassed | Use `supabase.auth.setSession({ access_token: jwtForUser })` before any tenant query |
| Stripe webhooks + Hono | `await c.req.json()` before signature check destroys raw body | `const raw = await c.req.text()` first; verify signature; then `JSON.parse(raw)` |
| Stripe + Supabase | Storing Stripe customer ID in Supabase without an index | `WHERE stripe_customer_id = $1` on webhook events does a full table scan — add index from the start |
| Tinybird Events API | Not checking `quarantined_rows` in ingestion response | Parse response body after every POST `/v0/events`; alert on any non-zero `quarantined_rows` |
| MoMo IPN + Workers | Async Supabase write inside IPN handler that times out — MoMo retries | Use `ctx.waitUntil(supabaseWrite)` to defer the write; return 200 immediately to MoMo |
| npm workspaces + tsdown | `tsdown` bundles workspace dependencies but leaves `node_modules` references for non-workspace deps | Verify bundle output has no `require('@vn-mcp/shared')` references — shared code must be inlined |
| npm publish + 2FA | Publishing from CI fails if npm account has 2FA enabled without automation token | Use `npm token create --type=automation` for CI; not a regular token |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No KV caching for API key validation | Every tool call adds 50–100ms Supabase RTT | Cache in Workers KV with 60s TTL | At >100 concurrent SSE sessions |
| Tinybird events batched too small | High ingestion overhead; Tinybird rate limits on free tier | Batch ≥100 events or flush every 5 seconds | At >100 tool calls/minute |
| Supabase `count(*)` for usage quota check per request | Full table scan on usage_records per request | Maintain a pre-aggregated `usage_counters` table updated via trigger | At >1000 records per API key |
| Workers cold start with large bundled dependencies | First SSE request takes 500ms–2s (cold start) | Keep worker bundle <1MB; lazy-import heavy deps | First request after idle period |
| SSE heartbeat not implemented | Connection drops after 60s idle in some CDN edge locations | Send `data: ping\n\n` every 15 seconds | Immediately in production on low-traffic SSE connections |
| MCP tool dispatch in synchronous hot path | All 5 server tool sets loaded regardless of which server the API key is subscribed to | Lazy-load per-server tool registration based on API key's subscribed servers | At 5+ servers with large tool sets |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key stored as plaintext in Supabase | Database breach exposes all user API keys | Store only `SHA-256(api_key)` hash; return the plaintext key only once at creation time |
| SSE endpoint accessible without API key validation | Any caller can use the hosted MCP gateway without billing | Validate API key in the Workers middleware before any SSE stream is opened |
| MoMo IPN not signature-verified | Attacker sends fake "payment success" IPN to credit accounts | Verify HMAC-SHA256 signature on every incoming IPN before updating Supabase |
| Stripe webhook endpoint public without signature check | Fake subscription events could grant free access | Always call `stripe.webhooks.constructEvent()` — reject unsigned requests with 401 |
| `wrangler.toml` secrets committed to git | All API keys (Supabase, Stripe, Tinybird) exposed | Use `wrangler secret put KEY_NAME` for all secrets; keep `wrangler.toml` committed with placeholder values only |
| CORS wildcard on SSE endpoint (`Access-Control-Allow-Origin: *`) | Any website can make credentialed SSE requests to your gateway | Restrict CORS to `claude.ai` and `localhost:*` for dev; require `Authorization` header which CORS preflight cannot forge |
| Tinybird ingest key in Workers environment | Tinybird ingest key can write arbitrary events to your datasources | Keep Tinybird ingest key server-side only; never expose in client-side code or public endpoints |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic "authentication failed" error on bad API key | Developer doesn't know if key is wrong, expired, or revoked | Return specific error: "API key not found", "API key revoked", "API key rate limit exceeded" — each distinct |
| No usage dashboard on landing page | Pro/Business users can't see how close they are to tier limits | Show current period usage in the developer dashboard; include `X-Usage-Remaining` header on each SSE response |
| Stripe payment failure not communicated to developer | Subscription lapses silently; API key stops working without notice | Send email on payment failure (Stripe handles this); downgrade tier in Supabase and respond with 402 on next API call |
| npm install instructions require global env setup | Developer friction: must set 5 env vars before first tool call | Provide a `mcp-momo-vn init` command that generates an `.env` file interactively |
| Landing page shows pricing in USD only | Vietnamese developers comparing to local services see irrelevant pricing | Show VND equivalents next to USD prices; update dynamically or refresh monthly |

---

## "Looks Done But Isn't" Checklist

- [ ] **SSE transport:** A second concurrent SSE client connects while the first is active — verify neither client receives the other's events (session isolation test).
- [ ] **RLS isolation:** User B's API key cannot query User A's usage records — test with two real Supabase accounts via `anon` key.
- [ ] **Stripe idempotency:** The same `checkout.session.completed` event processed twice does not double-credit the subscription — verify with Stripe CLI event replay.
- [ ] **MoMo IPN security:** An IPN with a tampered signature (one field changed) is rejected with 400 and does not update the subscription status.
- [ ] **API key hashing:** The plaintext API key is never stored in Supabase — verify by `SELECT * FROM api_keys` returns no column that contains the full key (only hash + prefix).
- [ ] **npm package contents:** `npm pack --dry-run` for each server shows only `dist/` and `README.md` — no `src/`, `__tests__/`, or `*.env` files.
- [ ] **Workers bundle size:** `wrangler deploy --dry-run` reports worker size <1MB — log the bundle size in CI.
- [ ] **Tinybird ingestion:** After 1000 test events, `SELECT count() FROM api_call_events` returns exactly 1000 — zero quarantined rows.
- [ ] **KV cache invalidation:** After revoking an API key in Supabase, the next request with that key is rejected within 60 seconds (not still hitting stale KV cache indefinitely).
- [ ] **MoMo merchant approval status:** Merchant application submitted and approval timeline confirmed before billing phase is marked complete.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Workers CPU limit kills SSE sessions | MEDIUM | Switch to Unbound usage model in `wrangler.toml`; redeploy; verify in production under load |
| RLS leakage discovered after data is in Supabase | HIGH | Audit all policies; fix missing USING/WITH CHECK; rotate all API keys as precaution; notify affected users |
| Stripe double-billing due to missing idempotency | HIGH | Identify all affected users via Stripe event logs; issue refunds; add idempotency table retroactively |
| npm packages published with source included | LOW | Unpublish affected version (`npm unpublish`); fix `files` field; republish with patch version bump |
| Tinybird events dropped due to schema mismatch | MEDIUM | Fix datasource schema; re-ingest missing events from Workers access logs; validate with count reconciliation |
| MoMo merchant account not approved at launch | MEDIUM | Launch Stripe-only; accept bank transfer for VND customers manually; add MoMo when approved |
| API keys stored as plaintext discovered | HIGH | Rotate all keys immediately; migrate to hashed storage with rehash-on-validate migration; audit access logs |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Workers CPU limit (Pitfall 1) | Cloudflare Workers gateway setup | `wrangler.toml` has `[usage_model] = "unbound"`; load test confirms no CPU limit errors |
| Stateless Workers SSE (Pitfall 2) | Workers gateway — SSE implementation | Smoke test: 3 SSE events delivered; 60s idle connection stays alive; heartbeat visible in network tab |
| stdio → SSE transport migration (Pitfall 3) | Workers gateway — MCP transport layer | Two concurrent SSE clients receive isolated events; tool registration confirmed per-connection |
| Supabase RLS leakage (Pitfall 4) | Supabase auth + API key phase | Two-user RLS test passes; `pg_policies` audit shows all tables covered |
| API key validation latency (Pitfall 5) | Workers gateway — auth middleware | `workers_kv_namespaces` in `wrangler.toml`; p95 tool call latency <50ms with warm cache |
| Stripe webhook idempotency (Pitfall 6) | Stripe billing integration | Stripe CLI replay test: double event does not double-credit subscription |
| MoMo IPN testability (Pitfall 7) | MoMo billing integration | IPN endpoint deployed before first sandbox payment; simulate endpoint tested locally |
| Workspace protocol in published packages (Pitfall 8) | npm publishing phase | `npm pack --dry-run` shows no `workspace:*` references in published `package.json` |
| Missing `files` field (Pitfall 9) | npm publishing phase | Published package size <50KB; no `src/` files in pack output |
| Tinybird schema mismatch (Pitfall 10) | Tinybird metering phase | 1000-event ingestion test with exact count verification before billing wired |
| MoMo merchant approval (Pitfall 11) | Billing architecture phase | Application submitted at milestone start; `PaymentProvider` abstraction implemented |

---

## Sources

**Cloudflare Workers:**
- Cloudflare Workers Platform Limits (official docs) — CPU time limits, Unbound vs Bundled usage model. HIGH confidence (official).
- Hono SSE documentation (`hono/streaming` — `streamSSE`). HIGH confidence (official Hono docs).
- Cloudflare Workers Stateless Model — no persistent TCP, Web Streams API required. HIGH confidence (official).

**Supabase RLS:**
- Supabase Row Level Security documentation — `USING`, `WITH CHECK`, service role bypass. HIGH confidence (official).
- Common RLS mistakes — missing `WITH CHECK` on UPDATE policies, indirect join leakage. MEDIUM confidence (community docs + GitHub issues).

**Stripe:**
- Stripe Webhook Signature Verification — raw body requirement, timestamp window. HIGH confidence (official Stripe docs).
- Stripe Webhook Idempotency — retry behavior, `stripe_event_id` pattern. HIGH confidence (official Stripe docs).

**MoMo:**
- MoMo IPN callback documentation — HMAC-SHA256 field order in IPN payload. MEDIUM confidence (official MoMo developer docs, Vietnamese).
- MoMo merchant account requirements — KYC, MST requirement for real money. MEDIUM confidence (MoMo business onboarding docs).

**npm Publishing:**
- npm Workspaces documentation — workspace protocol behavior on publish. HIGH confidence (official npm docs).
- `files` field in package.json — controls publish contents. HIGH confidence (official npm docs).
- `npm pack --dry-run` verification pattern — standard practice. HIGH confidence.

**Tinybird:**
- Tinybird Events API — `quarantined_rows` in response body, schema validation behavior. MEDIUM confidence (Tinybird official docs + community reports).

---
*Pitfalls research for: VN MCP Hub v1.1 — Hosted gateway platform (Cloudflare Workers, Supabase, Stripe, MoMo billing, npm publishing)*
*Researched: 2026-03-21*
