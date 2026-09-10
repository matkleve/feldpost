import type { UploadJob } from '../upload-manager.types';

/**
 * Was this job deliberately cancelled (by the user, or by sign-out), as
 * opposed to genuinely failing? Reads the explicit `wasCancelled` flag set
 * at every cancellation write site — not the error message text, which is
 * user-facing copy and would break under i18n.
 * @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-08
 */
export function isCancelledUploadJob(job: UploadJob | undefined): boolean {
  return job?.phase === 'error' && job.wasCancelled === true;
}
