import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { register as registerCreateOrder } from './createOrder.js';
import { register as registerQueryOrder } from './queryOrder.js';
import { register as registerRefund } from './refund.js';
import { register as registerValidateCallback } from './validateCallback.js';

export function registerAll(server: McpServer): void {
  registerCreateOrder(server);
  registerQueryOrder(server);
  registerRefund(server);
  registerValidateCallback(server);
}
