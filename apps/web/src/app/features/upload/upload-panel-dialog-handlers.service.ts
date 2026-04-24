/**
 * UploadPanelDialogHandlersService — delegates all dialog I/O and state management.
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

import { Injectable, inject, signal } from '@angular/core';
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
  projectSelectionDialogOpen: ReturnType<typeof signal<boolean>>;
  projectSelectionDialogTitle: ReturnType<typeof signal<string>>;
  projectSelectionDialogMessage: ReturnType<typeof signal<string>>;
  projectSelectionDialogOptions: ReturnType<typeof signal<ReadonlyArray<ProjectSelectOption>>>;
  projectSelectionDialogSelectedId: ReturnType<typeof signal<string | null>>;
  projectNameDialogOpen: ReturnType<typeof signal<boolean>>;
  projectNameDialogTitle: ReturnType<typeof signal<string>>;
  projectNameDialogMessage: ReturnType<typeof signal<string>>;
  projectNameDialogInitialValue: ReturnType<typeof signal<string>>;
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

  readonly locationAddressDialogQuery = signal('');
  readonly locationAddressDialogLoading = signal(false);
  readonly locationAddressDialogSuggestions = signal<ForwardGeocodeResult[]>([]);
  readonly locationAddressDialogOpen = signal(false);

  readonly projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogTitle = signal(
    this.t('upload.item.menu.assignProject', 'Assign project'),
  );
  readonly projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogSelectedId = signal<string | null>(null);

  readonly projectNameDialogOpen = signal(false);
  readonly projectNameDialogTitle = signal('');
  readonly projectNameDialogMessage = signal('');
  readonly projectNameDialogInitialValue = signal('');

  readonly duplicateResolutionDialogOpen = signal(false);
  readonly duplicateResolutionApplyToBatch = signal(false);

  constructor() {}

  // ── Location Address Dialog ────────────────────────────────────────────

  openLocationAddressDialog(job: UploadJob): void {
    if (!job.imageId && job.phase !== 'missing_data') {
      return;
    }

    this.locationAddressDialogQuery.set('');
    this.locationAddressDialogSuggestions.set([]);
    this.locationAddressDialogLoading.set(false);
    this.locationAddressDialogOpen.set(true);
  }

  closeLocationAddressDialog(): void {
    this.locationAddressDialogOpen.set(false);
    this.locationAddressDialogQuery.set('');
    this.locationAddressDialogSuggestions.set([]);
    if (this.locationAddressSearchTimeout) {
      clearTimeout(this.locationAddressSearchTimeout);
      this.locationAddressSearchTimeout = null;
    }
  }

  onLocationAddressDialogQueryInput(query: string): void {
    this.locationAddressDialogQuery.set(query);
    if (this.locationAddressSearchTimeout) {
      clearTimeout(this.locationAddressSearchTimeout);
      this.locationAddressSearchTimeout = null;
    }

    if (!query.trim()) {
      this.locationAddressDialogSuggestions.set([]);
      this.locationAddressDialogLoading.set(false);
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
      this.locationAddressDialogSuggestions.set([]);
      return;
    }

    this.locationAddressDialogLoading.set(true);
    const results = await this.geocodingService.search(normalized, { limit: 6 });
    this.locationAddressDialogLoading.set(false);
    this.locationAddressDialogSuggestions.set(this.mapSearchResultsToForwardSuggestions(results));
  }

  private mapSearchResultsToForwardSuggestions(
    results: readonly GeocoderSearchResult[],
  ): ForwardGeocodeResult[] {
    return results
      .map((result) => {
        const lat = typeof result.lat === 'number' ? result.lat : null;
        const lng = typeof result.lng === 'number' ? result.lng : null;

        if (!lat || !lng) {
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
    this.duplicateResolutionApplyToBatch.set(false);
    this.duplicateResolutionDialogOpen.set(true);
  }

  closeDuplicateResolutionDialog(): void {
    this.duplicateResolutionApplyToBatch.set(false);
    this.duplicateResolutionDialogOpen.set(false);
  }

  onDuplicateResolutionApplyToBatchChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    this.duplicateResolutionApplyToBatch.set(target.checked);
  }
}
