import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { formatToolError } from '@vn-mcp/shared';
import { zaloOaClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalo_oa_refresh_token',
    'Refresh the Zalo OA access token using the refresh token from environment. Call this when other Zalo OA tools return token-expired errors.',
    {},
    async () => {
      try {
        const result = await zaloOaClient.refreshToken();
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
