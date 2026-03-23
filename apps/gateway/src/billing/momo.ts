import type { PaymentProvider, CheckoutParams } from './provider.js';
import { MOMO_TIERS } from './provider.js';
import type { GatewayEnv } from '../types.js';

export interface MomoIpnPayload {
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
  signature: string;
}

/**
 * Verify MoMo IPN signature using crypto.subtle HMAC-SHA256.
 * DO NOT use node:crypto createHmac — it is NOT available in CF Workers.
 * Field order: 13 fields alphabetical (verified in servers/mcp-momo-vn/src/signatures.ts).
 */
export async function verifyMomoIpn(body: MomoIpnPayload, secretKey: string): Promise<boolean> {
  const raw = [
    `accessKey=${body.accessKey}`,
    `&amount=${body.amount}`,
    `&extraData=${body.extraData ?? ''}`,
    `&message=${body.message ?? ''}`,
    `&orderId=${body.orderId}`,
    `&orderInfo=${body.orderInfo ?? ''}`,
    `&orderType=${body.orderType ?? ''}`,
    `&partnerCode=${body.partnerCode}`,
    `&payType=${body.payType ?? ''}`,
    `&requestId=${body.requestId}`,
    `&responseTime=${body.responseTime}`,
    `&resultCode=${body.resultCode}`,
    `&transId=${body.transId}`,
  ].join('');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(raw));
  const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === body.signature;
}

/**
 * MoMoProvider — mock-first implementation.
 * Returns a mock payment URL until MoMo merchant account is approved.
 * When merchant account is ready, replace with real MoMo v2 createPayment API call.
 */
export class MoMoProvider implements PaymentProvider {
  constructor(private env: GatewayEnv['Bindings']) {}

  async createCheckoutUrl(params: CheckoutParams): Promise<string> {
    const tierConfig = MOMO_TIERS[params.tier];
    if (!tierConfig) throw new Error(`No MoMo price for tier: ${params.tier}`);

    // Encode userId + tier in extraData (base64 JSON) — MoMo sends it back in IPN
    const extraData = btoa(JSON.stringify({ userId: params.userId, tier: params.tier }));
    const orderId = `MCPVN_${Date.now()}_${params.tier}`;

    // MOCK MODE: Return a mock URL. Replace with real MoMo API when merchant account approved.
    // Real implementation would call: POST https://payment.momo.vn/v2/gateway/api/create
    return `https://test-payment.momo.vn/pay?orderId=${orderId}&amount=${tierConfig.amountVnd}&extraData=${extraData}&returnUrl=${encodeURIComponent(params.returnUrl)}`;
  }
}
