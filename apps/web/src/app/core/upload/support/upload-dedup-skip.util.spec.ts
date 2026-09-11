import { describe, expect, it, vi } from 'vitest';
import type { UploadJob } from '../upload-manager.types';
import { handleDedupSkip } from './upload-dedup-skip.util';

function job(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File([], 'a.jpg'),
    phase: 'dedup_check',
    mode: 'new',
    progress: 50,
    ...overrides,
  } as UploadJob;
}

// @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
describe('handleDedupSkip', () => {
  it('sets issueKind=duplicate_file at the point the skip is created', () => {
    const current = job();
    const updateJob = vi.fn();

    handleDedupSkip({
      jobId: 'job-1',
      job: current,
      contentHash: 'hash-1',
      existingMediaId: 'media-1',
      setPhase: vi.fn(),
      updateJob,
      markDone: vi.fn(),
      ctx: {
        emitUploadSkipped: vi.fn(),
        emitBatchProgress: vi.fn(),
        drainQueue: vi.fn(),
      },
    });

    expect(updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ issueKind: 'duplicate_file' }),
    );
  });
});
