/**
 * UploadManagerActionFunctions — Public action implementations:
 * retryUploadManagerJob, cancelUploadManagerJob, dismissUploadManagerJob,
 * placeUploadManagerJob, assignUploadManagerJobToProject, resolveUploadManagerConflict,
 * attachUploadManagerFile, replaceUploadManagerFile, forceUploadManagerDuplicateUpload,
 * hydrateUploadManagerDeferredPreviews, cancelUploadManagerBatch, dismissAllUploadManagerCompleted.
 *
 * All functions follow the same pattern:
 *  (1) Find job by jobId
 *  (2) Guard: Check phase/state preconditions
 *  (3) Update: Mutate job state via deps.updateJob()
 *  (4) Emit: Queue drain (deps.drainQueue()) if phase changed from terminal
 *  (5) Abort/Cleanup: Call deps.abortJobRequest(jobId) if cancelling active job
 *
 * RLS boundary: All mutations respect user org + role permissions (enforced in service layer).
 */

import type { ConflictResolution, UploadJob, UploadPhase } from '../upload-manager.types';
import { uploadManagerDebugLog } from '../support/upload-manager-debug.util';

export interface UploadManagerActionsDeps {
  findJob: (jobId: string) => UploadJob | undefined;
  snapshotJobs: () => ReadonlyArray<UploadJob>;
  updateJob: (jobId: string, patch: Partial<UploadJob>) => void;
  addJobs: (jobs: UploadJob[]) => void;
  removeJob: (jobId: string) => void;
  removeTerminalJobs: () => void;
  addBatch: (batch: {
    id: string;
    label: string;
    totalFiles: number;
    completedFiles: number;
    skippedFiles: number;
    failedFiles: number;
    overallProgress: number;
    status: 'uploading' | 'scanning' | 'complete' | 'cancelled';
    startedAt: Date;
    finishedAt?: Date;
  }) => void;
  updateBatch: (batchId: string, patch: { status?: 'cancelled'; finishedAt?: Date }) => void;
  createImmediatePreviewUrl: (file: File) => string | undefined;
  createDeferredPreviewUrl: (file: File) => Promise<string | null | undefined>;
  revokeObjectUrl: (url: string) => void;
  isTerminalPhase: (phase: UploadPhase) => boolean;
  queuedLabel: string;
  abortJobRequest: (jobId: string) => void;
  markDone: (jobId: string) => void;
  /**
   * Removes whatever the job already persisted (storage object, DB row, or
   * both — either may be absent depending on the phase it was cancelled in).
   * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-04
   */
  removeUploadResidue: (storagePath: string | undefined, mediaId: string | undefined) => Promise<void>;
  drainQueue: () => void;
}

export function retryUploadManagerJob(jobId: string, deps: UploadManagerActionsDeps): void {
  const job = deps.findJob(jobId);
  // A cancelled job is not a failure to retry — it was stopped on purpose.
  // @see docs/audits/upload-process-analysis-2026-09-08/03-branch-matrix.md Y3
  if (!job || job.phase !== 'error' || job.wasCancelled) return;

  deps.updateJob(jobId, {
    phase: 'queued',
    statusLabel: deps.queuedLabel,
    progress: 0,
    error: undefined,
    failedAt: undefined,
  });
  deps.drainQueue();
}

export function dismissUploadManagerJob(jobId: string, deps: UploadManagerActionsDeps): void {
  const job = deps.findJob(jobId);
  if (!job || !deps.isTerminalPhase(job.phase)) return;

  if (job.thumbnailUrl && job.phase !== 'complete') {
    deps.revokeObjectUrl(job.thumbnailUrl);
  }
  deps.removeJob(jobId);
}

export function dismissAllUploadManagerCompleted(deps: UploadManagerActionsDeps): void {
  deps.removeTerminalJobs();
}

export async function cancelUploadManagerJob(
  jobId: string,
  deps: UploadManagerActionsDeps,
): Promise<void> {
  const job = deps.findJob(jobId);
  if (!job || deps.isTerminalPhase(job.phase)) return;

  deps.abortJobRequest(jobId);
  deps.markDone(jobId);

  deps.updateJob(jobId, {
    phase: 'error',
    statusLabel: 'Cancelled',
    error: 'Upload cancelled by user.',
    failedAt: job.phase,
    wasCancelled: true,
  });

  deps.drainQueue();

  if (job.storagePath || job.mediaId) {
    await deps.removeUploadResidue(job.storagePath, job.mediaId);
  }
}

export function cancelUploadManagerBatch(
  batchId: string,
  deps: UploadManagerActionsDeps,
  cancelJob: (jobId: string) => void,
): void {
  const batchJobs = deps
    .snapshotJobs()
    .filter((job) => job.batchId === batchId && !deps.isTerminalPhase(job.phase));
  for (const job of batchJobs) {
    cancelJob(job.id);
  }
  deps.updateBatch(batchId, { status: 'cancelled', finishedAt: new Date() });
}

