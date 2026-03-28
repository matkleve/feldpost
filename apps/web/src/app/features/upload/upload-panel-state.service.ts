/**
 * UploadPanelStateService — state signals and computed properties.
 */

import { Injectable, computed, inject } from '@angular/core';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
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
  readonly showProgressBoard = computed(() => this.uploadManager.jobs().length > 0);

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
}
