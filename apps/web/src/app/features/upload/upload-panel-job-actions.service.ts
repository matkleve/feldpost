/**
 * UploadPanelJobActionsService — Per-file action handlers (menu item clicks).
 *
 * Routes menu action selections to appropriate handlers:
 *  - view_progress, view_file_details → UploadPanelJobFileActionsService
 *  - place_on_map, change_location_* → UploadPanelDialogActionsService
 *  - upload_anyway, use_existing, reject → Delegate to UploadManager
 *  - retry, cancel, dismiss → UploadManager action methods
 *  - download, open_*, assign_to_project → UploadPanelJobFileActionsService
 *
 * Ground rules (Spec: upload-panel.md § Actions):
 *  - Action visibility gated by lane + issueKind (see upload-panel-item.component.ts)
 *  - Modal dialogs flow back to setLane + UploadManager actions
 *  - Emitted events: imageUploaded, placementRequested, locationPreview*
 */

import { Injectable, inject, type WritableSignal } from '@angular/core';
import type { ForwardGeocodeResult } from '../../core/geocoding/geocoding.service';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import type { UploadItemActionContext, UploadItemMenuAction } from './upload-panel-item.component';
import type { UploadLane } from './upload-phase.helpers';
import { UploadPanelJobFileActionsService } from './upload-panel-job-file-actions.service';
import {
  UploadPanelDialogActionsService,
  type DuplicateResolutionChoice,
} from './upload-panel-dialog-actions.service';
export type { DuplicateResolutionChoice } from './upload-panel-dialog-actions.service';
import { UploadPanelMenuActionRouterService } from './upload-panel-menu-action-router.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from './upload-panel.types';

export interface UploadPanelJobActionsRegisterOptions {
  imageUploaded: (e: ImageUploadedEvent) => void;
  placementRequested: (id: string) => void;
  locationMapPickRequested: (e: UploadLocationMapPickRequest) => void;
  locationPreviewRequested: (e: UploadLocationPreviewEvent) => void;
  locationPreviewCleared: () => void;
  setLane: (lane: UploadLane) => void;
  selectedUploadJobIds: WritableSignal<Set<string>>;
  prioritizedUploadedJobIds: WritableSignal<Set<string>>;
}

@Injectable()
export class UploadPanelJobActionsService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly fileActions = inject(UploadPanelJobFileActionsService);
  private readonly dialogActions = inject(UploadPanelDialogActionsService);
  private readonly menuActionRouter = inject(UploadPanelMenuActionRouterService);

  private callbacks: UploadPanelJobActionsRegisterOptions | null = null;

  register(opts: UploadPanelJobActionsRegisterOptions): void {
    this.callbacks = opts;
    this.fileActions.register({
      locationMapPickRequested: opts.locationMapPickRequested,
      prioritizedUploadedJobIds: opts.prioritizedUploadedJobIds,
    });
    this.dialogActions.register({
      imageUploaded: opts.imageUploaded,
      locationPreviewRequested: opts.locationPreviewRequested,
      locationPreviewCleared: opts.locationPreviewCleared,
      setLane: opts.setLane,
      dismissFile: (jobId) => this.dismissFile(jobId),
      placeFile: (jobId, lat, lng) => this.placeFile(jobId, lat, lng),
      openExistingDuplicateInMedia: (job) => this.fileActions.openExistingDuplicateInMedia(job),
    });
    this.menuActionRouter.register({
      placementRequested: (jobId) => opts.placementRequested(jobId),
      dismissFile: (jobId) => this.dismissFile(jobId),
      retryFile: (jobId) => this.retryFile(jobId),
      setLane: (lane) => opts.setLane(lane),
    });
  }

  private get registered(): UploadPanelJobActionsRegisterOptions {
    if (!this.callbacks) {
      throw new Error('UploadPanelJobActionsService not registered.');
    }
    return this.callbacks;
  }

  private dismissFile(jobId: string): void {
    this.uploadManager.dismissJob(jobId);
    this.registered.selectedUploadJobIds.update((selected) => {
      if (!selected.has(jobId)) {
        return selected;
      }
      const next = new Set(selected);
      next.delete(jobId);
      return next;
    });
  }

  private retryFile(jobId: string): void {
    this.uploadManager.retryJob(jobId);
  }

  private placeFile(jobId: string, lat: number, lng: number): void {
    this.uploadManager.placeJob(jobId, { lat, lng });
  }

  async handleMenuAction(
    job: UploadJob,
    action: UploadItemMenuAction,
    context?: UploadItemActionContext,
  ): Promise<void> {
    await this.menuActionRouter.handleMenuAction(job, action, context);
  }

  onLocationAddressDialogQueryInput(query: string): void {
    this.dialogActions.onLocationAddressDialogQueryInput(query);
  }

  onLocationAddressDialogClose(): void {
    this.dialogActions.onLocationAddressDialogClose();
  }

  onLocationAddressSuggestionHover(suggestion: ForwardGeocodeResult): void {
    this.dialogActions.onLocationAddressSuggestionHover(suggestion);
  }

  onLocationAddressSuggestionHoverEnd(): void {
    this.dialogActions.onLocationAddressSuggestionHoverEnd();
  }

  async onLocationAddressSuggestionApply(suggestion: ForwardGeocodeResult): Promise<void> {
    await this.dialogActions.onLocationAddressSuggestionApply(suggestion);
  }

  onProjectSelectionDialogSelected(projectId: string): void {
    this.dialogActions.onProjectSelectionDialogSelected(projectId);
  }

  async onProjectSelectionDialogConfirmed(projectId: string): Promise<void> {
    await this.dialogActions.onProjectSelectionDialogConfirmed(projectId);
  }

  onProjectSelectionDialogCancelled(): void {
    this.dialogActions.onProjectSelectionDialogCancelled();
  }

  onDuplicateResolutionApplyToBatchChange(event: Event): void {
    this.dialogActions.onDuplicateResolutionApplyToBatchChange(event);
  }

  async onDuplicateResolutionChoice(choice: DuplicateResolutionChoice): Promise<void> {
    await this.dialogActions.onDuplicateResolutionChoice(choice);
  }

  async downloadUploadedJob(job: UploadJob): Promise<void> {
    await this.fileActions.downloadUploadedJob(job);
  }
}
