import { describe, expect, it, vi } from 'vitest';
import { awaitHeicConversionForUpload, routePreparedNewJob } from './upload-new-prepare-route.util';
import type { ParsedExif } from '../../upload.service';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'camera_001.jpg', { type: 'image/jpeg' }),
    phase: 'extracting_title',
    progress: 0,
    statusLabel: 'Checking filename…',
    submittedAt: new Date('2026-04-01T10:00:00.000Z'),
    mode: 'new',
    ...overrides,
  };
}

function createPipelineContext(): PipelineContext {
  return {
    failJob: vi.fn(),
    emitBatchProgress: vi.fn(),
    drainQueue: vi.fn(),
    getAbortSignal: vi.fn().mockReturnValue(undefined),
    abortJobRequest: vi.fn(),
    checkDedupHash: vi.fn().mockResolvedValue(null),
    getCurrentUserId: vi.fn().mockReturnValue('user-1'),
    emitDuplicateDetected: vi.fn(),
    emitUploadSkipped: vi.fn(),
    emitImageUploaded: vi.fn(),
    emitImageReplaced: vi.fn(),
    emitImageAttached: vi.fn(),
    emitMissingData: vi.fn(),
    emitLocationConflict: vi.fn(),
  };
}

describe('routePreparedNewJob', () => {
  it('uses inherited folder title address when filename parse is not high confidence', async () => {
    let job = createJob({
      titleAddress: 'Denisgasse 12, Wien',
      titleAddressSource: 'folder',
      titleAddressCoords: { lat: 48.2082, lng: 16.3738 },
      coords: { lat: 48.2082, lng: 16.3738 },
      locationSourceUsed: 'folder',
    });

    const deps = createRouteDeps({
      getJob: () => job,
      setJob: (next) => {
        job = next;
      },
    });

    const ctx = createPipelineContext();
    const runUploadPhase = vi.fn().mockResolvedValue(undefined);

    const parsedExif: ParsedExif = {};
    await routePreparedNewJob(
      deps as Parameters<typeof routePreparedNewJob>[0],
      job.id,
      job,
      parsedExif,
      ctx,
      runUploadPhase,
    );

    expectFolderFallbackResult(job, ctx, runUploadPhase);
  });
});

describe('routePreparedNewJob source precedence (positive branches)', () => {
  it('uses exif source when coordinates are already available', async () => {
    let job = createJob({
      coords: { lat: 48.2082, lng: 16.3738 },
      locationSourceUsed: 'exif',
    });
    const deps = createRouteDeps({
      getJob: () => job,
      setJob: (next) => {
        job = next;
      },
    });

    const runUploadPhase = vi.fn().mockResolvedValue(undefined);
    await routePreparedNewJob(
      deps as Parameters<typeof routePreparedNewJob>[0],
      job.id,
      job,
      {},
      createPipelineContext(),
      runUploadPhase,
    );

    expect(job.locationSourceUsed).toBe('exif');
    expect(runUploadPhase).toHaveBeenCalledOnce();
  });

  it('uploads when placement coords were set in pre-resolve', async () => {
    let job = createJob({
      titleAddress: 'Arsenalstrasse 3, Wien',
      titleAddressSource: 'file',
      titleAddressCoords: { lat: 48.2082, lng: 16.3738 },
      coords: { lat: 48.2082, lng: 16.3738 },
      locationSourceUsed: 'file',
    });
    const deps = createRouteDeps({
      getJob: () => job,
      setJob: (next) => {
        job = next;
      },
    });

    const ctx = createPipelineContext();
    const runUploadPhase = vi.fn().mockResolvedValue(undefined);

    await routePreparedNewJob(
      deps as Parameters<typeof routePreparedNewJob>[0],
      job.id,
      job,
      { coords: { lat: 48.2, lng: 16.37 } },
      ctx,
      runUploadPhase,
    );

    expect(job.locationSourceUsed).toBe('file');
    expect(runUploadPhase).toHaveBeenCalledOnce();
    expect(runUploadPhase).toHaveBeenCalledWith(
      job.id,
      job.coords,
      expect.objectContaining({ coords: { lat: 48.2, lng: 16.37 } }),
      expect.anything(),
    );
  });
});

