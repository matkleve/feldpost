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
import {
  GeocodingService,
  type ForwardGeocodeResult,
} from '../../core/geocoding/geocoding.service';
import { MediaLocationUpdateService } from '../../core/media-location-update/media-location-update.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { ToastService } from '../../core/toast/toast.service';
import { UploadManagerService, type UploadJob } from '../../core/upload/upload-manager.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MapProjectActionsService } from '../map/map-shell/map-project-actions.service';
import { MapProjectDialogService } from '../map/map-shell/map-project-dialog.service';
import { UploadPanelDialogSignals } from './upload-panel-dialog-signals.service';
import { mapSearchResultsToForwardSuggestions } from './upload-panel-helpers';
import { getBoundProjectIds } from './upload-panel-project-bindings.util';
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
  private readonly projectNameDialogOpen = signal(false);
  private readonly projectNameDialogTitle = signal('');
  private readonly projectNameDialogMessage = signal('');
  private readonly projectNameDialogInitialValue = signal('');

  private readonly projectDialogSignals = {
    projectSelectionDialogOpen: this.dialogSignals.projectSelectionDialogOpen,
    projectSelectionDialogTitle: this.dialogSignals.projectSelectionDialogTitle,
    projectSelectionDialogMessage: this.dialogSignals.projectSelectionDialogMessage,
    projectSelectionDialogOptions: this.dialogSignals.projectSelectionDialogOptions,
    projectSelectionDialogSelectedId: this.dialogSignals.projectSelectionDialogSelectedId,
    projectNameDialogOpen: this.projectNameDialogOpen.asReadonly(),
    projectNameDialogTitle: this.projectNameDialogTitle.asReadonly(),
    projectNameDialogMessage: this.projectNameDialogMessage.asReadonly(),
    projectNameDialogInitialValue: this.projectNameDialogInitialValue.asReadonly(),
    setProjectSelectionDialogOpen: (value: boolean) =>
      this.dialogSignals.setProjectSelectionDialogOpen(value),
    setProjectSelectionDialogTitle: (value: string) =>
      this.dialogSignals.setProjectSelectionDialogTitle(value),
    setProjectSelectionDialogMessage: (value: string) =>
      this.dialogSignals.setProjectSelectionDialogMessage(value),
    setProjectSelectionDialogOptions: (value: ReadonlyArray<{ id: string; name: string }>) =>
      this.dialogSignals.setProjectSelectionDialogOptions(value),
    setProjectSelectionDialogSelectedId: (value: string | null) =>
      this.dialogSignals.setProjectSelectionDialogSelectedId(value),
    setProjectNameDialogOpen: (value: boolean) => this.projectNameDialogOpen.set(value),
    setProjectNameDialogTitle: (value: string) => this.projectNameDialogTitle.set(value),
    setProjectNameDialogMessage: (value: string) => this.projectNameDialogMessage.set(value),
    setProjectNameDialogInitialValue: (value: string) =>
      this.projectNameDialogInitialValue.set(value),
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
    this.dialogSignals.setLocationAddressDialogQuery(query);
    const timeout = this.dialogSignals.getLocationAddressSearchTimeout();
    if (timeout) {
      clearTimeout(timeout);
      this.dialogSignals.setLocationAddressSearchTimeout(null);
    }

    if (!query.trim()) {
      this.dialogSignals.setLocationAddressDialogLoading(false);
      this.dialogSignals.setLocationAddressDialogSuggestions([]);
      this.ctx.locationPreviewCleared();
      return;
    }

    const newTimeout = setTimeout(() => {
      void this.searchLocationAddress(query);
    }, 280);
    this.dialogSignals.setLocationAddressSearchTimeout(newTimeout);
  }

  onLocationAddressDialogClose(): void {
    this.dialogSignals.setLocationAddressDialogOpen(false);
    this.dialogSignals.setLocationAddressDialogQuery('');
    this.dialogSignals.setLocationAddressDialogSuggestions([]);
    this.dialogSignals.setPendingLocationAddressJob(null);
    this.ctx.locationPreviewCleared();
  }

  onLocationAddressSuggestionHover(suggestion: ForwardGeocodeResult): void {
    this.ctx.locationPreviewRequested({ lat: suggestion.lat, lng: suggestion.lng });
  }

  onLocationAddressSuggestionHoverEnd(): void {
    this.ctx.locationPreviewCleared();
  }

  async onAddressAmbiguousCandidateSelect(job: UploadJob): Promise<void> {
    const candidate = job.addressCandidates?.[0];
    if (!candidate) {
      this.openLocationAddressDialog(job);
      return;
    }

    if (!job.imageId && job.phase === 'missing_data') {
      this.uploadManager.selectAddressCandidate(job.id, candidate);
      this.toastService.show({
        message: this.t('upload.location.update.success', 'Location updated.'),
        type: 'success',
        dedupe: true,
      });
      return;
    }

    if (!job.imageId) {
      return;
    }

    const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(job.imageId, {
      lat: candidate.lat,
      lng: candidate.lng,
      addressLabel: candidate.addressLabel,
      city: null,
      district: null,
      street: null,
      streetNumber: null,
      zip: null,
      country: null,
    });
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
      this.dialogSignals.setPendingProjectAssignmentJob(null);
      return;
    }

    if (!job.imageId && job.phase === 'missing_data') {
      this.uploadManager.assignJobToProject(job.id, projectId);
      this.toastService.show({
        message: this.mapProjectActionsService.formatProjectAssignmentSuccess(selected.name, 1),
        type: 'success',
        dedupe: true,
      });
      this.dialogSignals.setPendingProjectAssignmentJob(null);
      this.ctx.setLane('uploading');
      return;
    }

    if (!job.imageId) {
      this.dialogSignals.setPendingProjectAssignmentJob(null);
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

    this.dialogSignals.setPendingProjectAssignmentJob(null);
  }

  onProjectSelectionDialogCancelled(): void {
    this.mapProjectDialogService.cancelProjectSelection(this.projectDialogSignals);
    this.dialogSignals.setPendingProjectAssignmentJob(null);
  }

  onDuplicateResolutionApplyToBatchChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.dialogSignals.setDuplicateResolutionApplyToBatch(target.checked);
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

    this.dialogSignals.setPendingProjectAssignmentJob(job);
    const prioritizedOptions = this.prioritizeBoundProjectOptions(job, optionsResult.options);
    void this.mapProjectDialogService.openProjectSelectionDialog(
      this.projectDialogSignals,
      prioritizedOptions,
      this.t('upload.item.menu.assignProject', 'Assign project'),
      job.file.name,
    );
  }

  openDuplicateResolutionDialog(job: UploadJob): void {
    this.dialogSignals.setPendingDuplicateResolutionJob(job);
    this.dialogSignals.setDuplicateResolutionApplyToBatch(false);
    this.dialogSignals.setDuplicateResolutionDialogOpen(true);
  }

  closeDuplicateResolutionDialog(): void {
    this.dialogSignals.setPendingDuplicateResolutionJob(null);
    this.dialogSignals.setDuplicateResolutionApplyToBatch(false);
    this.dialogSignals.setDuplicateResolutionDialogOpen(false);
  }

  openLocationAddressDialog(job: UploadJob): void {
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    this.dialogSignals.setPendingLocationAddressJob(job);
    this.dialogSignals.setLocationAddressDialogQuery('');
    this.dialogSignals.setLocationAddressDialogSuggestions([]);
    this.dialogSignals.setLocationAddressDialogLoading(false);
    this.dialogSignals.setLocationAddressDialogOpen(true);
  }

  private async searchLocationAddress(query: string): Promise<void> {
    const normalized = query.trim();
    if (!normalized) {
      this.dialogSignals.setLocationAddressDialogSuggestions([]);
      this.dialogSignals.setLocationAddressDialogLoading(false);
      return;
    }

    this.dialogSignals.setLocationAddressDialogLoading(true);
    const results = await this.geocodingService.search(normalized, { limit: 6 });
    this.dialogSignals.setLocationAddressDialogLoading(false);
    this.dialogSignals.setLocationAddressDialogSuggestions(
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

  private prioritizeBoundProjectOptions(
    job: UploadJob,
    options: ReadonlyArray<{ id: string; name: string }>,
  ): ReadonlyArray<{ id: string; name: string }> {
    const boundProjectIds = new Set(getBoundProjectIds(job));
    if (boundProjectIds.size === 0) {
      return options;
    }

    const preferred = options.filter((option) => boundProjectIds.has(option.id));
    if (preferred.length === 0) {
      return options;
    }

    const remaining = options.filter((option) => !boundProjectIds.has(option.id));
    return [...preferred, ...remaining];
  }
}
