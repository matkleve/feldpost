import { describe, expect, it } from 'vitest';
import {
  buildAdminConflictQueryKey,
  buildAdminConflictSignature,
  collapseAdminFlatFields,
  detectAdminLevelConflicts,
  normalizeAdminValue,
} from './upload-address-level-map.helpers';

const municipalities = [
  { n: 'Wien', b: 'Wien', a: [] },
  { n: 'Innsbruck', b: 'Tirol', a: [] },
  { n: 'Salzburg', b: 'Salzburg', a: [] },
];

const postcodeMap = {
  '1090': ['Wien'],
};

describe('detectAdminLevelConflicts', () => {
  it('does not conflict when postcode expands to same city', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        city: [{ level: 2, value: 'Wien', source: 'folder', field: 'city' }],
        postcode: [{ level: 1, value: '1090', source: 'folder', field: 'postcode' }],
      },
      { municipalities, postcodeMap, country: 'AT' },
    );
    expect(conflicts).toHaveLength(0);
  });

  it('conflicts when city is not in declared state (Wien + Innsbruck)', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        state: [{ level: 2, value: 'Wien', source: 'folder', field: 'state' }],
        city: [{ level: 1, value: 'Innsbruck', source: 'folder', field: 'city' }],
      },
      { municipalities, postcodeMap, country: 'AT' },
    );
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].entries.some((e) => normalizeAdminValue(e.value) === 'innsbruck')).toBe(
      true,
    );
  });

  it('allows Salzburg state and city with same name', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        state: [{ level: 2, value: 'Salzburg', source: 'folder', field: 'state' }],
        city: [{ level: 1, value: 'Salzburg', source: 'folder', field: 'city' }],
      },
      { municipalities, postcodeMap, country: 'AT' },
    );
    expect(conflicts).toHaveLength(0);
  });

  it('conflicts when same field has different values at different levels', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        city: [
          { level: 2, value: 'Wien', source: 'folder', field: 'city' },
          { level: 1, value: 'Graz', source: 'folder', field: 'city' },
        ],
      },
      { municipalities, postcodeMap, country: 'AT' },
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field).toBe('city');
    expect(conflicts[0].entries).toHaveLength(2);
  });

  it('skips gazetteer check outside AT (value compare only)', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        state: [{ level: 2, value: 'Bayern', source: 'folder', field: 'state' }],
        city: [{ level: 1, value: 'München', source: 'folder', field: 'city' }],
      },
      { municipalities, postcodeMap, country: 'DE' },
    );
    expect(conflicts).toHaveLength(0);
  });
});

describe('collapseAdminFlatFields', () => {
  it('picks the lowest level entry per admin field', () => {
    const fields = {
      country: null as string | null,
      state: null as string | null,
      postcode: null as string | null,
      city: null as string | null,
    };
    collapseAdminFlatFields(fields, {
      city: [
        { level: 2, value: 'Wien', source: 'folder', field: 'city' },
        { level: 1, value: '1090', source: 'folder', field: 'city' },
      ],
    });
    expect(fields.city).toBe('1090');
  });
});

describe('buildAdminConflictSignature', () => {
  it('builds a stable dedup signature and query key', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        state: [{ level: 2, value: 'Wien', source: 'folder', field: 'state' }],
        city: [{ level: 1, value: 'Innsbruck', source: 'folder', field: 'city' }],
      },
      { municipalities, postcodeMap, country: 'AT' },
    );
    const signature = buildAdminConflictSignature(conflicts);
    expect(signature).toContain('city|');
    expect(buildAdminConflictQueryKey(signature)).toBe(`adminConflict|${signature}`);
  });

  it('produces the same signature regardless of conflict entry order', () => {
    const mapA = {
      state: [{ level: 2, value: 'Wien', source: 'folder', field: 'state' as const }],
      city: [{ level: 1, value: 'Innsbruck', source: 'folder', field: 'city' as const }],
    };
    const mapB = {
      city: [{ level: 1, value: 'Innsbruck', source: 'folder', field: 'city' as const }],
      state: [{ level: 2, value: 'Wien', source: 'folder', field: 'state' as const }],
    };
    const sigA = buildAdminConflictSignature(
      detectAdminLevelConflicts(mapA, { municipalities, postcodeMap, country: 'AT' }),
    );
    const sigB = buildAdminConflictSignature(
      detectAdminLevelConflicts(mapB, { municipalities, postcodeMap, country: 'AT' }),
    );
    expect(sigA).toBe(sigB);
  });
});

describe('normalizeAdminValue', () => {
  it('strips diacritics and normalizes whitespace', () => {
    expect(normalizeAdminValue('  Wörgl  ')).toBe('worgl');
    expect(normalizeAdminValue('Sankt Pölten')).toBe('sankt polten');
  });
});

describe('detectAdminLevelConflicts — edge cases', () => {
  it('conflicts on same field for DE even without gazetteer', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        city: [
          { level: 2, value: 'Berlin', source: 'folder', field: 'city' },
          { level: 1, value: 'Hamburg', source: 'folder', field: 'city' },
        ],
      },
      { municipalities, postcodeMap, country: 'DE' },
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].field).toBe('city');
  });

  it('accepts Wien city inside Wien state via gazetteer', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        state: [{ level: 2, value: 'Wien', source: 'folder', field: 'state' }],
        city: [{ level: 1, value: 'Wien', source: 'folder', field: 'city' }],
      },
      { municipalities, postcodeMap, country: 'AT' },
    );
    expect(conflicts).toHaveLength(0);
  });

  it('deduplicates repeated level entries in conflict output', () => {
    const conflicts = detectAdminLevelConflicts(
      {
        city: [
          { level: 2, value: 'Wien', source: 'folder', field: 'city' },
          { level: 2, value: 'Wien', source: 'folder', field: 'city' },
          { level: 1, value: 'Graz', source: 'folder', field: 'city' },
        ],
      },
      { municipalities, postcodeMap, country: 'AT' },
    );
    expect(conflicts[0].entries).toHaveLength(2);
  });
});
