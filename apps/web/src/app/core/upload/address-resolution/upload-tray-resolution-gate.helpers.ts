/**
 * Tray Continue gate — jobs must finish Phase 0 before the user can confirm an answer.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Tray Continue gate
 */

import type { UploadJob } from '../upload-manager.types';

/** Path/filename-only tray steps — no file-byte dependency. */
const TRAY_QUESTIONS_WITHOUT_FILE_PREPARE = new Set([
  'upload.resolver.question.layerPackage',
  'upload.resolver.question.adminLevelConflict',
]);

export function requiresFilePrepareForTrayQuestion(questionKey?: string): boolean {
  if (!questionKey) {
    return true;
  }
  return !TRAY_QUESTIONS_WITHOUT_FILE_PREPARE.has(questionKey);
}

export type TrayResolutionGateContext = {
  questionKey?: string;
  answerKind?: 'single_choice' | 'text';
};

/**
 * One job is ready when it awaits tray input and Phase 0 (EXIF parse) is complete.
 * HEIC conversion is deferred until upload — not required for tray questions.
 */
export function isJobReadyForTrayResolution(
  job: UploadJob,
  gateContext: TrayResolutionGateContext = {},
): boolean {
  if (job.phase !== 'awaiting_disambiguation') {
    return false;
  }
  if (gateContext.answerKind === 'text') {
    return true;
  }
  if (!requiresFilePrepareForTrayQuestion(gateContext.questionKey)) {
    return true;
  }
  return job.filePrepareComplete === true;
}

/** Job ids still awaiting tray input — excludes vanished or terminal jobs. */
export function liveTrayResolutionJobIds(
  jobIds: readonly string[],
  findJob: (id: string) => UploadJob | undefined,
): string[] {
  return jobIds.filter((id) => {
    const job = findJob(id);
    return job != null && job.phase === 'awaiting_disambiguation';
  });
}

/**
 * Every live affected job in the active tray item must pass {@link isJobReadyForTrayResolution}.
 * Dead, cancelled, or dismissed jobs are pruned at this boundary (NF-11).
 * @see docs/specs/component/upload/upload-resolver-tray.md
 */
export function areAllJobsReadyForTrayResolution(
  jobIds: readonly string[],
  findJob: (id: string) => UploadJob | undefined,
  gateContext: TrayResolutionGateContext = {},
): boolean {
  const liveIds = liveTrayResolutionJobIds(jobIds, findJob);
  if (!liveIds.length) {
    return false;
  }
  return liveIds.every((id) => {
    const job = findJob(id)!;
    return isJobReadyForTrayResolution(job, gateContext);
  });
}
