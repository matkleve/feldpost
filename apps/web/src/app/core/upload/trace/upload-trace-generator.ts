/**
 * Deterministic scale-up corpus for the upload pipeline trace harness.
 *
 * `buildGeneratedScenarios(150, 7)` always produces the same 150 paths, so a trace can be
 * re-run and compared. Shapes are drawn from the same folder conventions as the curated
 * corpus in `upload-trace-fixtures.ts`.
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 */

import { TRACE_PHOTO_MIME, TRACE_PHOTO_SIZE_BYTES, type UploadTraceScenario } from './upload-trace-fixtures';
import { stubCityCoords } from './upload-trace-geocoder.stub';

/** Localities that exist in `at-plz.json`, so PLZ expand has something to hit. */
const LOCALITIES: readonly { city: string; postcode: string }[] = [
  { city: 'Wien', postcode: '1090' },
  { city: 'Graz', postcode: '8010' },
  { city: 'Linz', postcode: '4020' },
  { city: 'Salzburg', postcode: '5020' },
  { city: 'Innsbruck', postcode: '6020' },
  { city: 'Klagenfurt', postcode: '9020' },
];

const STREETS: readonly string[] = [
  'Annenstraße',
  'Getreidegasse',
  'Hauptstraße',
  'Herrengasse',
  'Kärntner Straße',
  'Landstraße',
  'Maria-Theresien-Straße',
  'Währinger Straße',
];

const NOISE_FOLDERS: readonly string[] = [
  'Baustelle Nord',
  'Rohdaten',
  'Woche 12',
  'Kamera A',
  'Abnahme',
  'Export final',
];

/** Folder shapes the generator picks from — the "different names" part of the corpus. */
export type GeneratedShape =
  | 'full_chain'
  | 'city_street'
  | 'postcode_street'
  | 'street_only'
  | 'with_units'
  | 'project_token'
  | 'no_address'
  | 'filename_address';

const SHAPES: readonly GeneratedShape[] = [
  'full_chain',
  'city_street',
  'postcode_street',
  'street_only',
  'with_units',
  'project_token',
  'no_address',
  'filename_address',
];

const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_SHIFT_A = 15;
const MULBERRY_SHIFT_B = 7;
const MULBERRY_SHIFT_C = 14;
const MULBERRY_ODD_A = 1;
const MULBERRY_ODD_B = 61;
const UINT32_RANGE = 4294967296;

/** mulberry32 — a tiny seeded PRNG, so `--seed` reproduces a batch exactly. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> MULBERRY_SHIFT_A), t | MULBERRY_ODD_A);
    t ^= t + Math.imul(t ^ (t >>> MULBERRY_SHIFT_B), t | MULBERRY_ODD_B);
    return ((t ^ (t >>> MULBERRY_SHIFT_C)) >>> 0) / UINT32_RANGE;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

const MAX_HOUSE_NUMBER = 40;
const MAX_STAIRCASE = 4;
const MAX_TOP = 12;
const MAX_BAULOS = 5;
const FILENAME_ADDRESS_OFFSET = 2;
const LEAF_NUMBER_BASE = 2000;
const ID_PAD_WIDTH = 3;
/** Every Nth generated file reuses the previous body, so dedup is exercised at scale. */
const DUPLICATE_EVERY = 17;
const CONTENT_BYTE_BASE = 16;
const CONTENT_BYTE_SPAN = 200;
const EXIF_SHARE = 0.2;

interface ShapeInput {
  rng: () => number;
  city: string;
  postcode: string;
  street: string;
  houseNumber: number;
}

function buildSegments(shape: GeneratedShape, input: ShapeInput): string[] {
  const { rng, city, postcode, street, houseNumber } = input;
  const streetSegment = `${street} ${houseNumber}`;
  switch (shape) {
    case 'full_chain':
      return ['AT', city, postcode, streetSegment];
    case 'city_street':
    case 'filename_address':
      return [city, streetSegment];
    case 'postcode_street':
      return ['AT', postcode, streetSegment];
    case 'street_only':
      return [streetSegment];
    case 'with_units':
      return [
        'AT',
        city,
        postcode,
        streetSegment,
        `Stiege ${1 + Math.floor(rng() * MAX_STAIRCASE)}`,
        `Top ${1 + Math.floor(rng() * MAX_TOP)}`,
      ];
    case 'project_token':
      return [`Projekt: Baulos ${1 + Math.floor(rng() * MAX_BAULOS)}`, city, streetSegment];
    case 'no_address':
      return [pick(rng, NOISE_FOLDERS), pick(rng, NOISE_FOLDERS)];
  }
}

export function buildGeneratedScenarios(count: number, seed: number): UploadTraceScenario[] {
  const rng = createRandom(seed);
  const scenarios: UploadTraceScenario[] = [];

  for (let index = 0; index < count; index += 1) {
    const shape = pick(rng, SHAPES);
    const locality = pick(rng, LOCALITIES);
    const street = pick(rng, STREETS);
    const houseNumber = 1 + Math.floor(rng() * MAX_HOUSE_NUMBER);
    const segments = buildSegments(shape, { rng, ...locality, street, houseNumber });
    // Every leaf carries IMG_<index> so file names stay unique across the corpus — the flat
    // multi-file run identifies jobs by file name alone.
    const leaf = `IMG_${LEAF_NUMBER_BASE + index}`;
    const fileName =
      shape === 'filename_address'
        ? `${street} ${houseNumber + FILENAME_ADDRESS_OFFSET} Detail ${leaf}.jpg`
        : `${leaf}.jpg`;

    const previous = scenarios[scenarios.length - 1];
    const isDuplicate = index > 0 && index % DUPLICATE_EVERY === 0 && previous !== undefined;

    scenarios.push({
      id: `G${String(index + 1).padStart(ID_PAD_WIDTH, '0')}`,
      intent: isDuplicate ? `generated:${shape} (duplicate body)` : `generated:${shape}`,
      relativePath: [...segments, fileName].join('/'),
      mimeType: TRACE_PHOTO_MIME,
      exifCoords: rng() < EXIF_SHARE ? stubCityCoords(locality.city) : undefined,
      contentByte: isDuplicate
        ? previous.contentByte
        : CONTENT_BYTE_BASE + (index % CONTENT_BYTE_SPAN),
      sizeBytes: TRACE_PHOTO_SIZE_BYTES,
    });
  }

  return scenarios;
}
