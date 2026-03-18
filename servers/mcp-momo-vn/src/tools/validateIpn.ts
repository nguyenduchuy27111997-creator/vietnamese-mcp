import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { getMomoCredentials } from '../credentials.js';
import { buildIpnSignature } from '../signatures.js';

export function register(server: McpServer): void {
  server.tool(
    'momo_validate_ipn',
    'Validate a MoMo IPN (Instant Payment Notification) payload by verifying its HMAC-SHA256 signature. Returns validation result with parsed transaction details.',
    {
      ipnBody: z.string().min(1).describe('Raw IPN JSON body as a string'),
    },
    async (args) => {
      try {
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(args.ipnBody) as Record<string, unknown>;
        } catch {
          return formatToolError(new Error('Invalid JSON in ipnBody'));
        }

        const signature = parsed['signature'] as string | undefined;
        const credentials = getMomoCredentials();

        const expectedSignature = buildIpnSignature(
          {
            accessKey: credentials.accessKey,
            amount: parsed['amount'] as number,
            extraData: (parsed['extraData'] as string) ?? '',
            message: (parsed['message'] as string) ?? '',
            orderId: (parsed['orderId'] as string) ?? '',
            orderInfo: (parsed['orderInfo'] as string) ?? '',
            orderType: (parsed['orderType'] as string) ?? '',
            partnerCode: (parsed['partnerCode'] as string) ?? '',
            payType: (parsed['payType'] as string) ?? '',
            requestId: (parsed['requestId'] as string) ?? '',
            responseTime: (parsed['responseTime'] as number) ?? 0,
            resultCode: (parsed['resultCode'] as number) ?? -1,
            transId: (parsed['transId'] as number) ?? 0,
          },
          credentials.secretKey,
        );

        if (expectedSignature === signature) {
          const result = {
            valid: true as const,
            orderId: parsed['orderId'],
            amount: parsed['amount'],
            transId: parsed['transId'],
            resultCode: parsed['resultCode'],
            message: parsed['message'],
          };
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        } else {
          const result = { valid: false as const, reason: 'Signature mismatch' };
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        }
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
