import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR = join(__dirname, 'mock');

function generateTransactionId(amount: number, orderInfo: string): string {
  const hash = createHash('sha256')
    .update(`${amount}${orderInfo}`)
    .digest('hex')
    .substring(0, 12);
  return `VTP_${hash}`;
}

type CreatePaymentResult = {
  transactionId: string;
  paymentUrl: string;
  amount: number;
  orderInfo: string;
  code: string;
  message: string;
  _mock: true;
};

type QueryStatusResult = {
  transactionId: string;
  code: string;
  message: string;
  status: string;
  amount: number;
  _mock: true;
};

type RefundResult = {
  transactionId: string;
  refundId: string;
  amount: number;
  code: string;
  message: string;
  _mock: true;
};

export const viettelPayClient = {
  async createPayment(args: {
    amount: number;
    orderInfo: string;
    returnUrl?: string;
  }): Promise<CreatePaymentResult> {
    if (args.amount === 99999999) {
      loadFixture(join(MOCK_DIR, 'errorInsufficientBalance.json'));
      throw new McpApiError('06', 'Insufficient balance', 'viettelpay', 'Try a smaller amount');
    }

    if (isMockMode('viettelpay')) {
      const fixture = loadFixture<{
        transactionId: string;
        paymentUrl: string;
        amount: number;
        code: string;
        message: string;
        _mock: true;
      }>(join(MOCK_DIR, 'createPayment.json'));

      const transactionId = generateTransactionId(args.amount, args.orderInfo);

      return {
        transactionId,
        paymentUrl: `https://sandbox.viettelpay.vn/pay/${transactionId}`,
        amount: args.amount,
        orderInfo: args.orderInfo,
        code: '00',
        message: 'Success',
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set VIETTELPAY_SANDBOX=true');
  },

  async queryStatus(args: { transactionId: string }): Promise<QueryStatusResult> {
    if (isMockMode('viettelpay')) {
      const fixture = loadFixture<{
        status: string;
        amount: number;
        code: string;
        message: string;
        _mock: true;
      }>(join(MOCK_DIR, 'queryStatus.json'));

      return {
        transactionId: args.transactionId,
        code: '00',
        message: 'Success',
        status: fixture.status,
        amount: fixture.amount,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set VIETTELPAY_SANDBOX=true');
  },

  async refund(args: {
    transactionId: string;
    amount: number;
    description?: string;
  }): Promise<RefundResult> {
    if (isMockMode('viettelpay')) {
      const fixture = loadFixture<{
        code: string;
        message: string;
        _mock: true;
      }>(join(MOCK_DIR, 'refund.json'));

      return {
        transactionId: args.transactionId,
        refundId: `VTP_REFUND_${Date.now()}`,
        amount: args.amount,
        code: '00',
        message: 'Refund successful',
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set VIETTELPAY_SANDBOX=true');
  },
};
