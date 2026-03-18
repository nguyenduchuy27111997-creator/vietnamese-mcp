import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { momoClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'momo_refund',
    'Refund a MoMo transaction (full or partial) by transId.',
    {
      transId: z
        .number()
        .int()
        .positive()
        .describe('Transaction ID from the original payment (numeric, e.g. 2350000001)'),
      amount: z
        .number()
        .int()
        .positive()
        .describe('Refund amount in VND (must be <= original amount)'),
      description: z.string().optional().describe('Reason for the refund'),
    },
    async (args) => {
      try {
        const result = await momoClient.refund(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
