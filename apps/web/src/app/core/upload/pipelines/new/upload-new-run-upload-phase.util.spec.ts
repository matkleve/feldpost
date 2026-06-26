import { describe, expect, it } from 'vitest';
import { resolveUploadPhaseInputs } from '../../location/upload-location-inputs.helpers';
import type { UploadJob } from '../../upload-manager.types';
import type { ParsedExif } from '../../upload.service';

function createJob(mode: UploadJob['locationRequirementMode']): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
    phase: 'uploading',
    progress: 0,
    statusLabel: 'Uploading',
    submittedAt: new Date(),
    mode: 'new',
    locationRequirementMode: mode,
  };
}

describe('resolveUploadPhaseInputs', () => {
  const coords = { lat: 48.2, lng: 16.37 };
  const parsedExif: ParsedExif = { coords, capturedAt: new Date() };

  it('passes coords through when auto location is required', () => {
    const result = resolveUploadPhaseInputs({
      job: createJob('required'),
      manualCoords: coords,
      parsedExif,
    });
    expect(result.coords).toEqual(coords);
    expect(result.parsedExif?.coords).toEqual(coords);
  });

  it('strips assignment coords when panel mode is optional', () => {
    const result = resolveUploadPhaseInputs({
      job: createJob('optional'),
      manualCoords: coords,
      parsedExif,
    });
    expect(result.coords).toBeUndefined();
    expect(result.parsedExif?.coords).toEqual(coords);
    expect(result.parsedExif?.capturedAt).toEqual(parsedExif.capturedAt);
  });
});
