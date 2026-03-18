import { signHmacSha256 } from '@vn-mcp/shared';

/**
 * Build HMAC-SHA256 signature for the MoMo v2 create payment endpoint.
 * Field order (hardcoded, 10 fields alphabetical):
 * accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType
 *
 * Source: developers.momo.vn/v3/docs/payment/api/wallet/onetime/
 */
export function buildCreateSignature(
  params: {
    accessKey: string;
    amount: number;
    extraData: string;
    ipnUrl: string;
    orderId: string;
    orderInfo: string;
    partnerCode: string;
    redirectUrl: string;
    requestId: string;
    requestType: string;
  },
  secretKey: string,
): string {
  const raw =
    `accessKey=${params.accessKey}` +
    `&amount=${params.amount}` +
    `&extraData=${params.extraData}` +
    `&ipnUrl=${params.ipnUrl}` +
    `&orderId=${params.orderId}` +
    `&orderInfo=${params.orderInfo}` +
    `&partnerCode=${params.partnerCode}` +
    `&redirectUrl=${params.redirectUrl}` +
    `&requestId=${params.requestId}` +
    `&requestType=${params.requestType}`;
  return signHmacSha256(secretKey, raw);
}

/**
 * Build HMAC-SHA256 signature for the MoMo v2 query transaction endpoint.
 * Field order (hardcoded, 4 fields alphabetical):
 * accessKey, orderId, partnerCode, requestId
 *
 * Source: developers.momo.vn/v3/docs/payment/api/payment-api/query/
 */
export function buildQuerySignature(
  params: {
    accessKey: string;
    orderId: string;
    partnerCode: string;
    requestId: string;
  },
  secretKey: string,
): string {
  const raw =
    `accessKey=${params.accessKey}` +
    `&orderId=${params.orderId}` +
    `&partnerCode=${params.partnerCode}` +
    `&requestId=${params.requestId}`;
  return signHmacSha256(secretKey, raw);
}

/**
 * Build HMAC-SHA256 signature for the MoMo v2 refund endpoint.
 * Field order (hardcoded, 7 fields alphabetical):
 * accessKey, amount, description, orderId, partnerCode, requestId, transId
 *
 * Source: developers.momo.vn/v3/docs/payment/api/payment-api/refund/
 */
export function buildRefundSignature(
  params: {
    accessKey: string;
    amount: number;
    description: string;
    orderId: string;
    partnerCode: string;
    requestId: string;
    transId: number;
  },
  secretKey: string,
): string {
  const raw =
    `accessKey=${params.accessKey}` +
    `&amount=${params.amount}` +
    `&description=${params.description}` +
    `&orderId=${params.orderId}` +
    `&partnerCode=${params.partnerCode}` +
    `&requestId=${params.requestId}` +
    `&transId=${params.transId}`;
  return signHmacSha256(secretKey, raw);
}

/**
 * Build HMAC-SHA256 signature for MoMo v2 IPN validation.
 * Field order (hardcoded, 13 fields alphabetical):
 * accessKey, amount, extraData, message, orderId, orderInfo, orderType,
 * partnerCode, payType, requestId, responseTime, resultCode, transId
 *
 * Source: github.com/momo-wallet/payment/blob/master/php/PayMoMo/ipn_momo.php
 */
export function buildIpnSignature(
  payload: {
    accessKey: string;
    amount: number;
    extraData: string;
    message: string;
    orderId: string;
    orderInfo: string;
    orderType: string;
    partnerCode: string;
    payType: string;
    requestId: string;
    responseTime: number;
    resultCode: number;
    transId: number;
  },
  secretKey: string,
): string {
  const raw =
    `accessKey=${payload.accessKey}` +
    `&amount=${payload.amount}` +
    `&extraData=${payload.extraData}` +
    `&message=${payload.message}` +
    `&orderId=${payload.orderId}` +
    `&orderInfo=${payload.orderInfo}` +
    `&orderType=${payload.orderType}` +
    `&partnerCode=${payload.partnerCode}` +
    `&payType=${payload.payType}` +
    `&requestId=${payload.requestId}` +
    `&responseTime=${payload.responseTime}` +
    `&resultCode=${payload.resultCode}` +
    `&transId=${payload.transId}`;
  return signHmacSha256(secretKey, raw);
}
