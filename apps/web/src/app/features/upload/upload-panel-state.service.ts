/**
 * UploadPanelStateService — state signals and computed properties.
 */

import { Injectable, computed, inject } from '@angular/core';
import {
  UploadManagerService,
  type UploadBatch,
  type UploadJob,
} from '../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane, type UploadLane } from './upload-phase.helpers';

@Injectable({ providedIn: 'root' })
export class UploadPanelStateService {
  private readonly uploadManager = inject(UploadManagerService);

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

  readonly dotItems = computed(() =>
    this.uploadManager.jobs().map((job) => ({
      id: job.id,
      lane: this.getLaneForJob(job),
      statusClass: this.getDotStatusClass(job),
    })),
  );

  readonly lastCompletedBatch = computed<UploadBatch | null>(() => {
    const completeBatches = this.uploadManager
      .batches()
      .filter((batch) => batch.status === 'complete');
    return completeBatches.length === 0
      ? null
      : (completeBatches[completeBatches.length - 1] ?? null);
  });

  readonly showLastUpload = computed(
    () => this.uploadManager.jobs().length === 0 && !!this.lastCompletedBatch(),
  );
  readonly showProgressBoard = computed(() => this.uploadManager.jobs().length > 0);

  readonly lastUploadLabel = computed(() => {
    const batch = this.lastCompletedBatch();
    if (!batch) return null;
    return batch.totalFiles <= 1 ? batch.label : 'Batch · ' + batch.totalFiles + ' files';
  });

  readonly scanning = computed(() => this.uploadManager.activeBatch()?.status === 'scanning');

  readonly scanningLabel = computed(() => {
    const batch = this.uploadManager.activeBatch();
    if (!batch || batch.status !== 'scanning') return null;
    return (
      'Scanning... ' + batch.totalFiles + ' file' + (batch.totalFiles === 1 ? '' : 's') + ' found'
    );
  });

  readonly hasAwaitingPlacement = computed(() =>
    this.uploadManager.jobs().some((j) => j.phase === 'missing_data'),
  );

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }

  private getDotStatusClass(job: UploadJob): string {
    if (job.phase === 'complete') return 'complete';
    if (
      job.phase === 'skipped' ||
      job.phase === 'error' ||
      job.phase === 'missing_data' ||
      job.phase === 'awaiting_conflict_resolution'
    ) {
      return 'issue';
    }
    if (
      [
        'uploading',
        'saving_record',
        'replacing_record',
        'resolving_address',
        'resolving_coordinates',
      ].includes(job.phase)
    ) {
      return 'uploading';
    }
    return 'queued';
  }
}
