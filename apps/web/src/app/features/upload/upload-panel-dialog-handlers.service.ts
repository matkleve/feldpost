/**
 * UploadPanelDialogHandlersService — delegates all dialog I/O and state management.
 *
 * @see docs/specs/ui/upload/upload-panel-system.md — UI FSM boundaries vs `UploadManagerService` (dialog chrome only; outcomes via manager/core APIs).
 *
 * Extracts location, project, and duplicate resolution dialog handling from
 * the component to reduce its size and improve testability.
 *
 * Responsibilities:
 *  - Location address dialog: open, search, apply, close
 *  - Project selection dialog: open, confirm, cancel
 *  - Duplicate resolution dialog: open, choice, close
 *  - All search timeouts and state cleanup
 */

import { Injectable, inject, signal, type Signal } from '@angular/core';
import type { UploadJob } from '../../core/upload/upload-manager.service';
import { GeocodingService } from '../../core/geocoding/geocoding.service';
import { ToastService } from '../../core/toast/toast.service';
import { MediaLocationUpdateService } from '../../core/media-location-update/media-location-update.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { MapProjectActionsService } from '../map/map-shell/map-project-actions.service';
import { MapProjectDialogService } from '../map/map-shell/map-project-dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { SupabaseService } from '../../core/supabase/supabase.service';
import type { ForwardGeocodeResult } from '../../core/geocoding/geocoding.service';
import type { ProjectSelectOption } from '../../shared/project-select-dialog/project-select-dialog.component';
import type { GeocoderSearchResult } from '../../core/geocoding/geocoding.service';

export interface DialogSignals {
  projectSelectionDialogOptions: Signal<ReadonlyArray<ProjectSelectOption>>;
  setProjectSelectionDialogOpen(value: boolean): void;
  setProjectSelectionDialogTitle(value: string): void;
  setProjectSelectionDialogMessage(value: string): void;
  setProjectSelectionDialogOptions(value: ReadonlyArray<ProjectSelectOption>): void;
  setProjectSelectionDialogSelectedId(value: string | null): void;
  setProjectNameDialogOpen(value: boolean): void;
  setProjectNameDialogTitle(value: string): void;
  setProjectNameDialogMessage(value: string): void;
  setProjectNameDialogInitialValue(value: string): void;
}

