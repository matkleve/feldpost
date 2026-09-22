/**
 * UploadPanelStateService — Panel-specific state signals and computed properties.
 *
 * @see docs/specs/ui/upload/upload-panel-system.md — panel-owned presentation state vs manager-owned job signals.
 *
 * Transforms UploadManagerService.jobs into panel view model:
 *  - Buckets jobs by lane (uploading | uploaded | issues)
 *  - Computes lane counts and effective lane (current switch selection)
 *  - Filters jobs for display (max 5 running, scrollable; all uploaded)
 *
 * Signals:
 *  - laneBuckets: Record<UploadLane, UploadJob[]> — bucketized jobs
 *  - laneCounts: {uploading, uploaded, issues} — badge counts
 *  - laneJobs: UploadJob[] — filtered for current lane (scrollable, limited)
 *  - effectiveLane: UploadLane — currently selected lane from switch
 */

import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UploadManagerService, type UploadJob } from '../../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane, type UploadLane } from '../upload-phase.helpers';
import {
  computeArchiveImportProgress,
  shouldShowArchiveImportProgress,
} from './upload-archive-import-progress.helpers';

@Injectable({ providedIn: 'root' })
export class UploadPanelStateService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly i18n = inject(I18nService);

  readonly laneBuckets = computed(() => {
    const buckets: Record<UploadLane, UploadJob[]> = {
      uploading: [],
      uploaded: [],
      issues: [],
    };
    for (const job of this.uploadManager.jobs()) {
      buckets[this.getLaneForJob(job)].push(job);
    }
    return buckets;
  });

  readonly laneCounts = computed(() => {
    let uploading = 0,
      uploaded = 0,
      issues = 0;
    for (const job of this.uploadManager.jobs()) {
      const lane = this.getLaneForJob(job);
      if (lane === 'uploaded') uploaded++;
      else if (lane === 'issues') issues++;
      else uploading++;
    }
    return { uploading, uploaded, issues };
  });

  readonly laneJobs = computed(() => this.laneBuckets()['uploading']);
  readonly showProgressBoard = computed(() => this.uploadManager.jobs().length > 0);

  readonly scanning = computed(() => this.uploadManager.activeBatch()?.status === 'scanning');

  readonly scanningLabel = computed(() => {
    const batch = this.uploadManager.activeBatch();
    if (!batch || batch.status !== 'scanning') return null;
    const count = batch.totalFiles;
    const suffix = count === 1 ? '' : 's';
    return this.i18n.t(
      'upload.panel.scanning.status',
      'Scanning... {count} file{suffix} found',
    )
      .replace('{count}', String(count))
      .replace('{suffix}', suffix);
  });

  /**
   * Dual archive-import figures (Phase 5.2). Prefer the active archive batch;
   * after it completes, keep showing while a deferred backlog remains.
   * @see docs/specs/service/media-upload-service/upload-archive-import-mode.md § What "done" means
   */
  readonly archiveImportProgress = computed(() => {
    const jobs = this.uploadManager.jobs();
    const active = this.uploadManager.activeBatch();
    if (active?.importMode === 'archive') {
      const figures = computeArchiveImportProgress(active, jobs);
      return shouldShowArchiveImportProgress(active, figures) ? figures : null;
    }

    const batches = this.uploadManager.batches();
    for (let i = batches.length - 1; i >= 0; i--) {
      const candidate = batches[i];
      if (candidate.importMode !== 'archive') {
        continue;
      }
      const figures = computeArchiveImportProgress(candidate, jobs);
      if (shouldShowArchiveImportProgress(candidate, figures)) {
        return figures;
      }
    }
    return null;
  });

  readonly hasAwaitingPlacement = computed(() =>
    this.uploadManager.jobs().some((j) => j.phase === 'missing_data'),
  );

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }
}
