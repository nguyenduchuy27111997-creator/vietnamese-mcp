import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { servers } from './serverRegistry.js';
import { checkTierAccess } from './tierAccess.js';
import { wrapWithHeartbeat } from './heartbeat.js';

/**
 * Handle an incoming MCP request for a named server.
 * Creates a NEW stateless transport per request — no shared state between requests.
 */
export async function handleMcpRequest(
  serverName: string,
  req: Request,
  tier: string,
): Promise<Response> {
  const server = servers[serverName];
  if (!server) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32600, message: `Unknown server: ${serverName}` },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const tierError = checkTierAccess(serverName, tier);
  if (tierError) return tierError;

  // New transport per request — stateless: sessionIdGenerator: undefined
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(req);
  return wrapWithHeartbeat(response);
}
