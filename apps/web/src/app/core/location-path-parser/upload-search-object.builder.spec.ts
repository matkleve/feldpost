import { describe, expect, it } from 'vitest';
import {
  buildGroupingKey,
  buildSearchObjectFromRelativePath,
  expandPostcodeOnSearchObject,
  formatSearchObjectLabel,
  isSearchObjectComplete,
  isSearchObjectMeaningless,
} from './upload-search-object.builder';

const geo = {
  states: [{ n: 'Wien', a: ['vienna'] }],
  municipalities: [
    { n: 'Wien', b: 'Wien', a: ['vienna'] },
    { n: 'Graz', b: 'Steiermark', a: [] },
  ],
};

const geoWithInnsbruck = {
  states: [
    { n: 'Wien', a: ['vienna'] },
    { n: 'Tirol', a: [] },
  ],
  municipalities: [
    { n: 'Wien', b: 'Wien', a: ['vienna'] },
    { n: 'Innsbruck', b: 'Tirol', a: [] },
    { n: 'Graz', b: 'Steiermark', a: [] },
  ],
  postcodeMap: {
    '1090': ['Wien'],
  },
};

describe('buildSearchObjectFromRelativePath', () => {
  it('classifies country before postcode and street tokens', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Neustiftgasse-43/Stiege-2/Rechnung.pdf',
      'Rechnung.pdf',
      geo,
    );
    expect(so.country).toBe('AT');
    expect(so.postcode).toBeNull();
    // The key carries the spelling **fold** (S3: consecutive duplicate letters collapse), while
    // flat `street` keeps the path spelling (S4). This test is about token classification, so it
    // asserts both rather than assuming which form lands where.
    // @see docs/specs/service/media-upload-service/upload-search-object.street-fold.supplement.md
    expect(so.groupingKey).toContain('neustiftgase');
    expect(so.street).toBe('Neustiftgasse');
  });

  it('classifies house number after city in same segment when country unknown', () => {
    const so = buildSearchObjectFromRelativePath(
      'Neustiftgasse-43.pdf',
      'Neustiftgasse-43.pdf',
      geo,
    );
    expect(so.houseNumber).toBe('43');
    expect(so.postcode).toBeNull();
  });

  it('parses AT slash house/top from folder path (EX-09)', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Neustiftgasse 25/14/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.houseNumber).toBe('25');
    expect(so.door).toBe('14');
    expect(so.staircase).toBeNull();
  });

  it('classifies AT postcode when country segment is present', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/Neustiftgasse-43/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.country).toBe('AT');
    expect(so.postcode).toBe('1090');
  });

  it('filename street overrides folder city when both present', () => {
    const so = buildSearchObjectFromRelativePath(
      'Wien/AndereStrasse/Neustiftgasse-43.pdf',
      'Neustiftgasse-43.pdf',
      geo,
    );
    expect(so.street?.toLowerCase()).toContain('neustiftgasse');
    expect(so.houseNumber).toBe('43');
  });
});

describe('buildSearchObjectFromRelativePath — admin level map', () => {
  it('records admin fields per folder level', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/Neustiftgasse-43/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.areaEvidence?.city?.some((e) => e.value === 'Wien')).toBe(true);
    expect(so.areaEvidence?.postcode?.some((e) => e.value === '1090')).toBe(true);
    const cityLevel = so.areaEvidence?.city?.find((e) => e.value === 'Wien')?.level;
    const postcodeLevel = so.areaEvidence?.postcode?.find((e) => e.value === '1090')?.level;
    expect(cityLevel).toBeGreaterThan(postcodeLevel!);
  });

  it('does not conflict when postcode expands to the same city', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.areaConflicts ?? []).toHaveLength(0);
  });

  it('detects gazetteer conflict for Wien folder + Innsbruck subfolder', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Innsbruck/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.areaConflicts?.length).toBeGreaterThan(0);
    const values = so.areaConflicts!.flatMap((c) => c.entries.map((e) => e.value));
    expect(values.some((v) => v.toLowerCase().includes('innsbruck'))).toBe(true);
  });

  it('collapses flat postcode to the most specific (lowest) folder level', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.postcode).toBe('1090');
    expect(so.city).toBe('Wien');
  });

  it('conflicts when two cities appear at different folder levels', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Graz/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.areaConflicts?.some((c) => c.field === 'city')).toBe(true);
  });

  it('records filename-derived admin tokens at level 0', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/photo.jpg',
      'Graz.jpg',
      geoWithInnsbruck,
    );
    const filenameCity = so.areaEvidence?.city?.find((e) => e.source === 'filename');
    expect(filenameCity?.level).toBe(0);
    expect(filenameCity?.value).toBe('Graz');
  });

  it('includes country in areaEvidence from AT segment', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.areaEvidence?.country?.some((e) => e.value === 'AT')).toBe(true);
  });
});

