import { describe, expect, it } from 'vitest';
import { buildGroupingKey } from './upload-search-object.builder';
import {
  collapseAtSlashPathSegments,
  parseAtSegmentUnits,
  parseAtSlashUnits,
} from './upload-search-object.unit-parsing.at';

describe('upload-search-object.unit-parsing.at', () => {
  it('AT-U01: Neustiftgasse 25/14 → house 25, door 14', () => {
    const slash = parseAtSlashUnits('Neustiftgasse 25/14');
    expect(slash).toEqual({ houseNumber: '25', staircase: null, door: '14' });
    const full = parseAtSegmentUnits('Neustiftgasse 25/14', 'AT');
    expect(full.houseNumber).toBe('25');
    expect(full.door).toBe('14');
    expect(full.staircase).toBeNull();
  });

  it('AT-U02: Kirchengasse 15/4/5 → house, staircase, door', () => {
    const slash = parseAtSlashUnits('Kirchengasse 15/4/5');
    expect(slash).toEqual({ houseNumber: '15', staircase: '4', door: '5' });
  });

  it('AT-U03: Musterstraße 7 Tür 12', () => {
    const full = parseAtSegmentUnits('Musterstraße 7 Tür 12', 'AT');
    expect(full.door).toBe('12');
    expect(full.staircase).toBeNull();
  });

  it('AT-U04: Hauptstraße 3 Stiege 2', () => {
    const full = parseAtSegmentUnits('Hauptstraße 3 Stiege 2', 'AT');
    expect(full.staircase).toBe('2');
    expect(full.door).toBeNull();
  });

  it('AT-U05: Gasse 1 Top 7B', () => {
    const full = parseAtSegmentUnits('Gasse 1 Top 7B', 'AT');
    expect(full.door).toBe('7B');
  });

  it('grouping_key excludes staircase and door', () => {
    const withUnits = buildGroupingKey({
      country: 'AT',
      state: null,
      postcode: '1090',
      city: 'Wien',
      street: 'Neustiftgasse',
      houseNumber: '11',
      staircase: '2',
      door: '12',
      project: null,
    });
    const buildingOnly = buildGroupingKey({
      country: 'AT',
      state: null,
      postcode: '1090',
      city: 'Wien',
      street: 'Neustiftgasse',
      houseNumber: '11',
      staircase: null,
      door: null,
      project: null,
    });
    expect(withUnits).toBe(buildingOnly);
  });

  it('collapseAtSlashPathSegments merges folder parts split on slash', () => {
    expect(collapseAtSlashPathSegments(['AT', 'Wien', 'Neustiftgasse 25', '14', 'photo.jpg'])).toEqual([
      'AT',
      'Wien',
      'Neustiftgasse 25/14',
      'photo.jpg',
    ]);
  });

  it('non-AT segments skip slash parsing', () => {
    const de = parseAtSegmentUnits('Neustiftgasse 25/14', 'DE');
    expect(de.houseNumber).toBeNull();
    expect(de.door).toBeNull();
    expect(de.workingSegment).toBe('Neustiftgasse 25/14');
  });
});
