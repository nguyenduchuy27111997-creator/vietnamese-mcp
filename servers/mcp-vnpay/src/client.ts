import { isMockMode, loadFixture, McpApiError } from '@vn-mcp/shared';
import { createHash } from 'node:crypto';
import { getVnpayCredentials } from './credentials.js';
import { buildVnpaySecureHash } from './signatures.js';

import createPaymentUrlFixture from './mock/createPaymentUrl.json' with { type: 'json' };
import queryTransactionFixture from './mock/queryTransaction.json' with { type: 'json' };

function generateTxnRef(amount: number, orderInfo: string): string {
  const hash = createHash('sha256')
    .update(`${amount}${orderInfo}`)
    .digest('hex')
    .substring(0, 12);
  return `VNP_${hash}`;
}

/**
 * Returns YYYYMMDDHHMMSS format.
 * Uses a fixed date in mock mode for determinism.
 */
function formatVnpayDate(_date: Date): string {
  if (isMockMode('vnpay')) {
    return '20260318120000';
  }
  const d = _date;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(d.getFullYear()) +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

type CreatePaymentUrlResult = {
  paymentUrl: string;
  orderId: string;
  amount: number;
  bankCode: string;
  _mock: true;
};

type VerifyReturnResult =
  | {
      valid: true;
      vnp_TxnRef: string;
      vnp_Amount: number;
      vnp_ResponseCode: string;
      vnp_TransactionNo: string;
      _mock: true;
    }
  | {
      valid: false;
      reason: string;
    };

type QueryTransactionResult = {
  vnp_TxnRef: string;
  vnp_TransactionNo: string;
  vnp_ResponseCode: string;
  vnp_Message: string;
  vnp_BankCode: string;
  vnp_Amount: number;
  _mock: true;
};

export const vnpayClient = {
  async createPaymentUrl(args: {
    amount: number;
    orderInfo: string;
    bankCode?: string;
    locale?: string;
    returnUrl?: string;
  }): Promise<CreatePaymentUrlResult> {
    if (args.amount === 99999999) {
      throw new McpApiError('51', 'Insufficient balance', 'vnpay', 'Try a smaller amount');
    }

    if (isMockMode('vnpay')) {
      const fixture = loadFixture<{ _mock: true }>(createPaymentUrlFixture);

      const txnRef = generateTxnRef(args.amount, args.orderInfo);
      const credentials = getVnpayCredentials();

      const params: Record<string, string | number> = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: credentials.tmnCode,
        vnp_Amount: args.amount * 100,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: args.orderInfo,
        vnp_OrderType: 'other',
        vnp_Locale: args.locale ?? 'vn',
        vnp_ReturnUrl: args.returnUrl ?? 'https://localhost:3000/vnpay-return',
        vnp_IpAddr: '127.0.0.1',
        vnp_CreateDate: formatVnpayDate(new Date()),
        vnp_BankCode: args.bankCode ?? 'NCB',
      };

      const hash = buildVnpaySecureHash(params, credentials.hashSecret);

      const queryString = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&');

      const paymentUrl = `${credentials.endpoint}?${queryString}&vnp_SecureHashType=SHA512&vnp_SecureHash=${hash}`;

      return {
        paymentUrl,
        orderId: txnRef,
        amount: args.amount,
        bankCode: args.bankCode ?? 'NCB',
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set VNPAY_SANDBOX=true');
  },

  async verifyReturn(args: { returnUrl: string }): Promise<VerifyReturnResult> {
    let queryString: string;
    if (args.returnUrl.startsWith('http')) {
      queryString = new URL(args.returnUrl).search;
    } else {
      queryString = args.returnUrl.startsWith('?') ? args.returnUrl : `?${args.returnUrl}`;
    }

    const urlParams = new URLSearchParams(queryString);
    const params: Record<string, string> = {};
    for (const [k, v] of urlParams.entries()) {
      params[k] = v;
    }

    const receivedHash = params['vnp_SecureHash'];
    const paramsWithoutHash: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') {
        paramsWithoutHash[k] = v;
      }
    }

    const credentials = getVnpayCredentials();
    const computedHash = buildVnpaySecureHash(paramsWithoutHash, credentials.hashSecret);

    if (computedHash !== receivedHash) {
      return { valid: false, reason: 'Secure hash mismatch' };
    }

    return {
      valid: true,
      vnp_TxnRef: params['vnp_TxnRef'] ?? '',
      vnp_Amount: Number(params['vnp_Amount'] ?? 0) / 100,
      vnp_ResponseCode: params['vnp_ResponseCode'] ?? '',
      vnp_TransactionNo: params['vnp_TransactionNo'] ?? '',
      _mock: true,
    };
  },

  async queryTransaction(args: {
    txnRef: string;
    transDate?: string;
  }): Promise<QueryTransactionResult> {
    if (isMockMode('vnpay')) {
      const fixture = loadFixture<{
        vnp_TransactionNo: string;
        vnp_ResponseCode: string;
        vnp_Message: string;
        vnp_BankCode: string;
        vnp_Amount: number;
        _mock: true;
      }>(queryTransactionFixture);

      return {
        vnp_TxnRef: args.txnRef,
        vnp_TransactionNo: fixture.vnp_TransactionNo,
        vnp_ResponseCode: fixture.vnp_ResponseCode,
        vnp_Message: fixture.vnp_Message,
        vnp_BankCode: fixture.vnp_BankCode,
        vnp_Amount: fixture.vnp_Amount,
        _mock: fixture._mock,
      };
    }

    throw new Error('Real API not implemented — set VNPAY_SANDBOX=true');
  },
};
