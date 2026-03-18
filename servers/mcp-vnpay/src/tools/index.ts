import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { register as registerCreatePaymentUrl } from './createPaymentUrl.js';
import { register as registerVerifyReturn } from './verifyReturn.js';
import { register as registerQueryTransaction } from './queryTransaction.js';

export function registerAll(server: McpServer): void {
  registerCreatePaymentUrl(server);
  registerVerifyReturn(server);
  registerQueryTransaction(server);
}
