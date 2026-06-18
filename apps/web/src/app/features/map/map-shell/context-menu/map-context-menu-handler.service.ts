import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MapContextActionsService, type RemoveImagesFromProjectsResult } from './map-context-actions.service';
import { MapProjectActionsService } from '../workspace/map-project-actions.service';
import { MapProjectDialogService } from '../workspace/map-project-dialog.service';
import { MapWorkspaceActionExecutorService } from '../workspace/map-workspace-action-executor.service';
import { MapShellState } from '../component/map-shell.state';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { MapMarkerBindingService } from '../markers/map-marker-binding.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { LocationResolverService } from '../../../../core/location-resolver/location-resolver.service';
import { GeocodingService } from '../../../../core/geocoding/geocoding.service';
import { MediaLocationUpdateService } from '../../../../core/media-location-update/media-location-update.service';
import { MediaDeleteUndoService } from '../../../../core/media-delete/media-delete-undo.service';
import { MarkerStateMutationsService } from '../markers/marker-state-mutations.service';
import { MarkerContextPhotoDeleteService } from '../markers/marker-context-photo-delete.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { truncateToastTechnicalDetail } from '../../../../core/toast/toast.helpers';
import type { ToastOptions, ToastType } from '../../../../core/toast/toast.types';
import type { UploadLocationMapPickRequest } from '../../../../core/workspace-pane/workspace-pane-shell-events.types';
import type { PhotoMarkerState } from '../markers/map-marker-reconcile.facade';
import type { MapInstance, MapLayerGroup } from '../leaflet/map-leaflet.service';
import type { MapMenuActionId, MarkerMenuActionId, RadiusMenuActionId } from '../workspace/map-workspace-actions.types';

const HOUSE_PROXIMITY_ZOOM = 19;
const STREET_PROXIMITY_ZOOM = 17;
const QUICK_RADIUS_METERS = 250;

