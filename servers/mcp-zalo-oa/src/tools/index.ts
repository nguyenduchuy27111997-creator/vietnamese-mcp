import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { register as registerSendMessage } from './sendMessage.js';
import { register as registerGetFollowerProfile } from './getFollowerProfile.js';
import { register as registerListFollowers } from './listFollowers.js';
import { register as registerRefreshToken } from './refreshToken.js';

export function registerAll(server: McpServer): void {
  registerSendMessage(server);
  registerGetFollowerProfile(server);
  registerListFollowers(server);
  registerRefreshToken(server);
}
