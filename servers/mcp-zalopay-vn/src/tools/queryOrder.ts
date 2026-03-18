import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { zaloPayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalopay_query_order',
    'Check the status of a ZaloPay order by its app_trans_id.',
    {
      appTransId: z.string().min(1).describe('ZaloPay app_trans_id (format: YYMMDD_hash)'),
    },
    async (args) => {
      try {
        const result = await zaloPayClient.queryOrder({ appTransId: args.appTransId });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
