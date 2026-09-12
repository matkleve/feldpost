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
import { ToastService } from '../../../core/toast/toast.service';
import { UploadManagerService, type UploadJob } from '../../../core/upload/upload-manager.service';
import type { UploadItemActionContext, UploadItemMenuAction } from './upload-panel-item.component';
import { getIssueKind } from '../upload-phase.helpers';
import { UploadPanelDialogActionsService } from './upload-panel-dialog-actions.service';
import { UploadPanelJobFileActionsService } from './upload-panel-job-file-actions.service';
import { ACTION_CONTEXT_IDS } from '../../../core/action/action-context-ids';
import { I18nService } from '../../../core/i18n/i18n.service';
import { statusLabelText } from './upload-panel-item-helpers';

export interface UploadPanelMenuActionRouterOptions {
  placementRequested: (jobId: string) => void;
  dismissFile: (jobId: string) => void;
  retryFile: (jobId: string) => void;
  setLane: (lane: 'uploading' | 'uploaded' | 'issues') => void;
}

@Injectable()
export class UploadPanelMenuActionRouterService {
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);
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
    view_file_details: async (job) => {
      this.showJobStatusToast(job);
    },
    open_existing_media: async (job) => {
      await this.fileActions.openExistingDuplicateInMedia(job);
    },
    upload_anyway: async (job) => {
      // upload-panel.md § Row Action Registry Shape: upload_anyway directly forces duplicate bypass.
      this.uploadManager.forceDuplicateUpload(job.id);
    },
    change_location_address: async (job) => {
      this.dialogActions.openLocationAddressDialog(job);
    },
    candidate_select: async (job) => {
      await this.dialogActions.onAddressAmbiguousCandidateSelect(job);
    },
    manual_location_entry: async (job) => {
      this.dialogActions.openLocationAddressDialog(job);
    },
    cancel_location_prompt: async (job) => {
      this.ctx.dismissFile(job.id);
    },
    change_location_map: async (job) => {
      this.handlePlaceOnMap(job);
    },
    retry: async (job) => {
      this.ctx.retryFile(job.id);
    },
    open_project: async (job) => {
      await this.fileActions.openUploadedJobProject(job);
    },
    open_in_media: async (job) => {
      await this.fileActions.openUploadedJobInMedia(job);
    },
    assign_to_project: async (job) => {
      await this.dialogActions.openProjectAssignmentForJob(job);
    },
    download: async (job) => {
      await this.fileActions.downloadUploadedJob(job);
    },
    cancel_upload: async (job) => {
      this.uploadManager.cancelJob(job.id);
    },
    remove_from_project: async (job) => {
      const ok = await this.fileActions.removeUploadedJobFromProjects(job);
      if (ok) {
        this.ctx.dismissFile(job.id);
      }
    },
    delete_media: async (job) => {
      const ok = await this.fileActions.deleteUploadedMedia(job);
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
      // job.statusLabel is the pipeline's internal English text; the user-facing
      // string has to come from the i18n resolver (UP-29).
      message: statusLabelText(job, (key, fallback) => this.i18nService.t(key, fallback)),
      type: 'info',
      dedupe: true,
    });
  }

  private handlePlaceOnMap(job: UploadJob): void {
    const issueKind = getIssueKind(job);
    if (issueKind === 'missing_gps' || issueKind === 'address_deferred' || issueKind === 'document_unresolved') {
      // upload-panel.md § Actions 15m: issue rows enter placement workflow via placementRequested.
      this.ctx.placementRequested(job.id);
      return;
    }
    void this.fileActions.requestLocationPickOnMap(job);
  }

  async handleMenuAction(
    job: UploadJob,
    action: UploadItemMenuAction,
    context?: UploadItemActionContext,
  ): Promise<void> {
    if (context && context.contextType !== ACTION_CONTEXT_IDS.uploadItem) {
      return;
    }
    const handler = this.menuHandlers[action];
    await handler(job);
  }
}
