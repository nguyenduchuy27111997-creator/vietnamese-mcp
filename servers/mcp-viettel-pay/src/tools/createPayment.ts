import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { viettelPayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'viettel_pay_create_payment',
    'Create a ViettelPay payment request. Returns a payment URL for the customer. Note: this is a mock-only server — see MOCK_DEVIATIONS.md for assumptions.',
    {
      amount: z.number().int().positive().describe('Payment amount in VND'),
      orderInfo: z.string().min(1).describe('Order description'),
      returnUrl: z.string().url().optional().describe('URL to redirect after payment'),
    },
    async (args) => {
      try {
        const result = await viettelPayClient.createPayment(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
