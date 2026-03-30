import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { GeocodingService, type ForwardGeocodeResult } from '../../core/geocoding.service';
import { MediaLocationUpdateService } from '../../core/media-location-update.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ToastService } from '../../core/toast.service';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import { UploadService } from '../../core/upload/upload.service';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MapProjectActionsService } from '../map/map-shell/map-project-actions.service';
import { MapProjectDialogService } from '../map/map-shell/map-project-dialog.service';
import { UploadPanelDialogSignals } from './upload-panel-dialog-signals.service';
import type { UploadItemMenuAction } from './upload-panel-item.component';
import { getIssueKind, type UploadLane } from './upload-phase.helpers';
import { mapSearchResultsToForwardSuggestions } from './upload-panel-helpers';

export interface ImageUploadedEvent {
  id: string;
  lat: number;
  lng: number;
  direction?: number;
  thumbnailUrl?: string;
}

export interface UploadLocationPreviewEvent {
  lat: number;
  lng: number;
}

export interface UploadLocationMapPickRequest {
  imageId: string;
  fileName: string;
}

export type DuplicateResolutionChoice = 'use_existing' | 'upload_anyway' | 'reject';

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
  private readonly uploadService = inject(UploadService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly projectsService = inject(ProjectsService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly toastService = inject(ToastService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly router = inject(Router);
  private readonly supabaseService = inject(SupabaseService);
  private readonly i18nService = inject(I18nService);
  private readonly dialogSignals = inject(UploadPanelDialogSignals);

  private readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  private callbacks: UploadPanelJobActionsRegisterOptions | null = null;

  private readonly projectDialogSignals = {
    projectSelectionDialogOpen: this.dialogSignals.projectSelectionDialogOpen,
    projectSelectionDialogTitle: this.dialogSignals.projectSelectionDialogTitle,
    projectSelectionDialogMessage: this.dialogSignals.projectSelectionDialogMessage,
    projectSelectionDialogOptions: this.dialogSignals.projectSelectionDialogOptions,
    projectSelectionDialogSelectedId: this.dialogSignals.projectSelectionDialogSelectedId,
    projectNameDialogOpen: signal(false),
    projectNameDialogTitle: signal(''),
    projectNameDialogMessage: signal(''),
    projectNameDialogInitialValue: signal(''),
  };

  register(opts: UploadPanelJobActionsRegisterOptions): void {
    this.callbacks = opts;
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

  async handleMenuAction(job: UploadJob, action: UploadItemMenuAction): Promise<void> {
    if (action === 'view_progress' || action === 'view_file_details') {
      this.toastService.show({
        message: job.statusLabel,
        type: 'info',
        dedupe: true,
      });
      return;
    }

    if (action === 'open_existing_media') {
      await this.openExistingDuplicateInMedia(job);
      return;
    }

    if (action === 'upload_anyway') {
      this.openDuplicateResolutionDialog(job);
      return;
    }

    if (action === 'change_location_map') {
      this.requestLocationPickOnMap(job);
      return;
    }

    if (action === 'place_on_map') {
      const issueKind = getIssueKind(job);
      if (issueKind === 'missing_gps' || issueKind === 'document_unresolved') {
        this.registered.placementRequested(job.id);
        return;
      }
      this.requestLocationPickOnMap(job);
      return;
    }

    if (action === 'change_location_address') {
      this.openLocationAddressDialog(job);
      return;
    }

    if (action === 'retry') {
      this.retryFile(job.id);
      this.registered.setLane('uploading');
      return;
    }

    if (action === 'open_project') {
      await this.openUploadedJobProject(job);
      return;
    }

    if (action === 'open_in_media') {
      await this.openUploadedJobInMedia(job);
      return;
    }

    if (action === 'add_to_project') {
      await this.openProjectAssignmentForJob(job);
      return;
    }

    if (action === 'download') {
      await this.downloadUploadedJob(job);
      return;
    }

    if (action === 'cancel_upload') {
      this.uploadManager.cancelJob(job.id);
      return;
    }

    if (action === 'remove_from_project') {
      await this.removeUploadedJobFromProject(job);
      return;
    }

    if (action === 'dismiss') {
      this.dismissFile(job.id);
      return;
    }

    if (action === 'toggle_priority') {
      this.toggleJobPriority(job);
    }
  }

  onLocationAddressDialogQueryInput(query: string): void {
    this.dialogSignals.locationAddressDialogQuery.set(query);
    const timeout = this.dialogSignals.getLocationAddressSearchTimeout();
    if (timeout) {
      clearTimeout(timeout);
      this.dialogSignals.setLocationAddressSearchTimeout(null);
    }

    if (!query.trim()) {
      this.dialogSignals.locationAddressDialogLoading.set(false);
      this.dialogSignals.locationAddressDialogSuggestions.set([]);
      this.registered.locationPreviewCleared();
      return;
    }

    const newTimeout = setTimeout(() => {
      void this.searchLocationAddress(query);
    }, 280);
    this.dialogSignals.setLocationAddressSearchTimeout(newTimeout);
  }

  onLocationAddressDialogClose(): void {
    this.dialogSignals.locationAddressDialogOpen.set(false);
    this.dialogSignals.locationAddressDialogQuery.set('');
    this.dialogSignals.locationAddressDialogSuggestions.set([]);
    this.dialogSignals.pendingLocationAddressJob.set(null);
    this.registered.locationPreviewCleared();
  }

  onLocationAddressSuggestionHover(suggestion: ForwardGeocodeResult): void {
    this.registered.locationPreviewRequested({ lat: suggestion.lat, lng: suggestion.lng });
  }

  onLocationAddressSuggestionHoverEnd(): void {
    this.registered.locationPreviewCleared();
  }

  async onLocationAddressSuggestionApply(suggestion: ForwardGeocodeResult): Promise<void> {
    const job = this.dialogSignals.pendingLocationAddressJob();
    if (!job) {
      this.onLocationAddressDialogClose();
      return;
    }

    if (!job.imageId && job.phase === 'missing_data') {
      this.placeFile(job.id, suggestion.lat, suggestion.lng);
      this.toastService.show({
        message: this.t('upload.location.update.success', 'Location updated.'),
        type: 'success',
        dedupe: true,
      });
      this.onLocationAddressDialogClose();
      return;
    }

    if (!job.imageId) {
      this.onLocationAddressDialogClose();
      return;
    }

    const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
      job.imageId,
      suggestion,
    );
    if (!result.ok || typeof result.lat !== 'number' || typeof result.lng !== 'number') {
      this.toastService.show({
        message: this.t('upload.location.update.failed', 'Location could not be updated.'),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.registered.imageUploaded({ id: job.imageId, lat: result.lat, lng: result.lng });
    this.toastService.show({
      message: this.t('upload.location.update.success', 'Location updated.'),
      type: 'success',
      dedupe: true,
    });
    this.onLocationAddressDialogClose();
  }

  onProjectSelectionDialogSelected(projectId: string): void {
    this.mapProjectDialogService.setProjectSelectionSelectedId(
      this.projectDialogSignals,
      projectId,
    );
  }

  async onProjectSelectionDialogConfirmed(projectId: string): Promise<void> {
    const job = this.dialogSignals.pendingProjectAssignmentJob();
    const selected =
      this.dialogSignals
        .projectSelectionDialogOptions()
        .find((option) => option.id === projectId) ?? null;
    this.mapProjectDialogService.confirmProjectSelection(this.projectDialogSignals, projectId);

    if (!job || !selected) {
      this.dialogSignals.pendingProjectAssignmentJob.set(null);
      return;
    }

    if (!job.imageId && job.phase === 'missing_data') {
      this.uploadManager.assignJobToProject(job.id, projectId);
      this.toastService.show({
        message: this.mapProjectActionsService.formatProjectAssignmentSuccess(selected.name, 1),
        type: 'success',
        dedupe: true,
      });
      this.dialogSignals.pendingProjectAssignmentJob.set(null);
      this.registered.setLane('uploading');
      return;
    }

    if (!job.imageId) {
      this.dialogSignals.pendingProjectAssignmentJob.set(null);
      return;
    }

    const ok = await this.projectsService.addMediaToProject(job.imageId, projectId);
    if (ok) {
      this.toastService.show({
        message: this.mapProjectActionsService.formatProjectAssignmentSuccess(selected.name, 1),
        type: 'success',
        dedupe: true,
      });
    } else {
      this.toastService.show({
        message: this.t(
          'workspace.imageDetail.toast.membershipUpdateFailed',
          'Could not update project memberships.',
        ),
        type: 'error',
        dedupe: true,
      });
    }

    this.dialogSignals.pendingProjectAssignmentJob.set(null);
  }

  onProjectSelectionDialogCancelled(): void {
    this.mapProjectDialogService.cancelProjectSelection(this.projectDialogSignals);
    this.dialogSignals.pendingProjectAssignmentJob.set(null);
  }

  onDuplicateResolutionApplyToBatchChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.dialogSignals.duplicateResolutionApplyToBatch.set(target.checked);
  }

  async onDuplicateResolutionChoice(choice: DuplicateResolutionChoice): Promise<void> {
    const job = this.dialogSignals.pendingDuplicateResolutionJob();
    if (!job) {
      this.closeDuplicateResolutionDialog();
      return;
    }

    const jobs = this.resolveDuplicateResolutionTargets(
      job,
      this.dialogSignals.duplicateResolutionApplyToBatch(),
    );

    if (choice === 'upload_anyway') {
      for (const entry of jobs) {
        this.uploadManager.forceDuplicateUpload(entry.id);
      }
      this.registered.setLane('uploading');
      this.closeDuplicateResolutionDialog();
      return;
    }

    if (choice === 'use_existing') {
      await this.openExistingDuplicateInMedia(job);
      for (const entry of jobs) {
        this.dismissFile(entry.id);
      }
      this.closeDuplicateResolutionDialog();
      return;
    }

    for (const entry of jobs) {
      this.dismissFile(entry.id);
    }
    this.closeDuplicateResolutionDialog();
  }

  async openProjectAssignmentForJob(job: UploadJob): Promise<void> {
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    const optionsResult = await this.mapProjectActionsService.loadProjectOptions(
      this.supabaseService.client,
    );
    if (!optionsResult.ok) {
      this.toastService.show({
        message: this.t('map.shell.toast.projectAssignmentFailed', 'Project assignment failed.'),
        type: optionsResult.reason === 'empty' ? 'warning' : 'error',
        dedupe: true,
      });
      return;
    }

    this.dialogSignals.pendingProjectAssignmentJob.set(job);
    void this.mapProjectDialogService.openProjectSelectionDialog(
      this.projectDialogSignals,
      optionsResult.options,
      this.t('auto.0013.add_to_project', 'Add to project'),
      job.file.name,
    );
  }

  openDuplicateResolutionDialog(job: UploadJob): void {
    this.dialogSignals.pendingDuplicateResolutionJob.set(job);
    this.dialogSignals.duplicateResolutionApplyToBatch.set(false);
    this.dialogSignals.duplicateResolutionDialogOpen.set(true);
  }

  closeDuplicateResolutionDialog(): void {
    this.dialogSignals.pendingDuplicateResolutionJob.set(null);
    this.dialogSignals.duplicateResolutionApplyToBatch.set(false);
    this.dialogSignals.duplicateResolutionDialogOpen.set(false);
  }

  resolveDuplicateResolutionTargets(
    seed: UploadJob,
    applyToBatch: boolean,
  ): ReadonlyArray<UploadJob> {
    if (!applyToBatch || !seed.existingImageId) {
      return [seed];
    }

    return this.uploadManager
      .jobs()
      .filter((job) => job.phase === 'skipped' && job.existingImageId === seed.existingImageId);
  }

  async downloadUploadedJob(job: UploadJob): Promise<void> {
    if (!job.storagePath) {
      this.toastService.show({
        message: 'Download nicht verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    const result = await this.uploadService.downloadFile(job.storagePath);
    if (!result.ok) {
      this.toastService.show({
        message: typeof result.error === 'string' ? result.error : 'Download fehlgeschlagen.',
        type: 'error',
        dedupe: true,
      });
      return;
    }

    if (typeof document === 'undefined') {
      return;
    }

    const blobUrl = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = job.file.name;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }

  async openUploadedJobInMedia(job: UploadJob): Promise<void> {
    if (!job.imageId) {
      return;
    }

    this.workspaceSelectionService.setSingle(job.imageId);
    this.workspacePaneObserver.setDetailImageId(job.imageId);
    this.workspacePaneObserver.setOpen(true);

    await this.router.navigate(['/media']);
  }

  async openExistingDuplicateInMedia(job: UploadJob): Promise<void> {
    if (!job.existingImageId) {
      return;
    }

    this.workspaceSelectionService.setSingle(job.existingImageId);
    this.workspacePaneObserver.setDetailImageId(job.existingImageId);
    this.workspacePaneObserver.setOpen(true);

    await this.router.navigate(['/media']);
  }

  async openUploadedJobProject(job: UploadJob): Promise<void> {
    if (!job.projectId) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    await this.router.navigate(['/projects', job.projectId]);
  }

  async removeUploadedJobFromProject(job: UploadJob): Promise<void> {
    if (!job.imageId || !job.projectId) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.unavailable', 'No project assigned.'),
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    const ok = await this.projectsService.removeMediaFromProject(job.imageId, job.projectId);
    if (!ok) {
      this.toastService.show({
        message: this.t('upload.item.menu.project.remove.failed', 'Could not remove from project.'),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.toastService.show({
      message: this.t('upload.item.menu.project.remove.success', 'Removed from project.'),
      type: 'success',
      dedupe: true,
    });
    this.dismissFile(job.id);
  }

  requestLocationPickOnMap(job: UploadJob): void {
    if (!job.imageId) {
      return;
    }

    this.registered.locationMapPickRequested({ imageId: job.imageId, fileName: job.file.name });
    this.toastService.show({
      message: this.t('upload.location.mapPick.hint', 'Click on the map to set the location.'),
      type: 'info',
      dedupe: true,
    });
  }

  openLocationAddressDialog(job: UploadJob): void {
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    this.dialogSignals.pendingLocationAddressJob.set(job);
    this.dialogSignals.locationAddressDialogQuery.set('');
    this.dialogSignals.locationAddressDialogSuggestions.set([]);
    this.dialogSignals.locationAddressDialogLoading.set(false);
    this.dialogSignals.locationAddressDialogOpen.set(true);
  }

  async searchLocationAddress(query: string): Promise<void> {
    const normalized = query.trim();
    if (!normalized) {
      this.dialogSignals.locationAddressDialogSuggestions.set([]);
      this.dialogSignals.locationAddressDialogLoading.set(false);
      return;
    }

    this.dialogSignals.locationAddressDialogLoading.set(true);
    const results = await this.geocodingService.search(normalized, { limit: 6 });
    this.dialogSignals.locationAddressDialogLoading.set(false);
    this.dialogSignals.locationAddressDialogSuggestions.set(
      mapSearchResultsToForwardSuggestions(results),
    );
  }

  toggleJobPriority(job: UploadJob): void {
    if (!job.imageId) {
      return;
    }

    const next = new Set(this.registered.prioritizedUploadedJobIds());
    const had = next.has(job.id);
    if (had) {
      next.delete(job.id);
    } else {
      next.add(job.id);
    }
    this.registered.prioritizedUploadedJobIds.set(next);

    this.toastService.show({
      message: had
        ? this.t('upload.item.menu.priority.removedToast', 'Priority removed.')
        : this.t('upload.item.menu.priority.addedToast', 'Upload prioritized.'),
      type: 'success',
      dedupe: true,
    });
  }
}
