import { describe, expect, it } from 'vitest';
import { DEFAULT_UPLOAD_LOCATION_CONFIG } from './upload-location-config';
import {
  applySourceConflictChoiceToJob,
  buildSourceConflictCandidates,
  formatSourceConflictDistance,
  haversineMeters,
  labelFromFolderDisplayPath,
  resolveFolderSourceOptionLabel,
  resolvePlacementAfterTextGeocode,
  resolvePlacementWithoutText,
  shouldHoldForSourceConflict,
  SOURCE_CONFLICT_BOTH_CANDIDATE_ID,
  SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
  SOURCE_CONFLICT_NONE_CANDIDATE_ID,
  SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
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

  it('buildSourceConflictCandidates exposes four choices without scores', () => {
    const text = { lat: 48.2082, lng: 16.3738 };
    const exif = { lat: 48.23, lng: 16.39 };
    const candidates = buildSourceConflictCandidates({
      folderAddress: 'Wolzeile, Vienna',
      photoAddress: 'Mariahilfer Straße, Vienna',
      textCoords: text,
      exifCoords: exif,
    });
    expect(candidates.map((c) => c.id)).toEqual([
      SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
      SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
      SOURCE_CONFLICT_BOTH_CANDIDATE_ID,
      SOURCE_CONFLICT_NONE_CANDIDATE_ID,
    ]);
    expect(candidates.every((c) => c.score === undefined)).toBe(true);
  });

  it('formatSourceConflictDistance uses m below 1 km and km above', () => {
    expect(formatSourceConflictDistance(150)).toBe('150 m');
    expect(formatSourceConflictDistance(1250)).toBe('1.3 km');
  });

  it('resolvePlacementWithoutText returns exif when metadata coords exist', () => {
    expect(
      resolvePlacementWithoutText(job({ parsedExif: { coords: { lat: 1, lng: 2 } } })),
    ).toBe('exif');
    expect(resolvePlacementWithoutText(job())).toBe('missing_data');
  });

  /** @see docs/specs/component/upload/upload-resolver-tray.question-copy.md */
  it('labelFromFolderDisplayPath uses leaf folder segment for tray copy', () => {
    expect(labelFromFolderDisplayPath('Projects/Bau/Thaliastraße 14')).toBe('Thaliastraße 14');
  });

  it('applySourceConflictChoiceToJob uses tray candidate coords when job has no parsedExif', () => {
    const result = applySourceConflictChoiceToJob(
      job({ parsedExif: undefined }),
      SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
      { lat: 48.2, lng: 16.37 },
    );
    expect(result.kind).toBe('placement');
    if (result.kind === 'placement') {
      expect(result.patch.coords).toEqual({ lat: 48.2, lng: 16.37 });
    }
  });

  it('resolveFolderSourceOptionLabel prefers folder path over SO with IMG house number', () => {
    const label = resolveFolderSourceOptionLabel({
      job: job({
        titleAddress: 'Thaliastraße',
        folderDisplayPath: 'Thaliastraße 14',
      }),
      groupState: {
        searchObject: {
          street: 'Thaliastraße',
          houseNumber: 'IMG 14',
          city: 'Wien',
          postcode: null,
          country: null,
          state: null,
          municipality: null,
          staircase: null,
          door: null,
          relativePath: 'Thaliastraße 14',
          fileName: 'photo.jpg',
          sources: [],
          deviations: [],
          uncertainFields: [],
        },
      } as never,
    });
    expect(label).toBe('Thaliastraße 14');
    expect(label).not.toMatch(/\bIMG\b/i);
  });
});
