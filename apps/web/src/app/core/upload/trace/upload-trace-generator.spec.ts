/**
 * Corpus profile packing contracts for the upload trace generator.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Corpus profiles
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILES_PER_LOCATION,
  SHALLOW_FILES_PER_LOCATION,
  buildGeneratedScenario,
  buildGeneratedScenarios,
} from './upload-trace-generator';

const SEED = 7;
const THOUSAND = 1000;

describe('upload-trace-generator corpus profiles', () => {
  it('adversarial keeps ~1-file groups (defect-hunting density)', () => {
    const scenarios = buildGeneratedScenarios(THOUSAND, SEED, { profile: 'adversarial' });
    const folders = new Set(
      scenarios.map((scenario) => scenario.relativePath.split('/').slice(0, -1).join('/')),
    );
    // Random shapes rarely collide — expect hundreds of distinct folders.
    expect(folders.size).toBeGreaterThan(THOUSAND / 3);
  });

  it('company_area packs medias under City/PLZ and merges when PLZ stub wraps', () => {
    const scenarios = buildGeneratedScenarios(THOUSAND, SEED, {
      profile: 'company_area',
      filesPerLocation: DEFAULT_FILES_PER_LOCATION,
    });
    const first = scenarios[0].relativePath.split('/');
    expect(first[0]).toBe('Wien');
    expect(first[1]).toBe('1010');
    expect(first[2]).toMatch(/^IMG_/);

    const folders = new Map<string, number>();
    for (const scenario of scenarios) {
      const folder = scenario.relativePath.split('/').slice(0, -1).join('/');
      folders.set(folder, (folders.get(folder) ?? 0) + 1);
    }
    // 21 PLZ rows in the stub → at most 21 City/PLZ folders. Extra location slots merge
    // into the same place (same Wien/1020 is one group — correct product behaviour).
    expect(folders.size).toBe(21);
    const sizes = [...folders.values()];
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(DEFAULT_FILES_PER_LOCATION);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(DEFAULT_FILES_PER_LOCATION * 2);
  });

  it('company_street packs medias under City/PLZ/Street N', () => {
    const scenario = buildGeneratedScenario(0, SEED, {
      profile: 'company_street',
      filesPerLocation: DEFAULT_FILES_PER_LOCATION,
    });
    const parts = scenario.relativePath.split('/');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('Wien');
    expect(parts[1]).toBe('1010');
    expect(parts[2]).toMatch(/\d+$/);
    expect(parts[3]).toMatch(/^IMG_/);
  });

  it('flat dumps everything into one Rohdaten folder', () => {
    const scenarios = buildGeneratedScenarios(90, SEED, { profile: 'flat' });
    const folders = new Set(
      scenarios.map((scenario) => scenario.relativePath.split('/').slice(0, -1).join('/')),
    );
    expect([...folders]).toEqual(['Rohdaten']);
  });

  it('shallow_many uses few files per City/PLZ (merge on PLZ wrap)', () => {
    const count = 60; // 20 locations × 3 — stays within the 21-PLZ stub, no wrap
    const scenarios = buildGeneratedScenarios(count, SEED, { profile: 'shallow_many' });
    const folders = new Map<string, number>();
    for (const scenario of scenarios) {
      const folder = scenario.relativePath.split('/').slice(0, -1).join('/');
      folders.set(folder, (folders.get(folder) ?? 0) + 1);
    }
    expect(Math.max(...folders.values())).toBe(SHALLOW_FILES_PER_LOCATION);
    expect(folders.size).toBe(Math.ceil(count / SHALLOW_FILES_PER_LOCATION));
  });

  it('index-addressable: scenario N equals buildGeneratedScenarios()[N]', () => {
    const batch = buildGeneratedScenarios(40, SEED, {
      profile: 'company_area',
      filesPerLocation: 10,
    });
    expect(buildGeneratedScenario(37, SEED, { profile: 'company_area', filesPerLocation: 10 })).toEqual(
      batch[37],
    );
  });
});
