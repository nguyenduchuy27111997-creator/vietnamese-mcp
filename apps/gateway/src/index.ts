import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcpRequest } from './router.js';
import { corsConfig } from './cors.js';

type GatewayEnv = { Bindings: Record<string, string> };

const app = new Hono<GatewayEnv>();

// Apply CORS to all /mcp/* routes — handles OPTIONS preflight automatically
app.use('/mcp/*', cors(corsConfig));

// All 5 server routes: GET (SSE stream), POST (JSON-RPC), DELETE (session close)
app.all('/mcp/:server', async (c) => {
  const serverName = c.req.param('server');
  // Phase 5: tier stub — always 'free'. Phase 6 replaces with real API key auth.
  const tier = 'free';
  return handleMcpRequest(serverName, c.req.raw, tier);
});

// Health check — used by wrangler dev to confirm worker is live
app.get('/health', (c) =>
  c.json({ status: 'ok', servers: 5, tools: 18 }),
);

export default app;
