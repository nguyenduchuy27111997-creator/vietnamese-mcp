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
  },
  vnpay: {
    '00': 'Success',
    '07': 'Transaction suspected fraud',
    '51': 'Insufficient balance',
  },
  viettelpay: {
    '00': 'Success',
    '06': 'Insufficient balance',
  },
};

/**
 * Look up an English translation for a provider error code.
 * @returns English description if known, undefined if not in the table.
 */
export function translateErrorCode(provider: string, code: string): string | undefined {
  return VN_ERROR_CODES[provider]?.[code];
}
