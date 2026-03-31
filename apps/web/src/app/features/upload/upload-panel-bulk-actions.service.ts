/**
 * UploadPanelBulkActionsService — Bulk selection and multi-item actions.
 *
 * Provides:
 *  - Selection state: selectedUploadJobIds (Set<jobId>)
 *  - Selection filters: allInLaneSelected(), someInLaneSelected(), canSelectMore()
 *  - Bulk actions: retryAll(), dismissAll(), cancelAll(), downloadSelected()
 *  - Zoom to all selected jobs
 *
 * Ground rules:
 *  - Selection persists across lane switches
 *  - Bulk actions applied only to selected jobs in current lane
 *  - canZoomToJob() filters which files can show on map
 */

import { Injectable, type WritableSignal } from '@angular/core';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import { isRetryableJob, isTerminalJob } from './upload-panel-helpers';
import type { UploadLane } from './upload-phase.helpers';

export interface UploadPanelBulkActionsRegisterOptions {
  selectedUploadJobIds: WritableSignal<Set<string>>;
  selectedUploadJobs: () => UploadJob[];
  setLane: (lane: UploadLane) => void;
  retryFile: (jobId: string) => void;
  dismissFile: (jobId: string) => void;
  cancelJob: (jobId: string) => void;
  canZoomToJob: (job: UploadJob) => boolean;
  downloadUploadedJob: (job: UploadJob) => Promise<void>;
}

@Injectable()
export class UploadPanelBulkActionsService {
  private options: UploadPanelBulkActionsRegisterOptions | null = null;

  register(options: UploadPanelBulkActionsRegisterOptions): void {
    this.options = options;
  }

  private get ctx(): UploadPanelBulkActionsRegisterOptions {
    if (!this.options) {
      throw new Error('UploadPanelBulkActionsService not registered.');
    }
    return this.options;
  }

  onRowSelectionChanged(event: { jobId: string; selected: boolean }): void {
    this.ctx.selectedUploadJobIds.update((selected) => {
      const next = new Set(selected);
      if (event.selected) {
        next.add(event.jobId);
      } else {
        next.delete(event.jobId);
      }
      return next;
    });
  }

  clearSelectedUploads(): void {
    this.ctx.selectedUploadJobIds.set(new Set());
  }

  async retrySelectedUploads(): Promise<void> {
    for (const job of this.ctx.selectedUploadJobs()) {
      if (isRetryableJob(job)) {
        this.ctx.retryFile(job.id);
      }
    }
    this.clearSelectedUploads();
    this.ctx.setLane('uploading');
  }

  async downloadSelectedUploads(): Promise<void> {
    for (const job of this.ctx.selectedUploadJobs()) {
      if (job.imageId && job.storagePath && this.ctx.canZoomToJob(job)) {
        await this.ctx.downloadUploadedJob(job);
      }
    }
  }

  removeSelectedUploads(): void {
    for (const job of this.ctx.selectedUploadJobs()) {
      if (isTerminalJob(job.phase)) {
        this.ctx.dismissFile(job.id);
      } else {
        this.ctx.cancelJob(job.id);
      }
    }
    this.clearSelectedUploads();
  }
}
