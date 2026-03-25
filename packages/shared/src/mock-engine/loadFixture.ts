/**
 * Tag a pre-imported fixture object with _mock: true.
 * Works in all runtimes (Node, Cloudflare Workers, etc.)
 * because it no longer reads from the filesystem.
 *
 * @param fixture - a JSON object (typically imported via `import … from './mock/foo.json'`)
 * @returns A shallow copy with `_mock: true` added
 */
export function loadFixture<T = Record<string, unknown>>(fixture: T): T & { _mock: true } {
  return { ...fixture, _mock: true as const };
}
