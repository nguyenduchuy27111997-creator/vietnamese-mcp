/**
 * VN provider error code translation tables.
 * Maps provider -> numeric/string code -> English description.
 *
 * Phase 1 ships stubs with a few common codes per provider.
 * Each server's Phase 2+ implementation will extend these tables
 * with full provider-specific error code mappings.
 */
export const VN_ERROR_CODES: Record<string, Record<string, string>> = {
  momo: {
    '0': 'Success',
    '1005': 'Insufficient balance',
    '1006': 'Transaction failed — user denied the request',
    '1007': 'Transaction denied by risk management',
  },
  zalopay: {
    '1': 'Success',
    '2': 'Failed',
    '-49': 'Insufficient balance',
    '-54': 'Insufficient balance',
    '-68': 'Duplicate app_trans_id',
  },
  vnpay: {
    '00': 'Success',
    '07': 'Transaction suspected fraud',
    '09': 'Transaction unsuccessful - card/account not registered for internet banking',
    '10': 'Customer verification failed more than 3 times',
    '11': 'Payment session expired',
    '12': 'Account locked',
    '13': 'Wrong OTP entered',
    '24': 'Customer cancelled transaction',
    '51': 'Insufficient balance',
    '65': 'Transaction limit exceeded for the day',
    '75': 'Payment bank under maintenance',
    '79': 'Wrong payment password more than allowed',
    '99': 'Other errors',
  },
  viettelpay: {
    '00': 'Success',
    '06': 'Insufficient balance',
  },
  zalo_oa: {
    '0': 'Success',
    '210': 'User not found or not a follower',
    '400': 'Invalid access token',
  },
};

/**
 * Look up an English translation for a provider error code.
 * @returns English description if known, undefined if not in the table.
 */
export function translateErrorCode(provider: string, code: string): string | undefined {
  return VN_ERROR_CODES[provider]?.[code];
}
