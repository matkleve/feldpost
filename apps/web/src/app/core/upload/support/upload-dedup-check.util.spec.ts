import { describe, expect, it, vi } from 'vitest';
import { runUploadDedupCheck } from './upload-dedup-check.util';
import type { UploadJob } from '../upload-manager.types';

function makeJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'dup.jpg', { type: 'image/jpeg' }),
    phase: 'queued',
    progress: 0,
    submittedAt: new Date(),
    mode: 'new',
    ...overrides,
  } as UploadJob;
}

describe('runUploadDedupCheck', () => {
  it('keeps forced duplicate bypass active across repeated gate calls', async () => {
    const job = makeJob({ forceDuplicateUpload: true });
    const setPhase = vi.fn();
    const updateJob = vi.fn();
    const checkDedupHash = vi.fn();

    const deps = {
      jobState: {
        setPhase,
        updateJob,
      },
      queue: {
        markDone: vi.fn(),
      },
      uploadService: {
        resolveMediaType: () => 'photo',
      },
    } as unknown as Parameters<typeof runUploadDedupCheck>[0];

    const ctx = {
      checkDedupHash,
      getCurrentUserId: () => 'user-1',
      emitUploadSkipped: vi.fn(),
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      emitDuplicateDetected: vi.fn(),
      failJob: vi.fn(),
      getAbortSignal: vi.fn(),
      emitImageUploaded: vi.fn(),
      emitImageReplaced: vi.fn(),
      emitImageAttached: vi.fn(),
      emitMissingData: vi.fn(),
      emitLocationConflict: vi.fn(),
    } as unknown as Parameters<typeof runUploadDedupCheck>[4];

    await expect(runUploadDedupCheck(deps, 'job-1', job, undefined, ctx)).resolves.toBe('ineligible');
    await expect(runUploadDedupCheck(deps, 'job-1', job, undefined, ctx)).resolves.toBe('ineligible');

    expect(checkDedupHash).not.toHaveBeenCalled();
    expect(setPhase).not.toHaveBeenCalled();
    expect(updateJob).not.toHaveBeenCalled();
  });
});
