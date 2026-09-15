import { describe, expect, it } from 'vitest';
import { buildSearchObjectFromRelativePath } from '../../location-path-parser/upload-search-object.builder';

/** The four area fields a tray answer can move — the loop guard's progress check. */
function areaTuple(so: UploadSearchObject): string {
  return [so.country, so.state, so.postcode, so.city].join('|');
}
import {
  adminLevelCandidateId,
  adminLevelManualCandidateId,
  applyAdminLevelSelectionsToSearchObject,
  buildAdminConflictCandidates,
  parseAdminLevelCandidateId,
} from './upload-location-area-choice.util';
import type { UploadSearchObject } from '../address-resolution/upload-address-resolution.types';

const municipalities = [
  { n: 'Wien', b: 'Wien', a: [] },
  { n: 'Innsbruck', b: 'Tirol', a: [] },
];

const postcodeMap = { '1090': ['Wien'] };

function baseSearchObject(overrides: Partial<UploadSearchObject> = {}): UploadSearchObject {
  return {
    country: 'AT',
    state: 'Wien',
    postcode: null,
    city: 'Innsbruck',
    street: null,
    houseNumber: null,
    staircase: null,
    door: null,
    project: null,
    sources: [],
    sourceDeviations: [],
    postcodeCandidates: [],
    uncertainFields: [],
    groupingKey: 'at|wien||innsbruck||',
    relativePath: 'Wien/Innsbruck/photo.jpg',
    fileName: 'photo.jpg',
    areaEvidence: {
      state: [{ level: 2, value: 'Wien', source: 'folder', field: 'state' }],
      city: [{ level: 1, value: 'Innsbruck', source: 'folder', field: 'city' }],
    },
    areaConflicts: [
      {
        field: 'city',
        entries: [
          { level: 2, value: 'Wien', source: 'folder', field: 'state' },
          { level: 1, value: 'Innsbruck', source: 'folder', field: 'city' },
        ],
      },
    ],
    ...overrides,
  };
}

describe('upload-location-area-choice.util', () => {
  it('round-trips admin level candidate ids', () => {
    const entry = { level: 2, value: 'Wien', source: 'folder' as const, field: 'state' as const };
    const id = adminLevelCandidateId(entry);
    expect(parseAdminLevelCandidateId(id)).toEqual({ field: 'state', value: 'Wien' });
  });

  it('builds tray candidates from conflicts without duplicates', () => {
    const conflicts = baseSearchObject().areaConflicts!;
    const candidates = buildAdminConflictCandidates(conflicts);
    const ids = candidates.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(candidates.some((c) => c.addressLabel.includes('Level 1: Innsbruck'))).toBe(true);
    expect(candidates.some((c) => c.id.startsWith('admin-manual|'))).toBe(true);
  });

  it('clears conflicts when user picks a compatible city for Wien state', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      baseSearchObject(),
      { city: 'Wien' },
      { municipalities, postcodeMap },
    );
    expect(resolved.city).toBe('Wien');
    expect(resolved.areaConflicts).toHaveLength(0);
    expect(resolved.groupingKey).toContain('wien');
  });

  it('recomputes groupingKey after resolution', () => {
    const before = baseSearchObject().groupingKey;
    const resolved = applyAdminLevelSelectionsToSearchObject(
      baseSearchObject(),
      { city: 'Wien' },
      { municipalities, postcodeMap },
    );
    expect(resolved.groupingKey).not.toBe(before);
  });

  it('returns null for manual candidate ids', () => {
    expect(parseAdminLevelCandidateId(adminLevelManualCandidateId('city'))).toBeNull();
  });

  it('round-trips candidate ids with encoded special characters', () => {
    const entry = {
      level: 1,
      value: 'St. Pölten',
      source: 'folder' as const,
      field: 'city' as const,
    };
    const parsed = parseAdminLevelCandidateId(adminLevelCandidateId(entry));
    expect(parsed).toEqual({ field: 'city', value: 'St. Pölten' });
  });

  it('replaces prior level-map entries for the resolved field', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      baseSearchObject(),
      { city: 'Wien' },
      { municipalities, postcodeMap },
    );
    expect(resolved.areaEvidence?.city).toHaveLength(1);
    expect(resolved.areaEvidence?.city?.[0].value).toBe('Wien');
  });

  /**
   * Was: "keeps conflict when resolved city still mismatches state" — which is F-21, the loop.
   * The answer now outranks the path's state and the `city→state` rule refills it (D-12 option C).
   */
  it('re-derives the state when the resolved city mismatches the path state', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      baseSearchObject(),
      { city: 'Innsbruck' },
      { municipalities, postcodeMap },
    );
    expect(resolved.city).toBe('Innsbruck');
    expect(resolved.state).toBe('Tirol');
    expect(resolved.areaConflicts).toHaveLength(0);
  });

  it('resolves when user picks matching state for Innsbruck city', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      baseSearchObject(),
      { state: 'Tirol' },
      { municipalities, postcodeMap },
    );
    expect(resolved.state).toBe('Tirol');
    expect(resolved.areaConflicts).toHaveLength(0);
  });

  it('resolves street path Wien/Innsbruck when user picks Tirol state', () => {
    const geo = {
      states: [
        { n: 'Wien', a: [] },
        { n: 'Tirol', a: [] },
      ],
      municipalities: [
        { n: 'Wien', b: 'Wien', a: [] },
        { n: 'Innsbruck', b: 'Tirol', a: [] },
      ],
      postcodeMap: { '6020': ['Innsbruck'] },
    };
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Innsbruck/Hauptstraße 5/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.areaConflicts?.length).toBeGreaterThan(0);

    // Picking the state drops the city that cannot sit in it (D-12 option C), rather than
    // re-raising the same question forever.
    const resolvedWithTirol = applyAdminLevelSelectionsToSearchObject(
      so,
      { state: 'Tirol' },
      { municipalities: geo.municipalities, postcodeMap: geo.postcodeMap },
    );
    expect(resolvedWithTirol.state).toBe('Tirol');
    expect(resolvedWithTirol.areaConflicts).toHaveLength(0);

    const resolvedWithWienCity = applyAdminLevelSelectionsToSearchObject(
      so,
      { city: 'Wien' },
      { municipalities: geo.municipalities, postcodeMap: geo.postcodeMap },
    );
    expect(resolvedWithWienCity.areaConflicts).toHaveLength(0);
  });
});

