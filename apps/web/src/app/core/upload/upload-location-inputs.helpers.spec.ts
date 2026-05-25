import { describe, expect, it } from 'vitest';
import {
  resolveUploadPhaseInputs,
  stripPlacementCoordsFromParsedExif,
  usesTextPlacementSource,
} from './upload-location-inputs.helpers';
import type { UploadJob } from './upload-manager.types';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'IMG_1124.jpg', { type: 'image/jpeg' }),
    phase: 'uploading',
    progress: 0,
    statusLabel: 'Uploading',
    submittedAt: new Date(),
    mode: 'new',
    locationRequirementMode: 'required',
    locationSourceUsed: 'folder',
    ...overrides,
  };
}

describe('upload-location-inputs.helpers', () => {
  it('strips placement coords from parsed EXIF for text placement', () => {
    const parsed = stripPlacementCoordsFromParsedExif({
      coords: { lat: 48.2, lng: 16.37 },
      capturedAt: new Date(),
    });
    expect(parsed?.coords).toBeUndefined();
  });

  it('resolveUploadPhaseInputs clears EXIF placement when folder wins', () => {
    const job = createJob({ locationSourceUsed: 'folder' });
    const result = resolveUploadPhaseInputs({
      job,
      manualCoords: undefined,
      parsedExif: { coords: { lat: 48.2, lng: 16.37 } },
    });
    expect(result.coords).toBeUndefined();
    expect(result.parsedExif?.coords).toBeUndefined();
  });

  it('usesTextPlacementSource is true for file and folder', () => {
    expect(usesTextPlacementSource(createJob({ locationSourceUsed: 'folder' }))).toBe(true);
    expect(usesTextPlacementSource(createJob({ locationSourceUsed: 'file' }))).toBe(true);
    expect(usesTextPlacementSource(createJob({ locationSourceUsed: 'exif' }))).toBe(false);
  });
});