describe('buildSearchObjectFromRelativePath — filename admin gate', () => {
  it('ignores a camera filename number instead of writing it as a postcode', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg',
      'IMG_1274.jpg',
      geo,
    );

    expect(so.postcode).toBe('1090');
    expect(so.areaEvidence?.postcode?.some((entry) => entry.value === '1274')).toBe(false);
    expect(so.areaConflicts ?? []).toEqual([]);
  });

  it('keeps two camera files in one folder in the same group', () => {
    const first = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/Währinger Straße 12/IMG_1274.jpg',
      'IMG_1274.jpg',
      geo,
    );
    const second = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/Währinger Straße 12/IMG_1275.jpg',
      'IMG_1275.jpg',
      geo,
    );

    expect(first.groupingKey).toBe(second.groupingKey);
  });

  it('ignores admin tokens from a filename with no real street, however it is worded', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/Währinger Straße 12/Kopie von IMG_1274.jpg',
      'Kopie von IMG_1274.jpg',
      geo,
    );

    expect(so.postcode).toBe('1090');
  });

});

describe('buildSearchObjectFromRelativePath — filename admin gate, still allowed', () => {
  it('still accepts a postcode from a filename that carries a real street', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Baustelle Nord/1090 Mühlenstraße 12.jpg',
      '1090 Mühlenstraße 12.jpg',
      geo,
    );

    expect(so.postcode).toBe('1090');
    expect(so.street).toContain('Mühlenstraße');
    expect(so.houseNumber).toBe('12');
  });

  it('keeps street-level fields from the filename untouched', () => {
    const so = buildSearchObjectFromRelativePath(
      'Baustelle Nord/Mühlenstraße 12.jpg',
      'Mühlenstraße 12.jpg',
      geo,
    );

    expect(so.sources.some((e) => e.field === 'street' && e.source === 'filename')).toBe(true);
    expect(so.houseNumber).toBe('12');
  });
});

describe('buildGroupingKey', () => {
  it('dedupes identical addresses', () => {
    const a = buildGroupingKey({
      country: 'AT',
      state: 'Wien',
      postcode: '1090',
      city: 'Wien',
      street: 'Neustiftgasse',
      houseNumber: '43',
      staircase: null,
      door: null,
      project: null,
    });
    const b = buildGroupingKey({
      country: 'AT',
      state: 'Wien',
      postcode: '1090',
      city: 'Wien',
      street: 'Neustiftgasse',
      houseNumber: '43',
      staircase: null,
      door: null,
      project: null,
    });
    expect(a).toBe(b);
  });

  it('excludes door and staircase from grouping key', () => {
    const base = buildGroupingKey({
      country: 'AT',
      state: null,
      postcode: null,
      city: 'Wien',
      street: 'Neustiftgasse',
      houseNumber: '25',
      staircase: null,
      door: null,
      project: null,
    });
    const withUnits = buildGroupingKey({
      country: 'AT',
      state: null,
      postcode: null,
      city: 'Wien',
      street: 'Neustiftgasse',
      houseNumber: '25',
      staircase: '4',
      door: '14',
      project: null,
    });
    expect(base).toBe(withUnits);
  });
});

