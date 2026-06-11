import { describe, expect, it } from 'vitest';
import { resolveUploadPhaseInputs, usesTextPlacementSource } from './upload-location-inputs.helpers';
import type { UploadJob } from '../upload-manager.types';

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
  it('resolveUploadPhaseInputs uses manualCoords for placement and keeps parsedExif intact', () => {
    const job = createJob({ locationSourceUsed: 'folder' });
    const parsedExif = { coords: { lat: 48.2, lng: 16.37 } };
    const result = resolveUploadPhaseInputs({
      job,
      manualCoords: { lat: 48.21, lng: 16.38 },
      parsedExif,
    });
    expect(result.coords).toEqual({ lat: 48.21, lng: 16.38 });
    expect(result.parsedExif?.coords).toEqual({ lat: 48.2, lng: 16.37 });
  });

  it('usesTextPlacementSource is true for file and folder', () => {
    expect(usesTextPlacementSource(createJob({ locationSourceUsed: 'folder' }))).toBe(true);
    expect(usesTextPlacementSource(createJob({ locationSourceUsed: 'file' }))).toBe(true);
    expect(usesTextPlacementSource(createJob({ locationSourceUsed: 'exif' }))).toBe(false);
  });
});
