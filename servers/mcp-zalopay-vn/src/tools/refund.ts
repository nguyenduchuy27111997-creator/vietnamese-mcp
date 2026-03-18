import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { zaloPayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalopay_refund',
    'Refund a ZaloPay transaction by its zp_trans_id.',
    {
      zpTransId: z.number().int().positive().describe('ZaloPay transaction ID from query result'),
      amount: z.number().int().positive().describe('Refund amount in VND'),
      description: z.string().optional().describe('Reason for refund'),
    },
    async (args) => {
      try {
        const result = await zaloPayClient.refund({
          zpTransId: args.zpTransId,
          amount: args.amount,
          description: args.description,
        });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