describe('isSearchObjectComplete', () => {
  it('requires locality and street', () => {
    expect(
      isSearchObjectComplete({
        country: 'AT',
        state: null,
        postcode: null,
        city: null,
        street: 'Neustiftgasse',
        houseNumber: '43',
        staircase: null,
        door: null,
        project: null,
        sources: [],
        sourceDeviations: [],
        postcodeCandidates: [],
        uncertainFields: [],
        groupingKey: '',
        relativePath: '',
        fileName: '',
      }),
    ).toBe(false);

    expect(
      isSearchObjectComplete({
        country: 'AT',
        state: null,
        postcode: '1090',
        city: 'Wien',
        street: 'Neustiftgasse',
        houseNumber: '43',
        staircase: null,
        door: null,
        project: null,
        sources: [],
        sourceDeviations: [],
        postcodeCandidates: [],
        uncertainFields: [],
        groupingKey: '',
        relativePath: '',
        fileName: '',
      }),
    ).toBe(true);
  });
  // ── Filename admin gate (D-01 option A′) ───────────────────────────────────
  // @see docs/specs/service/media-upload-service/upload-search-object.md § Admin level map
});

// ── Country derived from the place (D-03) ─────────────────────────────────────
// @see docs/specs/service/media-upload-service/upload-search-object.country-derivation.md
describe('buildSearchObjectFromRelativePath — derived country', () => {
  const moedlingGeo = {
    states: [{ n: 'Niederösterreich', a: [] }],
    municipalities: [
      { n: 'Mödling', b: 'Niederösterreich', a: [] },
      { n: 'Schottwien', b: 'Niederösterreich', a: [] },
    ],
    postcodeMap: { '1160': ['Wien'] },
  };

  // `Wien` names a country even though the path never does, so 1090 IS a postcode here.
  // @see docs/specs/service/media-upload-service/upload-search-object.country-derivation.md
  it('derives the country from the city, which then admits the postcode', () => {
    const so = buildSearchObjectFromRelativePath(
      'Wien/1090/Neustiftgasse-43/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.country).toBe('AT');
    expect(so.countryProvenance).toBe('derived');
    expect(so.postcode).toBe('1090');
    expect(so.houseNumber).toBe('43');
  });

  it('does not treat a 4-digit token as postcode or house number when no place names a country', () => {
    const so = buildSearchObjectFromRelativePath(
      'Baustelle/1090/Neustiftgasse-43/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.country).toBeNull();
    expect(so.postcode).toBeNull();
    expect(so.houseNumber).toBe('43');
  });

  it('marks a country read from the path as parsed', () => {
    const so = buildSearchObjectFromRelativePath('AT/Wien/photo.jpg', 'photo.jpg', geo);
    expect(so.countryProvenance).toBe('parsed');
  });

  it('keeps both cities of a path that states the address twice, and flags the conflict', () => {
    const so = buildSearchObjectFromRelativePath(
      'Mödling/Wilhelminenstraße 141/Wilhelminenstr 141, 1160 Wien.jpg',
      'Wilhelminenstr 141, 1160 Wien.jpg',
      moedlingGeo,
    );

    const cityLevels = (so.areaEvidence?.city ?? []).map((e) => `${e.level}:${e.value}`).sort();
    expect(cityLevels).toEqual(['0:Wien', '2:Mödling']);
    expect(so.postcode).toBe('1160');
    expect(so.country).toBe('AT');
    expect(so.areaConflicts?.some((c) => c.field === 'city')).toBe(true);
  });
});

// ── Strong vs weak street evidence, and the all-or-nothing address side ───────
// @see docs/specs/service/media-upload-service/upload-search-object.evidence-model.md
describe('buildSearchObjectFromRelativePath — street evidence', () => {
  it('does not read a house number out of a period folder', () => {
    const so = buildSearchObjectFromRelativePath(
      'Baustelle Süd/Woche 12/IMG_8001.jpg',
      'IMG_8001.jpg',
      geo,
    );

    expect(so.street).toBeNull();
    expect(so.houseNumber).toBeNull();
    expect(so.groupingKey).toBe('|||||');
  });

  it('keeps a real street from the file name under a meaningless folder', () => {
    const so = buildSearchObjectFromRelativePath(
      'Baustelle Nord/Mühlenstraße 12.jpg',
      'Mühlenstraße 12.jpg',
      geo,
    );

    expect(so.street).toBe('Mühlenstraße');
    expect(so.houseNumber).toBe('12');
  });

  it('accepts an abbreviated street name standing beside its house number', () => {
    const so = buildSearchObjectFromRelativePath(
      'Wilhelminenstr 141/IMG_1.jpg',
      'IMG_1.jpg',
      geo,
    );

    expect(so.street).toBe('Wilhelminenstr');
    expect(so.houseNumber).toBe('141');
  });

  it('drops a lone number when nothing in the path is a street', () => {
    const so = buildSearchObjectFromRelativePath(
      'Rohdaten/Kamera A/IMG_9001.jpg',
      'IMG_9001.jpg',
      geo,
    );

    expect(so.street).toBeNull();
    expect(so.houseNumber).toBeNull();
  });
});

// ── Every value says where it came from ───────────────────────────────────────
// @see docs/specs/service/media-upload-service/upload-search-object.evidence-model.md
describe('buildSearchObjectFromRelativePath — value origin', () => {
  const geoAt = {
    states: [{ n: 'Niederösterreich', a: [] }],
    municipalities: [{ n: 'Mödling', b: 'Niederösterreich', a: [] }],
    postcodeMap: { '4020': ['Linz'] },
  };

  it('marks a value read from the path as path evidence', () => {
    const so = buildSearchObjectFromRelativePath('AT/Wien/photo.jpg', 'photo.jpg', geo);

    expect(so.areaEvidence?.city?.[0].origin).toBe('path');
    expect(so.areaEvidence?.city?.[0].rule).toBeUndefined();
  });

  it('names the rule that derived a country from a place', () => {
    const so = buildSearchObjectFromRelativePath(
      'Mödling/Wilhelminenstraße 141/IMG_1.jpg',
      'IMG_1.jpg',
      geoAt,
    );

    const country = so.areaEvidence?.country?.[0];
    expect(country?.origin).toBe('derived');
    expect(country?.rule).toBe('place→country');
    expect(country?.derivedFrom).toBe('Mödling');
  });

  it('names the rule that derived a city from a postcode', () => {
    const built = buildSearchObjectFromRelativePath(
      'AT/4020/Landstraße 7/foto.jpg',
      'foto.jpg',
      geoAt,
    );
    const so = expandPostcodeOnSearchObject(built, geoAt.postcodeMap);

    expect(so.city).toBe('Linz');
    const city = so.areaEvidence?.city?.find((entry) => entry.origin === 'derived');
    expect(city?.rule).toBe('postcode→city');
    expect(city?.derivedFrom).toBe('4020');
    expect(so.sources.find((entry) => entry.field === 'city')?.rule).toBe('postcode→city');
  });
});

// ── Is that number a postcode? · derived state · implausible postcode ─────────
// @see docs/specs/service/media-upload-service/upload-search-object.derivation-rules.md
const geoCorroboration = {
  states: [
    { n: 'Tirol', a: [] },
    { n: 'Niederösterreich', a: [] },
    { n: 'Wien', a: [] },
  ],
  municipalities: [
    { n: 'Wien', b: 'Wien', a: [] },
    { n: 'Mödling', b: 'Niederösterreich', a: [] },
    { n: 'Innsbruck', b: 'Tirol', a: [] },
  ],
  postcodeMap: { '1090': ['Wien'] },
};

describe('buildSearchObjectFromRelativePath — postcode corroboration and derivation', () => {
  it('takes a postcode that is a whole folder segment', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/4780/Passauer Straße 5/IMG_1.jpg',
      'IMG_1.jpg',
      geoCorroboration,
    );

    expect(so.postcode).toBe('4780');
  });

  it('ignores a number buried in a folder segment with other words', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Baustelle 4780/Passauer Straße 5/IMG_1.jpg',
      'IMG_1.jpg',
      geoCorroboration,
    );

    expect(so.postcode).toBeNull();
    expect(so.sources.some((entry) => entry.field === 'postcode')).toBe(true);
  });

  it('takes a postcode that stands next to its city in one segment', () => {
    const so = buildSearchObjectFromRelativePath(
      'Mödling/Wilhelminenstraße 141/Wilhelminenstr 141, 1160 Wien.jpg',
      'Wilhelminenstr 141, 1160 Wien.jpg',
      geoCorroboration,
    );

    expect(so.postcode).toBe('1160');
  });

  it('derives the state from the city', () => {
    const so = buildSearchObjectFromRelativePath(
      'Mödling/Wilhelminenstraße 141/IMG_1.jpg',
      'IMG_1.jpg',
      geoCorroboration,
    );

    expect(so.state).toBe('Niederösterreich');
    const state = so.areaEvidence?.state?.[0];
    expect(state?.origin).toBe('derived');
    expect(state?.rule).toBe('city→state');
    expect(state?.derivedFrom).toBe('Mödling');
  });

});

