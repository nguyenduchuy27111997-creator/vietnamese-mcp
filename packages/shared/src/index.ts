// @vn-mcp/shared — shared utilities for VN MCP servers
// Subpath exports: errors, http-client, mock-engine, test-helpers

export { signHmacSha256, signHmacSha512 } from './http-client/index.js';
export { McpApiError, formatToolError, VN_ERROR_CODES, translateErrorCode } from './errors/index.js';
export { isMockMode, loadFixture } from './mock-engine/index.js';
export { createTestClient, callTool } from './test-helpers/index.js';
export { validateToolName, TOOL_NAME_PATTERN } from './tool-naming.js';
export const VERSION = '0.0.1';
