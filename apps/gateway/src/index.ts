import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcpRequest } from './router.js';
import { corsConfig } from './cors.js';
import { authMiddleware } from './middleware/auth.js';
import { jwtAuthMiddleware } from './middleware/jwtAuth.js';
import { keysRouter } from './routes/keys.js';
import { usageRouter } from './routes/usage.js';
import { sendTinybirdEvent } from './metering/tinybird.js';
import { getUsageCount, checkUsageLimit, incrementUsageCounter, usageLimitResponse } from './metering/usageCounter.js';
import type { GatewayEnv } from './types.js';

const app = new Hono<GatewayEnv>();

// CORS on MCP routes — handles OPTIONS preflight automatically
app.use('/mcp/*', cors(corsConfig));

// CORS + Auth on /keys routes
app.use('/keys', cors(corsConfig));
app.use('/keys/*', cors(corsConfig));

// CORS + Auth on /usage route
app.use('/usage', cors(corsConfig));

// Auth middleware — API key auth for MCP routes, JWT auth for key management
// /health is intentionally excluded — no auth required for health checks
app.use('/mcp/*', authMiddleware);
app.use('/keys', jwtAuthMiddleware);
app.use('/keys/*', jwtAuthMiddleware);
app.use('/usage', jwtAuthMiddleware);

app.route('/keys', keysRouter);
app.route('/usage', usageRouter);

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

  // Execute tool
  const response = await handleMcpRequest(serverName, c.req.raw, tier);

  // Fire-and-forget: log to Tinybird + increment KV counter
  c.executionCtx.waitUntil(
    Promise.all([
      sendTinybirdEvent(
        {
          api_key_id: keyId,
          server: serverName,
          tool: 'unknown', // MCP protocol doesn't expose tool name at transport level
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
