/**
 * UploadPanelMenuActionRouterService — Route menu actions to appropriate handlers.
 *
 * Central dispatcher for item context menu click → handler delegation:
 *  - File-level actions (view_progress, download, open_project) → UploadPanelJobFileActionsService
 *  - Resolution actions (place_on_map, change_location_*) → UploadPanelDialogActionsService
 *  - UploadManager actions (retry, cancel, dismiss) → UploadManagerService methods
 *  - Dialog show/hide toggles and lane navigation
 *
 * Responsibilities:
 *  - Route based on action type and job state
 *  - Emit lane changes (e.g., retry sets lane='issues' if job is error)
 *  - Show toast feedback for disabled actions
 */

import { Injectable, inject } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import type { UploadItemMenuAction } from './upload-panel-item.component';
import { getIssueKind } from './upload-phase.helpers';
import { UploadPanelDialogActionsService } from './upload-panel-dialog-actions.service';
import { UploadPanelJobFileActionsService } from './upload-panel-job-file-actions.service';

export interface UploadPanelMenuActionRouterOptions {
  placementRequested: (jobId: string) => void;
  dismissFile: (jobId: string) => void;
  retryFile: (jobId: string) => void;
  setLane: (lane: 'uploading' | 'uploaded' | 'issues') => void;
}

@Injectable()
export class UploadPanelMenuActionRouterService {
  private readonly toastService = inject(ToastService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly fileActions = inject(UploadPanelJobFileActionsService);
  private readonly dialogActions = inject(UploadPanelDialogActionsService);

  private options: UploadPanelMenuActionRouterOptions | null = null;

  register(options: UploadPanelMenuActionRouterOptions): void {
    this.options = options;
  }

  private get ctx(): UploadPanelMenuActionRouterOptions {
    if (!this.options) {
      throw new Error('UploadPanelMenuActionRouterService not registered.');
    }
    return this.options;
  }

  private readonly menuHandlers: Record<UploadItemMenuAction, (job: UploadJob) => Promise<void>> = {
    view_progress: async (job) => {
      this.showJobStatusToast(job);
    },
    view_file_details: async (job) => {
      this.showJobStatusToast(job);
    },
    open_existing_media: async (job) => {
      await this.fileActions.openExistingDuplicateInMedia(job);
    },
    upload_anyway: async (job) => {
      this.dialogActions.openDuplicateResolutionDialog(job);
    },
    change_location_map: async (job) => {
      this.fileActions.requestLocationPickOnMap(job);
    },
    place_on_map: async (job) => {
      this.handlePlaceOnMap(job);
    },
    change_location_address: async (job) => {
      this.dialogActions.openLocationAddressDialog(job);
    },
    retry: async (job) => {
      this.ctx.retryFile(job.id);
      this.ctx.setLane('uploading');
    },
    open_project: async (job) => {
      await this.fileActions.openUploadedJobProject(job);
    },
    open_in_media: async (job) => {
      await this.fileActions.openUploadedJobInMedia(job);
    },
    add_to_project: async (job) => {
      await this.dialogActions.openProjectAssignmentForJob(job);
    },
    download: async (job) => {
      await this.fileActions.downloadUploadedJob(job);
    },
    cancel_upload: async (job) => {
      this.uploadManager.cancelJob(job.id);
    },
    remove_from_project: async (job) => {
      const ok = await this.fileActions.removeUploadedJobFromProject(job);
      if (ok) {
        this.ctx.dismissFile(job.id);
      }
    },
    dismiss: async (job) => {
      this.ctx.dismissFile(job.id);
    },
    toggle_priority: async (job) => {
      this.fileActions.toggleJobPriority(job);
    },
  };

  private showJobStatusToast(job: UploadJob): void {
    this.toastService.show({
      message: job.statusLabel,
      type: 'info',
      dedupe: true,
    });
  }

  private handlePlaceOnMap(job: UploadJob): void {
    const issueKind = getIssueKind(job);
    if (issueKind === 'missing_gps' || issueKind === 'document_unresolved') {
      this.ctx.placementRequested(job.id);
      return;
    }
    this.fileActions.requestLocationPickOnMap(job);
  }

  async handleMenuAction(job: UploadJob, action: UploadItemMenuAction): Promise<void> {
    const handler = this.menuHandlers[action];
    await handler(job);
  }
}
