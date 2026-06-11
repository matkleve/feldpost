import { describe, expect, it } from 'vitest';
import {
  buildGroupingKey,
  buildSearchObjectFromRelativePath,
  isSearchObjectComplete,
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
    expect(so.groupingKey).toContain('neustiftgasse');
  });

  it('does not treat 4-digit token as postcode or house number without country', () => {
    const so = buildSearchObjectFromRelativePath(
      'Wien/1090/Neustiftgasse-43/photo.jpg',
      'photo.jpg',
      geo,
    );
    expect(so.country).toBeNull();
    expect(so.postcode).toBeNull();
    expect(so.houseNumber).toBe('43');
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
    expect(so.adminLevelMap?.city?.some((e) => e.value === 'Wien')).toBe(true);
    expect(so.adminLevelMap?.postcode?.some((e) => e.value === '1090')).toBe(true);
    const cityLevel = so.adminLevelMap?.city?.find((e) => e.value === 'Wien')?.level;
    const postcodeLevel = so.adminLevelMap?.postcode?.find((e) => e.value === '1090')?.level;
    expect(cityLevel).toBeGreaterThan(postcodeLevel!);
  });

  it('does not conflict when postcode expands to the same city', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/1090/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.adminLevelConflicts ?? []).toHaveLength(0);
  });

  it('detects gazetteer conflict for Wien folder + Innsbruck subfolder', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/Innsbruck/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.adminLevelConflicts?.length).toBeGreaterThan(0);
    const values = so.adminLevelConflicts!.flatMap((c) => c.entries.map((e) => e.value));
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
    expect(so.adminLevelConflicts?.some((c) => c.field === 'city')).toBe(true);
  });

  it('records filename-derived admin tokens at level 0', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/photo.jpg',
      'Graz.jpg',
      geoWithInnsbruck,
    );
    const filenameCity = so.adminLevelMap?.city?.find((e) => e.source === 'filename');
    expect(filenameCity?.level).toBe(0);
    expect(filenameCity?.value).toBe('Graz');
  });

  it('includes country in adminLevelMap from AT segment', () => {
    const so = buildSearchObjectFromRelativePath(
      'AT/Wien/photo.jpg',
      'photo.jpg',
      geoWithInnsbruck,
    );
    expect(so.adminLevelMap?.country?.some((e) => e.value === 'AT')).toBe(true);
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
});
