#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAll } from './tools/index.js';

const server = new McpServer({
  name: 'mcp-zalopay-vn',
  version: '0.0.1',
});

// CRITICAL: Register all tools BEFORE connecting transport.
// If transport connects first, Claude Code's tools/list request returns empty.
registerAll(server);

const transport = new StdioServerTransport();
await server.connect(transport);
