import { describe, expect, it, vi } from 'vitest';
import { mergeTitleCandidateOnJob } from './upload-new-pre-resolve.util';
import type { UploadJob } from '../../upload-manager.types';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'IMG_1311.jpg', { type: 'image/jpeg' }),
    phase: 'queued',
    progress: 0,
    statusLabel: 'Queued',
    submittedAt: new Date(),
    mode: 'new',
    groupingKey: 'fuchsthalergasse-4|wien',
    titleAddress: 'Fuchsthalergasse 4, Wien',
    titleAddressSource: 'folder',
    ...overrides,
  };
}

describe('mergeTitleCandidateOnJob', () => {
  it('keeps Search Object folder title when groupingKey is set', () => {
    const job = createJob();
    const updateJob = vi.fn();
    const deps = {
      jobState: {
        findJob: vi.fn(() => job),
        updateJob,
      },
      filenameParser: {
        extractAddress: vi.fn().mockReturnValue({ address: 'IMG 1311', confidence: 'low' }),
      },
      locationConfig: {
        getConfig: vi.fn().mockReturnValue({
          titleConfidenceThreshold: 0.8,
          filenameAlwaysOverridesFolder: true,
        }),
      },
      addressOrchestrator: {
        getGroupState: vi.fn().mockReturnValue({
          searchObject: {
            street: 'Fuchsthalergasse',
            houseNumber: '4',
            city: 'Wien',
          },
        }),
      },
    };

    const result = mergeTitleCandidateOnJob(
      deps as Parameters<typeof mergeTitleCandidateOnJob>[0],
      job.id,
      job,
    );

    expect(result.highConfidence).toBe(true);
    expect(result.titleAddress).toBe('Fuchsthalergasse 4, Wien');
    expect(updateJob).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({
        titleAddress: 'Fuchsthalergasse 4, Wien',
        titleAddressSource: 'folder',
      }),
    );
  });

  it('prefers high-confidence folder over low-confidence filename parse', () => {
    const job = createJob({ groupingKey: undefined, titleAddress: 'Fuchsthalergasse 4' });
    const updateJob = vi.fn();
    const deps = {
      jobState: { findJob: vi.fn(() => job), updateJob },
      filenameParser: {
        extractAddress: vi.fn().mockReturnValue({ address: 'IMG 1311', confidence: 'low' }),
      },
      locationConfig: {
        getConfig: vi.fn().mockReturnValue({
          titleConfidenceThreshold: 0.8,
          filenameAlwaysOverridesFolder: true,
        }),
      },
    };

    const result = mergeTitleCandidateOnJob(
      deps as Parameters<typeof mergeTitleCandidateOnJob>[0],
      job.id,
      job,
    );

    expect(result.highConfidence).toBe(true);
    expect(updateJob).toHaveBeenCalledWith(
      job.id,
      expect.objectContaining({
        titleAddress: 'Fuchsthalergasse 4',
        titleAddressSource: 'folder',
      }),
    );
  });
});

