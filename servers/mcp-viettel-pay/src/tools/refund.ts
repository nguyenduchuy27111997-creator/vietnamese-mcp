import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { viettelPayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'viettel_pay_refund',
    'Refund a ViettelPay transaction. Note: mock-only server.',
    {
      transactionId: z.string().min(1).describe('Original transaction ID to refund'),
      amount: z.number().int().positive().describe('Refund amount in VND'),
      description: z.string().optional().describe('Reason for refund'),
    },
    async (args) => {
      try {
        const result = await viettelPayClient.refund(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
