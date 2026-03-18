import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { formatToolError } from '@vn-mcp/shared';
import { zaloOaClient } from '../client.js';

export function register(server: McpServer): void {
  server.tool(
    'zalo_oa_send_message',
    'Send a message to a Zalo OA follower. Supports text, image (URL), and file (URL) types.',
    {
      userId: z.string().min(1).describe('Zalo user ID of the follower to message'),
      type: z.enum(['text', 'image', 'file']).describe('Message type: text, image (URL), or file (URL)'),
      text: z.string().optional().describe('Text content (required if type=text)'),
      imageUrl: z.string().url().optional().describe('Image URL (required if type=image)'),
      fileUrl: z.string().url().optional().describe('File URL (required if type=file)'),
    },
    async (args) => {
      try {
        const result = await zaloOaClient.sendMessage(args);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return formatToolError(err);
      }
    },
  );
}