describe('routePreparedNewJob locationRequirementMode optional', () => {
  it('uploads without auto location when panel mode is optional despite EXIF coords', async () => {
    let job = createJob({
      locationRequirementMode: 'optional',
      coords: { lat: 48.2082, lng: 16.3738 },
    });
    const deps = createRouteDeps({
      getJob: () => job,
      setJob: (next) => {
        job = next;
      },
      parsedAddress: { address: 'Denisgasse 46, Wien', confidence: 'high' },
    });

    const runUploadPhase = vi.fn().mockResolvedValue(undefined);
    await routePreparedNewJob(
      deps as Parameters<typeof routePreparedNewJob>[0],
      job.id,
      job,
      { coords: { lat: 48.2082, lng: 16.3738 } },
      createPipelineContext(),
      runUploadPhase,
    );

    expect(job.locationSourceUsed).toBe('none');
    expect(job.titleAddress).toBeUndefined();
    expect(job.coords).toBeUndefined();
    expect(runUploadPhase).toHaveBeenCalledWith(job.id, undefined, expect.anything(), expect.anything());
  });
});

describe('routePreparedNewJob source precedence (unresolved branches)', () => {
  it('routes to issues and marks source none when no exif and no reliable title', async () => {
    let job = createJob({ titleAddress: undefined, titleAddressSource: undefined });
    const deps = createRouteDeps({
      getJob: () => job,
      setJob: (next) => {
        job = next;
      },
      parsedAddress: undefined,
      mediaType: 'photo',
    });

    const ctx = createPipelineContext();
    const runUploadPhase = vi.fn().mockResolvedValue(undefined);

    await routePreparedNewJob(
      deps as Parameters<typeof routePreparedNewJob>[0],
      job.id,
      job,
      {},
      ctx,
      runUploadPhase,
    );

    expect(job.issueKind).toBe('missing_gps');
    expect(job.locationSourceUsed).toBe('none');
    expect(runUploadPhase).not.toHaveBeenCalled();
  });

  it('routes documents without reliable location to document_unresolved with source none', async () => {
    let job = createJob({ titleAddress: undefined, titleAddressSource: undefined });
    const deps = createRouteDeps({
      getJob: () => job,
      setJob: (next) => {
        job = next;
      },
      parsedAddress: undefined,
      mediaType: 'document',
    });

    await routePreparedNewJob(
      deps as Parameters<typeof routePreparedNewJob>[0],
      job.id,
      job,
      {},
      createPipelineContext(),
      vi.fn().mockResolvedValue(undefined),
    );

    expect(job.issueKind).toBe('document_unresolved');
    expect(job.locationSourceUsed).toBe('none');
  });
});

// @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
describe('routePreparedNewJob conflict routing', () => {
  it('sets issueKind=conflict_review at the point a location conflict is created', async () => {
    let job = createJob({ coords: { lat: 48.2082, lng: 16.3738 } });
    const deps = createRouteDeps({
      getJob: () => job,
      setJob: (next) => {
        job = next;
      },
      conflictCandidate: { mediaId: 'media-1' },
    });

    const ctx = createPipelineContext();
    const runUploadPhase = vi.fn().mockResolvedValue(undefined);

    await routePreparedNewJob(
      deps as Parameters<typeof routePreparedNewJob>[0],
      job.id,
      job,
      {},
      ctx,
      runUploadPhase,
    );

    expect(deps.jobState.setPhase).toHaveBeenCalledWith(job.id, 'awaiting_conflict_resolution');
    expect(job.issueKind).toBe('conflict_review');
    expect(runUploadPhase).not.toHaveBeenCalled();
  });
});

