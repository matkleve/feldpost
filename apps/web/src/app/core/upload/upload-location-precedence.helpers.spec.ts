import { describe, expect, it } from 'vitest';
import { DEFAULT_UPLOAD_LOCATION_CONFIG } from './upload-location-config';
import {
  haversineMeters,
  resolvePlacementAfterTextGeocode,
  resolvePlacementWithoutText,
  shouldHoldForSourceConflict,
} from './upload-location-precedence.helpers';
import type { UploadJob } from './upload-manager.types';

function job(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'j1',
    batchId: 'b1',
    file: new File([], 'a.jpg', { type: 'image/jpeg' }),
    phase: 'queued',
    progress: 0,
    statusLabel: '',
    submittedAt: new Date(),
    mode: 'new',
    ...overrides,
  };
}

describe('upload-location-precedence.helpers', () => {
  it('auto-agrees text when EXIF within sourceAgreementRadiusMeters', () => {
    const text = { lat: 48.2082, lng: 16.3738 };
    const exif = { lat: 48.20825, lng: 16.37385 };
    expect(haversineMeters(text, exif)).toBeLessThan(10);
    expect(
      shouldHoldForSourceConflict(text, exif, DEFAULT_UPLOAD_LOCATION_CONFIG),
    ).toBe(false);
    expect(
      resolvePlacementAfterTextGeocode(
        job({ titleAddressCoords: text, parsedExif: { coords: exif } }),
        DEFAULT_UPLOAD_LOCATION_CONFIG,
      ).kind,
    ).toBe('placed');
  });

  it('holds source conflict when EXIF is far from text coords', () => {
    const text = { lat: 48.2082, lng: 16.3738 };
    const exif = { lat: 48.23, lng: 16.39 };
    expect(shouldHoldForSourceConflict(text, exif, DEFAULT_UPLOAD_LOCATION_CONFIG)).toBe(true);
    expect(
      resolvePlacementAfterTextGeocode(
        job({ titleAddressCoords: text, parsedExif: { coords: exif } }),
        DEFAULT_UPLOAD_LOCATION_CONFIG,
      ).kind,
    ).toBe('held_source_conflict');
  });

  it('resolvePlacementWithoutText returns exif when metadata coords exist', () => {
    expect(
      resolvePlacementWithoutText(job({ parsedExif: { coords: { lat: 1, lng: 2 } } })),
    ).toBe('exif');
    expect(resolvePlacementWithoutText(job())).toBe('missing_data');
  });
});
