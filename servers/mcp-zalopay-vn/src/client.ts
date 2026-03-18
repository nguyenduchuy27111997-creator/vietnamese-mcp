import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, 'mock');

function generateAppTransId(amount: number, description: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hash = createHash('sha256')
    .update(`${amount}${description}`)
    .digest('hex')
    .substring(0, 8);
  return `${yy}${mm}${dd}_${hash}`;
}

type CreateOrderResult = {
  orderId: string;
  app_trans_id: string;
  paymentUrl: string;
  amount: number;
  _mock: true;
};

type QueryOrderResult = {
  app_trans_id: string;
  return_code: number;
  return_message: string;
  zp_trans_id: number;
  _mock: true;
};

type RefundResult = {
  zp_trans_id: number;
  refund_id: number;
  return_code: number;
  return_message: string;
  amount: number;
  _mock: true;
};

export const zaloPayClient = {
  async createOrder(args: {
    amount: number;
    description: string;
    appUser?: string;
    embedData?: string;
    item?: string;
  }): Promise<CreateOrderResult> {
    if (args.amount === 99999999) {
      throw new McpApiError('-54', 'Insufficient balance', 'zalopay', 'Try a smaller amount');
    }

    if (isMockMode('zalopay')) {
      const fixture = loadFixture<{
        return_code: number;
        return_message: string;
        zp_trans_token: string;
        order_url: string;
        order_token: string;
        _mock: true;
      }>(join(MOCK_DIR, 'createOrder.json'));

      const appTransId = generateAppTransId(args.amount, args.description);

      return {
        orderId: appTransId,
        app_trans_id: appTransId,
        paymentUrl: `https://sbgateway.zalopay.vn/openinapp?order=token_${appTransId}`,
        amount: args.amount,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set ZALOPAY_SANDBOX=true');
  },

  async queryOrder(args: { appTransId: string }): Promise<QueryOrderResult> {
    if (isMockMode('zalopay')) {
      const fixture = loadFixture<{
        return_code: number;
        return_message: string;
        zp_trans_id: number;
        _mock: true;
      }>(join(MOCK_DIR, 'queryOrder.json'));

      return {
        app_trans_id: args.appTransId,
        return_code: fixture.return_code,
        return_message: fixture.return_message,
        zp_trans_id: fixture.zp_trans_id,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set ZALOPAY_SANDBOX=true');
  },

  async refund(args: {
    zpTransId: number;
    amount: number;
    description?: string;
  }): Promise<RefundResult> {
    if (isMockMode('zalopay')) {
      const fixture = loadFixture<{
        return_code: number;
        return_message: string;
        refund_id: number;
        _mock: true;
      }>(join(MOCK_DIR, 'refund.json'));

      return {
        zp_trans_id: args.zpTransId,
        refund_id: fixture.refund_id,
        return_code: fixture.return_code,
        return_message: fixture.return_message,
        amount: args.amount,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set ZALOPAY_SANDBOX=true');
  },
};
