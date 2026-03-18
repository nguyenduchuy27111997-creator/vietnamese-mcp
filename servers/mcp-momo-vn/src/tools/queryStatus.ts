import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { momoClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'momo_query_status',
    'Check the status of a MoMo payment transaction by orderId.',
    {
      orderId: z.string().min(1).describe('The orderId from momo_create_payment response'),
    },
    async (args) => {
      try {
        const result = await momoClient.queryStatus(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
