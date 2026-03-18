import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { viettelPayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'viettel_pay_query_status',
    'Check ViettelPay transaction status by transactionId. Note: mock-only server.',
    {
      transactionId: z.string().min(1).describe('ViettelPay transaction ID (e.g., VTP_xxxx)'),
    },
    async (args) => {
      try {
        const result = await viettelPayClient.queryStatus(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