@Injectable()
export class UploadPanelDialogHandlersService {
  private readonly geocodingService = inject(GeocodingService);
  private readonly toastService = inject(ToastService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly projectsService = inject(ProjectsService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly i18nService = inject(I18nService);
  private readonly supabaseService = inject(SupabaseService);

  private t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  private locationAddressSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  private readonly _locationAddressDialogQuery = signal('');
  readonly locationAddressDialogQuery = this._locationAddressDialogQuery.asReadonly();

  private readonly _locationAddressDialogLoading = signal(false);
  readonly locationAddressDialogLoading = this._locationAddressDialogLoading.asReadonly();

  private readonly _locationAddressDialogSuggestions = signal<ForwardGeocodeResult[]>([]);
  readonly locationAddressDialogSuggestions = this._locationAddressDialogSuggestions.asReadonly();

  private readonly _locationAddressDialogOpen = signal(false);
  readonly locationAddressDialogOpen = this._locationAddressDialogOpen.asReadonly();

  private readonly _projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogOpen = this._projectSelectionDialogOpen.asReadonly();

  private readonly _projectSelectionDialogTitle = signal(
    this.t('upload.item.menu.assignProject', 'Assign project'),
  );
  readonly projectSelectionDialogTitle = this._projectSelectionDialogTitle.asReadonly();

  private readonly _projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogMessage = this._projectSelectionDialogMessage.asReadonly();

  private readonly _projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogOptions = this._projectSelectionDialogOptions.asReadonly();

  private readonly _projectSelectionDialogSelectedId = signal<string | null>(null);
  readonly projectSelectionDialogSelectedId = this._projectSelectionDialogSelectedId.asReadonly();

  private readonly _projectNameDialogOpen = signal(false);
  readonly projectNameDialogOpen = this._projectNameDialogOpen.asReadonly();

  private readonly _projectNameDialogTitle = signal('');
  readonly projectNameDialogTitle = this._projectNameDialogTitle.asReadonly();

  private readonly _projectNameDialogMessage = signal('');
  readonly projectNameDialogMessage = this._projectNameDialogMessage.asReadonly();

  private readonly _projectNameDialogInitialValue = signal('');
  readonly projectNameDialogInitialValue = this._projectNameDialogInitialValue.asReadonly();

  private readonly _duplicateResolutionDialogOpen = signal(false);
  readonly duplicateResolutionDialogOpen = this._duplicateResolutionDialogOpen.asReadonly();

  private readonly _duplicateResolutionApplyToBatch = signal(false);
  readonly duplicateResolutionApplyToBatch = this._duplicateResolutionApplyToBatch.asReadonly();

  // ── Location Address Dialog ────────────────────────────────────────────

  openLocationAddressDialog(job: UploadJob): void {
    // missing_data jobs may lack imageId until placement; uploaded rows require persisted id.
    // @see docs/specs/ui/upload/upload-panel-system.md — Actions (dialog outcomes via core APIs)
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    this._locationAddressDialogQuery.set('');
    this._locationAddressDialogSuggestions.set([]);
    this._locationAddressDialogLoading.set(false);
    this._locationAddressDialogOpen.set(true);
  }

  closeLocationAddressDialog(): void {
    this._locationAddressDialogOpen.set(false);
    this._locationAddressDialogQuery.set('');
    this._locationAddressDialogSuggestions.set([]);
    if (this.locationAddressSearchTimeout) {
      clearTimeout(this.locationAddressSearchTimeout);
      this.locationAddressSearchTimeout = null;
    }
  }

  onLocationAddressDialogQueryInput(query: string): void {
    this._locationAddressDialogQuery.set(query);
    if (this.locationAddressSearchTimeout) {
      clearTimeout(this.locationAddressSearchTimeout);
      this.locationAddressSearchTimeout = null;
    }

    if (!query.trim()) {
      this._locationAddressDialogSuggestions.set([]);
      this._locationAddressDialogLoading.set(false);
      return;
    }

    this.locationAddressSearchTimeout = setTimeout(() => {
      void this.searchLocationAddress(query);
      this.locationAddressSearchTimeout = null;
    }, 280);
  }

  async updateLocationFromAddressSuggestion(
    job: UploadJob,
    suggestion: ForwardGeocodeResult,
  ): Promise<{ imageId: string; lat: number; lng: number } | null> {
    if (!job.imageId) {
      return null;
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
      return null;
    }

    this.toastService.show({
      message: this.t('upload.location.update.success', 'Location updated.'),
      type: 'success',
      dedupe: true,
    });

    return { imageId: job.imageId, lat: result.lat, lng: result.lng };
  }

  private async searchLocationAddress(query: string): Promise<void> {
    const normalized = query.trim();
    if (!normalized) {
      this._locationAddressDialogSuggestions.set([]);
      return;
    }

    this._locationAddressDialogLoading.set(true);
    const results = await this.geocodingService.search(normalized, { limit: 6 });
    this._locationAddressDialogLoading.set(false);
    this._locationAddressDialogSuggestions.set(this.mapSearchResultsToForwardSuggestions(results));
  }

  private mapSearchResultsToForwardSuggestions(
    results: readonly GeocoderSearchResult[],
  ): ForwardGeocodeResult[] {
    return results
      .map((result) => {
        const lat = typeof result.lat === 'number' ? result.lat : null;
        const lng = typeof result.lng === 'number' ? result.lng : null;

        if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        const street = result.address?.road ?? null;
        const city =
          result.address?.city ?? result.address?.town ?? result.address?.village ?? null;
        const country = result.address?.country ?? null;

        return {
          lat,
          lng,
          addressLabel: result.displayName,
          street,
          streetNumber: result.address?.house_number ?? null,
          zip: result.address?.postcode ?? null,
          city,
          district: null,
          country,
        } as ForwardGeocodeResult;
      })
      .filter((entry): entry is ForwardGeocodeResult => entry !== null);
  }

  // ── Project Selection Dialog ───────────────────────────────────────────

  async openProjectSelectionDialog(job: UploadJob, dialogSignals: DialogSignals): Promise<void> {
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    const optionsResult = await this.mapProjectActionsService.loadProjectOptions(
      this.supabaseService.client,
    );
    if (!optionsResult.ok) {
      this.toastService.show({
        message: this.t('projects.dialog.error.loadFailed', 'Could not load projects.'),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    await this.mapProjectDialogService.openProjectSelectionDialog(
      dialogSignals,
      optionsResult.options,
      this.t('upload.item.menu.assignProject', 'Assign project'),
      job.file.name,
    );
  }

  onProjectSelectionDialogSelected(projectId: string, dialogSignals: DialogSignals): void {
    this.mapProjectDialogService.setProjectSelectionSelectedId(dialogSignals, projectId);
  }

  onProjectSelectionDialogCancelled(dialogSignals: DialogSignals): void {
    this.mapProjectDialogService.cancelProjectSelection(dialogSignals);
  }

  // ── Duplicate Resolution Dialog ────────────────────────────────────────

  openDuplicateResolutionDialog(): void {
    this._duplicateResolutionApplyToBatch.set(false);
    this._duplicateResolutionDialogOpen.set(true);
  }

  closeDuplicateResolutionDialog(): void {
    this._duplicateResolutionApplyToBatch.set(false);
    this._duplicateResolutionDialogOpen.set(false);
  }

  onDuplicateResolutionApplyToBatchChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this._duplicateResolutionApplyToBatch.set(target.checked);
  }

  setProjectSelectionDialogOpen(value: boolean): void {
    this._projectSelectionDialogOpen.set(value);
  }

  setProjectSelectionDialogTitle(value: string): void {
    this._projectSelectionDialogTitle.set(value);
  }

  setProjectSelectionDialogMessage(value: string): void {
    this._projectSelectionDialogMessage.set(value);
  }

  setProjectSelectionDialogOptions(value: ReadonlyArray<ProjectSelectOption>): void {
    this._projectSelectionDialogOptions.set(value);
  }

  setProjectSelectionDialogSelectedId(value: string | null): void {
    this._projectSelectionDialogSelectedId.set(value);
  }

  setProjectNameDialogOpen(value: boolean): void {
    this._projectNameDialogOpen.set(value);
  }

  setProjectNameDialogTitle(value: string): void {
    this._projectNameDialogTitle.set(value);
  }

  setProjectNameDialogMessage(value: string): void {
    this._projectNameDialogMessage.set(value);
  }

  setProjectNameDialogInitialValue(value: string): void {
    this._projectNameDialogInitialValue.set(value);
  }
}