export interface ContextMenuHandlerContext {
  getMap(): MapInstance | undefined;
  showMapToast(key: string, fallback: string, type: ToastType, extra?: Omit<ToastOptions, 'title' | 'type'>): void;
  showMapToastTitle(title: string, type: ToastType, extra?: Omit<ToastOptions, 'title' | 'type'>): void;
  onMapMenuCloseRequested(): void;
  openDetailView(mediaId: string): void;
  onDetailAddressSearchRequestConsumed(requestId: number): void;
  handlePhotoMarkerClick(markerKey: string): void;
  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void;
  renderOrUpdateDraftMediaMarker(latlng: [number, number]): void;
  setPlacementActive(value: boolean): void;
  getUploadedPhotoMarkers(): Map<string, PhotoMarkerState>;
  getPhotoMarkerLayer(): MapLayerGroup | null;
  getMarkersByMediaId(): Map<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class MapContextMenuHandlerService {
  private readonly mapContextActionsService = inject(MapContextActionsService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly mapWorkspaceActionExecutorService = inject(MapWorkspaceActionExecutorService);
  private readonly state = inject(MapShellState);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly markerBindingService = inject(MapMarkerBindingService);
  private readonly radiusDrawingService = inject(RadiusDrawingOrchestratorService);
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly searchService = inject(MapShellSearchService);
  private readonly uploadShellUi = inject(UploadShellUiService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly locationResolverService = inject(LocationResolverService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly markerContextPhotoDeleteService = inject(MarkerContextPhotoDeleteService);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);

  private ctx: ContextMenuHandlerContext | null = null;

  bind(ctx: ContextMenuHandlerContext): void {
    this.ctx = ctx;
  }

  private patchDetailMediaId(mediaId: string | null): void {
    this.state.setDetailMediaId(mediaId);
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  get markerContextIsSingle(): boolean {
    const payload = this.state.markerContextMenuPayload();
    return !!payload && payload.count === 1;
  }

  get markerContextIsCluster(): boolean {
    const payload = this.state.markerContextMenuPayload();
    return !!payload && payload.count > 1 && !payload.isMultiSelection;
  }

  get markerContextIsMulti(): boolean {
    return !!this.state.markerContextMenuPayload()?.isMultiSelection;
  }

  async onMapMenuActionSelected(actionId: MapMenuActionId): Promise<void> {
    await this.mapWorkspaceActionExecutorService.executeMapAction(actionId, {
      createMarkerHere: () => this.onMapContextCreateMarkerHere(),
      zoomHouse: () => this.onMapContextZoomHouseHere(),
      zoomStreet: () => this.onMapContextZoomStreetHere(),
      copyAddress: () => this.onMapContextCopyAddress(),
      copyGps: () => this.onMapContextCopyGps(),
      openGoogleMaps: () => this.onMapContextOpenGoogleMaps(),
    });
  }

  async onRadiusMenuActionSelected(actionId: RadiusMenuActionId): Promise<void> {
    switch (actionId) {
      case 'open_selection':
        this.onRadiusContextOpenSelection();
        return;
      case 'assign_to_project':
        await this.onRadiusContextAssignToProject();
        return;
      case 'remove_from_project':
        await this.onRadiusContextRemoveFromProject();
        return;
      case 'delete_media':
        await this.onRadiusContextDeleteMedia();
        return;
      default:
        return;
    }
  }

  async onMarkerMenuActionSelected(actionId: MarkerMenuActionId): Promise<void> {
    await this.mapWorkspaceActionExecutorService.executeMarkerAction(actionId, {
      openDetailsOrSelection: () => this.onMarkerContextOpenDetailsOrSelection(),
      openInMedia: () => this.onMarkerContextOpenInMedia(),
      zoomHouse: () => this.onMarkerContextZoomHouse(),
      zoomStreet: () => this.onMarkerContextZoomStreet(),
      assignToProject: () => this.onMarkerContextAssignToProject(),
      resolveLocation: () => this.onMarkerContextResolveLocation(),
      changeLocationMap: () => this.onMarkerContextChangeLocationMap(),
      changeLocationAddress: () => this.onMarkerContextChangeLocationAddress(),
      copyAddress: () => this.onMarkerContextCopyAddress(),
      copyGps: () => this.onMarkerContextCopyGps(),
      openGoogleMaps: () => this.onMarkerContextOpenGoogleMaps(),
      removeFromProject: () => this.onMarkerContextRemoveFromProject(),
      deleteMedia: () => this.onMarkerContextDeletePhoto(),
    });
  }

  onBatchAddressDialogCancelled(): void {
    this.state.setBatchAddressDialogOpen(false);
    this.state.setBatchAddressTargetMediaIds([]);
  }

  async onBatchAddressDialogConfirmed(addressInput: string): Promise<void> {
    const input = addressInput.trim();
    if (!input) return;

    const targetMediaIds = this.state.batchAddressTargetMediaIds();
    if (targetMediaIds.length === 0) {
      this.onBatchAddressDialogCancelled();
      return;
    }

    const suggestion = await this.geocodingService.forward(input);
    if (!suggestion) {
      this.ctx?.showMapToast(
        'map.shell.toast.addressResolveFailed',
        'Could not resolve address.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onMarkerContextCopyAddress' } },
      );
      return;
    }

    let updatedCount = 0;
    for (const mediaId of targetMediaIds) {
      const result = await this.mediaLocationUpdateService.updateFromAddressSuggestion(mediaId, {
        lat: suggestion.lat,
        lng: suggestion.lng,
        addressLabel: suggestion.addressLabel,
        city: suggestion.city,
        district: suggestion.district,
        street: suggestion.street,
        streetNumber: suggestion.streetNumber,
        zip: suggestion.zip,
        country: suggestion.country,
      });
      if (result.ok) {
        updatedCount += 1;
      }
    }

    if (updatedCount === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.addressChangeFailed',
        'Address change failed.',
        'error',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextChangeAddress' } },
      );
      return;
    }

    this.ctx?.showMapToastTitle(
      this.i18nService
        .t('map.shell.toast.addressesUpdated', '{count} media address(es) updated.')
        .replace('{count}', String(updatedCount)),
      'success',
    );
    this.onBatchAddressDialogCancelled();
    await this.mapViewportCoordinatorService.queryViewportMarkers();
  }

  onDetailAddressSearchRequestConsumed(requestId: number): void {
    this.ctx?.onDetailAddressSearchRequestConsumed(requestId);
  }

  onProjectSelectionDialogSelected(projectId: string): void {
    this.mapProjectDialogService.setProjectSelectionSelectedId(this.state, projectId);
  }

  onProjectSelectionDialogConfirmed(projectId: string): void {
    this.mapProjectDialogService.confirmProjectSelection(this.state, projectId);
  }

  onProjectSelectionDialogCancelled(): void {
    this.mapProjectDialogService.cancelProjectSelection(this.state);
  }

  onProjectNameDialogConfirmed(projectName: string): void {
    this.mapProjectDialogService.confirmProjectName(this.state, projectName);
  }

  onProjectNameDialogCancelled(): void {
    this.mapProjectDialogService.cancelProjectName(this.state);
  }

  async onMapContextStartRadiusFromHere(): Promise<void> {
    const coords = this.state.mapContextMenuCoords();
    const map = this.ctx?.getMap();
    if (!coords || !map) return;
    const center = this.mapLeafletService.createLatLng(coords.lat, coords.lng);
    await this.radiusDrawingService.startQuickRadius(center, QUICK_RADIUS_METERS);
    this.ctx?.onMapMenuCloseRequested();
  }

  private onMapContextCreateMarkerHere(): void {
    const coords = this.state.mapContextMenuCoords();
    if (!coords) return;
    this.state.setDraftMediaMarker({ lat: coords.lat, lng: coords.lng, uploadCount: 0 });
    this.ctx?.renderOrUpdateDraftMediaMarker([coords.lat, coords.lng]);
    this.searchService.setPlacementActive(false);
    this.ctx?.setPlacementActive(false);
    if (!this.state.photoPanelOpen()) {
      this.state.setWorkspacePaneWidth(this.state.getWorkspacePaneOpeningWidth());
    }
    this.state.setPhotoPanelOpen(true);
    this.patchDetailMediaId(null);
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.uploadShellUi.openUploadPanel();
    this.ctx?.getMap()?.getContainer().classList.remove('map-container--placing');
    this.ctx?.showMapToast(
      'map.shell.toast.mediaMarkerCreated',
      'Media marker created. Start upload.',
      'success',
    );
    this.state.closeAllContextMenus();
  }

  private onMapContextZoomHouseHere(): void {
    const coords = this.state.mapContextMenuCoords();
    if (!coords || !this.ctx?.getMap()) return;
    this.setViewWithPaneOffset(coords.lat, coords.lng, HOUSE_PROXIMITY_ZOOM);
    this.ctx?.onMapMenuCloseRequested();
  }

  private onMapContextZoomStreetHere(): void {
    const coords = this.state.mapContextMenuCoords();
    if (!coords) return;
    this.setViewWithPaneOffset(coords.lat, coords.lng, STREET_PROXIMITY_ZOOM);
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMapContextCopyAddress(): Promise<void> {
    const coords = this.state.mapContextMenuCoords();
    if (!coords) return;
    await this.mapContextActionsService.copyAddressWithFeedback(coords.lat, coords.lng, {
      onCopied: () =>
        this.ctx?.showMapToast('map.shell.toast.addressCopied', 'Address copied.', 'success'),
      onNotFound: () =>
        this.ctx?.showMapToast(
          'map.shell.toast.addressResolveFailed',
          'Could not resolve address.',
          'warning',
          { codeRef: { file: 'map-shell.component.ts', fn: 'copyAddressWithFeedback' } },
        ),
    });
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMapContextCopyGps(): Promise<void> {
    const coords = this.state.mapContextMenuCoords();
    if (!coords) return;
    await this.mapContextActionsService.copyGpsWithFeedback(coords.lat, coords.lng, {
      onCopied: () =>
        this.ctx?.showMapToast('map.shell.toast.gpsCopied', 'GPS copied.', 'success'),
      onFallback: (text) => this.ctx?.showMapToastTitle(text, 'info'),
    });
    this.ctx?.onMapMenuCloseRequested();
  }

  private onMapContextOpenGoogleMaps(): void {
    const coords = this.state.mapContextMenuCoords();
    if (!coords) return;
    this.mapContextActionsService.openGoogleMaps(coords.lat, coords.lng);
    this.ctx?.onMapMenuCloseRequested();
  }

  private onRadiusContextOpenSelection(): void {
    this.ensurePhotoPanelOpen();
    this.patchDetailMediaId(null);
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onRadiusContextCreateProjectFromSelection(): Promise<void> {
    const mediaIds = this.getRadiusMediaIds();
    if (mediaIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaInRadiusSelection',
        'No media available in radius selection.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextAssignToProject' } },
      );
      this.state.closeAllContextMenus();
      return;
    }

    const projectName = await this.promptProjectNameFromRadius();
    if (!projectName) {
      this.state.closeAllContextMenus();
      return;
    }

    const created = await this.mapProjectActionsService.createProjectFromFirstImage({
      projectName,
      firstImageId: mediaIds[0],
    });
    if (!created.ok || !created.project) {
      if (created.reason === 'organization-missing') {
        this.ctx?.showMapToast(
          'map.shell.toast.projectCreateOrganizationUnknown',
          'Could not create project (organization unknown).',
          'error',
          { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextCreateProject' } },
        );
      } else {
        this.ctx?.showMapToast(
          'map.shell.toast.projectCreateFailed',
          'Could not create project.',
          'error',
          {
            detail: created.errorMessage
              ? truncateToastTechnicalDetail(created.errorMessage)
              : undefined,
            codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextCreateProject' },
          },
        );
      }
      this.state.closeAllContextMenus();
      return;
    }

    const assigned = await this.mapContextActionsService.assignImagesToProject(
      mediaIds,
      created.project.id,
    );
    const assignFailureMessage =
      this.mapProjectActionsService.getAssignmentFailureMessage(assigned);
    if (assignFailureMessage) {
      this.ctx?.showMapToastTitle(
        assignFailureMessage,
        assigned.reason === 'empty' ? 'warning' : 'error',
        { codeRef: { file: 'map-shell.component.ts', fn: 'assignMediaToProject' } },
      );
      this.state.closeAllContextMenus();
      return;
    }

    this.ctx?.showMapToastTitle(
      this.i18nService
        .t(
          'map.shell.toast.projectCreatedAndAssigned',
          'Project "{project}" created and {count} media items assigned.',
        )
        .replace('{project}', created.project.name)
        .replace('{count}', String(mediaIds.length)),
      'success',
    );
    this.state.closeAllContextMenus();
  }

  private async onRadiusContextAssignToProject(): Promise<void> {
    const mediaIds = this.getRadiusMediaIds();
    if (mediaIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaInRadiusSelection',
        'No media available in radius selection.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextAssignToProject' } },
      );
      this.state.closeAllContextMenus();
      return;
    }

