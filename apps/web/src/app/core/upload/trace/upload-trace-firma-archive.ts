/**
 * `firma_at_archive` corpus profile — a construction-company folder tree shaped like a real
 * Wien / Niederösterreich photo archive (path conventions described by the product owner,
 * 2026-09-16). Documented guesses are marked GUESS; recalibrate from a path-only export.
 *
 * Layout:
 *   /{Bundesland}/{PLZ}/{building-or-place}/{IMG_…}
 * Most medias live in the third-level folder. A small share drops randomly under PLZ or
 * Bundesland.
 *
 * **Increment chains (owner clarification):** one logical address often appears as
 *   Wasagasse 4 / Wasagasse 4 (1) / Wasagasse 4 (2) / …
 * and again under a spelling variant that restarts the counter:
 *   Wasagase 4 / Wasagase 4 (1) / Wasagase 4 (2) / …
 * Those are separate folders today → separate groups / questions.
 *
 * Folder sizes cycle through a fixed pattern (mostly 10–50, occasional 100+) so the generator
 * stays index-addressable at company scale.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Corpus profiles
 */

export interface FirmaArchivePlacement {
  segments: string[];
  /** City token used for optional stub EXIF coords. */
  city: string;
  shapeLabel: string;
}

interface FirmaSite {
  bundesland: 'Wien' | 'Niederösterreich';
  postcode: string;
  /** City for gazetteer/EXIF — Wien districts use Wien; NÖ uses the PLZ city. */
  city: string;
}

