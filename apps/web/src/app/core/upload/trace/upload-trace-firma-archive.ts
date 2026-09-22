/**
 * `firma_at_archive` corpus profile — a construction-company folder tree shaped like a real
 * Wien / Niederösterreich photo archive (path conventions described by the product owner,
 * 2026-09-16). Documented guesses are marked GUESS; recalibrate from a path-only export.
 *
 * Layout:
 *   /{Bundesland}/{PLZ}/{building-or-place}/{IMG_…}
 * Most medias live in the third-level folder. A small share drops randomly under PLZ or
 * Bundesland, and some places have no PLZ folder at all — the owner described street-named
 * folders sitting directly inside a Bundesland folder.
 *
 * Building folders carry the owner's spellings: `Wasagasse 56`, `Kirchengasse 8A`, nested unit
 * folders (`Lange Gasse 6/3/5` — Windows cannot hold `/` in one name, so those are real nested
 * folders), the abbreviation (`Lerchenfelder Str 6`), full addresses, and landmarks.
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
 * Owner: inside a Bundesland folder there are "random files or folders too with streetnames".
 * Such a folder skips the PLZ level, so the postcode is never in the path.
 * GUESS: every 9th place (~11 %).
 */
const PLACE_WITHOUT_POSTCODE_EVERY = 9;

function placeSkipsPostcode(placeIndex: number): boolean {
  return placeIndex % PLACE_WITHOUT_POSTCODE_EVERY === 4;
}

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

/**
 * Second spelling of the same place, as field archives actually contain them.
 *
 * Two classes, and the corpus carries both on purpose:
 *  - `ß`/`ss` — one street written two ways. The grouping key folds it, so these merge.
 *  - a dropped letter — a real typo. Nothing folds it, so it stays its own group. A corpus that
 *    only contained variants the pipeline can merge would measure the fix, not the archive.
 */
export function spellingVariantStreetName(street: string): string {
  if (street.includes('straße')) {
    return street.replace('straße', 'strasse');
  }
  if (street.includes('Straße')) {
    return street.replace('Straße', 'Strasse');
  }
  if (street.includes('gasse')) {
    return street.replace('gasse', 'gase');
  }
  if (street.includes('Gasse')) {
    return street.replace('Gasse', 'Gase');
  }
  if (street.length > 3) {
    return `${street.slice(0, 3)}${street.slice(4)}`;
  }
  return `${street}x`;
}

/**
 * Windows appends `(N)` to the folder that was copied. When the address folder has nested unit
 * folders below it (`Lange Gasse 6/3/5`), copying the address copies the subtree, so the suffix
 * lands on the first segment and the ones below keep their names.
 */
function withCopySuffix(baseName: string, copyIndex: number): string {
  if (copyIndex === 0) {
    return baseName;
  }
  const [head, ...rest] = baseName.split('/');
  return [`${head} (${copyIndex})`, ...rest].join('/');
}

/**
 * Owner wrote `Lerchenfelder Str 173`: the abbreviation appears in real folder names. It keeps the
 * case of the word it replaces, so `Hauptstraße` shortens to `Hauptstr`, not `HauptStr`.
 */
function abbreviateStrasse(street: string): string {
  return street.replace(/stra(?:ß|ss)e$/iu, (match) =>
    match[0] === match[0].toUpperCase() ? 'Str' : 'str',
  );
}

/**
 * Base label for a logical place (no Windows copy suffix yet). `/` means nested folders.
 * Kind rotates: plain street, letter, nested units, full address, landmark, abbreviated street.
 */
function placeBaseName(placeIndex: number, site: FirmaSite, spelling: 'canonical' | 'typo'): string {
  const streets = streetsFor(site);
  const streetRaw = streets[placeIndex % streets.length];
  const street = spelling === 'typo' ? spellingVariantStreetName(streetRaw) : streetRaw;
  const houseNumber = 1 + (placeIndex % 80);
  const kind = placeIndex % 6;

  switch (kind) {
    case 0:
      return `${street} ${houseNumber}`;
    case 1:
      return `${street} ${houseNumber}A`;
    case 2:
      // Owner wrote `Lange Gasse 6/3/5`. A Windows folder name cannot hold `/`, so the unit parts
      // are nested folders — which is what `collapseAtSlashPathSegments` reassembles.
      return `${street} ${houseNumber}/3/5`;
    case 3:
      return spelling === 'typo'
        ? `${site.city} ${site.postcode} ${street} ${houseNumber}`
        : `${site.city} ${site.postcode}, ${abbreviateStrasse(streetRaw)} ${houseNumber}`;
    case 4: {
      const landmark = LANDMARKS[placeIndex % LANDMARKS.length];
      return spelling === 'typo' ? spellingVariantStreetName(landmark) : landmark;
    }
    case 5:
    default: {
      // Only a `Straße` name can carry the abbreviation, and index arithmetic alone kept landing
      // on `…gasse` streets — so pick from the Straße pool explicitly. The second spelling is the
      // written-out form: abbreviating both would produce two chains with identical folder names.
      const strasseStreets = streets.filter((name) => /straße/iu.test(name));
      const strasseRaw = strasseStreets[placeIndex % strasseStreets.length];
      return spelling === 'typo'
        ? `${spellingVariantStreetName(strasseRaw)} ${houseNumber}`
        : `${abbreviateStrasse(strasseRaw)} ${houseNumber}`;
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
  // A `/` in the building name is a nested unit folder, not one folder with a slash in it.
  const buildingSegments = building.split('/');

  if (placeSkipsPostcode(placeIndex)) {
    return {
      segments: [site.bundesland, ...buildingSegments],
      city: site.city,
      shapeLabel: `firma_at_archive:street_under_bundesland:${spelling}:copy${copyIndex}`,
    };
  }

  return {
    segments: [site.bundesland, site.postcode, ...buildingSegments],
    city: site.city,
    shapeLabel: `firma_at_archive:building:${spelling}:copy${copyIndex}`,
  };
}
