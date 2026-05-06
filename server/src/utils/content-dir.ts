import path from 'path';
import fs from 'fs';

/**
 * Locate the /content/ directory across dev and prod environments.
 *
 * - Dev (ts-node from server/src/...): content is at repo root → `../../../../content`
 * - Prod (compiled, content copied into dist by build script): `../../content`
 * - Override: set CONTENT_DIR env var
 *
 * Cached after first call.
 */
let cached: string | undefined;

export function getContentDir(): string {
  if (cached) return cached;

  const candidates = [
    process.env.CONTENT_DIR,
    // Production: dist/utils/ → dist/content/
    path.resolve(__dirname, '../content'),
    // Dev: src/utils/ → repo/content/
    path.resolve(__dirname, '../../../content'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'scenarios'))) {
      cached = candidate;
      return candidate;
    }
  }

  throw new Error(
    `Content directory not found. Tried:\n  ${candidates.join('\n  ')}`,
  );
}