/** Wien + NÖ only — owner: "just those mostly". PLZs must exist in `at-plz.json`. */
const FIRMA_SITES: readonly FirmaSite[] = [
  { bundesland: 'Wien', postcode: '1010', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1020', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1030', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1040', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1050', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1060', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1070', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1080', city: 'Wien' },
  { bundesland: 'Wien', postcode: '1090', city: 'Wien' },
  { bundesland: 'Niederösterreich', postcode: '2700', city: 'Wiener Neustadt' },
  { bundesland: 'Niederösterreich', postcode: '3100', city: 'St. Pölten' },
  { bundesland: 'Niederösterreich', postcode: '3500', city: 'Krems an der Donau' },
];

const WIEN_STREETS: readonly string[] = [
  'Wasagasse',
  'Lange Gasse',
  'Lerchenfelder Straße',
  'Währinger Straße',
  'Mariahilfer Straße',
  'Neubaugasse',
  'Josefstädter Straße',
  'Alser Straße',
];

const NOE_STREETS: readonly string[] = [
  'Hauptstraße',
  'Wiener Straße',
  'Bahnhofstraße',
  'Kirchengasse',
];

const LANDMARKS: readonly string[] = [
  'Stephansplatz',
  'Karlsplatz',
  'Praterstern',
  'Westbahnhof',
];

/**
 * GUESS: medias per building folder — mostly 10–25 (so 1 000 files cover many places
 * including NÖ), occasional ~50, rare 100+.
 */
export const FIRMA_FOLDER_SIZE_PATTERN: readonly number[] = [
  12, 18, 10, 22, 15, 14, 20, 11, 25, 16, 100, 13, 19, 17, 12, 50,
];

const FIRMA_CYCLE_SUM = FIRMA_FOLDER_SIZE_PATTERN.reduce((sum, size) => sum + size, 0);

/** GUESS: ~5 % of files sit directly under /Bundesland/PLZ/ (no building folder). */
const LOOSE_UNDER_PLZ_EVERY = 20;
/** GUESS: ~2 % sit directly under /Bundesland/. */
const LOOSE_UNDER_BUNDESLAND_EVERY = 50;

/**
 * Per logical place: canonical spelling gets bare + (1) + (2), then a typo spelling restarts
 * the same increment series. 3 × 2 = 6 folders that a human would merge into one address.
 */
export const FIRMA_COPIES_PER_SPELLING = 3;
export const FIRMA_SPELLINGS_PER_PLACE = 2;
export const FIRMA_FOLDERS_PER_PLACE = FIRMA_COPIES_PER_SPELLING * FIRMA_SPELLINGS_PER_PLACE;

const WIEN_SITES: readonly FirmaSite[] = FIRMA_SITES.filter(
  (site) => site.bundesland === 'Wien',
);
const NOE_SITES: readonly FirmaSite[] = FIRMA_SITES.filter(
  (site) => site.bundesland === 'Niederösterreich',
);

/**
 * GUESS: ~75 % Wien / ~25 % NÖ places (owner: "just those mostly").
 * Interleave so small corpora still hit both bundesländer.
 */
function siteForPlace(placeIndex: number): FirmaSite {
  if (placeIndex % 4 === 3) {
    return NOE_SITES[Math.floor(placeIndex / 4) % NOE_SITES.length];
  }
  return WIEN_SITES[placeIndex % WIEN_SITES.length];
}

function streetsFor(site: FirmaSite): readonly string[] {
  return site.bundesland === 'Wien' ? WIEN_STREETS : NOE_STREETS;
}

/** Map a file index to (locationIndex, offset) using the cycling size pattern. */
export function firmaLocationForFileIndex(fileIndex: number): {
  locationIndex: number;
  offsetInFolder: number;
  folderSize: number;
} {
  const cycle = Math.floor(fileIndex / FIRMA_CYCLE_SUM);
  let within = fileIndex % FIRMA_CYCLE_SUM;
  for (let slot = 0; slot < FIRMA_FOLDER_SIZE_PATTERN.length; slot += 1) {
    const folderSize = FIRMA_FOLDER_SIZE_PATTERN[slot];
    if (within < folderSize) {
      return {
        locationIndex: cycle * FIRMA_FOLDER_SIZE_PATTERN.length + slot,
        offsetInFolder: within,
        folderSize,
      };
    }
    within -= folderSize;
  }
  // Unreachable — within is always < cycle sum.
  return { locationIndex: 0, offsetInFolder: 0, folderSize: FIRMA_FOLDER_SIZE_PATTERN[0] };
}

/** Drop a letter / ascii-swap so the typo series is visibly the same place, wrong spelling. */
export function typoStreetName(street: string): string {
  if (street.includes('gasse')) {
    return street.replace('gasse', 'gase');
  }
  if (street.includes('Gasse')) {
    return street.replace('Gasse', 'Gase');
  }
  if (street.includes('straße')) {
    return street.replace('straße', 'strasse');
  }
  if (street.includes('Straße')) {
    return street.replace('Straße', 'Strase');
  }
  if (street.length > 3) {
    return `${street.slice(0, 3)}${street.slice(4)}`;
  }
  return `${street}x`;
}

function withCopySuffix(baseName: string, copyIndex: number): string {
  return copyIndex === 0 ? baseName : `${baseName} (${copyIndex})`;
}

/**
 * Base label for a logical place (no Windows copy suffix yet).
 * Kind rotates: plain street, letter, units, full address, landmark.
 */
function placeBaseName(placeIndex: number, site: FirmaSite, spelling: 'canonical' | 'typo'): string {
  const streets = streetsFor(site);
  const streetRaw = streets[placeIndex % streets.length];
  const street = spelling === 'typo' ? typoStreetName(streetRaw) : streetRaw;
  const houseNumber = 1 + (placeIndex % 80);
  const kind = placeIndex % 5;

  switch (kind) {
    case 0:
      return `${street} ${houseNumber}`;
    case 1:
      return `${street} ${houseNumber}A`;
    case 2:
      // Windows forbids `/` in folder names — humans write units with dashes.
      return `${street} ${houseNumber}-3-5`;
    case 3:
      return spelling === 'typo'
        ? `${site.city} ${site.postcode} ${street} ${houseNumber}`
        : `${site.city} ${site.postcode}, ${streetRaw} ${houseNumber}`;
    case 4:
    default: {
      const landmark = LANDMARKS[placeIndex % LANDMARKS.length];
      return spelling === 'typo' ? typoStreetName(landmark) : landmark;
    }
  }
}

/**
 * Resolve the third-level folder name for a location slot.
 * locationIndex packs placeIndex × (spelling × copyIncrement).
 */
export function buildingFolderName(locationIndex: number): string {
  const placeIndex = Math.floor(locationIndex / FIRMA_FOLDERS_PER_PLACE);
  const slot = locationIndex % FIRMA_FOLDERS_PER_PLACE;
  const spelling: 'canonical' | 'typo' =
    slot < FIRMA_COPIES_PER_SPELLING ? 'canonical' : 'typo';
  const copyIndex = slot % FIRMA_COPIES_PER_SPELLING;
  const site = siteForPlace(placeIndex);
  return withCopySuffix(placeBaseName(placeIndex, site, spelling), copyIndex);
}

/**
 * Place file `fileIndex` into the firma archive tree. `seed` is accepted for API symmetry with
 * the adversarial generator; packing itself is index-deterministic.
 */
export function placeFirmaArchiveFile(fileIndex: number, _seed: number): FirmaArchivePlacement {
  const { locationIndex } = firmaLocationForFileIndex(fileIndex);
  const placeIndex = Math.floor(locationIndex / FIRMA_FOLDERS_PER_PLACE);
  const site = siteForPlace(placeIndex);

  // Loose files: still keyed off fileIndex so the same index always lands the same way.
  if (fileIndex > 0 && fileIndex % LOOSE_UNDER_BUNDESLAND_EVERY === 0) {
    return {
      segments: [site.bundesland],
      city: site.city,
      shapeLabel: 'firma_at_archive:loose_bundesland',
    };
  }
  if (fileIndex > 0 && fileIndex % LOOSE_UNDER_PLZ_EVERY === 0) {
    return {
      segments: [site.bundesland, site.postcode],
      city: site.city,
      shapeLabel: 'firma_at_archive:loose_plz',
    };
  }

  const building = buildingFolderName(locationIndex);
  const slot = locationIndex % FIRMA_FOLDERS_PER_PLACE;
  const spelling = slot < FIRMA_COPIES_PER_SPELLING ? 'canonical' : 'typo';
  const copyIndex = slot % FIRMA_COPIES_PER_SPELLING;
  return {
    segments: [site.bundesland, site.postcode, building],
    city: site.city,
    shapeLabel: `firma_at_archive:building:${spelling}:copy${copyIndex}`,
  };
}
