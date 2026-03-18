import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { getZaloPayCredentials } from '../credentials.js';
import { buildCallbackSignature } from '../signatures.js';

export function register(server: McpServer): void {
  server.tool(
    'zalopay_validate_callback',
    'Validate a ZaloPay callback payload by verifying its HMAC-SHA256 MAC using key2. Returns validation result with parsed transaction details.',
    {
      callbackData: z.string().min(1).describe('Raw ZaloPay callback JSON body as a string'),
    },
    async (args) => {
      try {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(args.callbackData) as Record<string, unknown>;
        } catch {
          return formatToolError(new Error('Invalid JSON in callbackData'));
        }

        const mac = parsed['mac'] as string | undefined;
        const data = parsed['data'] as string | undefined;

        if (!data) {
          return formatToolError(new Error('Missing data field in callback payload'));
        }

        const credentials = getZaloPayCredentials();
        const expectedMac = buildCallbackSignature(data, credentials.key2);

        if (expectedMac === mac) {
          let transactionData: Record<string, unknown>;
          try {
            transactionData = JSON.parse(data) as Record<string, unknown>;
          } catch {
            return formatToolError(new Error('Invalid JSON in callback data field'));
          }
          const result = { valid: true as const, ...transactionData };
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        } else {
          const result = { valid: false as const, reason: 'MAC mismatch' };
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
