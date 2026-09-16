/**
 * Deterministic scale-up corpus for the upload pipeline trace harness.
 *
 * `buildGeneratedScenario(index, seed)` is **index-addressable**: scenario 900_000 can be built
 * without building the 899_999 before it, and it is always the same path for a given seed. That
 * is what lets the scale tier stream a million paths without materialising them.
 * `buildGeneratedScenarios(count, seed)` is the array form for ordinary runs.
 *
 * **Profiles** model how companies actually lay out folders. The historical default
 * (`adversarial`) draws a random shape per file and averages ~1 file per address — that
 * maximises tray surface for defect hunting, but it overstates tray volume for a typical
 * archive where ~30 medias share one `/City/PLZ/` (or street) folder.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Corpus profiles
 */

import { TRACE_PHOTO_MIME, TRACE_PHOTO_SIZE_BYTES, type UploadTraceScenario } from './upload-trace-fixtures';
import { stubCityCoords } from './upload-trace-geocoder.stub';
import { placeFirmaArchiveFile } from './upload-trace-firma-archive';

/**
 * Localities that exist in the shipped `at-plz.json` stub (21 rows). Company-area uniqueness
 * therefore caps at 21 distinct City/PLZ groups unless a street segment is added.
 */
const AREA_LOCALITIES: readonly { city: string; postcode: string }[] = [
  { city: 'Wien', postcode: '1010' },
  { city: 'Wien', postcode: '1020' },
  { city: 'Wien', postcode: '1030' },
  { city: 'Wien', postcode: '1040' },
  { city: 'Wien', postcode: '1050' },
  { city: 'Wien', postcode: '1060' },
  { city: 'Wien', postcode: '1070' },
  { city: 'Wien', postcode: '1080' },
  { city: 'Wien', postcode: '1090' },
  { city: 'Wiener Neustadt', postcode: '2700' },
  { city: 'St. Pölten', postcode: '3100' },
  { city: 'Krems an der Donau', postcode: '3500' },
  { city: 'Linz', postcode: '4020' },
  { city: 'Steyr', postcode: '4400' },
  { city: 'Gmunden', postcode: '4810' },
  { city: 'Salzburg', postcode: '5020' },
  { city: 'Innsbruck', postcode: '6020' },
  { city: 'Bregenz', postcode: '6900' },
  { city: 'Graz', postcode: '8010' },
  { city: 'Klagenfurt', postcode: '9020' },
  { city: 'Villach', postcode: '9500' },
];

/** Smaller set used by the adversarial mixer (curated-corpus parity). */
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

/** Folder shapes the adversarial generator picks from — the "different names" part of the corpus. */
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

/**
 * How the generated corpus packs files into folders.
 *
 * - `adversarial` — random shape per file (~1 file/address). Defect hunting / worst-case trays.
 * - `company_area` — `/City/PLZ/` with N files per folder. Typical construction archive.
 * - `company_street` — `/City/PLZ/Street N/` with N files per folder. Address-complete folders.
 * - `flat` — one dump folder, no address. USB / camera roll import.
 * - `shallow_many` — many City/PLZ folders, few files each (sparse tree).
 * - `mixed` — 70 % area-dense, 20 % street-dense, 10 % noise locations.
 * - `firma_at_archive` — Wien/NÖ bundesland → PLZ → building-folder tree (owner-described).
 */
export type CorpusProfile =
  | 'adversarial'
  | 'company_area'
  | 'company_street'
  | 'flat'
  | 'shallow_many'
  | 'mixed'
  | 'firma_at_archive';

export const CORPUS_PROFILES: readonly CorpusProfile[] = [
  'adversarial',
  'company_area',
  'company_street',
  'flat',
  'shallow_many',
  'mixed',
  'firma_at_archive',
] as const;

/** Default medias per location — matches the company layout described in STUDY-005 follow-ups. */
export const DEFAULT_FILES_PER_LOCATION = 30;
/** Sparse tree: a handful of files per City/PLZ. */
export const SHALLOW_FILES_PER_LOCATION = 3;

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

