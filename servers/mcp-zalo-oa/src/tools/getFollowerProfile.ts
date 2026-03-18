import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { zaloOaClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalo_oa_get_follower_profile',
    'Get profile information for a Zalo OA follower by userId.',
    {
      userId: z.string().min(1).describe('Zalo user ID of the follower'),
    },
    async (args) => {
      try {
        const result = await zaloOaClient.getFollowerProfile(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
