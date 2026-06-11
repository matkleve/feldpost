import { describe, expect, it, vi } from 'vitest';
import { routePreparedNewJob } from './upload-new-prepare-route.util';
import type { ParsedExif } from '../../upload.service';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'camera_001.jpg', { type: 'image/jpeg' }),
    phase: 'extracting_title',
    progress: 0,
    statusLabel: 'Checking filenameÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦',
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
    checkDedupHash: vi.fn().mockResolvedValue(null),
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

function createRouteDeps(options: {
  getJob: () => UploadJob;
  setJob: (job: UploadJob) => void;
  parsedAddress?: { address: string; confidence: 'high' | 'low' };
  mediaType?: 'photo' | 'document';
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
      findConflict: vi.fn().mockResolvedValue(null),
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
