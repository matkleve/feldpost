/**
 * `firma_at_archive` packing contracts.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Corpus profiles
 */
import { describe, expect, it } from 'vitest';
import {
  FIRMA_FOLDER_SIZE_PATTERN,
  firmaLocationForFileIndex,
  placeFirmaArchiveFile,
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

  it('puts most medias under Bundesland/PLZ/building (third level)', () => {
    const scenarios = buildGeneratedScenarios(THOUSAND, SEED, { profile: 'firma_at_archive' });
    let thirdLevel = 0;
    let loosePlz = 0;
    let looseBundesland = 0;
    for (const scenario of scenarios) {
      const depth = scenario.relativePath.split('/').length;
      if (depth === 4) {
        thirdLevel += 1;
      } else if (depth === 3) {
        loosePlz += 1;
      } else if (depth === 2) {
        looseBundesland += 1;
      }
    }
    expect(thirdLevel).toBeGreaterThan(THOUSAND * 0.85);
    expect(loosePlz).toBeGreaterThan(0);
    expect(looseBundesland).toBeGreaterThan(0);
  });

  it('only uses Wien and Niederösterreich as bundesland roots', () => {
    const scenarios = buildGeneratedScenarios(500, SEED, { profile: 'firma_at_archive' });
    const roots = new Set(scenarios.map((scenario) => scenario.relativePath.split('/')[0]));
    expect([...roots].sort()).toEqual(['Niederösterreich', 'Wien']);
  });

  it('emits Windows-style copy suffixes and unit/letter building names', () => {
    const names = new Set<string>();
    for (let index = 0; index < 400; index += 1) {
      const placed = placeFirmaArchiveFile(index, SEED);
      if (placed.segments.length >= 3) {
        names.add(placed.segments[2]);
      }
    }
    const joined = [...names].join('\n');
    expect(joined).toMatch(/\(\d+\)/);
    expect(joined).toMatch(/\/\d+\/\d+/);
    expect(joined).toMatch(/\dA\b/);
  });

  it('varies folder sizes across the 10–50 band and includes a 100+ folder', () => {
    expect(Math.min(...FIRMA_FOLDER_SIZE_PATTERN)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...FIRMA_FOLDER_SIZE_PATTERN)).toBeGreaterThanOrEqual(100);
    const mid = FIRMA_FOLDER_SIZE_PATTERN.filter((size) => size >= 10 && size <= 50);
    expect(mid.length).toBeGreaterThan(FIRMA_FOLDER_SIZE_PATTERN.length / 2);
  });
});
