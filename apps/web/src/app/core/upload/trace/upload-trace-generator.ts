/**
 * Deterministic scale-up corpus for the upload pipeline trace harness.
 *
 * `buildGeneratedScenario(index, seed)` is **index-addressable**: scenario 900_000 can be built
 * without building the 899_999 before it, and it is always the same path for a given seed. That
 * is what lets the scale tier stream a million paths without materialising them.
 * `buildGeneratedScenarios(count, seed)` is the array form for ordinary runs.
 *
 * Shapes are drawn from the same folder conventions as the curated corpus in
 * `upload-trace-fixtures.ts`.
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
/**
 * Six-digit leaf numbers cannot be read as an AT postcode (4 digits) or a house number
 * (≤ 4 digits), so `neutral` naming isolates folder behaviour from the file-name defect.
 */
const NEUTRAL_LEAF_NUMBER_BASE = 100_000;
const ID_PAD_WIDTH = 3;
/** Every Nth generated file reuses the previous body, so dedup is exercised at scale. */
const DUPLICATE_EVERY = 17;
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

/** Per-index seed, so every scenario is reproducible on its own. */
const INDEX_SEED_STRIDE = 2654435761;
/**
 * Content seeds start above the curated corpus's range, so a generated body never collides with
 * a curated one by accident — only the deliberate every-Nth duplicate collides.
 */
const CONTENT_SEED_BASE = 1000;

/**
 * Build scenario `index` (0-based) for `seed`, independent of every other index.
 *
 * Every leaf carries `IMG_<index>` so file names stay unique across the corpus — the flat
 * multi-file run identifies jobs by file name alone.
 */
/**
 * `camera` reproduces what cameras actually write (`IMG_2001.jpg`), whose 4-digit number the
 * parser reads as a postcode. `neutral` keeps everything else identical but uses a 6-digit
 * number, so the two can be compared.
 */
export type GeneratedNaming = 'camera' | 'neutral';

export function buildGeneratedScenario(
  index: number,
  seed: number,
  naming: GeneratedNaming = 'camera',
): UploadTraceScenario {
  const rng = createRandom((seed + index * INDEX_SEED_STRIDE) >>> 0);
  const shape = pick(rng, SHAPES);
  const locality = pick(rng, LOCALITIES);
  const street = pick(rng, STREETS);
  const houseNumber = 1 + Math.floor(rng() * MAX_HOUSE_NUMBER);
  const segments = buildSegments(shape, { rng, ...locality, street, houseNumber });
  const leafBase = naming === 'neutral' ? NEUTRAL_LEAF_NUMBER_BASE : LEAF_NUMBER_BASE;
  const leaf = `IMG_${leafBase + index}`;
  const fileName =
    shape === 'filename_address'
      ? `${street} ${houseNumber + FILENAME_ADDRESS_OFFSET} Detail ${leaf}.jpg`
      : `${leaf}.jpg`;

  // Every Nth file reuses the previous file's body, so dedup is exercised at scale.
  const isDuplicate = index > 0 && index % DUPLICATE_EVERY === 0;
  // `photo_v1` hashes EXIF GPS alongside the bytes, so a duplicate must copy the EXIF too or it
  // is not a duplicate to the pipeline. The predecessor is never itself a duplicate, so this
  // recurses exactly one level.
  const exifCoords = isDuplicate
    ? buildGeneratedScenario(index - 1, seed, naming).exifCoords
    : rng() < EXIF_SHARE
      ? stubCityCoords(locality.city)
      : undefined;

  return {
    id: `G${String(index + 1).padStart(ID_PAD_WIDTH, '0')}`,
    intent: isDuplicate ? `generated:${shape} (duplicate body)` : `generated:${shape}`,
    relativePath: [...segments, fileName].join('/'),
    mimeType: TRACE_PHOTO_MIME,
    exifCoords,
    // Unique per index, except where a duplicate is wanted — so dedup counts stay meaningful
    // at any corpus size instead of colliding by accident.
    contentSeed: CONTENT_SEED_BASE + (isDuplicate ? index - 1 : index),
    sizeBytes: TRACE_PHOTO_SIZE_BYTES,
  };
}

export function buildGeneratedScenarios(
  count: number,
  seed: number,
  naming: GeneratedNaming = 'camera',
): UploadTraceScenario[] {
  return Array.from({ length: count }, (_unused, index) =>
    buildGeneratedScenario(index, seed, naming),
  );
}
