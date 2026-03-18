process.env.ZALO_OA_SANDBOX = 'true';

import { describe, it, expect, beforeAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createTestClient, callTool } from '@vn-mcp/shared';
import { registerAll } from '../tools/index.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

let client: Client;

beforeAll(async () => {
  const server = new McpServer({ name: 'mcp-zalo-oa', version: '0.0.1' });
  registerAll(server);
  client = await createTestClient(server);
});

function parseResult(result: { isError?: boolean; content: Array<{ type: string; text: string }> }): unknown {
  return JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text);
}

describe('Integration: mcp-zalo-oa tools (ZALO_OA_SANDBOX=true)', () => {
  // ZLOA-01: Send message happy path
  it('zalo_oa_send_message returns message_id with _mock:true (ZLOA-01)', async () => {
    const result = await callTool(client, 'zalo_oa_send_message', {
      userId: '3512267360915248000',
      type: 'text',
      text: 'Hello',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; message_id: string; userId: string };
    expect(data._mock).toBe(true);
    expect(data.message_id).toBeTruthy();
    expect(data.userId).toBe('3512267360915248000');
  });

  // ZLOA-01: Send message error path
  it('zalo_oa_send_message with invalid_user returns isError:true (ZLOA-01 error)', async () => {
    const result = await callTool(client, 'zalo_oa_send_message', {
      userId: 'invalid_user',
      type: 'text',
      text: 'Hi',
    });
    expect(result.isError).toBe(true);
  });

  // ZLOA-02: Get follower profile happy path
  it('zalo_oa_get_follower_profile returns profile with _mock:true (ZLOA-02)', async () => {
    const result = await callTool(client, 'zalo_oa_get_follower_profile', {
      userId: '3512267360915248000',
    });
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as { _mock: boolean; display_name: string; user_id: string };
    expect(data._mock).toBe(true);
    expect(data.display_name).toBeTruthy();
    expect(data.user_id).toBe('3512267360915248000');
  });

  // ZLOA-03: List followers happy path
  it('zalo_oa_list_followers returns paginated list with _mock:true (ZLOA-03)', async () => {
    const result = await callTool(client, 'zalo_oa_list_followers', {});
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as {
      _mock: boolean;
      followers: Array<unknown>;
      total: number;
      offset: number;
    };
    expect(data._mock).toBe(true);
    expect(Array.isArray(data.followers)).toBe(true);
    expect(data.followers.length).toBe(3);
    expect(data.total).toBe(3);
    expect(data.offset).toBe(0);
  });

  // ZLOA-04: Refresh token happy path
  it('zalo_oa_refresh_token returns mock token with _mock:true (ZLOA-04)', async () => {
    const result = await callTool(client, 'zalo_oa_refresh_token', {});
    expect(result.isError).toBeFalsy();
    const data = parseResult(result) as {
      _mock: boolean;
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    expect(data._mock).toBe(true);
    expect(data.access_token).toBe('mock_access_token_xxxxx');
    expect(data.expires_in).toBe(3600);
    expect(data.refresh_token).toBe('mock_refresh_token_xxxxx');
  });

  // ZLOA-02: Get follower profile error path
  it('zalo_oa_get_follower_profile with invalid_user returns isError:true (ZLOA-02 error)', async () => {
    const result = await callTool(client, 'zalo_oa_get_follower_profile', {
      userId: 'invalid_user',
    });
    expect(result.isError).toBe(true);
  });
});
