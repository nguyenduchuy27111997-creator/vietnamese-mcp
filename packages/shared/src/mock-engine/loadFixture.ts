import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load a JSON fixture file and inject _mock: true.
 * @param fixturePath - absolute path or path relative to cwd
 * @returns Parsed JSON with _mock: true field added
 */
export function loadFixture<T = Record<string, unknown>>(fixturePath: string): T & { _mock: true } {
  const fullPath = resolve(fixturePath);
  const raw = readFileSync(fullPath, 'utf-8');
  const data = JSON.parse(raw) as T;
  return { ...data, _mock: true as const };
}
