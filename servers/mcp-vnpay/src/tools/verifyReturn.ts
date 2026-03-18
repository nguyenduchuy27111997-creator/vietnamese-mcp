import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { vnpayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'vnpay_verify_return',
    'Verify a VNPAY return URL or query string by validating the HMAC-SHA512 secure hash. Returns validation result with parsed transaction details.',
    {
      returnUrl: z.string().min(1).describe('Full VNPAY return URL or query string to verify'),
    },
    async (args) => {
      try {
        const result = await vnpayClient.verifyReturn({ returnUrl: args.returnUrl });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
