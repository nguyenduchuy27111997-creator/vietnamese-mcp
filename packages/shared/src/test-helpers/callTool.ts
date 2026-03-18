import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Call a tool on the MCP client and return the result.
 */
export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
) {
  const result = await client.callTool({ name, arguments: args });
  return result;
}
