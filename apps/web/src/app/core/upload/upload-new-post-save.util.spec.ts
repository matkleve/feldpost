import { describe, expect, it, vi } from 'vitest';
import { finalizeNewUploadPhase } from './upload-new-post-save.util';
import type { UploadJob } from './upload-manager.types';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
    phase: 'saving_record',
    progress: 100,
    statusLabel: 'Saving',
    submittedAt: new Date('2026-04-01T10:00:00.000Z'),
    mode: 'new',
    imageId: 'media-1',
    ...overrides,
  };
}

describe('finalizeNewUploadPhase', () => {
  it('records mismatch meters when EXIF and title-geocoded coordinates differ above tolerance', async () => {
    const phases: string[] = [];
    let job = createJobWithMismatch();

    await runFinalize(
      job,
      (next) => {
        job = next;
      },
      {
        setPhase: (phase) => phases.push(phase),
        geocodeTitleAddress: vi.fn().mockResolvedValue({ lat: 48.1372, lng: 11.5756 }),
      },
    );

    expect(phases).toContain('resolving_coordinates');
    expect(job.titleAddressCoords).toEqual({ lat: 48.1372, lng: 11.5756 });
    expect(job.locationMismatchMeters).toBeTypeOf('number');
    expect(job.locationMismatchMeters).toBeGreaterThan(15);
  });

  it('does not set mismatch when coordinates are within tolerance', async () => {
    let job = createJob({
      coords: { lat: 48.2082, lng: 16.3738 },
      titleAddress: 'Test',
    });

    await runFinalize(
      job,
      (next) => {
        job = next;
      },
      {
        geocodeTitleAddress: vi.fn().mockResolvedValue({ lat: 48.20820005, lng: 16.37380005 }),
      },
    );

    expect(job.titleAddressCoords).toEqual({ lat: 48.20820005, lng: 16.37380005 });
    expect(job.locationMismatchMeters).toBeUndefined();
  });
});

function createJobWithMismatch(): UploadJob {
  return createJob({
    coords: { lat: 48.2082, lng: 16.3738 },
    titleAddress: 'Marienplatz 1, Muenchen',
  });
}

async function runFinalize(
  job: UploadJob,
  onUpdate: (job: UploadJob) => void,
  overrides: {
    setPhase?: (phase: 'resolving_address' | 'resolving_coordinates' | 'complete') => void;
    geocodeTitleAddress?: () => Promise<{ lat: number; lng: number } | undefined>;
  } = {},
): Promise<void> {
  await finalizeNewUploadPhase({
    jobId: job.id,
    isCancelled: () => false,
    findJob: () => job,
    setPhase: overrides.setPhase ?? vi.fn(),
    updateJob: (patch) => {
      const next = { ...job, ...patch };
      job = next;
      onUpdate(next);
    },
    markDone: vi.fn(),
    emitBatchProgress: vi.fn(),
    drainQueue: vi.fn(),
    enrichWithReverseGeocode: vi.fn(),
    enrichWithForwardGeocode: vi.fn(),
    geocodeTitleAddress:
      overrides.geocodeTitleAddress ?? vi.fn().mockResolvedValue({ lat: 48.2082, lng: 16.3738 }),
    mismatchToleranceMeters: 15,
    setLocalUrl: vi.fn(),
    emitImageUploaded: vi.fn(),
  });
}
