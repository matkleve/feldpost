/**
 * UploadPanelDialogActionsService — Modal dialog handlers (duplicate, project, location).
 *
 * Handles user responses from three main dialog flows:
 *  1. **Duplicate Resolution** (issueKind=duplicate_photo)
 *     - Modal: Choose use_existing, upload_anyway, reject
 *     - Actions: Attach to row | Force new upload | Skip entirely
 *
 *  2. **Project Assignment** (issueKind=document_unresolved)
 *     - Modal: Select from active projects or skip
 *     - Action: assignUploadManagerJobToProject(jobId, projectId)
 *
 *  3. **Location Resolution** (issueKind=missing_gps | document_unresolved)
 *     - Map picker or address search (forward-geocode)
 *     - Actions: placeFile(jobId, lat, lng) | dismiss
 *
 * Delegates to:
 *  - UploadManagerService: resolveUploadManagerConflict, assignUploadManagerJobToProject
 *  - GeocodingService: Forward-geocode address → coords
 *  - MediaLocationUpdateService: Update existing row coordinates
 *  - MapProjectDialogService: Project selection UI
 */

import { Injectable, inject, signal } from '@angular/core';
import { GeocodingService, type ForwardGeocodeResult } from '../../core/geocoding.service';
import { MediaLocationUpdateService } from '../../core/media-location-update.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ToastService } from '../../core/toast.service';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MapProjectActionsService } from '../map/map-shell/map-project-actions.service';
import { MapProjectDialogService } from '../map/map-shell/map-project-dialog.service';
import { UploadPanelDialogSignals } from './upload-panel-dialog-signals.service';
import { mapSearchResultsToForwardSuggestions } from './upload-panel-helpers';
import type { ImageUploadedEvent, UploadLocationPreviewEvent } from './upload-panel.types';

export type DuplicateResolutionChoice = 'use_existing' | 'upload_anyway' | 'reject';

export interface UploadPanelDialogActionsRegisterOptions {
  imageUploaded: (e: ImageUploadedEvent) => void;
  locationPreviewRequested: (e: UploadLocationPreviewEvent) => void;
  locationPreviewCleared: () => void;
  setLane: (lane: 'uploading' | 'uploaded' | 'issues') => void;
  dismissFile: (jobId: string) => void;
  placeFile: (jobId: string, lat: number, lng: number) => void;
  openExistingDuplicateInMedia: (job: UploadJob) => Promise<void>;
}

@Injectable()
export class UploadPanelDialogActionsService {
  private readonly uploadManager = inject(UploadManagerService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly projectsService = inject(ProjectsService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly toastService = inject(ToastService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly i18nService = inject(I18nService);
  private readonly dialogSignals = inject(UploadPanelDialogSignals);

  private readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  private options: UploadPanelDialogActionsRegisterOptions | null = null;

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

  register(options: UploadPanelDialogActionsRegisterOptions): void {
    this.options = options;
  }

  private get ctx(): UploadPanelDialogActionsRegisterOptions {
    if (!this.options) {
      throw new Error('UploadPanelDialogActionsService not registered.');
    }
    return this.options;
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
      this.ctx.locationPreviewCleared();
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
    this.ctx.locationPreviewCleared();
  }

  onLocationAddressSuggestionHover(suggestion: ForwardGeocodeResult): void {
    this.ctx.locationPreviewRequested({ lat: suggestion.lat, lng: suggestion.lng });
  }

  onLocationAddressSuggestionHoverEnd(): void {
    this.ctx.locationPreviewCleared();
  }

  async onLocationAddressSuggestionApply(suggestion: ForwardGeocodeResult): Promise<void> {
    const job = this.dialogSignals.pendingLocationAddressJob();
    if (!job) {
      this.onLocationAddressDialogClose();
      return;
    }

    if (!job.imageId && job.phase === 'missing_data') {
      this.ctx.placeFile(job.id, suggestion.lat, suggestion.lng);
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

    this.ctx.imageUploaded({ id: job.imageId, lat: result.lat, lng: result.lng });
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
      this.ctx.setLane('uploading');
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
      this.ctx.setLane('uploading');
      this.closeDuplicateResolutionDialog();
      return;
    }

    if (choice === 'use_existing') {
      await this.ctx.openExistingDuplicateInMedia(job);
      for (const entry of jobs) {
        this.ctx.dismissFile(entry.id);
      }
      this.closeDuplicateResolutionDialog();
      return;
    }

    for (const entry of jobs) {
      this.ctx.dismissFile(entry.id);
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

  private async searchLocationAddress(query: string): Promise<void> {
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

  private resolveDuplicateResolutionTargets(
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
}
