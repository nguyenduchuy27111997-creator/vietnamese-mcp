import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcpRequest } from './router.js';
import { corsConfig } from './cors.js';
import { authMiddleware } from './middleware/auth.js';
import type { GatewayEnv } from './types.js';

const app = new Hono<GatewayEnv>();

// CORS on MCP routes — handles OPTIONS preflight automatically
app.use('/mcp/*', cors(corsConfig));

// Auth middleware on all MCP and key management routes
// /health is intentionally excluded — no auth required for health checks
app.use('/mcp/*', authMiddleware);
app.use('/keys/*', authMiddleware);

// MCP routes — tier comes from auth context (not hardcoded 'free' stub)
app.all('/mcp/:server', async (c) => {
  const serverName = c.req.param('server');
  const { tier } = c.get('auth');
  return handleMcpRequest(serverName, c.req.raw, tier);
});

// Health check — no auth; used by wrangler dev and monitoring
app.get('/health', (c) =>
  c.json({ status: 'ok', servers: 5, tools: 18 }),
);

export default app;