function buildAdversarialSegments(shape: GeneratedShape, input: ShapeInput): string[] {
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
 * `camera` reproduces what cameras actually write (`IMG_2001.jpg`), whose 4-digit number the
 * parser reads as a postcode. `neutral` keeps everything else identical but uses a 6-digit
 * number, so the two can be compared.
 */
export type GeneratedNaming = 'camera' | 'neutral';

export interface CorpusGenerateOptions {
  naming?: GeneratedNaming;
  profile?: CorpusProfile;
  /**
   * Files that share one location folder. Default 30 for dense company profiles; `shallow_many`
   * defaults to 3 when this is omitted.
   */
  filesPerLocation?: number;
}

function resolveFilesPerLocation(profile: CorpusProfile, override?: number): number {
  if (override !== undefined && override > 0) {
    return override;
  }
  return profile === 'shallow_many' ? SHALLOW_FILES_PER_LOCATION : DEFAULT_FILES_PER_LOCATION;
}

function localityForIndex(locationIndex: number): { city: string; postcode: string } {
  return AREA_LOCALITIES[locationIndex % AREA_LOCALITIES.length];
}

function streetForLocation(locationIndex: number): { street: string; houseNumber: number } {
  return {
    street: STREETS[locationIndex % STREETS.length],
    houseNumber: 1 + (locationIndex % MAX_HOUSE_NUMBER),
  };
}

type DenseKind = 'area' | 'street' | 'noise';

function denseKindForProfile(profile: CorpusProfile, locationIndex: number): DenseKind {
  if (profile === 'company_area') {
    return 'area';
  }
  if (profile === 'company_street' || profile === 'shallow_many') {
    return profile === 'shallow_many' ? 'area' : 'street';
  }
  if (profile === 'flat') {
    return 'noise';
  }
  // mixed: 7 area / 2 street / 1 noise per 10 locations
  const bucket = locationIndex % 10;
  if (bucket < 7) {
    return 'area';
  }
  if (bucket < 9) {
    return 'street';
  }
  return 'noise';
}

function buildProfileSegments(
  profile: CorpusProfile,
  locationIndex: number,
  filesPerLocation: number,
): { segments: string[]; shapeLabel: string; city: string } {
  if (profile === 'flat') {
    return { segments: ['Rohdaten'], shapeLabel: 'flat', city: 'Wien' };
  }

  const kind = denseKindForProfile(profile, locationIndex);
  const locality = localityForIndex(locationIndex);
  if (kind === 'noise') {
    return {
      segments: [NOISE_FOLDERS[locationIndex % NOISE_FOLDERS.length], `Export ${locationIndex}`],
      shapeLabel: 'no_address',
      city: locality.city,
    };
  }
  if (kind === 'area') {
    return {
      segments: [locality.city, locality.postcode],
      shapeLabel: `company_area@${filesPerLocation}`,
      city: locality.city,
    };
  }
  const { street, houseNumber } = streetForLocation(locationIndex);
  return {
    segments: [locality.city, locality.postcode, `${street} ${houseNumber}`],
    shapeLabel: `company_street@${filesPerLocation}`,
    city: locality.city,
  };
}

/**
 * Build scenario `index` (0-based) for `seed`, independent of every other index.
 *
 * Every leaf carries `IMG_<index>` so file names stay unique across the corpus — the flat
 * multi-file run identifies jobs by file name alone.
 */
export function buildGeneratedScenario(
  index: number,
  seed: number,
  options: CorpusGenerateOptions | GeneratedNaming = {},
): UploadTraceScenario {
  const opts: CorpusGenerateOptions =
    typeof options === 'string' ? { naming: options } : (options ?? {});
  const naming: GeneratedNaming = opts.naming ?? 'camera';
  const profile: CorpusProfile = opts.profile ?? 'adversarial';
  const filesPerLocation = resolveFilesPerLocation(profile, opts.filesPerLocation);

  const rng = createRandom((seed + index * INDEX_SEED_STRIDE) >>> 0);
  let segments: string[];
  let shapeLabel: string;
  let localityCity: string;
  let fileNameStreet: string | undefined;
  let fileNameHouse: number | undefined;

  if (profile === 'adversarial') {
    const shape = pick(rng, SHAPES);
    const locality = pick(rng, LOCALITIES);
    const street = pick(rng, STREETS);
    const houseNumber = 1 + Math.floor(rng() * MAX_HOUSE_NUMBER);
    segments = buildAdversarialSegments(shape, { rng, ...locality, street, houseNumber });
    shapeLabel = shape;
    localityCity = locality.city;
    if (shape === 'filename_address') {
      fileNameStreet = street;
      fileNameHouse = houseNumber + FILENAME_ADDRESS_OFFSET;
    }
  } else if (profile === 'firma_at_archive') {
    const placed = placeFirmaArchiveFile(index, seed);
    segments = placed.segments;
    shapeLabel = placed.shapeLabel;
    localityCity = placed.city;
  } else {
    const locationIndex = profile === 'flat' ? 0 : Math.floor(index / filesPerLocation);
    const built = buildProfileSegments(profile, locationIndex, filesPerLocation);
    segments = built.segments;
    shapeLabel = built.shapeLabel;
    localityCity = built.city;
  }

  const leafBase = naming === 'neutral' ? NEUTRAL_LEAF_NUMBER_BASE : LEAF_NUMBER_BASE;
  const leaf = `IMG_${leafBase + index}`;
  const fileName =
    fileNameStreet !== undefined && fileNameHouse !== undefined
      ? `${fileNameStreet} ${fileNameHouse} Detail ${leaf}.jpg`
      : `${leaf}.jpg`;

  // Every Nth file reuses the previous file's body, so dedup is exercised at scale.
  const isDuplicate = index > 0 && index % DUPLICATE_EVERY === 0;
  // `photo_v1` hashes EXIF GPS alongside the bytes, so a duplicate must copy the EXIF too or it
  // is not a duplicate to the pipeline. The predecessor is never itself a duplicate, so this
  // recurses exactly one level.
  const exifCoords = isDuplicate
    ? buildGeneratedScenario(index - 1, seed, opts).exifCoords
    : rng() < EXIF_SHARE
      ? stubCityCoords(localityCity)
      : undefined;

  return {
    id: `G${String(index + 1).padStart(ID_PAD_WIDTH, '0')}`,
    intent: isDuplicate ? `generated:${shapeLabel} (duplicate body)` : `generated:${shapeLabel}`,
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
  options: CorpusGenerateOptions | GeneratedNaming = {},
): UploadTraceScenario[] {
  const opts: CorpusGenerateOptions =
    typeof options === 'string' ? { naming: options } : (options ?? {});
  return Array.from({ length: count }, (_unused, index) =>
    buildGeneratedScenario(index, seed, opts),
  );
}
