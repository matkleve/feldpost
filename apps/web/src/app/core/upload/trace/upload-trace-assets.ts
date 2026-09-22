/**
 * Locating the production geo assets the trace harness reads.
 *
 * **Deliberately not `__dirname`-relative.** These specs are bundled by the Angular unit-test
 * builder, so `__dirname` names the *output chunk's* directory rather than this source file's — and
 * which chunk a module lands in changes as spec files are added. Adding one spec that imported the
 * harness was enough to turn the path into `/home/assets/geo`, and all five trace tests failed with
 * `ENOENT` on a path nothing in the repository contains.
 *
 * `process.cwd()` is stable here: `ng test` and `scripts/trace-upload-pipeline.mjs` both start in
 * `apps/web`. The `__dirname` form stays as a fallback, and a failure names both attempts rather
 * than one misleading one.
 */

import fs from 'node:fs';
import path from 'node:path';

/** A file that exists in the assets directory and nowhere else nearby — the probe. */
const PROBE = 'at-plz.json';

export function resolveTraceAssetsDir(): string {
  const candidates = [
    path.join(process.cwd(), 'src/assets/geo'),
    path.join(__dirname, '../../../../assets/geo'),
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, PROBE)));
  if (!found) {
    throw new Error(`trace harness: geo assets not found. Tried: ${candidates.join(' , ')}`);
  }
  return found;
}
