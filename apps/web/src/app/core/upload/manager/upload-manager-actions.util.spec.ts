import { describe, expect, it, vi } from 'vitest';
import type { UploadJob } from '../upload-manager.types';
import { cancelUploadManagerJob } from './upload-manager-actions.util';
import type { UploadManagerActionsDeps } from './upload-manager-actions.util';

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

function buildDeps(current: UploadJob): {
  deps: UploadManagerActionsDeps;
  removeUploadResidue: ReturnType<typeof vi.fn>;
  updateJob: ReturnType<typeof vi.fn>;
} {
  const removeUploadResidue = vi.fn().mockResolvedValue(undefined);
  const updateJob = vi.fn();
  const deps: UploadManagerActionsDeps = {
    findJob: () => current,
    snapshotJobs: () => [current],
    updateJob,
    addJobs: vi.fn(),
    removeJob: vi.fn(),
    removeTerminalJobs: vi.fn(),
    addBatch: vi.fn(),
    updateBatch: vi.fn(),
    createImmediatePreviewUrl: vi.fn(),
    createDeferredPreviewUrl: vi.fn(),
    revokeObjectUrl: vi.fn(),
    isTerminalPhase: (phase) => phase === 'complete' || phase === 'error' || phase === 'missing_data' || phase === 'skipped',
    queuedLabel: 'Queued',
    abortJobRequest: vi.fn(),
    markDone: vi.fn(),
    removeUploadResidue,
    drainQueue: vi.fn(),
  };
  return { deps, removeUploadResidue, updateJob };
}

describe('cancelUploadManagerJob', () => {
  it('removes both the storage object and the media_items row when the job already has both', async () => {
    const current = job({ storagePath: 'org/user/uuid.jpg', mediaId: 'media-1' });
    const { deps, removeUploadResidue } = buildDeps(current);

    await cancelUploadManagerJob('job-1', deps);

    expect(removeUploadResidue).toHaveBeenCalledWith('org/user/uuid.jpg', 'media-1');
  });

  it('flips the job to error before the residue cleanup settles', async () => {
    const current = job({ storagePath: 'org/user/uuid.jpg', mediaId: 'media-1' });
    let resolveResidue!: () => void;
    const deps: UploadManagerActionsDeps = {
      ...buildDeps(current).deps,
      removeUploadResidue: () => new Promise((resolve) => (resolveResidue = resolve as () => void)),
    };
    const updateJob = vi.fn();
    deps.updateJob = updateJob;

    const pending = cancelUploadManagerJob('job-1', deps);

    expect(updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ phase: 'error' }),
    );

    resolveResidue();
    await pending;
  });

  it('does not attempt residue cleanup for a job that never reached storage or the DB', async () => {
    const current = job({ phase: 'queued' });
    const { deps, removeUploadResidue } = buildDeps(current);

    await cancelUploadManagerJob('job-1', deps);

    expect(removeUploadResidue).not.toHaveBeenCalled();
  });

  it('is a no-op for a job already in a terminal phase', async () => {
    const current = job({ phase: 'complete', storagePath: 'org/user/uuid.jpg', mediaId: 'media-1' });
    const { deps, removeUploadResidue, updateJob } = buildDeps(current);

    await cancelUploadManagerJob('job-1', deps);

    expect(removeUploadResidue).not.toHaveBeenCalled();
    expect(updateJob).not.toHaveBeenCalled();
  });
});
