import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { register as registerCreatePayment } from './createPayment.js';
import { register as registerQueryStatus } from './queryStatus.js';
import { register as registerRefund } from './refund.js';

export function registerAll(server: McpServer): void {
  registerCreatePayment(server);
  registerQueryStatus(server);
  registerRefund(server);
}