describe('buildSearchObjectFromRelativePath — postcode plausibility against the state', () => {
  const geoAt = {
    states: [
      { n: 'Tirol', a: [] },
      { n: 'Oberösterreich', a: [] },
    ],
    municipalities: [{ n: 'Innsbruck', b: 'Tirol', a: [] }],
    postcodeMap: { '1090': ['Wien'] },
  };

  it('asks when a postcode cannot belong to the state in the path', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Tirol/1090/Museumstraße 1/IMG_1.jpg',
      'IMG_1.jpg',
      geoAt,
    );

    expect(so.areaConflicts?.some((conflict) => conflict.field === 'postcode')).toBe(true);
  });

  it('stays quiet for a border postcode that looks wrong but is not', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Oberösterreich/5280/Stadtplatz 1/IMG_1.jpg',
      'IMG_1.jpg',
      geoAt,
    );

    expect(so.areaConflicts ?? []).toEqual([]);
  });
});

// ── Area-only precision: state/country alone is real evidence, not noise (F-19) ──────────────
// @see docs/study/005-upload-pipeline-trace-findings.md#f-19
describe('isSearchObjectMeaningless — area-only evidence', () => {
  it('is not meaningless for a state-only path, even with no city/postcode/street', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Niederösterreich/IMG_1.jpg',
      'IMG_1.jpg',
      geoCorroboration,
    );

    expect(so.city).toBeNull();
    expect(so.postcode).toBeNull();
    expect(so.street).toBeNull();
    expect(so.state).toBe('Niederösterreich');
    expect(isSearchObjectMeaningless(so)).toBe(false);
  });

  it('is still meaningless for a bare country with nothing else — too coarse, too collision-prone', () => {
    // A two-letter alias alone (no state/city/postcode/street) stays meaningless: it is exactly
    // the kind of token that turns up by accident in an unrelated filename (see the next test).
    const so = buildSearchObjectFromRelativePath('AT/IMG_1.jpg', 'IMG_1.jpg', geoCorroboration);

    expect(so.country).toBe('AT');
    expect(isSearchObjectMeaningless(so)).toBe(true);
  });

  it('is still meaningless for a plain filename with no area or street evidence', () => {
    const so = buildSearchObjectFromRelativePath(
      'CV Matthias Kleveta ERP DE.pdf',
      'CV Matthias Kleveta ERP DE.pdf',
      geoCorroboration,
    );

    expect(isSearchObjectMeaningless(so)).toBe(true);
  });
});

