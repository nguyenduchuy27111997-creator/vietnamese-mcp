import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcpRequest } from './router.js';
import { corsConfig } from './cors.js';
import { authMiddleware } from './middleware/auth.js';
import { scopeCheckMiddleware } from './middleware/scopeCheck.js';
import { jwtAuthMiddleware } from './middleware/jwtAuth.js';
import { keysRouter } from './routes/keys.js';
import { usageRouter } from './routes/usage.js';
import { billingRouter } from './routes/billing.js';
import { webhookLogsRouter } from './routes/webhookLogs.js';
import { sendTinybirdEvent } from './metering/tinybird.js';
import { getUsageCount, checkUsageLimit, incrementUsageCounter, usageLimitResponse } from './metering/usageCounter.js';
import type { GatewayEnv } from './types.js';

const app = new Hono<GatewayEnv>();

// Sync wrangler [vars] to process.env so isMockMode() works in CF Workers
app.use('*', async (c, next) => {
  const sandboxVars = ['MOMO_SANDBOX', 'ZALOPAY_SANDBOX', 'VNPAY_SANDBOX', 'VIETTELPAY_SANDBOX', 'ZALO_OA_SANDBOX'];
  for (const key of sandboxVars) {
    const val = (c.env as Record<string, string>)[key];
    if (val) process.env[key] = val;
  }
  return next();
});

// CORS on MCP routes — handles OPTIONS preflight automatically
app.use('/mcp/*', cors(corsConfig));

// CORS + Auth on /keys routes
app.use('/keys', cors(corsConfig));
app.use('/keys/*', cors(corsConfig));

// CORS + Auth on /usage route
app.use('/usage', cors(corsConfig));

// CORS + Auth on /billing routes (except webhook which uses Stripe signature)
app.use('/billing/*', cors(corsConfig));

// Auth middleware — API key auth for MCP routes, JWT auth for key management
// /health is intentionally excluded — no auth required for health checks
app.use('/mcp/*', authMiddleware);
app.use('/mcp/:server', scopeCheckMiddleware);
app.use('/keys', jwtAuthMiddleware);
app.use('/keys/*', jwtAuthMiddleware);
app.use('/usage', jwtAuthMiddleware);
// JWT auth for checkout and portal — NOT for stripe-webhook or momo-ipn
app.use('/billing/create-checkout', jwtAuthMiddleware);
app.use('/billing/portal', jwtAuthMiddleware);

app.route('/keys', keysRouter);
app.route('/usage', usageRouter);
app.route('/billing', billingRouter);

// CORS + Auth on /webhook-logs route
app.use('/webhook-logs', cors(corsConfig));
app.use('/webhook-logs', jwtAuthMiddleware);
app.route('/webhook-logs', webhookLogsRouter);

// MCP routes — tier comes from auth context; metering check + fire-and-forget after execution
app.all('/mcp/:server', async (c) => {
  const serverName = c.req.param('server');
  const { tier, keyId } = c.get('auth');

  // Usage limit check (skip for business tier — zero overhead)
  if (tier !== 'business') {
    const used = await getUsageCount(keyId, c.env.API_KEYS);
    if (checkUsageLimit(used, tier)) {
      return usageLimitResponse(tier, used);
    }
  }

  // Extract tool name from MCP JSON-RPC body (clone to preserve body for transport)
  let toolName = '';
  try {
    const cloned = c.req.raw.clone();
    const body = await cloned.json() as { method?: string; params?: { name?: string } };
    if (body.method === 'tools/call' && body.params?.name) {
      toolName = body.params.name;
    }
  } catch {
    // Not JSON (e.g. SSE) or parse error — leave as empty string
  }

  // Execute tool
  const response = await handleMcpRequest(serverName, c.req.raw, tier);

  // Fire-and-forget: log to Tinybird + increment KV counter
  c.executionCtx.waitUntil(
    Promise.all([
      sendTinybirdEvent(
        {
          api_key_id: keyId,
          server: serverName,
          tool: toolName,
          timestamp: new Date().toISOString(),
          response_status: 'ok',
        },
        c.env.TINYBIRD_TOKEN,
        c.env.TINYBIRD_HOST,
      ),
      tier !== 'business' ? incrementUsageCounter(keyId, c.env.API_KEYS) : Promise.resolve(),
    ]),
  );

  return response;
});

// Health check — no auth; used by wrangler dev and monitoring
app.get('/health', (c) =>
  c.json({ status: 'ok', servers: 5, tools: 18 }),
);


export default app;
