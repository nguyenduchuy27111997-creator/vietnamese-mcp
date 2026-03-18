import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { zaloOaClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalo_oa_list_followers',
    'List followers of the Zalo Official Account with offset pagination.',
    {
      offset: z.number().int().min(0).default(0).optional().describe('Pagination offset (default: 0)'),
      count: z.number().int().min(1).max(50).default(50).optional().describe('Number of followers to return (default: 50, max: 50)'),
    },
    async (args) => {
      try {
        const result = await zaloOaClient.listFollowers(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
