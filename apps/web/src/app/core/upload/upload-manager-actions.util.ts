import type { ConflictResolution, UploadJob, UploadPhase } from './upload-manager.types';

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
  removeStoragePath: (storagePath: string) => void;
  drainQueue: () => void;
}

export function retryUploadManagerJob(jobId: string, deps: UploadManagerActionsDeps): void {
  const job = deps.findJob(jobId);
  if (!job || job.phase !== 'error') return;

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

export function cancelUploadManagerJob(jobId: string, deps: UploadManagerActionsDeps): void {
  const job = deps.findJob(jobId);
  if (!job || deps.isTerminalPhase(job.phase)) return;

  deps.abortJobRequest(jobId);
  deps.markDone(jobId);

  if (job.storagePath) {
    deps.removeStoragePath(job.storagePath);
  }

  deps.updateJob(jobId, {
    phase: 'error',
    statusLabel: 'Cancelled',
    error: 'Upload cancelled by user.',
    failedAt: job.phase,
  });

  deps.drainQueue();
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
  imageId: string,
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
    targetImageId: imageId,
  };

  deps.addJobs([job]);
  hydrateUploadManagerDeferredPreviews([job], deps);
  deps.drainQueue();
  return jobId;
}

export function attachUploadManagerFile(
  imageId: string,
  file: File,
  deps: UploadManagerActionsDeps,
): string {
  console.log('[upload-manager] attachFile called:', {
    imageId,
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
    targetImageId: imageId,
  };

  deps.addJobs([job]);
  hydrateUploadManagerDeferredPreviews([job], deps);
  console.log('[upload-manager] attach job added to state, calling drainQueue. jobId:', jobId);
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
      targetImageId: job.conflictCandidate!.imageId,
    });
  }

  deps.drainQueue();
}

export function forceUploadManagerDuplicateUpload(
  jobId: string,
  deps: UploadManagerActionsDeps,
): void {
  const job = deps.findJob(jobId);
  if (!job || job.phase !== 'skipped' || !job.existingImageId) return;

  deps.updateJob(jobId, {
    forceDuplicateUpload: true,
    phase: 'queued',
    statusLabel: deps.queuedLabel,
    error: undefined,
    failedAt: undefined,
    existingImageId: undefined,
  });

  deps.drainQueue();
}
