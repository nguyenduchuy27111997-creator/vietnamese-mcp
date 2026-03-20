// CORS configuration for the gateway Hono app.
// Origin function form required — Hono cors does exact string matching on arrays,
// so localhost:* wildcard is handled via function returning the request's own origin.

export const corsConfig = {
  origin: (origin: string) => {
    if (origin && origin.startsWith('http://localhost:')) return origin;
    return 'https://claude.ai';
  },
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'MCP-Protocol-Version', 'Mcp-Session-Id'],
  exposeHeaders: ['MCP-Protocol-Version', 'Mcp-Session-Id'],
  maxAge: 86400, // 24h preflight cache
};