describe('runPreUploadLocationResolve -- text before EXIF', () => {
  it('geocodes folder text before EXIF-only when titleAddressCoords are missing', async () => {
    const exifCoords = { lat: 48.21, lng: 16.37 };
    let job = createJob({
      titleAddress: 'Thaliastraße, Wien',
      titleAddressSource: 'folder',
      parsedExif: { coords: exifCoords },
      groupingKey: undefined,
    });

    const resolveJobTitleAddress = vi.fn().mockImplementation(async () => {
      job = { ...job, titleAddressCoords: { lat: 48.199, lng: 16.35 } };
      return 'continue' as const;
    });

    const finalizePlacementForJob = vi.fn().mockImplementation(() => {
      if (job.titleAddressCoords) {
        job = {
          ...job,
          coords: job.titleAddressCoords,
          locationSourceUsed: 'folder',
        };
      }
      return false;
    });

    const { runPreUploadLocationResolve } = await import('./upload-new-pre-resolve.util');
    const deps = {
      jobState: {
        findJob: vi.fn(() => job),
        updateJob: vi.fn((_id: string, patch: Partial<typeof job>) => {
          job = { ...job, ...patch };
        }),
        setPhase: vi.fn(),
      },
      queue: { markDone: vi.fn() },
      uploadService: {
        resolveMediaType: vi.fn().mockReturnValue('photo'),
        isPhotoFile: vi.fn().mockReturnValue(false),
      },
      filenameParser: { extractAddress: vi.fn().mockReturnValue(undefined) },
      locationConfig: {
        getConfig: vi.fn().mockReturnValue({
          titleConfidenceThreshold: 0.8,
          filenameAlwaysOverridesFolder: true,
        }),
      },
      locationResolution: { resolveJobTitleAddress, finalizePlacementForJob },
      addressOrchestrator: {},
    };
    const ctx = {
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      emitMissingData: vi.fn(),
      failJob: vi.fn(),
      emitUploadSkipped: vi.fn(),
      emitImageUploaded: vi.fn(),
      emitImageReplaced: vi.fn(),
      emitImageAttached: vi.fn(),
      emitLocationConflict: vi.fn(),
      getAbortSignal: vi.fn(),
      checkDedupHash: vi.fn().mockResolvedValue(null),
      getCurrentUserId: vi.fn().mockReturnValue('user-1'),
      claimBatchHash: vi.fn().mockReturnValue(null),
      mergeDuplicateAddress: vi.fn(),
      attachAddressToMedia: vi.fn(),
      emitDuplicateDetected: vi.fn(),
    };

    await runPreUploadLocationResolve(deps as never, job.id, job.parsedExif ?? {}, ctx as never);

    expect(resolveJobTitleAddress).toHaveBeenCalled();
    expect(job.locationSourceUsed).toBe('folder');
    expect(job.coords).toEqual({ lat: 48.199, lng: 16.35 });
  });

  it('skips upload when content-hash dedup finds a match in required (non-optional) mode', async () => {
    let job = createJob({
      groupingKey: undefined,
      titleAddress: undefined,
      titleAddressSource: undefined,
      coords: { lat: 48.2, lng: 16.37 },
    });

    const { runPreUploadLocationResolve } = await import('./upload-new-pre-resolve.util');
    const deps = {
      jobState: {
        findJob: vi.fn(() => job),
        updateJob: vi.fn((_id: string, patch: Partial<typeof job>) => {
          job = { ...job, ...patch };
        }),
        setPhase: vi.fn((_id: string, phase: typeof job.phase) => {
          job = { ...job, phase };
        }),
      },
      queue: { markDone: vi.fn() },
      uploadService: {
        resolveMediaType: vi.fn().mockReturnValue('photo'),
        isPhotoFile: vi.fn().mockReturnValue(true),
      },
      filenameParser: { extractAddress: vi.fn().mockReturnValue(undefined) },
      locationConfig: {
        getConfig: vi.fn().mockReturnValue({
          titleConfidenceThreshold: 0.8,
          filenameAlwaysOverridesFolder: true,
        }),
      },
      locationResolution: {},
      addressOrchestrator: {},
    };
    const ctx = {
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      emitMissingData: vi.fn(),
      failJob: vi.fn(),
      emitUploadSkipped: vi.fn(),
      emitImageUploaded: vi.fn(),
      emitImageReplaced: vi.fn(),
      emitImageAttached: vi.fn(),
      emitLocationConflict: vi.fn(),
      getAbortSignal: vi.fn(),
      checkDedupHash: vi.fn().mockResolvedValue({
        mediaItemId: 'existing-media-id',
        registeredByUserId: 'user-1',
      }),
      getCurrentUserId: vi.fn().mockReturnValue('user-1'),
      claimBatchHash: vi.fn().mockReturnValue(null),
      mergeDuplicateAddress: vi.fn(),
      attachAddressToMedia: vi.fn(),
      emitDuplicateDetected: vi.fn(),
    };

    const outcome = await runPreUploadLocationResolve(
      deps as never,
      job.id,
      job.parsedExif ?? {},
      ctx as never,
    );

    expect(outcome).toBe('dedup_skip');
    expect(job.existingMediaId).toBe('existing-media-id');
    expect(job.phase).toBe('skipped');
    expect(deps.queue.markDone).toHaveBeenCalledWith(job.id);
    expect(ctx.emitUploadSkipped).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: job.id, existingMediaId: 'existing-media-id' }),
    );
  });

  it('skips a duplicate without an address before it would be routed to "missing data"', async () => {
    let job = createJob({
      groupingKey: undefined,
      titleAddress: undefined,
      titleAddressSource: undefined,
      coords: undefined,
      parsedExif: undefined,
    });

    const { runPreUploadLocationResolve } = await import('./upload-new-pre-resolve.util');
    const deps = {
      jobState: {
        findJob: vi.fn(() => job),
        updateJob: vi.fn((_id: string, patch: Partial<typeof job>) => {
          job = { ...job, ...patch };
        }),
        setPhase: vi.fn((_id: string, phase: typeof job.phase) => {
          job = { ...job, phase };
        }),
      },
      queue: { markDone: vi.fn() },
      uploadService: {
        resolveMediaType: vi.fn().mockReturnValue('photo'),
        isPhotoFile: vi.fn().mockReturnValue(true),
      },
      filenameParser: { extractAddress: vi.fn().mockReturnValue(undefined) },
      locationConfig: {
        getConfig: vi.fn().mockReturnValue({
          titleConfidenceThreshold: 0.8,
          filenameAlwaysOverridesFolder: true,
        }),
      },
      locationResolution: {},
      addressOrchestrator: {},
    };
    const ctx = {
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      emitMissingData: vi.fn(),
      failJob: vi.fn(),
      emitUploadSkipped: vi.fn(),
      emitImageUploaded: vi.fn(),
      emitImageReplaced: vi.fn(),
      emitImageAttached: vi.fn(),
      emitLocationConflict: vi.fn(),
      getAbortSignal: vi.fn(),
      checkDedupHash: vi.fn().mockResolvedValue({
        mediaItemId: 'existing-media-id',
        registeredByUserId: 'user-1',
      }),
      getCurrentUserId: vi.fn().mockReturnValue('user-1'),
      claimBatchHash: vi.fn().mockReturnValue(null),
      mergeDuplicateAddress: vi.fn(),
      attachAddressToMedia: vi.fn(),
      emitDuplicateDetected: vi.fn(),
    };

    const outcome = await runPreUploadLocationResolve(
      deps as never,
      job.id,
      job.parsedExif ?? {},
      ctx as never,
    );

    expect(outcome).toBe('dedup_skip');
    expect(job.phase).toBe('skipped');
    expect(ctx.emitMissingData).not.toHaveBeenCalled();
    expect(ctx.emitUploadSkipped).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: job.id, existingMediaId: 'existing-media-id' }),
    );
  });

  it('keeps duplicate bypass active across both pre-resolve dedup passes', async () => {
    let job = createJob({
      groupingKey: undefined,
      titleAddress: undefined,
      titleAddressSource: undefined,
      coords: { lat: 48.2, lng: 16.37 },
      forceDuplicateUpload: true,
    });

    const { runPreUploadLocationResolve } = await import('./upload-new-pre-resolve.util');
    const deps = {
      jobState: {
        findJob: vi.fn(() => job),
        updateJob: vi.fn((_id: string, patch: Partial<typeof job>) => {
          job = { ...job, ...patch };
        }),
        setPhase: vi.fn((_id: string, phase: typeof job.phase) => {
          job = { ...job, phase };
        }),
      },
      queue: { markDone: vi.fn() },
      uploadService: {
        resolveMediaType: vi.fn().mockReturnValue('photo'),
        isPhotoFile: vi.fn().mockReturnValue(true),
      },
      filenameParser: { extractAddress: vi.fn().mockReturnValue(undefined) },
      locationConfig: {
        getConfig: vi.fn().mockReturnValue({
          titleConfidenceThreshold: 0.8,
          filenameAlwaysOverridesFolder: true,
        }),
      },
      locationResolution: {},
      addressOrchestrator: {},
    };
    const ctx = {
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      emitMissingData: vi.fn(),
      failJob: vi.fn(),
      emitUploadSkipped: vi.fn(),
      emitImageUploaded: vi.fn(),
      emitImageReplaced: vi.fn(),
      emitImageAttached: vi.fn(),
      emitLocationConflict: vi.fn(),
      getAbortSignal: vi.fn(),
      checkDedupHash: vi.fn().mockResolvedValue({
        mediaItemId: 'existing-media-id',
        registeredByUserId: 'user-1',
      }),
      getCurrentUserId: vi.fn().mockReturnValue('user-1'),
      claimBatchHash: vi.fn().mockReturnValue(null),
      mergeDuplicateAddress: vi.fn(),
      attachAddressToMedia: vi.fn(),
      emitDuplicateDetected: vi.fn(),
    };

    const outcome = await runPreUploadLocationResolve(
      deps as never,
      job.id,
      job.parsedExif ?? {},
      ctx as never,
    );

    expect(outcome).toBe('continue');
    expect(ctx.checkDedupHash).not.toHaveBeenCalled();
    expect(job.phase).toBe('extracting_title');
    expect(ctx.emitUploadSkipped).not.toHaveBeenCalled();
  });
});
