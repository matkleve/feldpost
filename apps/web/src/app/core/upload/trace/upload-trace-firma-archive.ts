/**
 * `firma_at_archive` corpus profile — a construction-company folder tree shaped like a real
 * Wien / Niederösterreich photo archive (path conventions described by the product owner,
 * 2026-09-16). Documented guesses are marked GUESS; recalibrate from a path-only export.
 *
 * Layout:
 *   /{Bundesland}/{PLZ}/{building-or-place}/{IMG_…}
 * Most medias live in the third-level folder. A small share drops randomly under PLZ or
 * Bundesland. Building folders mix street+number, units, letters, full-address strings,
 * landmarks, and Windows-style " (1)" / " (2)" near-duplicates of the same place.
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
 * GUESS: medias per building folder — mostly 10–50, occasional 100+.
 * Cycle sum keeps index→folder mapping O(pattern) and deterministic.
 */
export const FIRMA_FOLDER_SIZE_PATTERN: readonly number[] = [
  18, 32, 45, 12, 50, 28, 22, 38, 15, 42, 110, 25, 35, 48, 20, 14,
];

const FIRMA_CYCLE_SUM = FIRMA_FOLDER_SIZE_PATTERN.reduce((sum, size) => sum + size, 0);

/** GUESS: ~5 % of files sit directly under /Bundesland/PLZ/ (no building folder). */
const LOOSE_UNDER_PLZ_EVERY = 20;
/** GUESS: ~2 % sit directly under /Bundesland/. */
const LOOSE_UNDER_BUNDESLAND_EVERY = 50;
/**
 * GUESS: ~20 % of building folders are a near-duplicate of another place
 * (Windows " (1)" copy or a slight spelling/formatting variant).
 */
const NEAR_DUP_EVERY = 5;

function siteForLocation(locationIndex: number): FirmaSite {
  return FIRMA_SITES[locationIndex % FIRMA_SITES.length];
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

function canonicalBuildingName(locationIndex: number, site: FirmaSite): string {
  const streets = streetsFor(site);
  const street = streets[locationIndex % streets.length];
  const houseNumber = 1 + (locationIndex % 80);
  const kind = locationIndex % 10;

  switch (kind) {
    case 0:
    case 1:
    case 2:
    case 3:
      return `${street} ${houseNumber}`;
    case 4:
      return `${street} ${houseNumber}A`;
    case 5:
      return `${street} ${houseNumber}/3/5`;
    case 6:
      return `${site.city} ${site.postcode}, ${street} ${houseNumber}`;
    case 7:
      return LANDMARKS[locationIndex % LANDMARKS.length];
    case 8:
      // Near-duplicate of the "plain street" form with a Windows copy suffix.
      return `${street} ${houseNumber} (${1 + (locationIndex % 3)})`;
    case 9:
    default: {
      // Slight formatting variant of the same place (comma / Str. abbreviation).
      const shortStreet = street.replace('Straße', 'Str').replace('gasse', 'g.');
      return `${shortStreet} ${houseNumber}`;
    }
  }
}

function buildingFolderName(locationIndex: number, site: FirmaSite): string {
  // Near-duplicates are kinds 8–9 inside canonicalBuildingName (~20 % of slots),
  // plus an occasional Windows copy of the previous place.
  if (locationIndex > 0 && locationIndex % NEAR_DUP_EVERY === 3) {
    const base = canonicalBuildingName(locationIndex - 1, siteForLocation(locationIndex - 1));
    const stripped = base.replace(/\s\(\d+\)$/, '');
    return `${stripped} (${1 + (locationIndex % 4)})`;
  }
  return canonicalBuildingName(locationIndex, site);
}

/**
 * Place file `fileIndex` into the firma archive tree. `seed` is accepted for API symmetry with
 * the adversarial generator; packing itself is index-deterministic.
 */
export function placeFirmaArchiveFile(fileIndex: number, _seed: number): FirmaArchivePlacement {
  const { locationIndex } = firmaLocationForFileIndex(fileIndex);
  const site = siteForLocation(locationIndex);

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

  const building = buildingFolderName(locationIndex, site);
  return {
    segments: [site.bundesland, site.postcode, building],
    city: site.city,
    shapeLabel: 'firma_at_archive:building',
  };
}
