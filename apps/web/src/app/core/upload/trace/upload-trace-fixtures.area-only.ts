/**
 * Area-only scenarios: a folder names a place and nothing else.
 *
 * A correct result is a location at area precision — everything above it filled, no coordinates, and
 * no question. Today all three land in Issues.
 * @see docs/study/005-upload-pipeline-trace-findings.md#f-19
 */

import type { UploadTraceScenario } from './upload-trace-fixtures';
import { TRACE_PHOTO_MIME, TRACE_PHOTO_SIZE_BYTES } from './upload-trace-fixtures';

export const TRACE_AREA_ONLY_SCENARIOS: readonly UploadTraceScenario[] = [
  {
    id: 'S19',
    intent: 'City only — no street anywhere, no EXIF',
    relativePath: 'Wien/IMG_1101.jpg',
    mimeType: TRACE_PHOTO_MIME,
    contentSeed: 19,
    sizeBytes: TRACE_PHOTO_SIZE_BYTES,
  },
  {
    id: 'S20',
    intent: 'City + postcode only, no street',
    relativePath: 'Wien/1090/IMG_1102.jpg',
    mimeType: TRACE_PHOTO_MIME,
    contentSeed: 20,
    sizeBytes: TRACE_PHOTO_SIZE_BYTES,
  },
  {
    id: 'S21',
    intent: 'State only — the coarsest area a folder can name',
    relativePath: 'AT/Niederösterreich/IMG_1103.jpg',
    mimeType: TRACE_PHOTO_MIME,
    contentSeed: 21,
    sizeBytes: TRACE_PHOTO_SIZE_BYTES,
  },
];
