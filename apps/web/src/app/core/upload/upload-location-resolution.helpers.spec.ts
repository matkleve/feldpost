import { describe, expect, it } from 'vitest';
import {
  buildDisambiguationQueryKey,
  buildSearchQuery,
  classifySearchHits,
  deriveFolderDisplayPath,
  deriveLocalityHint,
  normalizeAddressForGrouping,
} from './upload-location-resolution.helpers';
import { DEFAULT_UPLOAD_LOCATION_CONFIG } from './upload-location-config';

describe('upload-location-resolution.helpers', () => {
  it('deriveFolderDisplayPath strips filename', () => {
    expect(deriveFolderDisplayPath('Proj/Wien/IMG_001.jpg')).toBe('Proj/Wien');
    expect(deriveFolderDisplayPath('solo.jpg')).toBe('');
  });

  it('buildDisambiguationQueryKey combines normalized address and folder', () => {
    expect(
      buildDisambiguationQueryKey('Neustiftgasse 43', 'Proj/Wien'),
    ).toBe(`${normalizeAddressForGrouping('Neustiftgasse 43')}|proj/wien`);
  });

  it('buildSearchQuery appends locality hint only when present', () => {
    expect(buildSearchQuery('Street 1', undefined)).toBe('Street 1');
    expect(buildSearchQuery('Street 1', 'Wien')).toBe('Street 1, Wien');
    expect(buildSearchQuery('Street 1, Wien', 'Wien')).toBe('Street 1, Wien');
  });

  it('deriveLocalityHint uses last folder segment', () => {
    expect(deriveLocalityHint('a/b/Wien/photo.jpg')).toBe('Wien');
    expect(deriveLocalityHint('photo.jpg')).toBeUndefined();
  });

  it('classifySearchHits auto-assigns high-confidence single hit', () => {
    const outcome = classifySearchHits(
      [
        {
          lat: 48.2,
          lng: 16.37,
          displayName: 'A',
          name: 'Street 1',
          importance: 0.98,
          address: { city: 'Wien' },
        },
      ],
      DEFAULT_UPLOAD_LOCATION_CONFIG,
    );
    expect(outcome.kind).toBe('auto');
  });

  it('classifySearchHits marks close multi-hit sets ambiguous', () => {
    const outcome = classifySearchHits(
      [
        {
          lat: 48.2,
          lng: 16.37,
          displayName: 'A',
          name: 'A',
          importance: 0.75,
          address: { city: 'Wien' },
        },
        {
          lat: 48.3,
          lng: 16.38,
          displayName: 'B',
          name: 'B',
          importance: 0.72,
          address: { city: 'Graz' },
        },
      ],
      DEFAULT_UPLOAD_LOCATION_CONFIG,
    );
    expect(outcome.kind).toBe('ambiguous');
  });
});
