import { describe, expect, it, vi } from 'vitest';
import type { UploadJob, UploadPhase } from '../upload-manager.types';
import { cancelAllActiveUploads } from './upload-manager-cancel-active.util';
import type { CancelAllActiveUploadsDeps } from './upload-manager-cancel-active.util';

function job(overrides: Partial<UploadJob>): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File([], 'a.jpg'),
    phase: 'uploading',
    mode: 'new',
    progress: 50,
    ...overrides,
  } as UploadJob;
}

const isTerminalPhase = (phase: UploadPhase): boolean =>
  phase === 'complete' || phase === 'error' || phase === 'missing_data' || phase === 'skipped';

describe('cancelAllActiveUploads', () => {
  it('removes both the storage object and the media_items row for a job that already has both', async () => {
    const active = job({ id: 'active-1', storagePath: 'org/user/uuid.jpg', mediaId: 'media-1' });
    const removeUploadResidue = vi.fn().mockResolvedValue({ errors: [] });
    const deps: CancelAllActiveUploadsDeps = {
      snapshotJobs: () => [active],
      isTerminalPhase,
      abortJobRequest: vi.fn(),
      markDone: vi.fn(),
      removeUploadResidue,
      markCancelledSignedOut: vi.fn(),
    };

    await cancelAllActiveUploads(deps);

    expect(removeUploadResidue).toHaveBeenCalledWith('org/user/uuid.jpg', 'media-1');
  });

  it('skips residue cleanup for a job that never reached storage or the DB', async () => {
    const active = job({ id: 'active-1', phase: 'queued' });
    const removeUploadResidue = vi.fn().mockResolvedValue({ errors: [] });
    const deps: CancelAllActiveUploadsDeps = {
      snapshotJobs: () => [active],
      isTerminalPhase,
      abortJobRequest: vi.fn(),
      markDone: vi.fn(),
      removeUploadResidue,
      markCancelledSignedOut: vi.fn(),
    };

    await cancelAllActiveUploads(deps);

    expect(removeUploadResidue).not.toHaveBeenCalled();
  });

  it('leaves terminal jobs untouched', async () => {
    const terminal = job({ id: 'done-1', phase: 'complete', mediaId: 'media-1' });
    const abortJobRequest = vi.fn();
    const removeUploadResidue = vi.fn().mockResolvedValue({ errors: [] });
    const deps: CancelAllActiveUploadsDeps = {
      snapshotJobs: () => [terminal],
      isTerminalPhase,
      abortJobRequest,
      markDone: vi.fn(),
      removeUploadResidue,
      markCancelledSignedOut: vi.fn(),
    };

    await cancelAllActiveUploads(deps);

    expect(abortJobRequest).not.toHaveBeenCalled();
    expect(removeUploadResidue).not.toHaveBeenCalled();
  });
});