describe('formatSearchObjectLabel — area-only fallback', () => {
  it('falls back to state + country when nothing below city is known', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Niederösterreich/IMG_1.jpg',
      'IMG_1.jpg',
      geoCorroboration,
    );

    expect(formatSearchObjectLabel(so)).toBe('Niederösterreich, AT');
  });

  it('still prefers city over the area-only fallback', () => {
    const so = buildSearchObjectFromRelativePath('Wien/IMG_1.jpg', 'IMG_1.jpg', geoCorroboration);

    expect(formatSearchObjectLabel(so)).toBe('Wien');
  });

  it('falls back to the filename only when there is no evidence at all', () => {
    const so = buildSearchObjectFromRelativePath(
      'random.jpg',
      'random.jpg',
      geoCorroboration,
    );

    expect(formatSearchObjectLabel(so)).toBe('random.jpg');
  });
});

const geoCopySuffix = {
  states: [{ n: 'Wien', a: ['vienna'] }],
  municipalities: [{ n: 'Wien', b: 'Wien', a: ['vienna'] }],
  postcodeMap: { '1010': ['Wien'] },
};

/**
 * Windows Explorer copy folders — `(N)` must not enter street / groupingKey.
 * @see docs/specs/service/media-upload-service/upload-search-object.copy-suffix.supplement.md
 */