    const project = await this.promptProjectSelection();
    if (!project) {
      this.state.closeAllContextMenus();
      return;
    }

    const assigned = await this.mapContextActionsService.assignImagesToProject(
      mediaIds,
      project.id,
    );
    const assignFailureMessage =
      this.mapProjectActionsService.getAssignmentFailureMessage(assigned);
    if (!assignFailureMessage) {
      this.ctx?.showMapToastTitle(
        this.mapProjectActionsService.formatProjectAssignmentSuccess(
          project.name,
          mediaIds.length,
        ),
        'success',
      );
    } else {
      this.ctx?.showMapToastTitle(
        assignFailureMessage,
        assigned.reason === 'empty' ? 'warning' : 'error',
        { codeRef: { file: 'map-shell.component.ts', fn: 'assignMediaToProject' } },
      );
    }
    this.state.closeAllContextMenus();
  }

  private async onRadiusContextRemoveFromProject(): Promise<void> {
    const uniqueImageIds = Array.from(new Set(this.getRadiusMediaIds()));
    if (uniqueImageIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaForProjectRemoval',
        'No media found for project removal.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextRemoveFromProjects' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    const removed = await this.mapContextActionsService.removeImagesFromProjects(uniqueImageIds);
    if (!removed.ok) {
      this.ctx?.showMapToastTitle(
        this.getRemoveImagesFromProjectsFailureMessage(removed),
        removed.reason === 'empty' ? 'warning' : 'error',
        { codeRef: { file: 'map-shell.component.ts', fn: 'removeImagesFromProjects' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    this.ctx?.showMapToast(
      'map.shell.toast.removedFromProjects',
      'Media removed from projects.',
      'success',
    );
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onRadiusContextDeleteMedia(): Promise<void> {
    const uniqueImageIds = Array.from(new Set(this.getRadiusMediaIds()));
    if (uniqueImageIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaToDelete',
        'No media found to delete.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextDelete' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    if (!this.markerContextPhotoDeleteService.confirmPhotoDeleteCount(uniqueImageIds.length)) {
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    const result = await this.mediaDeleteUndo.deleteWithUndo({
      mediaItemIds: uniqueImageIds,
      onAfterDelete: async () => {
        this.patchDetailMediaId(null);
        this.markerSelectionService.setSelectedMarker(null);
        this.markerSelectionService.setSelectedMarkerKeys(new Set());
        this.workspaceSelectionService.clearSelection();
        this.workspaceViewService.clearActiveSelection();
        await this.mapViewportCoordinatorService.queryViewportMarkers();
      },
      onAfterUndo: async () => {
        await this.mapViewportCoordinatorService.queryViewportMarkers();
      },
    });

    if (!result.ok) {
      this.ctx?.showMapToast(
        'map.shell.toast.deleteFailed',
        'Delete failed.',
        'error',
        {
          detail: result.errorMessage
            ? truncateToastTechnicalDetail(result.errorMessage)
            : undefined,
          codeRef: { file: 'map-shell.component.ts', fn: 'deleteSelectedMedia' },
        },
      );
    }
    this.ctx?.onMapMenuCloseRequested();
  }

  private onMarkerContextOpenDetailsOrSelection(): void {
    const payload = this.state.markerContextMenuPayload();
    if (!payload) return;
    this.state.closeAllContextMenus();
    this.ctx?.handlePhotoMarkerClick(payload.markerKey);
  }

  private async onMarkerContextOpenInMedia(): Promise<void> {
    const payload = this.state.markerContextMenuPayload();
    const mediaId = payload?.mediaId;
    if (!mediaId) {
      this.ctx?.showMapToast(
        'map.shell.toast.singleMarkerOnly',
        'This action is only available for a single marker.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onMarkerContextMoveMarker' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }
    this.workspaceSelectionService.setSingle(mediaId);
    this.ctx?.openDetailView(mediaId);
    await this.router.navigate(['/media']);
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMarkerContextChangeLocationMap(): Promise<void> {
    const mediaIds = await this.resolveMarkerContextMediaIds();
    if (mediaIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaForLocationChange',
        'No media found for location change.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextChangeLocation' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    if (mediaIds.length > 1) {
      this.ctx?.showMapToastTitle(
        this.i18nService
          .t(
            'map.shell.toast.bulkLocationMovePending',
            '{count} media selected. Map-based bulk move comes in the next step.',
          )
          .replace('{count}', String(mediaIds.length)),
        'info',
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    const mediaId = mediaIds[0];
    this.ctx?.onUploadLocationMapPickRequested({ mediaId, fileName: mediaId });
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMarkerContextChangeLocationAddress(): Promise<void> {
    const mediaIds = await this.resolveMarkerContextMediaIds();
    if (mediaIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaForAddressChange',
        'No media found for address change.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextChangeAddress' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    if (mediaIds.length > 1) {
      this.state.setBatchAddressDialogTitle('Adresse fuer Auswahl aendern');
      this.state.setBatchAddressDialogMessage(
        `${mediaIds.length} Medien erhalten dieselbe Adresse.`,
      );
      this.state.setBatchAddressTargetMediaIds(mediaIds);
      this.state.setBatchAddressDialogOpen(true);
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    const mediaId = mediaIds[0];
    this.ctx?.openDetailView(mediaId);
    const currentRequestId = this.state.detailAddressSearchRequest()?.requestId ?? 0;
    this.state.setDetailAddressSearchRequest({ mediaId, requestId: currentRequestId + 1 });
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMarkerContextResolveLocation(): Promise<void> {
    const mediaIds = await this.resolveMarkerContextMediaIds();
    if (mediaIds.length !== 1) {
      this.ctx?.showMapToast(
        'map.shell.toast.locationResolveSingleOnly',
        'Location resolution is only available for a single item.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextResolveLocation' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    const result = await this.locationResolverService.resolvePendingMediaItem(mediaIds[0]);
    if (result.status === 'resolved') {
      this.ctx?.showMapToast(
        'map.shell.toast.locationResolved',
        'Location resolved successfully.',
        'success',
      );
      await this.mapViewportCoordinatorService.queryViewportMarkers();
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    if (result.status === 'unresolvable') {
      this.ctx?.showMapToast(
        'map.shell.toast.locationResolveTerminal',
        'Location could not be resolved (terminal).',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextResolveLocation' } },
      );
      if (result.changed) {
        await this.mapViewportCoordinatorService.queryViewportMarkers();
      }
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    this.ctx?.showMapToast(
      'map.shell.toast.locationAlreadyResolved',
      'Location is already resolved or not retryable.',
      'info',
    );
    this.ctx?.onMapMenuCloseRequested();
  }

  private onMarkerContextZoomHouse(): void {
    const payload = this.state.markerContextMenuPayload();
    if (!payload || !this.ctx?.getMap()) return;
    this.setViewWithPaneOffset(payload.lat, payload.lng, HOUSE_PROXIMITY_ZOOM);
    this.ctx?.onMapMenuCloseRequested();
  }

  private onMarkerContextZoomStreet(): void {
    const payload = this.state.markerContextMenuPayload();
    if (!payload || !this.ctx?.getMap()) return;
    this.setViewWithPaneOffset(payload.lat, payload.lng, STREET_PROXIMITY_ZOOM);
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMarkerContextCopyAddress(): Promise<void> {
    const payload = this.state.markerContextMenuPayload();
    if (!payload) return;
    await this.mapContextActionsService.copyAddressWithFeedback(payload.lat, payload.lng, {
      onCopied: () =>
        this.ctx?.showMapToast('map.shell.toast.addressCopied', 'Address copied.', 'success'),
      onNotFound: () =>
        this.ctx?.showMapToast(
          'map.shell.toast.addressResolveFailed',
          'Could not resolve address.',
          'warning',
          { codeRef: { file: 'map-shell.component.ts', fn: 'onMarkerContextCopyAddress' } },
        ),
    });
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMarkerContextCopyGps(): Promise<void> {
    const payload = this.state.markerContextMenuPayload();
    if (!payload) return;
    await this.mapContextActionsService.copyGpsWithFeedback(payload.lat, payload.lng, {
      onCopied: () =>
        this.ctx?.showMapToast('map.shell.toast.gpsCopied', 'GPS copied.', 'success'),
      onFallback: (text) => this.ctx?.showMapToastTitle(text, 'info'),
    });
    this.ctx?.onMapMenuCloseRequested();
  }

  private onMarkerContextOpenGoogleMaps(): void {
    const payload = this.state.markerContextMenuPayload();
    if (!payload || typeof window === 'undefined') return;
    const url = this.mapContextActionsService.buildGoogleMapsUrl(payload.lat, payload.lng);
    window.open(url, '_blank', 'noopener,noreferrer');
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMarkerContextAssignToProject(): Promise<void> {
    const payload = this.state.markerContextMenuPayload();
    if (!payload) return;

    const project = await this.promptProjectSelection();
    if (!project) {
      this.state.closeAllContextMenus();
      return;
    }

    const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
      payload,
      (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
      this.ctx?.getMap()?.getZoom() ?? 13,
    );
    if (mediaIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaForProjectAssignment',
        'No media found for project assignment.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onMarkerContextAssignToProject' } },
      );
      this.state.closeAllContextMenus();
      return;
    }

    const assigned = await this.mapContextActionsService.assignImagesToProject(
      mediaIds,
      project.id,
    );
    const assignFailureMessage =
      this.mapProjectActionsService.getAssignmentFailureMessage(assigned);
    if (assignFailureMessage) {
      this.ctx?.showMapToastTitle(
        assignFailureMessage,
        assigned.reason === 'empty' ? 'warning' : 'error',
        { codeRef: { file: 'map-shell.component.ts', fn: 'assignMediaToProject' } },
      );
      this.state.closeAllContextMenus();
      return;
    }

    this.ctx?.showMapToastTitle(
      this.mapProjectActionsService.formatProjectAssignmentSuccess(project.name, mediaIds.length),
      'success',
    );
    this.state.closeAllContextMenus();
  }

  private async onMarkerContextRemoveFromProject(): Promise<void> {
    const payload = this.state.markerContextMenuPayload();
    if (!payload) return;

    const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
      payload,
      (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
      this.ctx?.getMap()?.getZoom() ?? 13,
    );
    const uniqueImageIds = Array.from(new Set(mediaIds));
    if (uniqueImageIds.length === 0) {
      this.ctx?.showMapToast(
        'map.shell.toast.noMediaForProjectRemoval',
        'No media found for project removal.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'onRadiusContextRemoveFromProjects' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    const removed = await this.mapContextActionsService.removeImagesFromProjects(uniqueImageIds);
    if (!removed.ok) {
      this.ctx?.showMapToastTitle(
        this.getRemoveImagesFromProjectsFailureMessage(removed),
        removed.reason === 'empty' ? 'warning' : 'error',
        { codeRef: { file: 'map-shell.component.ts', fn: 'removeImagesFromProjects' } },
      );
      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    this.ctx?.showMapToast(
      'map.shell.toast.removedFromProjects',
      'Media removed from projects.',
      'success',
    );
    this.ctx?.onMapMenuCloseRequested();
  }

  private async onMarkerContextDeletePhoto(): Promise<void> {
    const payload = this.state.markerContextMenuPayload();

    if (payload && payload.count > 1) {
      const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
        payload,
        (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
        this.ctx?.getMap()?.getZoom() ?? 13,
      );
      const uniqueImageIds = Array.from(new Set(mediaIds));
      if (uniqueImageIds.length === 0) {
        this.ctx?.showMapToast(
          'map.shell.toast.noMediaToDelete',
          'No media found to delete.',
          'warning',
          { codeRef: { file: 'map-shell.component.ts', fn: 'onMarkerContextDelete' } },
        );
        this.ctx?.onMapMenuCloseRequested();
        return;
      }

      if (!this.markerContextPhotoDeleteService.confirmPhotoDeleteCount(uniqueImageIds.length)) {
        this.ctx?.onMapMenuCloseRequested();
        return;
      }

      const result = await this.mediaDeleteUndo.deleteWithUndo({
        mediaItemIds: uniqueImageIds,
        onAfterDelete: async () => {
          this.patchDetailMediaId(null);
          this.markerSelectionService.setSelectedMarker(null);
          this.markerSelectionService.setSelectedMarkerKeys(new Set());
          this.workspaceSelectionService.clearSelection();
          this.workspaceViewService.clearActiveSelection();
          await this.mapViewportCoordinatorService.queryViewportMarkers();
        },
        onAfterUndo: async () => {
          await this.mapViewportCoordinatorService.queryViewportMarkers();
        },
      });

      if (!result.ok) {
        this.ctx?.showMapToast('map.shell.toast.deleteFailed', 'Delete failed.', 'error', {
          detail: result.errorMessage
            ? truncateToastTechnicalDetail(result.errorMessage)
            : undefined,
          codeRef: { file: 'map-shell.component.ts', fn: 'deleteSelectedMedia' },
        });
      }

      this.ctx?.onMapMenuCloseRequested();
      return;
    }

    const target = this.markerContextPhotoDeleteService.getSingleImageTarget(payload);
    if (!target || !this.markerContextPhotoDeleteService.confirmPhotoDelete()) return;

    const result = await this.mediaDeleteUndo.deleteWithUndo({
      mediaItemIds: [target.mediaId],
      onAfterDelete: () => {
        this.markerStateMutationsService.removeDeletedPhotoFromMapUi({
          markerKey: target.markerKey,
          mediaId: target.mediaId,
          uploadedPhotoMarkers: this.ctx!.getUploadedPhotoMarkers(),
          photoMarkerLayer: this.ctx!.getPhotoMarkerLayer(),
          markersByMediaId: this.ctx!.getMarkersByMediaId(),
          selectedMarkerKey: this.state.selectedMarkerKey(),
          selectedMarkerKeys: this.state.selectedMarkerKeys(),
          detailMediaId: this.state.detailMediaId(),
          cancelMarkerMoveAnimation: (marker) =>
            this.markerBindingService.cancelMarkerMoveAnimation(marker),
          setSelectedMarker: (markerKey) =>
            this.markerSelectionService.setSelectedMarker(markerKey),
          setSelectedMarkerKeys: (markerKeys) =>
            this.markerSelectionService.setSelectedMarkerKeys(markerKeys),
          setDetailImageId: (mediaId) => this.patchDetailMediaId(mediaId),
        });
      },
      onAfterUndo: async () => {
        await this.mapViewportCoordinatorService.queryViewportMarkers();
      },
    });

    if (!result.ok) {
      this.ctx?.showMapToast('map.shell.toast.deleteFailed', 'Delete failed.', 'error', {
        detail: result.errorMessage
          ? truncateToastTechnicalDetail(result.errorMessage)
          : undefined,
        codeRef: { file: 'map-shell.component.ts', fn: 'deleteSelectedMedia' },
      });
      return;
    }

    this.ctx?.onMapMenuCloseRequested();
  }

  private async promptProjectSelection(): Promise<{ id: string; name: string } | null> {
    const projects = await this.mapProjectActionsService.loadProjectOptions();
    if (!projects.ok) {
      this.ctx?.showMapToast(
        'map.shell.toast.noProjectsAvailable',
        'No projects available.',
        'warning',
        { codeRef: { file: 'map-shell.component.ts', fn: 'openProjectSelectionDialog' } },
      );
      return null;
    }
    return this.mapProjectDialogService.openProjectSelectionDialog(
      this.state,
      projects.options,
      'Projekt auswaehlen',
      'Waehle ein bestehendes Projekt fuer die Zuweisung aus.',
    );
  }

  private async promptProjectNameFromRadius(): Promise<string | null> {
    return this.mapProjectDialogService.openProjectNameDialog(
      this.state,
      'Name fuer neues Projekt aus Radius',
      'Neues Radius Projekt',
      'Gib einen Projektnamen ein.',
    );
  }

  private getRemoveImagesFromProjectsFailureMessage(result: RemoveImagesFromProjectsResult): string {
    switch (result.reason) {
      case 'lookup-error':
        return this.i18nService.t(
          'map.shell.toast.removeFromProjects.lookupError',
          'Could not load project assignments.',
        );
      case 'remove-error':
        return this.i18nService.t(
          'map.shell.toast.removeFromProjects.removeError',
          'Removing from projects failed.',
        );
      case 'empty':
        return this.i18nService.t(
          'map.shell.toast.removeFromProjects.empty',
          'No project assignments found.',
        );
      default:
        return this.i18nService.t(
          'map.shell.toast.removeFromProjects.removeError',
          'Removing from projects failed.',
        );
    }
  }

  private async resolveMarkerContextMediaIds(): Promise<string[]> {
    const payload = this.state.markerContextMenuPayload();
    if (!payload) return [];
    const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
      payload,
      (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
      this.ctx?.getMap()?.getZoom() ?? 13,
    );
    return Array.from(new Set(mediaIds));
  }

  private getRadiusMediaIds(): string[] {
    return this.mapProjectActionsService.getActiveSelectionImageIds(
      this.workspaceViewService.rawImages(),
    );
  }

  private setViewWithPaneOffset(lat: number, lng: number, zoom: number): void {
    const map = this.ctx?.getMap();
    if (!map) return;
    const paneOffset = this.state.photoPanelOpen() ? this.state.workspacePaneWidth() / 2 : 0;
    if (paneOffset === 0) {
      map.setView([lat, lng], zoom);
      return;
    }
    const targetPx = map.project([lat, lng], zoom);
    const shiftedPx = targetPx.add([paneOffset, 0]);
    const shiftedLatLng = map.unproject(shiftedPx, zoom);
    map.setView(shiftedLatLng, zoom);
  }

  private ensurePhotoPanelOpen(): void {
    if (!this.state.photoPanelOpen()) {
      this.state.setWorkspacePaneWidth(this.state.getWorkspacePaneOpeningWidth());
    }
    this.state.setPhotoPanelOpen(true);
  }

}
