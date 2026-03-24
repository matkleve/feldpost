/**
 * UploadPanelLaneHandlersService — lane navigation & selection.
 */

import { Injectable, inject, signal } from '@angular/core';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane, type UploadLane } from './upload-phase.helpers';

@Injectable({ providedIn: 'root' })
export class UploadPanelLaneHandlersService {
  private readonly uploadManager = inject(UploadManagerService);

  readonly selectedLane = signal<UploadLane>('uploading');

  setSelectedLane(lane: UploadLane): void {
    this.selectedLane.set(lane);
  }

  onDotClick(jobId: string): void {
    const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
    if (!job) return;
    this.selectedLane.set(this.getLaneForJob(job));
  }

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }
}
