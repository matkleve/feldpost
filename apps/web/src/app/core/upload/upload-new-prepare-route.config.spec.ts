import { describe, expect, it, vi } from 'vitest';
import { routePreparedNewJob } from './upload-new-prepare-route.util';
import { DEFAULT_UPLOAD_LOCATION_CONFIG } from './upload-location-config';
import type { UploadJob } from './upload-manager.types';
import type { PipelineContext } from './upload-manager.types';

type AddressParseResult = { address: string; confidence: 'high' | 'low' } | undefined;

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-config-1',
    batchId: 'batch-config-1',
    file: new File(['x'], 'camera_001.jpg', { type: 'image/jpeg' }),
    phase: 'extracting_title',
    progress: 0,
    statusLabel: 'Checking filename…',
    submittedAt: new Date('2026-04-01T10:00:00.000Z'),
    mode: 'new',
    ...overrides,
  };
}

describe('routePreparedNewJob config overrides', () => {
  it('routes to missing_data when titleConfidenceThreshold is higher than mapped high-confidence score', async () => {
    let job = createJob();

    const { deps, ctx } = createRouteHarness(
      () => job,
      (next) => {
        job = next;
      },
      {
        parsedAddress: { address: 'Arsenalstrasse 3, Wien', confidence: 'high' },
        configPatch: { titleConfidenceThreshold: 1.1 },
      },
    );

    const runUploadPhase = vi.fn().mockResolvedValue(undefined);

    await routePreparedNewJob(deps, job.id, job, {}, ctx as PipelineContext, runUploadPhase);

    expect(job.issueKind).toBe('missing_gps');
    expect(runUploadPhase).not.toHaveBeenCalled();
  });

  it('uses inherited folder candidate before EXIF fallback when file candidate is missing', async () => {
    let job = createJob({
      coords: { lat: 48.2082, lng: 16.3738 },
      titleAddress: 'Denisgasse 12, Wien',
      titleAddressSource: 'folder',
    });

    const { deps, ctx } = createRouteHarness(
      () => job,
      (next) => {
        job = next;
      },
      {
        parsedAddress: undefined,
        configPatch: { titleConfidenceThreshold: 0.8 },
      },
    );

    const runUploadPhase = vi.fn().mockResolvedValue(undefined);

    await routePreparedNewJob(deps, job.id, job, {}, ctx as PipelineContext, runUploadPhase);

    expect(job.locationSourceUsed).toBe('folder');
    expect(runUploadPhase).toHaveBeenCalledWith(job.id, undefined, {}, expect.anything());
  });
});

function createRouteHarness(
  getJob: () => UploadJob,
  setJob: (next: UploadJob) => void,
  options: {
    parsedAddress: AddressParseResult;
    configPatch?: Partial<typeof DEFAULT_UPLOAD_LOCATION_CONFIG>;
  },
): { deps: Parameters<typeof routePreparedNewJob>[0]; ctx: PipelineContext } {
  const deps = createRouteDeps(getJob, setJob, options);
  const ctx = createPipelineContextMock() as PipelineContext;
  return { deps, ctx };
}

function createRouteDeps(
  getJob: () => UploadJob,
  setJob: (next: UploadJob) => void,
  options: {
    parsedAddress: AddressParseResult;
    configPatch?: Partial<typeof DEFAULT_UPLOAD_LOCATION_CONFIG>;
  },
): Parameters<typeof routePreparedNewJob>[0] {
  const deps = {
    jobState: {
      setPhase: vi.fn(),
      updateJob: vi.fn((_jobId: string, patch: Partial<UploadJob>) => {
        setJob({ ...getJob(), ...patch });
      }),
      findJob: vi.fn(() => getJob()),
    },
    queue: {
      markDone: vi.fn(),
    },
    uploadService: {
      resolveMediaType: vi.fn().mockReturnValue('photo'),
    },
    filenameParser: {
      extractAddress: vi.fn().mockReturnValue(options.parsedAddress),
    },
    locationConfig: {
      getConfig: vi.fn().mockReturnValue({
        ...DEFAULT_UPLOAD_LOCATION_CONFIG,
        ...options.configPatch,
      }),
    },
    conflictService: {
      findConflict: vi.fn().mockResolvedValue(null),
    },
    attachPipeline: {
      run: vi.fn(),
    },
  } as unknown as Parameters<typeof routePreparedNewJob>[0];

  return deps;
}

function createPipelineContextMock() {
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
