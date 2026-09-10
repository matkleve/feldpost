import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runUploadDedupCheck } from './upload-dedup-check.util';
import { clearInflightDedupRegistryForTests, tryRegisterInflightDedupHash } from './upload-inflight-dedup.registry';
import type { UploadJob, PipelineContext } from '../upload-manager.types';

function createJob(): UploadJob {
  return {
    id: 'job-2',
    batchId: 'batch-1',
    file: new File(['same'], 'dup.jpg', { type: 'image/jpeg' }),
    phase: 'queued',
    progress: 0,
    statusLabel: 'Queued',
    submittedAt: new Date(),
    mode: 'new',
  };
}

describe('runUploadDedupCheck in-flight guard', () => {
  beforeEach(() => {
    clearInflightDedupRegistryForTests();
  });

  it('auto-skips when another job already reserved the same content hash', async () => {
    tryRegisterInflightDedupHash('hash-a', { jobId: 'job-1', registeredByUserId: 'user-1' });

    const job = createJob();
    const jobState = {
      setPhase: vi.fn(),
      updateJob: vi.fn(),
      findJob: vi.fn(() => job),
    };
    const queue = { markDone: vi.fn() };
    const uploadService = {
      resolveMediaType: vi.fn().mockReturnValue('photo'),
    };
    const ctx: PipelineContext = {
      checkDedupHash: vi.fn().mockResolvedValue(null),
      getCurrentUserId: vi.fn().mockReturnValue('user-1'),
      emitUploadSkipped: vi.fn(),
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      emitDuplicateDetected: vi.fn(),
      failJob: vi.fn(),
      getAbortSignal: vi.fn(),
      abortJobRequest: vi.fn(),
      emitImageUploaded: vi.fn(),
      emitImageReplaced: vi.fn(),
      emitImageAttached: vi.fn(),
      emitMissingData: vi.fn(),
      emitLocationConflict: vi.fn(),
    };

    const outcome = await runUploadDedupCheck(
      { jobState: jobState as never, queue: queue as never, uploadService: uploadService as never },
      job.id,
      { ...job, contentHash: 'hash-a', contentHashAlgo: 'photo_v1' },
      {},
      ctx,
    );

    expect(outcome).toBe('skipped');
    expect(jobState.setPhase).toHaveBeenCalledWith(job.id, 'skipped');
    expect(queue.markDone).toHaveBeenCalledWith(job.id);
    expect(ctx.checkDedupHash).not.toHaveBeenCalled();
  });
});
