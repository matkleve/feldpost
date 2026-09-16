/**
 * `firma_at_archive` packing contracts — including Windows increment + typo chains.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Corpus profiles
 */
import { describe, expect, it } from 'vitest';
import {
  FIRMA_COPIES_PER_SPELLING,
  FIRMA_FOLDER_SIZE_PATTERN,
  FIRMA_FOLDERS_PER_PLACE,
  buildingFolderName,
  firmaLocationForFileIndex,
  placeFirmaArchiveFile,
  spellingVariantStreetName,
} from './upload-trace-firma-archive';
import { buildGeneratedScenarios } from './upload-trace-generator';

const SEED = 7;
const THOUSAND = 1000;

describe('upload-trace-firma-archive', () => {
  it('maps file indices through the size pattern without gaps or overlaps', () => {
    const cycleSum = FIRMA_FOLDER_SIZE_PATTERN.reduce((sum, size) => sum + size, 0);
    const seen = new Set<string>();
    for (let index = 0; index < cycleSum; index += 1) {
      const placed = firmaLocationForFileIndex(index);
      const key = `${placed.locationIndex}:${placed.offsetInFolder}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(placed.offsetInFolder).toBeLessThan(placed.folderSize);
    }
    expect(seen.size).toBe(cycleSum);
  });

  it('puts most medias under Bundesland/PLZ/building, with loose files at both levels', () => {
    const scenarios = buildGeneratedScenarios(THOUSAND, SEED, { profile: 'firma_at_archive' });
    let building = 0;
    let loosePlz = 0;
    let looseBundesland = 0;
    for (const scenario of scenarios) {
      const segments = scenario.relativePath.split('/');
      if (segments.length > 3 && /^\d{4}$/.test(segments[1])) {
        building += 1;
      } else if (segments.length === 3) {
        loosePlz += 1;
      } else if (segments.length === 2) {
        looseBundesland += 1;
      }
    }
    expect(building).toBeGreaterThan(THOUSAND * 0.7);
    expect(loosePlz).toBeGreaterThan(0);
    expect(looseBundesland).toBeGreaterThan(0);
  });

  // Owner: inside a Bundesland folder there are "folders too with streetnames". No postcode is
  // in that path, so the classifier has to reach the locality from the street alone.
  it('puts some places directly under the Bundesland, with no postcode folder', () => {
    const scenarios = buildGeneratedScenarios(THOUSAND, SEED, { profile: 'firma_at_archive' });
    const noPostcode = scenarios.filter((scenario) => {
      const segments = scenario.relativePath.split('/');
      return segments.length > 2 && !/^\d{4}$/.test(segments[1]);
    });

    expect(noPostcode.length).toBeGreaterThan(THOUSAND * 0.05);
  });

  // Owner: "Lange Gasse 6/3/5". Windows cannot hold `/` in one folder name, so the unit parts are
  // nested folders — the shape `collapseAtSlashPathSegments` exists to reassemble.
  it('emits nested unit folders under an address folder', () => {
    const scenarios = buildGeneratedScenarios(THOUSAND, SEED, { profile: 'firma_at_archive' });

    expect(scenarios.some((scenario) => /\s\d+(?:\s\(\d+\))?\/3\/5\//u.test(scenario.relativePath)))
      .toBe(true);
  });

  // Owner: "Lerchenfelder Str 173". The abbreviation is the other half of what the key folds.
  it('emits the Str abbreviation alongside the written-out Straße', () => {
    const scenarios = buildGeneratedScenarios(THOUSAND, SEED, { profile: 'firma_at_archive' });
    const paths = scenarios.map((scenario) => scenario.relativePath).join('\n');

    expect(paths).toMatch(/\bStr \d/u);
    expect(paths).toMatch(/Straße \d/u);
  });

  it('only uses Wien and Niederösterreich as bundesland roots', () => {
    const scenarios = buildGeneratedScenarios(500, SEED, { profile: 'firma_at_archive' });
    const roots = new Set(scenarios.map((scenario) => scenario.relativePath.split('/')[0]));
    expect([...roots].sort()).toEqual(['Niederösterreich', 'Wien']);
  });

  it('emits a Windows increment chain and a typo chain that restarts the counter', () => {
    // Place 0 occupies locationIndex 0..5 → Wasagasse 1, (1), (2), Wasagase 1, (1), (2)
    const chain = Array.from({ length: FIRMA_FOLDERS_PER_PLACE }, (_unused, slot) =>
      buildingFolderName(slot),
    );
    expect(chain[0]).toBe('Wasagasse 1');
    expect(chain[1]).toBe('Wasagasse 1 (1)');
    expect(chain[2]).toBe('Wasagasse 1 (2)');
    expect(chain[3]).toBe('Wasagase 1');
    expect(chain[4]).toBe('Wasagase 1 (1)');
    expect(chain[5]).toBe('Wasagase 1 (2)');
    expect(spellingVariantStreetName('Wasagasse')).toBe('Wasagase');
    expect(FIRMA_COPIES_PER_SPELLING).toBe(3);
  });

  // The ß/ss pair is the variant the grouping key folds; the corpus must contain it, otherwise
  // the fold is never exercised by a trace run.
  it('models the ß/ss pair on Straße names', () => {
    expect(spellingVariantStreetName('Mariahilfer Straße')).toBe('Mariahilfer Strasse');
    expect(spellingVariantStreetName('Landstraße')).toBe('Landstrasse');
  });

  it('also emits unit and letter building forms somewhere in the tree', () => {
    const names = Array.from({ length: 60 }, (_unused, locationIndex) =>
      buildingFolderName(locationIndex),
    ).join('\n');
    expect(names).toMatch(/\d\/3\/5/);
    expect(names).toMatch(/\dA\b/);
  });

  // A copied address folder takes the suffix with it; the unit folders below keep their names.
  it('puts the copy suffix on the address folder, not on the nested unit folder', () => {
    const withUnits = Array.from({ length: 60 }, (_unused, locationIndex) =>
      buildingFolderName(locationIndex),
    ).filter((name) => name.includes('/3/5'));

    expect(withUnits.some((name) => /\(\d\)\/3\/5$/u.test(name))).toBe(true);
    expect(withUnits.every((name) => !/\/5 \(\d\)$/u.test(name))).toBe(true);
  });

  it('varies folder sizes across the 10–50 band and includes a 100+ folder', () => {
    expect(Math.min(...FIRMA_FOLDER_SIZE_PATTERN)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...FIRMA_FOLDER_SIZE_PATTERN)).toBeGreaterThanOrEqual(100);
    const mid = FIRMA_FOLDER_SIZE_PATTERN.filter((size) => size >= 10 && size <= 50);
    expect(mid.length).toBeGreaterThan(FIRMA_FOLDER_SIZE_PATTERN.length / 2);
  });

  it('labels building placements with spelling + copy slot', () => {
    const placed = placeFirmaArchiveFile(0, SEED);
    expect(placed.shapeLabel).toContain('canonical:copy0');
    expect(placed.segments[2]).toBe('Wasagasse 1');
  });
});
