import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, 'mock');

function generateOrderId(amount: number, orderInfo: string): string {
  const hash = createHash('sha256')
    .update(`${amount}${orderInfo}`)
    .digest('hex')
    .substring(0, 12);
  return `MOMO_${hash}`;
}

function generateRequestId(): string {
  return `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

type CreatePaymentResult = {
  orderId: string;
  payUrl: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  _mock: true;
};

type QueryStatusResult = {
  orderId: string;
  transId: number;
  amount: number;
  resultCode: number;
  status: string;
  message: string;
  payType: string;
  _mock: true;
};

type RefundResult = {
  orderId: string;
  transId: number;
  amount: number;
  resultCode: number;
  message: string;
  responseTime: number;
  _mock: true;
};

export const momoClient = {
  async createPayment(args: {
    amount: number;
    orderInfo: string;
    redirectUrl?: string;
    ipnUrl?: string;
    requestType?: string;
    extraData?: string;
  }): Promise<CreatePaymentResult> {
    if (args.amount === 99999999) {
      loadFixture(join(MOCK_DIR, 'errorInsufficientBalance.json'));
      throw new McpApiError('1005', 'Insufficient balance', 'momo', 'Try a smaller amount');
    }

    if (isMockMode('momo')) {
      const fixture = loadFixture<{
        orderId: string;
        payUrl: string;
        requestId: string;
        amount: number;
        orderInfo: string;
        requestType: string;
        _mock: true;
      }>(join(MOCK_DIR, 'createPayment.json'));

      const orderId = generateOrderId(args.amount, args.orderInfo);
      const requestId = generateRequestId();

      return {
        orderId,
        payUrl: `https://test-payment.momo.vn/pay/${orderId}`,
        requestId,
        amount: args.amount,
        orderInfo: args.orderInfo,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set MOMO_SANDBOX=true');
  },

  async queryStatus(args: { orderId: string }): Promise<QueryStatusResult> {
    if (isMockMode('momo')) {
      const fixture = loadFixture<{
        transId: number;
        amount: number;
        resultCode: number;
        message: string;
        payType: string;
        _mock: true;
      }>(join(MOCK_DIR, 'queryStatus.json'));

      return {
        orderId: args.orderId,
        transId: fixture.transId,
        amount: fixture.amount,
        resultCode: fixture.resultCode,
        status: fixture.resultCode === 0 ? 'SUCCESS' : 'FAILED',
        message: fixture.message,
        payType: fixture.payType,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set MOMO_SANDBOX=true');
  },

  async refund(args: {
    transId: number;
    amount: number;
    description?: string;
  }): Promise<RefundResult> {
    if (isMockMode('momo')) {
      const fixture = loadFixture<{
        resultCode: number;
        message: string;
        responseTime: number;
        _mock: true;
      }>(join(MOCK_DIR, 'refund.json'));

      const orderId = `MOMO_REFUND_${args.transId}`;

      return {
        orderId,
        transId: args.transId,
        amount: args.amount,
        resultCode: fixture.resultCode,
        message: fixture.message,
        responseTime: fixture.responseTime,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set MOMO_SANDBOX=true');
  },
};
