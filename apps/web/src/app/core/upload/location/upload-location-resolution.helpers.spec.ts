import { describe, expect, it } from 'vitest';
import {
  buildStreetOnlyCity01Candidates,
  buildDisambiguationQueryKey,
  buildSearchQuery,
  classifySearchHits,
  deriveFolderDisplayPath,
  deriveLocalityHint,
  evaluateLocalResolution,
  isExifAuthoritativeOverWeakFilenameStreet,
  normalizeAddressForGrouping,
  pickDiscriminatingField,
  shouldForceStreetOnlyCityTray,
  shouldSplitGroupByPhotonUnitCoords,
} from './upload-location-resolution.helpers';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';
import type { UploadJob } from '../upload-manager.types';
import { DEFAULT_UPLOAD_LOCATION_CONFIG } from './upload-location-config';
import type { UploadSearchObject } from '../address-resolution/upload-address-resolution.types';

function so(partial: Partial<UploadSearchObject>): UploadSearchObject {
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
    relativePath: 'x',
    fileName: 'x.jpg',
    ...partial,
  };
}

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

  it('evaluateLocalResolution street_locality with street + city', () => {
    expect(evaluateLocalResolution(so({ street: 'Thaliastraße', city: 'Wien' }))).toBe('street_locality');
  });

  it('evaluateLocalResolution street_project_bias with project centroid', () => {
    expect(
      evaluateLocalResolution(so({ street: 'Thaliastraße', houseNumber: '4' }), {
        lat: 48.2,
        lng: 16.3,
      }),
    ).toBe('street_project_bias');
  });

  it('evaluateLocalResolution street_only without centroid', () => {
    expect(evaluateLocalResolution(so({ street: 'Thaliastraße' }))).toBe('street_only');
  });

  it('shouldSplitGroupByPhotonUnitCoords when units on SO and hits far apart', () => {
    expect(
      shouldSplitGroupByPhotonUnitCoords(
        { staircase: null, door: '12' },
        [
          { id: 'a', addressLabel: 'A', lat: 48.2, lng: 16.37 },
          { id: 'b', addressLabel: 'B', lat: 48.21, lng: 16.39 },
        ],
        25,
      ),
    ).toBe(true);
    expect(
      shouldSplitGroupByPhotonUnitCoords(
        { staircase: null, door: '12' },
        [{ id: 'a', addressLabel: 'A', lat: 48.2, lng: 16.37 }],
        25,
      ),
    ).toBe(false);
  });

  it('pickDiscriminatingField prefers city when cities differ', () => {
    const field = pickDiscriminatingField([
      {
        id: 'a',
        addressLabel: 'A',
        lat: 1,
        lng: 1,
        city: 'Vienna',
      },
      {
        id: 'b',
        addressLabel: 'B',
        lat: 2,
        lng: 2,
        city: 'Graz',
      },
    ]);
    expect(field).toBe('city');
  });

  it('isExifAuthoritativeOverWeakFilenameStreet for IMG_1121-style EXIF-only upload', () => {
    const groupState: UploadGroupResolutionState = {
      status: 'needsTray',
      groupingKey: 'at|||img',
      jobIds: ['job-1'],
      searchObject: so({
        street: 'IMG',
        fileName: 'IMG_1121.jpg',
        relativePath: 'IMG_1121.jpg',
        sources: [{ field: 'street', value: 'IMG', source: 'filename', confidence: 0.5 }],
      }),
      folderDisplayPath: '',
      titleAddressLabel: 'IMG',
      geocodeBranch: 'street_only',
      trayStep: '1a',
    };
    const job = {
      id: 'job-1',
      parsedExif: { coords: { lat: 48.170953, lng: 16.379047 } },
    } as UploadJob;
    expect(
      isExifAuthoritativeOverWeakFilenameStreet(groupState, () => job),
    ).toBe(true);
  });

  describe('shouldForceStreetOnlyCityTray (CITY-01)', () => {
    const streetOnlyGroup: Pick<UploadGroupResolutionState, 'geocodeBranch' | 'searchObject'> = {
      geocodeBranch: 'street_only',
      searchObject: so({ street: 'Neustiftgasse', city: null, houseNumber: null }),
    };

    const autoOutcome = {
      kind: 'auto' as const,
      candidate: {
        id: 'photon-1',
        addressLabel: 'Neustiftgasse, St. Pölten',
        lat: 48.2,
        lng: 15.62,
        city: 'St. Pölten',
      },
    };

    it('forces city tray when Photon city differs from EXIF reverse-geocode city (name, not distance)', () => {
      expect(
        shouldForceStreetOnlyCityTray(streetOnlyGroup, autoOutcome, 'Wien'),
      ).toBe(true);
    });

    it('does not force when cities match even if pins are far apart', () => {
      expect(
        shouldForceStreetOnlyCityTray(streetOnlyGroup, autoOutcome, 'St. Pölten'),
      ).toBe(false);
    });

    it('does not force when auto candidate city is null (CITY-02 path)', () => {
      expect(
        shouldForceStreetOnlyCityTray(
          streetOnlyGroup,
          {
            kind: 'auto',
            candidate: {
              id: 'photon-2',
              addressLabel: 'Neustiftgasse',
              lat: 48.2,
              lng: 15.62,
              city: null,
            },
          },
          'Wien',
        ),
      ).toBe(false);
    });

    it('does not force when EXIF reverse city is missing', () => {
      expect(shouldForceStreetOnlyCityTray(streetOnlyGroup, autoOutcome, null)).toBe(false);
      expect(shouldForceStreetOnlyCityTray(streetOnlyGroup, autoOutcome, '')).toBe(false);
    });

    it('does not force when Search Object already has city or house number', () => {
      expect(
        shouldForceStreetOnlyCityTray(
          { ...streetOnlyGroup, searchObject: so({ street: 'Neustiftgasse', city: 'Wien' }) },
          autoOutcome,
          'Graz',
        ),
      ).toBe(false);
      expect(
        shouldForceStreetOnlyCityTray(
          { ...streetOnlyGroup, searchObject: so({ street: 'Neustiftgasse', houseNumber: '12' }) },
          autoOutcome,
          'Graz',
        ),
      ).toBe(false);
    });

    it('buildStreetOnlyCity01Candidates yields two cities for pickDiscriminatingField', () => {
      const candidates = buildStreetOnlyCity01Candidates(
        autoOutcome.candidate,
        'Wien',
        { lat: 48.17, lng: 16.37 },
      );
      expect(candidates).toHaveLength(2);
      expect(pickDiscriminatingField(candidates)).toBe('city');
      expect(candidates.map((c) => c.city)).toEqual(['St. Pölten', 'Wien']);
    });
  });

  it('isExifAuthoritativeOverWeakFilenameStreet false when folder path present', () => {
    const groupState: UploadGroupResolutionState = {
      status: 'needsTray',
      groupingKey: 'k',
      jobIds: ['job-1'],
      searchObject: so({
        street: 'Musterstrasse',
        sources: [{ field: 'street', value: 'Musterstrasse', source: 'folder', confidence: 1 }],
      }),
      folderDisplayPath: 'Baustelle',
      titleAddressLabel: 'Musterstrasse',
      geocodeBranch: 'street_only',
      trayStep: '1a',
    };
    const job = {
      id: 'job-1',
      parsedExif: { coords: { lat: 48.17, lng: 16.37 } },
    } as UploadJob;
    expect(
      isExifAuthoritativeOverWeakFilenameStreet(groupState, () => job),
    ).toBe(false);
  });
});
