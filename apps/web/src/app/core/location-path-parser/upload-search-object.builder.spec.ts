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
