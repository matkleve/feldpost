/**
 * Archive import dual progress figures (Phase 5.2).
 *
 * Two independent counts — never one blended number:
 *  - files imported (finite): terminal upload outcomes including `missing_data`
 *  - items awaiting resolution (backlog): `address_deferred` jobs
 *
 * @see docs/specs/service/media-upload-service/upload-archive-import-mode.md § What "done" means
 */

import type { UploadBatch, UploadJob } from '../../../core/upload/upload-manager.types';

export interface ArchiveImportProgressFigures {
  filesImported: number;
  filesTotal: number;
  itemsAwaitingResolution: number;
}

/** Terminal for the *import* (bytes safe), not for location resolution. */
const IMPORT_TERMINAL_PHASES = new Set([
  'complete',
  'error',
  'skipped',
  'missing_data',
]);

export function computeArchiveImportProgress(
  batch: UploadBatch,
  jobs: readonly UploadJob[],
): ArchiveImportProgressFigures {
  const batchJobs = jobs.filter((job) => job.batchId === batch.id);
  const filesTotal = batch.totalFiles || batchJobs.length;
  const filesImported = batchJobs.filter((job) => IMPORT_TERMINAL_PHASES.has(job.phase)).length;
  const itemsAwaitingResolution = batchJobs.filter(
    (job) => job.issueKind === 'address_deferred',
  ).length;

  return { filesImported, filesTotal, itemsAwaitingResolution };
}

/**
 * Whether the dual figures should be shown: during an archive batch, or after it
 * finishes while a resolution backlog remains.
 */
export function shouldShowArchiveImportProgress(
  batch: UploadBatch | null | undefined,
  figures: ArchiveImportProgressFigures | null,
): boolean {
  if (!batch || batch.importMode !== 'archive' || !figures) {
    return false;
  }
  if (batch.status === 'cancelled') {
    return false;
  }
  if (batch.status !== 'complete') {
    return true;
  }
  return figures.itemsAwaitingResolution > 0;
}
