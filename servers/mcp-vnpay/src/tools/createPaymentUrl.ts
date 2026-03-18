import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { vnpayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'vnpay_create_payment_url',
    'Build a signed VNPAY payment URL. Returns the payment URL for the customer to complete payment.',
    {
      amount: z.number().int().positive().describe('Payment amount in VND (integer, e.g. 150000)'),
      orderInfo: z.string().min(1).describe('Order description shown on VNPAY payment page'),
      bankCode: z.string().optional().describe('Bank code (e.g. NCB, VNPAYQR). Default: NCB'),
      locale: z.enum(['vn', 'en']).optional().describe('Payment page language (default: vn)'),
      returnUrl: z.string().url().optional().describe('URL to redirect after payment'),
    },
    async (args) => {
      try {
        const result = await vnpayClient.createPaymentUrl(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
