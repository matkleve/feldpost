/**
 * Tray Continue gate — jobs must finish Phase 0 before the user can confirm an answer.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Tray Continue gate
 */

import type { UploadJob } from '../upload-manager.types';

/**
 * One job is ready when it awaits tray input and HEIC was converted to JPEG on the job file.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Tray Continue gate
 */
export function isJobReadyForTrayResolution(
  job: UploadJob,
  isHeic: (file: File) => boolean,
): boolean {
  if (job.phase !== 'awaiting_disambiguation') {
    return false;
  }
  return !isHeic(job.file);
}

/**
 * Every affected job in the active tray item must pass {@link isJobReadyForTrayResolution}.
 * @see docs/specs/component/upload/upload-resolver-tray.md
 */
export function areAllJobsReadyForTrayResolution(
  jobIds: readonly string[],
  findJob: (id: string) => UploadJob | undefined,
  isHeic: (file: File) => boolean,
): boolean {
  if (!jobIds.length) {
    return false;
  }
  return jobIds.every((id) => {
    const job = findJob(id);
    return job != null && isJobReadyForTrayResolution(job, isHeic);
  });
}