/**
 * F-21 / D-12 option C: a tray answer is authoritative for the fields it implies. Before this, the
 * answer wrote only the chosen field, the contradicting one survived, and the identical conflict
 * re-formed — measured at 55 answers to one question in a single trace run.
 * @see docs/specs/service/media-upload-service/contradiction-resolution-model.cross-field-answers.supplement.md
 */
describe('applyAdminLevelSelectionsToSearchObject — cross-field answers (F-21)', () => {
  const geo = {
    municipalities: [
      { n: 'Wien', b: 'Wien', a: [] },
      { n: 'Innsbruck', b: 'Tirol', a: [] },
      { n: 'Mödling', b: 'Niederösterreich', a: [] },
    ],
    postcodeMap: { '1090': ['Wien'], '1160': ['Wien'] },
  };

  /** The owner's S18 case: folder says Mödling, filename says Wien 1160. */
  function s18SearchObject(): UploadSearchObject {
    return {
      country: 'AT',
      state: 'Wien',
      postcode: '1160',
      city: 'Wien',
      street: 'Wilhelminenstraße',
      houseNumber: '141',
      staircase: null,
      door: null,
      project: null,
      sources: [],
      sourceDeviations: [],
      postcodeCandidates: [],
      uncertainFields: [],
      groupingKey: 'at|wien|1160|wien|wilhelminenstraße|141',
      relativePath: 'Mödling/Wilhelminenstraße 141/Wilhelminenstr 141, 1160 Wien.jpg',
      fileName: 'Wilhelminenstr 141, 1160 Wien.jpg',
      areaEvidence: {
        country: [{ level: 2, value: 'AT', source: 'folder', field: 'country' }],
        city: [
          { level: 2, value: 'Mödling', source: 'folder', field: 'city' },
          { level: 0, value: 'Wien', source: 'filename', field: 'city' },
        ],
        state: [{ level: 0, value: 'Wien', source: 'filename', field: 'state' }],
        postcode: [{ level: 0, value: '1160', source: 'filename', field: 'postcode' }],
      },
      areaConflicts: [
        {
          field: 'city',
          entries: [
            { level: 2, value: 'Mödling', source: 'folder', field: 'city' },
            { level: 0, value: 'Wien', source: 'filename', field: 'city' },
            { level: 0, value: 'Wien', source: 'filename', field: 'state' },
          ],
        },
      ],
    };
  }

  it('re-derives the state from the chosen city instead of leaving the contradiction standing', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      s18SearchObject(),
      { city: 'Mödling' },
      geo,
    );

    expect(resolved.city).toBe('Mödling');
    expect(resolved.state).toBe('Niederösterreich');
    expect(resolved.areaConflicts).toHaveLength(0);
  });

  it('marks the re-derived state as derived, with the rule that produced it', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      s18SearchObject(),
      { city: 'Mödling' },
      geo,
    );

    const stateEntry = resolved.areaEvidence?.state?.[0];
    expect(stateEntry?.value).toBe('Niederösterreich');
    expect(stateEntry?.origin).toBe('derived');
    expect(stateEntry?.rule).toBe('city→state');
    expect(stateEntry?.derivedFrom).toBe('Mödling');
  });

  it('drops a postcode the chosen city contradicts, rather than keeping a stale one', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      s18SearchObject(),
      { city: 'Mödling' },
      geo,
    );

    // 1160 is Wien; it cannot survive an answer of Mödling.
    expect(resolved.postcode).toBeNull();
    expect(resolved.areaEvidence?.postcode ?? []).toHaveLength(0);
    expect(resolved.groupingKey).not.toContain('1160');
  });

  it('converges: answering the same value again changes nothing and raises no conflict', () => {
    const once = applyAdminLevelSelectionsToSearchObject(s18SearchObject(), { city: 'Mödling' }, geo);
    const twice = applyAdminLevelSelectionsToSearchObject(once, { city: 'Mödling' }, geo);

    expect(twice.areaConflicts).toHaveLength(0);
    expect(twice.city).toBe('Mödling');
    expect(twice.state).toBe('Niederösterreich');
    expect(twice.groupingKey).toBe(once.groupingKey);
  });

  it('keeps the other reading available: answering Wien keeps Wien and its postcode', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(s18SearchObject(), { city: 'Wien' }, geo);

    expect(resolved.city).toBe('Wien');
    expect(resolved.state).toBe('Wien');
    expect(resolved.postcode).toBe('1160');
    expect(resolved.areaConflicts).toHaveLength(0);
  });

  it('answering the state drops a city that cannot sit in it', () => {
    const resolved = applyAdminLevelSelectionsToSearchObject(
      s18SearchObject(),
      { state: 'Niederösterreich' },
      geo,
    );

    expect(resolved.state).toBe('Niederösterreich');
    expect(resolved.city).toBe('Mödling');
    expect(resolved.areaEvidence?.city?.some((e) => e.value === 'Wien')).toBe(false);
  });

  /**
   * An answer is authoritative for what it contradicts, not transitively for what that implies.
   * `isPostcodePlausibleForState` is deliberately generous (a `1…` postcode is plausible in both
   * Wien and Niederösterreich), so answering the *state* leaves `1160` standing against the city
   * that survived — an answerable follow-up rather than the same question again.
   *
   * Note the signature does **not** distinguish the two: `detectAreaConflicts` pass 3 synthesizes a
   * `city` entry for each city the postcode expands to, so both read `city|modling,wien`. That is
   * why the loop guard keys on whether the answer moved the Search Object, not on the signature.
   */
  it('a state answer can leave a follow-up question, and that one converges', () => {
    const before = s18SearchObject();
    const afterState = applyAdminLevelSelectionsToSearchObject(
      before,
      { state: 'Niederösterreich' },
      geo,
    );

    // Progress: the answer moved the area fields, even though a question remains.
    expect(areaTuple(afterState)).not.toEqual(areaTuple(before));
    expect(afterState.areaConflicts?.length).toBeGreaterThan(0);

    const afterCity = applyAdminLevelSelectionsToSearchObject(afterState, { city: 'Mödling' }, geo);
    expect(afterCity.areaConflicts).toHaveLength(0);
    expect(afterCity.postcode).toBeNull();
  });
});
