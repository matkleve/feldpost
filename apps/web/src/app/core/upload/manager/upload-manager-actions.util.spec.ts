import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadJob } from '../upload-manager.types';
import {
  attachUploadManagerFile,
  cancelUploadManagerJob,
  resolveUploadManagerConflict,
  retryUploadManagerJob,
} from './upload-manager-actions.util';
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
  transitionTo: ReturnType<typeof vi.fn>;
} {
  const removeUploadResidue = vi.fn().mockResolvedValue({ errors: [] });
  const updateJob = vi.fn();
  const transitionTo = vi.fn((jobId: string, phase: UploadJob['phase'], options: { statusLabel?: string }) => {
    updateJob(jobId, { phase, statusLabel: options.statusLabel });
    return true;
  });
  const deps: UploadManagerActionsDeps = {
    findJob: () => current,
    snapshotJobs: () => [current],
    updateJob,
    transitionTo,
    addJobs: vi.fn(),
    removeJob: vi.fn(),
    removeTerminalJobs: vi.fn(),
    addBatch: vi.fn(),
    updateBatch: vi.fn(),
    createImmediatePreviewUrl: vi.fn(),
    createDeferredPreviewUrl: vi.fn().mockResolvedValue(undefined),
    revokeObjectUrl: vi.fn(),
    isTerminalPhase: (phase) => phase === 'complete' || phase === 'error' || phase === 'missing_data' || phase === 'skipped',
    queuedLabel: 'Queued',
    abortJobRequest: vi.fn(),
    markDone: vi.fn(),
    removeUploadResidue,
    drainQueue: vi.fn(),
  };
  return { deps, removeUploadResidue, updateJob, transitionTo };
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
      removeUploadResidue: () =>
        new Promise((resolve) => {
          resolveResidue = () => resolve({ errors: [] });
        }),
    };
    const updateJob = vi.fn();
    const transitionTo = vi.fn().mockReturnValue(true);
    deps.updateJob = updateJob;
    deps.transitionTo = transitionTo;

    const pending = cancelUploadManagerJob('job-1', deps);

    expect(transitionTo).toHaveBeenCalledWith(
      'job-1',
      'error',
      expect.objectContaining({ channel: 'user' }),
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
    const { deps, removeUploadResidue, updateJob, transitionTo } = buildDeps(current);

    await cancelUploadManagerJob('job-1', deps);

    expect(removeUploadResidue).not.toHaveBeenCalled();
    expect(updateJob).not.toHaveBeenCalled();
    expect(transitionTo).not.toHaveBeenCalled();
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-08
  it('marks the job wasCancelled instead of relying on the error message text', async () => {
    const current = job({});
    const { deps, updateJob } = buildDeps(current);

    await cancelUploadManagerJob('job-1', deps);

    expect(updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ wasCancelled: true }),
    );
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
  it('sets issueKind=upload_error so getIssueKind is authoritative without reading statusLabel', async () => {
    const current = job({});
    const { deps, updateJob } = buildDeps(current);

    await cancelUploadManagerJob('job-1', deps);

    expect(updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ issueKind: 'upload_error' }),
    );
  });
});

describe('attachUploadManagerFile', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    localStorage.removeItem('feldpost:debug:upload-manager');
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-41
  it('does not emit console.log on every attach when the debug flag is disabled', () => {
    const current = job({ id: 'existing' });
    const { deps } = buildDeps(current);
    const file = new File([], 'photo.jpg');

    attachUploadManagerFile('media-1', file, deps);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('still queues the job and drains the queue regardless of logging', () => {
    const current = job({ id: 'existing' });
    const { deps } = buildDeps(current);
    const file = new File([], 'photo.jpg');

    const jobId = attachUploadManagerFile('media-1', file, deps);

    expect(jobId).toBeTruthy();
    expect(deps.addJobs).toHaveBeenCalled();
    expect(deps.drainQueue).toHaveBeenCalled();
  });
});

describe('retryUploadManagerJob', () => {
  it('retries a genuinely failed job', () => {
    const current = job({ phase: 'error', error: 'Network error' });
    const { deps, updateJob, transitionTo } = buildDeps(current);

    retryUploadManagerJob('job-1', deps);

    expect(transitionTo).toHaveBeenCalledWith(
      'job-1',
      'queued',
      expect.objectContaining({ channel: 'user' }),
    );
    expect(updateJob).toHaveBeenCalledWith(
      'job-1',
      expect.not.objectContaining({ phase: 'queued' }),
    );
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/03-branch-matrix.md Y3
  it('refuses to retry a job the user cancelled', () => {
    const current = job({ phase: 'error', error: 'Upload cancelled by user.', wasCancelled: true });
    const { deps, updateJob, transitionTo } = buildDeps(current);

    retryUploadManagerJob('job-1', deps);

    expect(updateJob).not.toHaveBeenCalled();
    expect(transitionTo).not.toHaveBeenCalled();
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
  it('clears the stale issueKind so a retried job leaves the issues lane', () => {
    const current = job({ phase: 'error', error: 'Network error', issueKind: 'upload_error' });
    const { deps, updateJob } = buildDeps(current);

    retryUploadManagerJob('job-1', deps);

    expect(updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({ issueKind: undefined }));
  });
});

describe('resolveUploadManagerConflict', () => {
  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
  it('clears the stale conflict_review issueKind so a resolved job leaves the issues lane', () => {
    const current = job({
      phase: 'awaiting_conflict_resolution',
      issueKind: 'conflict_review',
      conflictCandidate: { mediaId: 'media-1' },
    });
    const { deps, updateJob } = buildDeps(current);

    resolveUploadManagerConflict('job-1', 'create_new', deps);

    expect(updateJob).toHaveBeenCalledWith('job-1', expect.objectContaining({ issueKind: undefined }));
  });
});
