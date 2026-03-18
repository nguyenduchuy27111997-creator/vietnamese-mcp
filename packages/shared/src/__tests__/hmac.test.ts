import { describe, it, expect } from 'vitest';
import { signHmacSha256, signHmacSha512 } from '../http-client/index.js';

describe('HMAC signing utilities', () => {
  describe('signHmacSha256', () => {
    it('produces the known hex digest for ("secret", "hello")', () => {
      expect(signHmacSha256('secret', 'hello')).toBe(
        '88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b',
      );
    });

    it('returns a lowercase hex string', () => {
      const result = signHmacSha256('key', 'msg');
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('handles an empty message without throwing', () => {
      expect(() => signHmacSha256('secret', '')).not.toThrow();
    });
  });

  describe('signHmacSha512', () => {
    it('produces the known hex digest for ("secret", "hello")', () => {
      const result = signHmacSha512('secret', 'hello');
      // Actual HMAC-SHA512 computed value; plan's "21d45bba" prefix was incorrect
      expect(result).toBe(
        'db1595ae88a62fd151ec1cba81b98c39df82daae7b4cb9820f446d5bf02f1dcfca6683d88cab3e273f5963ab8ec469a746b5b19086371239f67d1e5f99a79440',
      );
    });

    it('returns a lowercase hex string', () => {
      const result = signHmacSha512('key', 'msg');
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('handles an empty message without throwing', () => {
      expect(() => signHmacSha512('secret', '')).not.toThrow();
    });
  });
});
