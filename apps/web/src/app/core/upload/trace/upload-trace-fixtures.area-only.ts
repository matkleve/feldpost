/**
 * Area-only scenarios: a folder names a place and nothing else.
 *
 * A correct result is a location at area precision — everything above it filled, no coordinates, and
 * no question. Today all three land in Clarifications.
 * @see docs/study/005-upload-pipeline-trace-findings.md#f-19
 */

import type { UploadTraceScenario } from './upload-trace-fixtures';

// Values inlined, not imported from `upload-trace-fixtures.ts` — that module imports
// `TRACE_AREA_ONLY_SCENARIOS` from here, and importing its constants back would make the two
// modules circular. In that cycle this module evaluates first, before `upload-trace-fixtures.ts`
// has assigned its exports, so `TRACE_PHOTO_MIME`/`TRACE_PHOTO_SIZE_BYTES` would resolve to
// `undefined` here (an empty synthetic file, three colliding content hashes) rather than throw —
// silent, not loud. `upload-trace-fixtures.ts` defines these as `'image/jpeg'` and `512` too.
const AREA_ONLY_MIME = 'image/jpeg';
const AREA_ONLY_SIZE_BYTES = 512;

export const TRACE_AREA_ONLY_SCENARIOS: readonly UploadTraceScenario[] = [
  {
    id: 'S19',
    intent: 'City only — no street anywhere, no EXIF',
    relativePath: 'Wien/IMG_1101.jpg',
    mimeType: AREA_ONLY_MIME,
    contentSeed: 19,
    sizeBytes: AREA_ONLY_SIZE_BYTES,
  },
  {
    id: 'S20',
    intent: 'City + postcode only, no street',
    relativePath: 'Wien/1090/IMG_1102.jpg',
    mimeType: AREA_ONLY_MIME,
    contentSeed: 20,
    sizeBytes: AREA_ONLY_SIZE_BYTES,
  },
  {
    id: 'S21',
    intent: 'State only — the coarsest area a folder can name',
    relativePath: 'AT/Niederösterreich/IMG_1103.jpg',
    mimeType: AREA_ONLY_MIME,
    contentSeed: 21,
    sizeBytes: AREA_ONLY_SIZE_BYTES,
  },
];
