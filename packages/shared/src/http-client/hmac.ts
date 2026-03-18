import { createHmac } from 'node:crypto';

/**
 * Create an HMAC-SHA256 hex digest.
 * @param key - The secret key
 * @param message - The message to sign
 * @returns Lowercase hex string of the HMAC-SHA256 digest
 *
 * NOTE (PITFALLS.md): This is a primitive only. Field ordering for signature
 * strings is per-server responsibility — never add ordering logic here.
 */
export function signHmacSha256(key: string, message: string): string {
  return createHmac('sha256', key).update(message).digest('hex');
}

/**
 * Create an HMAC-SHA512 hex digest.
 * @param key - The secret key
 * @param message - The message to sign
 * @returns Lowercase hex string of the HMAC-SHA512 digest
 *
 * NOTE (PITFALLS.md): This is a primitive only. Field ordering for signature
 * strings is per-server responsibility — never add ordering logic here.
 */
export function signHmacSha512(key: string, message: string): string {
  return createHmac('sha512', key).update(message).digest('hex');
}