export function placeUploadManagerJob(
  jobId: string,
  coords: { lat: number; lng: number },
  deps: UploadManagerActionsDeps,
): void {
  const job = deps.findJob(jobId);
  if (!job || job.phase !== 'missing_data') return;

  deps.updateJob(jobId, {
    phase: 'queued',
    statusLabel: deps.queuedLabel,
    coords,
    issueKind: undefined,
  });
  deps.drainQueue();
}

export function assignUploadManagerJobToProject(
  jobId: string,
  projectId: string,
  deps: UploadManagerActionsDeps,
): void {
  const job = deps.findJob(jobId);
  if (!job || job.phase !== 'missing_data') return;

  deps.updateJob(jobId, {
    phase: 'queued',
    statusLabel: deps.queuedLabel,
    projectId,
    issueKind: undefined,
  });
  deps.drainQueue();
}

export function replaceUploadManagerFile(
  mediaId: string,
  file: File,
  deps: UploadManagerActionsDeps,
): string {
  const batchId = crypto.randomUUID();
  const jobId = crypto.randomUUID();

  deps.addBatch({
    id: batchId,
    label: 'Replace photo',
    totalFiles: 1,
    completedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    overallProgress: 0,
    status: 'uploading',
    startedAt: new Date(),
  });

  const job: UploadJob = {
    id: jobId,
    batchId,
    file,
    phase: 'queued',
    progress: 0,
    statusLabel: deps.queuedLabel,
    thumbnailUrl: deps.createImmediatePreviewUrl(file),
    submittedAt: new Date(),
    mode: 'replace',
    targetMediaId: mediaId,
  };

  deps.addJobs([job]);
  hydrateUploadManagerDeferredPreviews([job], deps);
  deps.drainQueue();
  return jobId;
}

export function attachUploadManagerFile(
  mediaId: string,
  file: File,
  deps: UploadManagerActionsDeps,
): string {
  uploadManagerDebugLog('[upload-manager] attachFile called:', {
    mediaId,
    fileName: file.name,
    fileSize: file.size,
  });

  const batchId = crypto.randomUUID();
  const jobId = crypto.randomUUID();

  deps.addBatch({
    id: batchId,
    label: 'Attach photo',
    totalFiles: 1,
    completedFiles: 0,
    skippedFiles: 0,
    failedFiles: 0,
    overallProgress: 0,
    status: 'uploading',
    startedAt: new Date(),
  });

  const job: UploadJob = {
    id: jobId,
    batchId,
    file,
    phase: 'queued',
    progress: 0,
    statusLabel: deps.queuedLabel,
    thumbnailUrl: deps.createImmediatePreviewUrl(file),
    submittedAt: new Date(),
    mode: 'attach',
    targetMediaId: mediaId,
  };

  deps.addJobs([job]);
  hydrateUploadManagerDeferredPreviews([job], deps);
  uploadManagerDebugLog(
    '[upload-manager] attach job added to state, calling drainQueue. jobId:',
    jobId,
  );
  deps.drainQueue();
  return jobId;
}

export function hydrateUploadManagerDeferredPreviews(
  jobs: ReadonlyArray<UploadJob>,
  deps: UploadManagerActionsDeps,
): void {
  for (const job of jobs) {
    if (job.thumbnailUrl) continue;

    void deps.createDeferredPreviewUrl(job.file).then((previewUrl) => {
      if (!previewUrl) return;

      const current = deps.findJob(job.id);
      if (!current || current.thumbnailUrl) {
        deps.revokeObjectUrl(previewUrl);
        return;
      }

      deps.updateJob(job.id, { thumbnailUrl: previewUrl });
    });
  }
}

export function resolveUploadManagerConflict(
  jobId: string,
  resolution: ConflictResolution,
  deps: UploadManagerActionsDeps,
): void {
  const job = deps.findJob(jobId);
  if (!job || job.phase !== 'awaiting_conflict_resolution') return;

  deps.updateJob(jobId, {
    conflictResolution: resolution,
    phase: 'queued',
    statusLabel: deps.queuedLabel,
  });

  if (resolution === 'attach_replace' || resolution === 'attach_keep') {
    deps.updateJob(jobId, {
      mode: 'attach',
      targetMediaId: job.conflictCandidate!.mediaId,
    });
  }

  deps.drainQueue();
}

export function forceUploadManagerDuplicateUpload(
  jobId: string,
  deps: UploadManagerActionsDeps,
): void {
  const job = deps.findJob(jobId);
  const isDuplicateResume =
    !!job?.existingMediaId &&
    (job.phase === 'skipped' ||
      (job.phase === 'missing_data' && job.issueKind === 'duplicate_file'));
  if (!job || !isDuplicateResume) return;

  deps.updateJob(jobId, {
    forceDuplicateUpload: true,
    phase: 'queued',
    statusLabel: deps.queuedLabel,
    error: undefined,
    failedAt: undefined,
    existingMediaId: undefined,
    duplicateOfMediaId: undefined,
    issueKind: undefined,
  });

  deps.drainQueue();
}
