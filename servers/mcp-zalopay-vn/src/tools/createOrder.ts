import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { zaloPayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalopay_create_order',
    'Create a ZaloPay payment order. Returns a payment URL for the customer to complete payment.',
    {
      amount: z.number().int().positive().describe('Payment amount in VND (integer, e.g. 150000)'),
      description: z.string().min(1).describe('Order description shown to the customer'),
      appUser: z.string().optional().describe('App user identifier (default: demo_user)'),
      embedData: z.string().optional().describe('Embedded data JSON string'),
      item: z.string().optional().describe('Item details JSON string'),
    },
    async (args) => {
      try {
        const result = await zaloPayClient.createOrder(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
