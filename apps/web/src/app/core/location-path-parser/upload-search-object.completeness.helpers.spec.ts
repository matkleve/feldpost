import { describe, expect, it } from 'vitest';
import {
  classifySearchObjectCompleteness,
  isSearchObjectComplete,
  searchObjectHasStreet,
} from './upload-search-object.completeness.helpers';
import type { UploadSearchObject } from '../upload/upload-address-resolution.types';

function baseSo(overrides: Partial<UploadSearchObject> = {}): UploadSearchObject {
  return {
    country: 'AT',
    state: null,
    postcode: null,
    city: null,
    street: null,
    houseNumber: null,
    staircase: null,
    door: null,
    project: null,
    sources: [],
    sourceDeviations: [],
    postcodeCandidates: [],
    uncertainFields: [],
    groupingKey: 'k',
    relativePath: 'Thalistraße 4/foto.jpg',
    fileName: 'foto.jpg',
    ...overrides,
  };
}

describe('classifySearchObjectCompleteness', () => {
  it('Branch A: street + city', () => {
    expect(classifySearchObjectCompleteness(baseSo({ street: 'Thaliastraße', city: 'Wien' }))).toBe(
      'branch_a',
    );
  });

  it('houseNumber alone is not street', () => {
    expect(searchObjectHasStreet(baseSo({ houseNumber: '4' }))).toBe(false);
    expect(
      classifySearchObjectCompleteness(baseSo({ houseNumber: '4', country: null })),
    ).toBe('incomplete');
  });

  it('Branch B: street + project centroid', () => {
    expect(
      classifySearchObjectCompleteness(baseSo({ street: 'Thaliastraße', houseNumber: '4' }), {
        lat: 48.2,
        lng: 16.3,
        city: 'Wien',
      }),
    ).toBe('branch_b');
  });

  it('Branch C: street without city or centroid', () => {
    expect(classifySearchObjectCompleteness(baseSo({ street: 'Thaliastraße' }))).toBe('branch_c');
  });

  it('metadata_only: city without street', () => {
    expect(classifySearchObjectCompleteness(baseSo({ city: 'Wien', district: 'Mariahilf' }))).toBe(
      'metadata_only',
    );
  });

  it('isSearchObjectComplete matches branch_a only', () => {
    expect(isSearchObjectComplete(baseSo({ street: 'X', city: 'Wien' }))).toBe(true);
    expect(isSearchObjectComplete(baseSo({ street: 'X' }))).toBe(false);
  });
});
