/**
 * UploadPanelLaneHandlersService — lane navigation & selection.
 */

import { Injectable, inject } from '@angular/core';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import { getLaneForJob as mapJobToLane, type UploadLane } from './upload-phase.helpers';
import { UploadPanelSignalsService } from './upload-panel-signals.service';

@Injectable({ providedIn: 'root' })
export class UploadPanelLaneHandlersService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly signals = inject(UploadPanelSignalsService);

  setSelectedLane(lane: UploadLane): void {
    this.signals.selectedLane.set(lane);
  }

  onDotClick(jobId: string): void {
    const job = this.uploadManager.jobs().find((entry) => entry.id === jobId);
    if (!job) return;
    this.signals.selectedLane.set(this.getLaneForJob(job));
  }

  private getLaneForJob(job: UploadJob): UploadLane {
    return mapJobToLane(job);
  }
}
