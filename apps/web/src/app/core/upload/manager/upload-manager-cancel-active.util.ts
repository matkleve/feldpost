import type { UploadJob, UploadPhase } from '../upload-manager.types';

export interface CancelAllActiveUploadsDeps {
  snapshotJobs: () => ReadonlyArray<UploadJob>;
  isTerminalPhase: (phase: UploadPhase) => boolean;
  abortJobRequest: (jobId: string) => void;
  markDone: (jobId: string) => void;
  /**
   * Removes whatever the job already persisted (storage object, DB row, or
   * both — either may be absent depending on the phase it was cancelled in).
   * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-04
   */
  removeUploadResidue: (
    storagePath: string | undefined,
    mediaId: string | undefined,
  ) => Promise<{ errors: string[] }>;
  markCancelledSignedOut: (jobId: string, failedAt: UploadPhase) => void;
}

export async function cancelAllActiveUploads(deps: CancelAllActiveUploadsDeps): Promise<void> {
  const active = deps.snapshotJobs().filter((job) => !deps.isTerminalPhase(job.phase));
  for (const job of active) {
    deps.abortJobRequest(job.id);
    deps.markDone(job.id);
    deps.markCancelledSignedOut(job.id, job.phase);
  }
  const residueResults = await Promise.all(
    active
      .filter((job) => job.storagePath || job.mediaId)
      .map((job) => deps.removeUploadResidue(job.storagePath, job.mediaId)),
  );

  const errors = residueResults.flatMap((result) => result.errors);
  if (errors.length > 0) {
    throw new Error(`Upload cancel residue cleanup failed: ${errors.join('; ')}`);
  }
}
