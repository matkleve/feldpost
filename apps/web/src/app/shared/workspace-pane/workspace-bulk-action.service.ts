import { Injectable, inject } from '@angular/core';
import type { ForwardGeocodeResult } from '../../core/geocoding/geocoding.service';
import { GeocodingService } from '../../core/geocoding/geocoding.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaDeleteUndoService } from '../../core/media-delete/media-delete-undo.service';
import { buildLocationUpdateFailureToast } from '../../core/media-location-update/location-update-toast.util';
import { MediaLocationUpdateService } from '../../core/media-location-update/media-location-update.service';
import { MediaQueryService } from '../../core/media-query/media-query.service';
import { ProjectsService } from '../../core/projects/projects.service';
import { ShareSetService } from '../../core/share-set/share-set.service';
import type { ShareAudienceDialogResult } from '../../core/share-set/share-set.types';
import { ToastService } from '../../core/toast/toast.service';
import { WorkspacePaneObserverAdapter } from '../../core/workspace-pane/workspace-pane-observer.adapter';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { WorkspaceViewService } from '../../core/workspace-view/workspace-view.service';
import type {
  WorkspaceBulkAddressConfirmResult,
  WorkspaceBulkDeleteHooks,
  WorkspaceBulkDeleteResult,
  WorkspaceBulkProjectAssignResult,
  WorkspaceBulkProjectLoadResult,
  WorkspaceBulkRemoveFromProjectResult,
} from './workspace-bulk-action.types';

@Injectable({ providedIn: 'root' })
export class WorkspaceBulkActionService {
  private readonly selectionService = inject(WorkspaceSelectionService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);
  private readonly projectsService = inject(ProjectsService);
  private readonly shareSetService = inject(ShareSetService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  getSelectedLookupIds(): string[] {
    return Array.from(this.selectionService.selectedMediaIds());
  }

  hasSelection(): boolean {
    return this.selectionService.selectedMediaIds().size > 0;
  }

  showNoSelectionError(severity: 'error' | 'warning' = 'error'): void {
    this.toastService.show({
      message: this.t('workspace.export.error.noImagesSelected', 'No images selected.'),
      type: severity,
    });
  }

  async resolveSelectedMediaItemIds(): Promise<string[]> {
    const selectedIds = this.getSelectedLookupIds();
    return this.mediaQueryService.resolveMediaItemIdsByLookupIds(selectedIds);
  }

  async loadProjectSelectOptions(): Promise<WorkspaceBulkProjectLoadResult> {
    const projectOptions = await this.projectsService.loadProjectSelectOptions();

    if (projectOptions.length === 0) {
      this.toastService.show({
        message: this.t('workspace.export.error.noProjectsAvailable', 'No projects available.'),
        type: 'warning',
      });
      return { status: 'no_projects' };
    }

    return { status: 'ok', options: projectOptions };
  }

  async assignSelectedToProject(projectId: string): Promise<WorkspaceBulkProjectAssignResult> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.showNoSelectionError('warning');
      return { status: 'empty_selection' };
    }

    const result = await this.projectsService.assignMediaItemsToProject(
      selectedMediaItemIds,
      projectId,
    );

    if (!result.ok) {
      this.toastService.show({
        message: result.errorMessage ?? '',
        type: 'error',
      });
      return { status: 'error', errorMessage: result.errorMessage ?? null };
    }