describe('buildSearchObjectFromRelativePath — Windows copy suffix (CS-*)', () => {
  it('CS-01/02: Wasagasse 4 (1) shares street, houseNumber and groupingKey with bare', () => {
    const bare = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    const copy = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4 (1)/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );

    expect(bare.street).toBe('Wasagasse');
    expect(bare.houseNumber).toBe('4');
    expect(copy.street).toBe('Wasagasse');
    expect(copy.houseNumber).toBe('4');
    expect(copy.street).not.toContain('(');
    expect(copy.groupingKey).toBe(bare.groupingKey);
  });

  it('CS-03: Wasagasse 4 (12) matches bare', () => {
    const bare = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    const copy = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4 (12)/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    expect(copy.groupingKey).toBe(bare.groupingKey);
  });

  it('CS-04: Wasagasse 4A (2) matches bare Wasagasse 4A', () => {
    const bare = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4A/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    const copy = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4A (2)/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    expect(copy.houseNumber).toBe('4A');
    expect(copy.groupingKey).toBe(bare.groupingKey);
  });

  it('CS-05: Stephansplatz (1) matches bare Stephansplatz', () => {
    const bare = buildSearchObjectFromRelativePath(
      'Wien/1010/Stephansplatz/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    const copy = buildSearchObjectFromRelativePath(
      'Wien/1010/Stephansplatz (1)/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    expect(copy.groupingKey).toBe(bare.groupingKey);
    expect(copy.street ?? copy.city).toBeTruthy();
  });

  it('strips (N) from a filename stem before the extension', () => {
    const bare = buildSearchObjectFromRelativePath(
      'Wasagasse 4.jpg',
      'Wasagasse 4.jpg',
      geoCopySuffix,
    );
    const copy = buildSearchObjectFromRelativePath(
      'Wasagasse 4 (1).jpg',
      'Wasagasse 4 (1).jpg',
      geoCopySuffix,
    );
    expect(copy.street).toBe('Wasagasse');
    expect(copy.houseNumber).toBe('4');
    expect(copy.groupingKey).toBe(bare.groupingKey);
  });
});

/**
 * Spelling twins — groupingKey fold collapses doubled letters.
 * @see docs/specs/service/media-upload-service/upload-search-object.street-fold.supplement.md
 */
describe('buildSearchObjectFromRelativePath — street spelling fold (SF-*)', () => {
  it('SF-01: Wasagasse 4 and Wasagase 4 share groupingKey; flat street keeps path spelling', () => {
    const correct = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    const typo = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagase 4/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    expect(correct.street).toBe('Wasagasse');
    expect(typo.street).toBe('Wasagase');
    expect(typo.groupingKey).toBe(correct.groupingKey);
  });

  it('SF-02: copy-suffix + typo chain still one key', () => {
    const a = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4 (1)/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    const b = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagase 4 (2)/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    expect(a.groupingKey).toBe(b.groupingKey);
  });

  it('SF-03: different streets do not merge', () => {
    const a = buildSearchObjectFromRelativePath(
      'Wien/1010/Wasagasse 4/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    const b = buildSearchObjectFromRelativePath(
      'Wien/1010/Neubaugasse 4/IMG_1.jpg',
      'IMG_1.jpg',
      geoCopySuffix,
    );
    expect(a.groupingKey).not.toBe(b.groupingKey);
  });
});
