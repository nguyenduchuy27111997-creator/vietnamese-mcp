import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, 'mock');

export const zaloOaClient = {
  async sendMessage(args: {
    userId: string;
    type: 'text' | 'image' | 'file';
    text?: string;
    imageUrl?: string;
    fileUrl?: string;
  }): Promise<{ success: boolean; message_id: string; userId: string; type: string; _mock: true }> {
    if (args.userId === 'invalid_user') {
      throw new McpApiError('210', 'User not found or not a follower', 'zalo_oa', 'Check userId is valid OA follower');
    }

    if (isMockMode('zalo_oa')) {
      const fixture = loadFixture<{
        message_id: string;
        status: number;
        message: string;
        _mock: true;
      }>(join(MOCK_DIR, 'sendMessage.json'));

      return {
        success: true,
        message_id: fixture.message_id,
        userId: args.userId,
        type: args.type,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set ZALO_OA_SANDBOX=true');
  },

  async getFollowerProfile(args: { userId: string }): Promise<{
    user_id: string;
    display_name: string;
    avatar: string;
    user_gender: number;
    user_id_by_app: string;
    _mock: true;
  }> {
    if (args.userId === 'invalid_user') {
      throw new McpApiError('210', 'User not found or not a follower', 'zalo_oa', 'Check userId is valid OA follower');
    }

    if (isMockMode('zalo_oa')) {
      const fixture = loadFixture<{
        user_id: string;
        display_name: string;
        avatar: string;
        user_gender: number;
        user_id_by_app: string;
        _mock: true;
      }>(join(MOCK_DIR, 'getFollowerProfile.json'));

      return {
        ...fixture,
        user_id: args.userId,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set ZALO_OA_SANDBOX=true');
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listFollowers(args: { offset?: number; count?: number }): Promise<{
    followers: Array<{
      user_id: string;
      display_name: string;
      avatar: string;
      user_gender: number;
      user_id_by_app: string;
    }>;
    total: number;
    offset: number;
    _mock: true;
  }> {
    if (isMockMode('zalo_oa')) {
      const fixture = loadFixture<{
        followers: Array<{
          user_id: string;
          display_name: string;
          avatar: string;
          user_gender: number;
          user_id_by_app: string;
        }>;
        total: number;
        offset: number;
        _mock: true;
      }>(join(MOCK_DIR, 'listFollowers.json'));

      return fixture;
    }

    throw new Error('Real API not implemented — set ZALO_OA_SANDBOX=true');
  },

  async refreshToken(): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    _mock: true;
  }> {
    if (isMockMode('zalo_oa')) {
      const fixture = loadFixture<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        _mock: true;
      }>(join(MOCK_DIR, 'refreshToken.json'));

      return fixture;
    }

    throw new Error('Real API not implemented — set ZALO_OA_SANDBOX=true');
  },
};
