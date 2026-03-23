import { describe, it } from 'vitest';

describe('BILL-03: MoMo Create Payment', () => {
  it.todo('POST /billing/create-checkout with provider=momo returns MoMo payment URL');
  it.todo('POST /billing/create-checkout with invalid tier returns 400');
});

describe('BILL-04: MoMo IPN', () => {
  it.todo('POST /billing/momo-ipn with valid HMAC and resultCode=0 upgrades tier');
  it.todo('POST /billing/momo-ipn with tampered HMAC returns 400');
  it.todo('POST /billing/momo-ipn with resultCode!=0 returns 204 without upgrade');
  it.todo('POST /billing/momo-ipn with duplicate orderId returns 204 without re-processing');
});
