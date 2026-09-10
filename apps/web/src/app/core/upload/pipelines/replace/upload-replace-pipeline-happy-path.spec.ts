/**
 * Happy-path coverage for the `replace` pipeline (351 LOC, previously 0 tests).
 * Drives the same two functions `UploadReplacePipelineService.run()` calls,
 * `prepareReplacePipelineJob` then `finishReplacePipelineJob`, so it exercises
 * production orchestration rather than a hand-rolled substitute.
 *
 * @see docs/audits/upload-process-analysis-2026-09-08/09-coverage.md § 4 T15
 */
import { describe, expect, it, vi } from 'vitest';
import {
  prepareReplacePipelineJob,
  type ReplacePipelineRunDeps,
} from './upload-replace-pipeline-run.util';
import { finishReplacePipelineJob } from './upload-replace-pipeline-finish.util';
import type { PipelineContext, UploadJob, UploadPhase } from '../../upload-manager.types';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'replacement.jpg', { type: 'image/jpeg' }),
    phase: 'queued',
    progress: 0,
    statusLabel: 'Queued',
    submittedAt: new Date('2026-04-01T10:00:00.000Z'),
    mode: 'replace',
    targetMediaId: 'media-existing',
    ...overrides,
  };
}

function buildSupabaseClientMock(options: { updateError?: { message: string } | null } = {}) {
  const removeStorage = vi.fn().mockResolvedValue({ data: null, error: null });
  const insertDedup = vi.fn().mockResolvedValue({ data: null, error: null });
  const updateEq = vi.fn().mockResolvedValue({ error: options.updateError ?? null });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  const targetMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'media-existing' }, error: null });
  const targetLimit = vi.fn().mockReturnValue({ maybeSingle: targetMaybeSingle });
  const targetOr = vi.fn().mockReturnValue({ limit: targetLimit });
  const targetSelect = vi.fn().mockReturnValue({ or: targetOr });

  const rowMaybeSingle = vi
    .fn()
    .mockResolvedValue({ data: { storage_path: 'org/u/old.jpg', thumbnail_path: null }, error: null });
  const rowLimit = vi.fn().mockReturnValue({ maybeSingle: rowMaybeSingle });
  const rowEq = vi.fn().mockReturnValue({ limit: rowLimit });
  const rowSelect = vi.fn().mockReturnValue({ eq: rowEq });

  const from = vi.fn((table: string) => {
    if (table === 'media_items') {
      // First call (in prepare) selects the target row, second (in prepare)
      // selects storage/thumbnail paths, third (in finish) updates it.
      return { select: from.mock.calls.filter((c) => c[0] === 'media_items').length <= 1 ? targetSelect : rowSelect, update };
    }
    if (table === 'dedup_hashes') {
      return { insert: insertDedup };
    }
    throw new Error(`unexpected table: ${table}`);
  });

  const client = {
    from,
    storage: { from: vi.fn().mockReturnValue({ remove: removeStorage }) },
  };

  return { client, removeStorage, insertDedup, update, updateEq };
}

function buildCtx(): PipelineContext {
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

describe('replace pipeline happy path', () => {
  it('runs validating -> parsing_exif -> hashing -> dedup_check -> uploading -> replacing_record -> complete', async () => {
    let job = createJob();
    const phases: UploadPhase[] = [];
    const { client } = buildSupabaseClientMock();

    const jobState = {
      findJob: vi.fn(() => job),
      updateJob: vi.fn((_id: string, patch: Partial<UploadJob>) => {
        job = { ...job, ...patch };
      }),
      setPhase: vi.fn((_id: string, phase: UploadPhase) => {
        phases.push(phase);
        job = { ...job, phase };
      }),
    };

    const deps: ReplacePipelineRunDeps = {
      uploadService: {
        validateFile: vi.fn().mockReturnValue({ valid: true }),
        parseExif: vi.fn().mockResolvedValue({ coords: { lat: 48.2, lng: 16.37 }, direction: 90 }),
        isHeic: vi.fn().mockReturnValue(false),
        isPhotoFile: vi.fn().mockReturnValue(true),
        resolveMediaType: vi.fn().mockReturnValue('photo'),
      } as unknown as ReplacePipelineRunDeps['uploadService'],
      supabaseClient: client as unknown as ReplacePipelineRunDeps['supabaseClient'],
      mediaDownloadService: { setLocalUrl: vi.fn() } as unknown as ReplacePipelineRunDeps['mediaDownloadService'],
      jobState: jobState as unknown as ReplacePipelineRunDeps['jobState'],
      queue: { markDone: vi.fn() } as unknown as ReplacePipelineRunDeps['queue'],
      storage: { upload: vi.fn().mockResolvedValue('org/u/new.jpg') } as unknown as ReplacePipelineRunDeps['storage'],
      getUser: () => ({ id: 'user-1' }) as never,
      isCancelled: () => false,
    };

    const ctx = buildCtx();

    const prepared = await prepareReplacePipelineJob(job.id, ctx, deps);
    expect(prepared).not.toBeNull();

    await finishReplacePipelineJob(job.id, ctx, prepared!, undefined, deps);

    expect(phases).toEqual([
      'validating',
      'parsing_exif',
      'hashing',
      'dedup_check',
      'uploading',
      'replacing_record',
      'complete',
    ]);
    expect(job.mediaId).toBe('media-existing');
    expect(job.storagePath).toBe('org/u/new.jpg');
    expect(ctx.failJob).not.toHaveBeenCalled();
    expect(ctx.emitImageReplaced).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: job.id, mediaId: 'media-existing', newStoragePath: 'org/u/new.jpg' }),
    );
  });

  it('cleans up the old storage/thumbnail paths after a successful replace', async () => {
    let job = createJob();
    const { client, removeStorage } = buildSupabaseClientMock();

    const jobState = {
      findJob: vi.fn(() => job),
      updateJob: vi.fn((_id: string, patch: Partial<UploadJob>) => {
        job = { ...job, ...patch };
      }),
      setPhase: vi.fn((_id: string, phase: UploadPhase) => {
        job = { ...job, phase };
      }),
    };

    const deps: ReplacePipelineRunDeps = {
      uploadService: {
        validateFile: vi.fn().mockReturnValue({ valid: true }),
        parseExif: vi.fn().mockResolvedValue({}),
        isHeic: vi.fn().mockReturnValue(false),
        isPhotoFile: vi.fn().mockReturnValue(true),
        resolveMediaType: vi.fn().mockReturnValue('photo'),
      } as unknown as ReplacePipelineRunDeps['uploadService'],
      supabaseClient: client as unknown as ReplacePipelineRunDeps['supabaseClient'],
      mediaDownloadService: { setLocalUrl: vi.fn() } as unknown as ReplacePipelineRunDeps['mediaDownloadService'],
      jobState: jobState as unknown as ReplacePipelineRunDeps['jobState'],
      queue: { markDone: vi.fn() } as unknown as ReplacePipelineRunDeps['queue'],
      storage: { upload: vi.fn().mockResolvedValue('org/u/new.jpg') } as unknown as ReplacePipelineRunDeps['storage'],
      getUser: () => ({ id: 'user-1' }) as never,
      isCancelled: () => false,
    };

    const ctx = buildCtx();
    const prepared = await prepareReplacePipelineJob(job.id, ctx, deps);
    await finishReplacePipelineJob(job.id, ctx, prepared!, undefined, deps);

    expect(removeStorage).toHaveBeenCalledWith(['org/u/old.jpg']);
  });
});
