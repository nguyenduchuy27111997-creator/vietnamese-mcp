import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { vnpayClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'vnpay_query_transaction',
    'Query the status of a VNPAY transaction by its reference number.',
    {
      txnRef: z.string().min(1).describe('VNPAY transaction reference (vnp_TxnRef)'),
      transDate: z.string().optional().describe('Transaction date in YYYYMMDDHHMMSS format'),
    },
    async (args) => {
      try {
        const result = await vnpayClient.queryTransaction({ txnRef: args.txnRef, transDate: args.transDate });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
