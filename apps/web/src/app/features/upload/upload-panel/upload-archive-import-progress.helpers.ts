/**
 * Archive import dual progress figures (Phase 5.2).
 *
 * Three independent counts — never one blended number:
 *  - files imported (finite): the file's bytes are safe — `complete`, `skipped`, `missing_data`
 *  - files failed: the bytes are not there; a failure never counts as an import
 *  - items awaiting resolution (backlog): `address_deferred` jobs
 *
 * @see docs/specs/service/media-upload-service/upload-archive-import-mode.md § What "done" means
 */

import type { UploadBatch, UploadJob } from '../../../core/upload/upload-manager.types';

export interface ArchiveImportProgressFigures {
  filesImported: number;
  filesFailed: number;
  filesTotal: number;
  itemsAwaitingResolution: number;
}

/**
 * Import succeeded: the bytes are stored. `missing_data` belongs here — the file is in, only its
 * location is unknown. `error` does not: counting a failed upload as imported is the blended
 * number the dual-figure rule exists to prevent (Constitution § no silent failure).
 */
const IMPORT_SUCCEEDED_PHASES = new Set(['complete', 'skipped', 'missing_data']);

export function computeArchiveImportProgress(
  batch: UploadBatch,
  jobs: readonly UploadJob[],
): ArchiveImportProgressFigures {
  const batchJobs = jobs.filter((job) => job.batchId === batch.id);
  const filesTotal = batch.totalFiles || batchJobs.length;
  const filesImported = batchJobs.filter((job) => IMPORT_SUCCEEDED_PHASES.has(job.phase)).length;
  const filesFailed = batchJobs.filter((job) => job.phase === 'error').length;
  const itemsAwaitingResolution = batchJobs.filter(
    (job) => job.issueKind === 'address_deferred',
  ).length;

  return { filesImported, filesFailed, filesTotal, itemsAwaitingResolution };
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
