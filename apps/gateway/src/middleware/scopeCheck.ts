import type { MiddlewareHandler } from 'hono';
import type { GatewayEnv } from '../types.js';

export const scopeCheckMiddleware: MiddlewareHandler<GatewayEnv> = async (c, next) => {
  const { allowedServers } = c.get('auth');
  const serverName = c.req.param('server');
  // null/undefined = all servers allowed; non-empty array = only listed servers; empty array = none allowed
  if (allowedServers && !allowedServers.includes(serverName)) {
    return c.json({ error: `API key not authorized for server: ${serverName}` }, 403);
  }
  return next();
};
