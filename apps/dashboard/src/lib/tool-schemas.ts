export type ToolParam = {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
  enumValues?: string[];
  default?: unknown;
};

export type ToolSchema = {
  name: string;
  description: string;
  params: ToolParam[];
};

export type ServerInfo = {
  id: string;
  label: string;
  tools: ToolSchema[];
};

export const SERVERS: ServerInfo[] = [
  {
    id: 'momo',
    label: 'MoMo',
    tools: [
      {
        name: 'momo_create_payment',
        description: 'Create a MoMo payment link (QR code, wallet, or ATM). Returns payUrl for the customer to complete payment.',
        params: [
          { name: 'amount', type: 'number', required: true, description: 'Payment amount in VND (integer, e.g. 150000)' },
          { name: 'orderInfo', type: 'string', required: true, description: 'Order description shown to the customer' },
          { name: 'redirectUrl', type: 'string', required: false, description: 'URL to redirect after payment' },
          { name: 'ipnUrl', type: 'string', required: false, description: 'Server callback URL for payment notification' },
          { name: 'requestType', type: 'string', required: false, description: 'Payment method (default: captureWallet for QR code)', enumValues: ['captureWallet', 'payWithATM', 'payWithCC'] },
          { name: 'extraData', type: 'string', required: false, description: 'Additional data to pass through' },
        ],
      },
      {
        name: 'momo_query_status',
        description: 'Check the status of a MoMo payment transaction by orderId.',
        params: [
          { name: 'orderId', type: 'string', required: true, description: 'The orderId from momo_create_payment response' },
        ],
      },
      {
        name: 'momo_refund',
        description: 'Refund a MoMo transaction (full or partial) by transId.',
        params: [
          { name: 'transId', type: 'number', required: true, description: 'Transaction ID from the original payment (numeric, e.g. 2350000001)' },
          { name: 'amount', type: 'number', required: true, description: 'Refund amount in VND (must be <= original amount)' },
          { name: 'description', type: 'string', required: false, description: 'Reason for the refund' },
        ],
      },
      {
        name: 'momo_validate_ipn',
        description: 'Validate a MoMo IPN payload by verifying its HMAC-SHA256 signature.',
        params: [
          { name: 'ipnBody', type: 'string', required: true, description: 'Raw IPN JSON body as a string' },
        ],
      },
    ],
  },
  {
    id: 'zalopay',
    label: 'ZaloPay',
    tools: [
      {
        name: 'zalopay_create_order',
        description: 'Create a ZaloPay payment order. Returns a payment URL.',
        params: [
          { name: 'amount', type: 'number', required: true, description: 'Payment amount in VND (integer, e.g. 150000)' },
          { name: 'description', type: 'string', required: true, description: 'Order description shown to the customer' },
          { name: 'appUser', type: 'string', required: false, description: 'App user identifier (default: demo_user)' },
          { name: 'embedData', type: 'string', required: false, description: 'Embedded data JSON string' },
          { name: 'item', type: 'string', required: false, description: 'Item details JSON string' },
        ],
      },
      {
        name: 'zalopay_query_order',
        description: 'Check the status of a ZaloPay order by its app_trans_id.',
        params: [
          { name: 'appTransId', type: 'string', required: true, description: 'ZaloPay app_trans_id (format: YYMMDD_hash)' },
        ],
      },
      {
        name: 'zalopay_refund',
        description: 'Refund a ZaloPay transaction by its zp_trans_id.',
        params: [
          { name: 'zpTransId', type: 'number', required: true, description: 'ZaloPay transaction ID from query result' },
          { name: 'amount', type: 'number', required: true, description: 'Refund amount in VND' },
          { name: 'description', type: 'string', required: false, description: 'Reason for refund' },
        ],
      },
      {
        name: 'zalopay_validate_callback',
        description: 'Validate a ZaloPay callback payload by verifying its HMAC-SHA256 MAC.',
        params: [
          { name: 'callbackData', type: 'string', required: true, description: 'Raw ZaloPay callback JSON body as a string' },
        ],
      },
    ],
  },
  {
    id: 'vnpay',
    label: 'VNPAY',
    tools: [
      {
        name: 'vnpay_create_payment_url',
        description: 'Build a signed VNPAY payment URL.',
        params: [
          { name: 'amount', type: 'number', required: true, description: 'Payment amount in VND (integer, e.g. 150000)' },
          { name: 'orderInfo', type: 'string', required: true, description: 'Order description shown on VNPAY payment page' },
          { name: 'bankCode', type: 'string', required: false, description: 'Bank code (e.g. NCB, VNPAYQR). Default: NCB' },
          { name: 'locale', type: 'string', required: false, description: 'Payment page language (default: vn)', enumValues: ['vn', 'en'] },
          { name: 'returnUrl', type: 'string', required: false, description: 'URL to redirect after payment' },
        ],
      },
      {
        name: 'vnpay_verify_return',
        description: 'Verify a VNPAY return URL by validating the HMAC-SHA512 secure hash.',
        params: [
          { name: 'returnUrl', type: 'string', required: true, description: 'Full VNPAY return URL or query string to verify' },
        ],
      },
      {
        name: 'vnpay_query_transaction',
        description: 'Query the status of a VNPAY transaction by its reference number.',
        params: [
          { name: 'txnRef', type: 'string', required: true, description: 'VNPAY transaction reference (vnp_TxnRef)' },
          { name: 'transDate', type: 'string', required: false, description: 'Transaction date in YYYYMMDDHHMMSS format' },
        ],
      },
    ],
  },
  {
    id: 'zalo-oa',
    label: 'Zalo OA',
    tools: [
      {
        name: 'zalo_oa_send_message',
        description: 'Send a message to a Zalo OA follower.',
        params: [
          { name: 'userId', type: 'string', required: true, description: 'Zalo user ID of the follower to message' },
          { name: 'type', type: 'string', required: true, description: 'Message type: text, image (URL), or file (URL)', enumValues: ['text', 'image', 'file'] },
          { name: 'text', type: 'string', required: false, description: 'Text content (required if type=text)' },
          { name: 'imageUrl', type: 'string', required: false, description: 'Image URL (required if type=image)' },
          { name: 'fileUrl', type: 'string', required: false, description: 'File URL (required if type=file)' },
        ],
      },
      {
        name: 'zalo_oa_get_follower_profile',
        description: 'Get profile information for a Zalo OA follower by userId.',
        params: [
          { name: 'userId', type: 'string', required: true, description: 'Zalo user ID of the follower' },
        ],
      },
      {
        name: 'zalo_oa_list_followers',
        description: 'List followers of the Zalo Official Account with offset pagination.',
        params: [
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default: 0)' },
          { name: 'count', type: 'number', required: false, description: 'Number of followers to return (default: 50, max: 50)' },
        ],
      },
      {
        name: 'zalo_oa_refresh_token',
        description: 'Refresh the Zalo OA access token using the refresh token from environment.',
        params: [],
      },
    ],
  },
  {
    id: 'viettel-pay',
    label: 'ViettelPay',
    tools: [
      {
        name: 'viettel_pay_create_payment',
        description: 'Create a ViettelPay payment request. Returns a payment URL.',
        params: [
          { name: 'amount', type: 'number', required: true, description: 'Payment amount in VND' },
          { name: 'orderInfo', type: 'string', required: true, description: 'Order description' },
          { name: 'returnUrl', type: 'string', required: false, description: 'URL to redirect after payment' },
        ],
      },
      {
        name: 'viettel_pay_query_status',
        description: 'Check ViettelPay transaction status by transactionId.',
        params: [
          { name: 'transactionId', type: 'string', required: true, description: 'ViettelPay transaction ID (e.g., VTP_xxxx)' },
        ],
      },
      {
        name: 'viettel_pay_refund',
        description: 'Refund a ViettelPay transaction.',
        params: [
          { name: 'transactionId', type: 'string', required: true, description: 'Original transaction ID to refund' },
          { name: 'amount', type: 'number', required: true, description: 'Refund amount in VND' },
          { name: 'description', type: 'string', required: false, description: 'Reason for refund' },
        ],
      },
    ],
  },
];
