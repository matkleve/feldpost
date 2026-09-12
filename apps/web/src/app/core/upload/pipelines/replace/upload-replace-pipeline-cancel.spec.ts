/**
 * Replace cancel path: restore pre-existing row when cancelled after DB update.
 * @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-02
 */
import { describe, expect, it, vi } from 'vitest';
import { finishReplacePipelineJob } from './upload-replace-pipeline-finish.util';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';
import type { ReplacePipelineFinishDeps } from './upload-replace-pipeline-finish.util';
import type { ReplacePipelinePrepared } from './upload-replace-pipeline-run.util';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'replacement.jpg', { type: 'image/jpeg' }),
    phase: 'replacing_record',
    progress: 100,
    statusLabel: 'Updating record…',
    submittedAt: new Date(),
    mode: 'replace',
    targetMediaId: 'media-existing',
    oldStoragePath: 'org/u/old.jpg',
    contentHash: 'hash-b',
    storagePath: 'org/u/new.jpg',
    ...overrides,
  };
}

describe('finishReplacePipelineJob cancel after row update', () => {
  it('restores oldStoragePath instead of leaving a dangling storage_path', async () => {
    let job = createJob();
    const removeStorage = vi.fn().mockResolvedValue({ data: null, error: null });
    const updateEq = vi.fn().mockImplementation(async () => {
      cancelled = true;
      return { error: null };
    });
    const update = vi.fn().mockReturnValue({ eq: updateEq });
    const rpc = vi.fn().mockResolvedValue({ data: 1, error: null });
    const insertDedup = vi.fn().mockResolvedValue({ data: null, error: null });

    const client = {
      from: vi.fn((table: string) => {
        if (table === 'media_items') return { update };
        if (table === 'dedup_hashes') return { insert: insertDedup };
        throw new Error(`unexpected table ${table}`);
      }),
      storage: { from: vi.fn().mockReturnValue({ remove: removeStorage }) },
      rpc,
    };

    const jobState = {
      findJob: vi.fn(() => job),
      updateJob: vi.fn((_id: string, patch: Partial<UploadJob>) => {
        job = { ...job, ...patch };
      }),
      setPhase: vi.fn(),
    };

    let cancelled = false;
    const deps: ReplacePipelineFinishDeps = {
      uploadService: {
        isHeic: vi.fn().mockReturnValue(false),
        convertToJpeg: vi.fn(),
      },
      supabaseClient: client as never,
      mediaDownloadService: { setLocalUrl: vi.fn() } as never,
      jobState: jobState as never,
      queue: { markDone: vi.fn() } as never,
      storage: { upload: vi.fn().mockResolvedValue('org/u/new.jpg') } as never,
      getUser: () => ({ id: 'user-1' }) as never,
      isCancelled: () => cancelled,
    };

    const ctx: PipelineContext = {
      failJob: vi.fn(),
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      getAbortSignal: vi.fn(),
      abortJobRequest: vi.fn(),
      checkDedupHash: vi.fn(),
      getCurrentUserId: vi.fn(),
      emitDuplicateDetected: vi.fn(),
      emitUploadSkipped: vi.fn(),
      emitImageUploaded: vi.fn(),
      emitImageReplaced: vi.fn(),
      emitImageAttached: vi.fn(),
      emitMissingData: vi.fn(),
      emitLocationConflict: vi.fn(),
    };

    const prepared: ReplacePipelinePrepared = {
      job,
      targetMediaItemId: 'media-existing',
      parsedExif: {},
      contentHash: 'hash-b',
    };

    await finishReplacePipelineJob('job-1', ctx, prepared, undefined, deps);

    expect(removeStorage).toHaveBeenCalledWith(['org/u/new.jpg']);
    expect(update).toHaveBeenCalledTimes(2);
    expect(updateEq).toHaveBeenLastCalledWith('id', 'media-existing');
    expect(update.mock.calls[1]?.[0]).toEqual({
      storage_path: 'org/u/old.jpg',
      thumbnail_path: null,
    });
    expect(ctx.emitImageReplaced).not.toHaveBeenCalled();
  });
});
