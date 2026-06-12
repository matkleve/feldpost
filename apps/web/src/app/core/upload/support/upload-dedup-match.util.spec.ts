import { describe, it, expect, vi } from 'vitest';
import { applyDedupMatch, shouldAutoSkipDedupMatch } from './upload-dedup-match.util';
import type { UploadJob } from '../upload-manager.types';

function makeJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    phase: 'dedup_check',
    progress: 0,
    submittedAt: new Date(),
    mode: 'new',
    ...overrides,
  } as UploadJob;
}

describe('shouldAutoSkipDedupMatch', () => {
  it('auto-skips when registrant is current user', () => {
    expect(
      shouldAutoSkipDedupMatch(
        { mediaItemId: 'm1', registeredByUserId: 'user-a' },
        'user-a',
      ),
    ).toBe(true);
  });

  it('does not auto-skip for colleague upload', () => {
    expect(
      shouldAutoSkipDedupMatch(
        { mediaItemId: 'm1', registeredByUserId: 'user-a' },
        'user-b',
      ),
    ).toBe(false);
  });
});

describe('applyDedupMatch', () => {
  it('emits duplicateDetected for colleague match', () => {
    const emitDuplicateDetected = vi.fn();
    const markDone = vi.fn();
    const setPhase = vi.fn();

    const result = applyDedupMatch({
      jobId: 'job-1',
      job: makeJob(),
      contentHash: 'abc',
      match: { mediaItemId: 'media-1', registeredByUserId: 'other-user' },
      currentUserId: 'me',
      deps: {
        setPhase,
        updateJob: vi.fn(),
        markDone,
      },
      ctx: {
        emitUploadSkipped: vi.fn(),
        emitBatchProgress: vi.fn(),
        drainQueue: vi.fn(),
        emitDuplicateDetected,
      },
    });

    expect(result).toBe('issue');
    expect(setPhase).toHaveBeenCalledWith('job-1', 'missing_data');
    expect(emitDuplicateDetected).toHaveBeenCalled();
    expect(markDone).toHaveBeenCalledWith('job-1');
  });
});
