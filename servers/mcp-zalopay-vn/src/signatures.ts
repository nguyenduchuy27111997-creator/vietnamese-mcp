import { signHmacSha256 } from '@vn-mcp/shared';

/**
 * Build HMAC-SHA256 signature for ZaloPay create order endpoint.
 * Field order (pipe-separated, 7 fields):
 * app_id|app_trans_id|app_user|amount|app_time|embed_data|item
 *
 * Source: docs.zalopay.vn/docs/api/create-order
 */
export function buildCreateSignature(
  params: {
    app_id: string;
    app_trans_id: string;
    app_user: string;
    amount: number;
    app_time: number;
    embed_data: string;
    item: string;
  },
  key1: string,
): string {
  const raw =
    `${params.app_id}|${params.app_trans_id}|${params.app_user}|${params.amount}|${params.app_time}|${params.embed_data}|${params.item}`;
  return signHmacSha256(key1, raw);
}

/**
 * Build HMAC-SHA256 signature for ZaloPay query order endpoint.
 * Field order (pipe-separated, 3 fields):
 * app_id|app_trans_id|app_time
 *
 * Source: docs.zalopay.vn/docs/api/query-order
 */
export function buildQuerySignature(
  params: {
    app_id: string;
    app_trans_id: string;
    app_time: number;
  },
  key1: string,
): string {
  const raw = `${params.app_id}|${params.app_trans_id}|${params.app_time}`;
  return signHmacSha256(key1, raw);
}

/**
 * Build HMAC-SHA256 signature for ZaloPay refund endpoint.
 * Field order (pipe-separated, 5 fields):
 * app_id|zp_trans_id|amount|description|timestamp
 *
 * Source: docs.zalopay.vn/docs/api/refund
 */
export function buildRefundSignature(
  params: {
    app_id: string;
    zp_trans_id: number;
    amount: number;
    description: string;
    timestamp: number;
  },
  key1: string,
): string {
  const raw =
    `${params.app_id}|${params.zp_trans_id}|${params.amount}|${params.description}|${params.timestamp}`;
  return signHmacSha256(key1, raw);
}

/**
 * Build HMAC-SHA256 signature for ZaloPay callback validation.
 * ZaloPay callback MAC signs the raw `data` field string with key2 (NOT key1).
 *
 * Source: docs.zalopay.vn/docs/api/callback
 */
export function buildCallbackSignature(callbackData: string, key2: string): string {
  return signHmacSha256(key2, callbackData);
}
