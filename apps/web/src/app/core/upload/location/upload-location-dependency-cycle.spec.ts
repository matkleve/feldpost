import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Structural regression guard for UP-26 (the location-layer god-object).
 *
 * `UploadLocationResolutionService` is a pure facade: every one of its public
 * methods forwards to exactly one named sibling service. Six siblings used to
 * reach back into it anyway — via a top-level import plus, in most of them,
 * an `Injector.get()` lazy call — purely to invoke the sibling method the
 * facade itself only forwards to. That created the 6-identical-workarounds,
 * 11/14-file mutual-dependency cluster documented in
 * docs/audits/upload-process-analysis-2026-09-08/01-structure.md § 3.1-3.2
 * and re-confirmed (worse: 20 cycles, not 11) in
 * docs/audits/upload-flow-review-2026-09-10/04-status-of-prior-findings.md UP-26.
 *
 * The fix moves the two pieces of state the facade actually owned (the
 * `disambiguationRequired$` / `disambiguationResolved$` event subjects) onto
 * the already-leaf `UploadLocationDisambiguationStoreService`, so siblings can
 * inject the real owning service directly instead of routing through the
 * facade. This test asserts the six siblings never import the facade again —
 * if one does, the cluster is growing back.
 *
 * Two narrow exceptions are NOT covered here and are expected to keep using
 * `Injector.get()`: `upload-location-tray-flow.service.ts` → candidate-apply
 * and `upload-location-placement.service.ts` → pre-resolve-orchestrator each
 * have a genuine two-way dependency with their target (the target already
 * imports them directly), so a top-level import the other way would just
 * recreate a real cycle. Those are documented at the call site instead.
 */
const HUB_IMPORT = /from ['"]\.\/upload-location-resolution\.service['"]/;

const FILES_THAT_MUST_NOT_IMPORT_THE_FACADE = [
  'upload-location-placement.service.ts',
  'upload-location-source-conflict.service.ts',
  'upload-location-tray-flow.service.ts',
  'upload-location-candidate-apply.service.ts',
  'upload-location-pre-resolve-orchestrator.service.ts',
  'upload-location-disambiguation-registration.service.ts',
];

describe('UploadLocationResolutionService is not a dependency hub (UP-26)', () => {
  for (const file of FILES_THAT_MUST_NOT_IMPORT_THE_FACADE) {
    it(`${file} does not import the facade`, () => {
      const source = readFileSync(join(__dirname, file), 'utf8');
      expect(HUB_IMPORT.test(source)).toBe(false);
    });
  }
});
