import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAll as registerMomo } from '@vn-mcp/mcp-momo-vn/tools';
import { registerAll as registerZaloPay } from '@vn-mcp/mcp-zalopay-vn/tools';
import { registerAll as registerVnpay } from '@vn-mcp/mcp-vnpay/tools';
import { registerAll as registerZaloOa } from '@vn-mcp/mcp-zalo-oa/tools';
import { registerAll as registerViettelPay } from '@vn-mcp/mcp-viettel-pay/tools';

type ServerFactory = () => McpServer;

function makeFactory(name: string, version: string, register: (s: McpServer) => void): ServerFactory {
  return () => {
    const s = new McpServer({ name, version });
    register(s);
    return s;
  };
}

export const serverFactories: Record<string, ServerFactory> = {
  'momo':         makeFactory('mcp-momo-vn',     '1.1.0', registerMomo),
  'zalopay':      makeFactory('mcp-zalopay-vn',  '1.1.0', registerZaloPay),
  'vnpay':        makeFactory('mcp-vnpay',        '1.1.0', registerVnpay),
  'zalo-oa':      makeFactory('mcp-zalo-oa',      '1.1.0', registerZaloOa),
  'viettel-pay':  makeFactory('mcp-viettel-pay',  '1.1.0', registerViettelPay),
};

export const FREE_SERVERS = new Set(['momo', 'zalopay']);
export const ALL_SERVERS = new Set(Object.keys(serverFactories));
