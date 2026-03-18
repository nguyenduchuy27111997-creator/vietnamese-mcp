import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { momoClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'momo_create_payment',
    'Create a MoMo payment link (QR code, wallet, or ATM). Returns payUrl for the customer to complete payment.',
    {
      amount: z.number().int().positive().describe('Payment amount in VND (integer, e.g. 150000)'),
      orderInfo: z.string().min(1).describe('Order description shown to the customer'),
      redirectUrl: z.string().url().optional().describe('URL to redirect after payment'),
      ipnUrl: z.string().url().optional().describe('Server callback URL for payment notification'),
      requestType: z
        .enum(['captureWallet', 'payWithATM', 'payWithCC'])
        .optional()
        .describe('Payment method (default: captureWallet for QR code)'),
      extraData: z.string().optional().describe('Additional data to pass through'),
    },
    async (args) => {
      try {
        const result = await momoClient.createPayment(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