describe('awaitHeicConversionForUpload', () => {
  // @see docs/audits/upload-process-analysis-2026-09-08/03-branch-matrix.md M3
  // @see docs/audits/upload-process-analysis-2026-09-08/09-coverage.md § 4 T9
  it('rejects when convertToJpeg fails, so the pipeline never reaches uploadFile with the original blob', async () => {
    const job = createJob({ id: 'heic-job', file: new File(['x'], 'IMG_0001.HEIC', { type: 'image/heic' }) });
    const jobState = {
      findJob: vi.fn(() => job),
      updateJob: vi.fn(),
      setPhase: vi.fn(),
    };
    const uploadService = {
      isHeic: vi.fn().mockReturnValue(true),
      convertToJpeg: vi.fn().mockRejectedValue(new Error('HEIC_CONVERSION_FAILED')),
    };

    await expect(
      awaitHeicConversionForUpload(
        { jobState, uploadService } as unknown as Parameters<typeof awaitHeicConversionForUpload>[0],
        job.id,
      ),
    ).rejects.toThrow('HEIC_CONVERSION_FAILED');

    // The gate rejected before producing a converted file — nothing downstream
    // was ever handed a JPEG to upload from the original HEIC blob.
    expect(uploadService.convertToJpeg).toHaveBeenCalledWith(job.file);
  });

  it('resolves without error for a non-HEIC file, allowing upload to proceed', async () => {
    const job = createJob({ id: 'jpeg-job', file: new File(['x'], 'camera_001.jpg', { type: 'image/jpeg' }) });
    const jobState = { findJob: vi.fn(() => job), updateJob: vi.fn(), setPhase: vi.fn() };
    const uploadService = { isHeic: vi.fn().mockReturnValue(false), convertToJpeg: vi.fn() };

    await expect(
      awaitHeicConversionForUpload(
        { jobState, uploadService } as unknown as Parameters<typeof awaitHeicConversionForUpload>[0],
        job.id,
      ),
    ).resolves.toBeUndefined();

    expect(uploadService.convertToJpeg).not.toHaveBeenCalled();
  });
});

function createRouteDeps(options: {
  getJob: () => UploadJob;
  setJob: (job: UploadJob) => void;
  parsedAddress?: { address: string; confidence: 'high' | 'low' };
  mediaType?: 'photo' | 'document';
  conflictCandidate?: { mediaId: string };
}): Parameters<typeof routePreparedNewJob>[0] {
  const deps = {
    jobState: {
      setPhase: vi.fn(),
      updateJob: vi.fn((_jobId: string, patch: Partial<UploadJob>) => {
        options.setJob({ ...options.getJob(), ...patch });
      }),
      findJob: vi.fn(() => options.getJob()),
    },
    queue: {
      markDone: vi.fn(),
    },
    uploadService: {
      resolveMediaType: vi.fn().mockReturnValue(options.mediaType ?? 'photo'),
    },
    filenameParser: {
      extractAddress: vi.fn().mockReturnValue(options.parsedAddress),
    },
    locationConfig: {
      getConfig: vi.fn().mockReturnValue({
        titleConfidenceThreshold: 0.8,
        filenameAlwaysOverridesFolder: true,
      }),
    },
    conflictService: {
      findConflict: vi.fn().mockResolvedValue(options.conflictCandidate ?? null),
    },
    attachPipeline: {
      run: vi.fn(),
    },
  };

  return deps as unknown as Parameters<typeof routePreparedNewJob>[0];
}

function expectFolderFallbackResult(
  job: UploadJob,
  ctx: PipelineContext,
  runUploadPhase: ReturnType<typeof vi.fn>,
): void {
  expect(job.titleAddress).toBe('Denisgasse 12, Wien');
  expect(job.titleAddressSource).toBe('folder');
  expect(job.locationSourceUsed).toBe('folder');
  expect(job.issueKind).toBeUndefined();
  expect(runUploadPhase).toHaveBeenCalledOnce();
  expect(runUploadPhase).toHaveBeenCalledWith(job.id, job.coords, expect.anything(), expect.anything());
  expect(ctx.emitMissingData).not.toHaveBeenCalled();
}