    this.toastService.show({
      message: this.t('workspace.export.success.projectAssigned', 'Assigned to project.'),
      type: 'success',
    });
    return { status: 'ok' };
  }

  async confirmAddressForSelection(
    addressQuery: string,
  ): Promise<WorkspaceBulkAddressConfirmResult> {
    const addressText = addressQuery.trim();
    if (!addressText) {
      return { status: 'noop' };
    }

    const suggestion = await this.geocodingService.forward(addressText);
    if (!suggestion) {
      this.toastService.show({
        message: this.t('workspace.export.error.addressNotFound', 'Address could not be resolved.'),
        type: 'warning',
      });
      return { status: 'not_found' };
    }

    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.showNoSelectionError('warning');
      return { status: 'empty_selection' };
    }

    let updatedCount = 0;
    let lastUpdateError: string | undefined;
    for (const mediaItemId of selectedMediaItemIds) {
      const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(
        mediaItemId,
        this.toAddressSuggestionPayload(suggestion),
      );
      if (result.ok) {
        updatedCount += 1;
      } else if (result.error) {
        lastUpdateError = result.error;
      }
    }

    if (updatedCount === 0) {
      this.toastService.show(
        lastUpdateError
          ? {
              ...buildLocationUpdateFailureToast(lastUpdateError, {
                file: 'workspace-bulk-action.service.ts',
                fn: 'confirmAddressForSelection',
              }),
            }
          : {
              message: this.t(
                'workspace.export.error.addressUpdateFailed',
                'Address update failed.',
              ),
              type: 'error',
            },
      );
      return { status: 'update_failed' };
    }

    this.patchSelectedImagesAddress(suggestion);
    this.toastService.show({
      message: this.t('workspace.export.success.addressUpdated', 'Address updated.'),
      type: 'success',
    });
    return { status: 'success', suggestion };
  }

  async createShareLinkWithAudience(
    copyToClipboard: boolean,
    audience: ShareAudienceDialogResult,
  ): Promise<string | null> {
    const selectedIds = this.getSelectedLookupIds();
    if (selectedIds.length === 0) {
      this.showNoSelectionError('error');
      return null;
    }

    try {
      const result = await this.shareSetService.createOrReuseShareSet(selectedIds, {
        audience: audience.audience,
        shareGrant: audience.shareGrant,
        recipientUserIds:
          audience.audience === 'named' ? audience.recipientUserIds : undefined,
      });
      let url = `${window.location.origin}/?share=${encodeURIComponent(result.token)}`;
      const detailMediaId = this.workspacePaneObserver.detailImageId$();
      const canonicalMediaId =
        selectedIds.length === 1
          ? selectedIds[0]
          : detailMediaId && selectedIds.includes(detailMediaId)
            ? detailMediaId
            : null;
      if (canonicalMediaId) {
        url += `&media=${encodeURIComponent(canonicalMediaId)}`;
      }

      if (copyToClipboard) {
        await this.copyShareUrlToClipboard(url);
      }

      return url;
    } catch (error) {
      const message = this.formatShareLinkError(error);
      this.toastService.show({ message, type: 'error' });
      return null;
    }
  }

  async deleteSelectedWithUndo(hooks: WorkspaceBulkDeleteHooks): Promise<WorkspaceBulkDeleteResult> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.showNoSelectionError('warning');
      return { status: 'empty_selection' };
    }

    const result = await this.mediaDeleteUndo.deleteWithUndo({
      mediaItemIds: selectedMediaItemIds,
      onAfterDelete: hooks.onAfterDelete,
      onAfterUndo: hooks.onAfterUndo,
    });

    if (!result.ok) {
      this.toastService.show({ message: result.errorMessage ?? '', type: 'error' });
      return { status: 'error', errorMessage: result.errorMessage ?? null };
    }

    return { status: 'ok' };
  }

  async removeSelectedFromProject(): Promise<WorkspaceBulkRemoveFromProjectResult> {
    const selectedMediaItemIds = await this.resolveSelectedMediaItemIds();
    if (selectedMediaItemIds.length === 0) {
      this.showNoSelectionError('warning');
      return { status: 'empty_selection' };
    }

    const result = await this.projectsService.removeMediaItemsFromProjects(selectedMediaItemIds);

    if (!result.ok) {
      this.toastService.show({ message: result.errorMessage ?? '', type: 'error' });
      return { status: 'error', errorMessage: result.errorMessage ?? null };
    }

    const selectedImageIds = this.selectionService.selectedMediaIds();
    this.workspaceViewService.updateRawImages((images) =>
      images.map((image) =>
        selectedImageIds.has(image.id)
          ? {
              ...image,
              projectId: null,
              projectName: null,
            }
          : image,
      ),
    );

    this.toastService.show({
      message: this.t(
        'upload.item.menu.project.remove.success',
        'Removed from project successfully.',
      ),
      type: 'success',
    });
    return { status: 'ok' };
  }

  private patchSelectedImagesAddress(suggestion: ForwardGeocodeResult): void {
    const selectedImageIds = this.selectionService.selectedMediaIds();
    this.workspaceViewService.updateRawImages((images) =>
      images.map((image) =>
        selectedImageIds.has(image.id)
          ? {
              ...image,
              latitude: suggestion.lat,
              longitude: suggestion.lng,
              addressLabel: suggestion.addressLabel,
              city: suggestion.city,
              district: suggestion.district,
              street: suggestion.street,
              streetNumber: suggestion.streetNumber,
              zip: suggestion.zip,
              country: suggestion.country,
            }
          : image,
      ),
    );
  }

  private toAddressSuggestionPayload(suggestion: ForwardGeocodeResult): {
    lat: number;
    lng: number;
    addressLabel: string;
    city: string | null;
    district: string | null;
    street: string | null;
    streetNumber: string | null;
    zip: string | null;
    country: string | null;
  } {
    return {
      lat: suggestion.lat,
      lng: suggestion.lng,
      addressLabel: suggestion.addressLabel,
      city: suggestion.city,
      district: suggestion.district,
      street: suggestion.street,
      streetNumber: suggestion.streetNumber,
      zip: suggestion.zip,
      country: suggestion.country,
    };
  }

  private async copyShareUrlToClipboard(url: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      this.toastService.show({
        message: this.t(
          'workspace.export.error.clipboardUnavailable',
          'Clipboard is not available.',
        ),
        type: 'error',
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    this.toastService.show({
      message: this.t('workspace.export.success.linkCopied', 'Share link copied.'),
      type: 'success',
      dedupe: true,
    });
  }

  private formatShareLinkError(error: unknown): string {
    if (error instanceof Error && error.message.toLowerCase().includes('column reference')) {
      return this.t(
        'workspace.export.error.linkCreateFailed',
        'Freigabelink konnte nicht erstellt werden.',
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return this.t(
      'workspace.export.error.linkCreateFailed',
      'Freigabelink konnte nicht erstellt werden.',
    );
  }
}
