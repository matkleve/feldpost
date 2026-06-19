import { DestroyRef, ElementRef, Injectable, inject } from '@angular/core';
import { MapLeafletService, MapInstance, MapMouseEvent } from '../leaflet/map-leaflet.service';
import { MapShellBasemapService } from '../leaflet/map-shell-basemap.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { MapMarkerBindingService } from '../markers/map-marker-binding.service';
import { MapContextMenuHandlerService } from '../context-menu/map-context-menu-handler.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapClickHandlerService } from './map-click-handler.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { MapViewFlyService } from './map-view-fly.service';
import { MapZoomOrchestratorService } from '../../../../core/map-zoom/map-zoom-orchestrator.service';
import { MapLocationPickService } from './map-location-pick.service';
import { MapMoveEndHandlerService } from './map-move-end-handler.service';
import {
  MapZoomHighlightOrchestratorService,
  DETAIL_LOCATION_FOCUS_ZOOM,
} from '../markers/map-zoom-highlight-orchestrator.service';
import { DeferredStartupHandles, MapDeferredStartupService } from '../leaflet/map-deferred-startup.service';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { MapSubscriptionService } from './map-subscription.service';
import { MapMediaDeleteSyncService } from '../markers/map-media-delete-sync.service';
import { MarkerMotionService } from '../markers/marker-motion.service';
import { MarkerStateMutationsService } from '../markers/marker-state-mutations.service';
import { MapProjectDialogService } from '../workspace/map-project-dialog.service';
import { MapShellState } from '../component/map-shell.state';
import { MapPlacementService } from './map-placement.service';
import { MapThumbnailLoaderService } from '../markers/map-thumbnail-loader.service';
import type { LocationMapPickNavigationPayload } from '../../../../core/workspace-pane/location-map-pick-navigation.service';

export interface MapShellInitCallbacks {
  openDetailView: (mediaId: string) => void;
  closeWorkspacePane: () => void;
  onDetailAddressSearchRequestConsumed: (requestId: number) => void;
  getPendingMapFocus: () => { mediaId: string; lat: number; lng: number } | null;
  clearPendingMapFocus: () => void;
  getPendingLocationMapPickNav: () => LocationMapPickNavigationPayload | null;
  clearPendingLocationMapPickNav: () => void;
}

@Injectable({ providedIn: 'root' })
export class MapShellInitService {
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly basemapService = inject(MapShellBasemapService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly markerBindingService = inject(MapMarkerBindingService);
  private readonly mapContextMenuHandlerService = inject(MapContextMenuHandlerService);
  private readonly photoMarkerLifecycleService = inject(PhotoMarkerLifecycleService);
  private readonly mapClickHandlerService = inject(MapClickHandlerService);
  private readonly searchService = inject(MapShellSearchService);
  private readonly mapViewFlyService = inject(MapViewFlyService);
  private readonly mapZoomOrchestrator = inject(MapZoomOrchestratorService);
  private readonly mapLocationPickService = inject(MapLocationPickService);
  private readonly mapMoveEndHandlerService = inject(MapMoveEndHandlerService);
  private readonly zoomHighlightOrchestrator = inject(MapZoomHighlightOrchestratorService);
  private readonly mapDeferredStartupService = inject(MapDeferredStartupService);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly gpsService = inject(MapShellGpsService);
  private readonly instance = inject(MapShellInstanceService);
  private readonly radiusDrawingService = inject(RadiusDrawingOrchestratorService);
  private readonly mapSubscriptionService = inject(MapSubscriptionService);
  private readonly mapMediaDeleteSyncService = inject(MapMediaDeleteSyncService);
  private readonly markerMotionService = inject(MarkerMotionService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly state = inject(MapShellState);
  private readonly mapPlacementService = inject(MapPlacementService);
  private readonly _thumbnailLoader = inject(MapThumbnailLoaderService);

  private mapInitialized = false;
  private readonly deferredStartupHandles: DeferredStartupHandles = {
    rafId: null,
    startupTimer: null,
    markerBootstrapTimer: null,
  };

  initOnFirstRender(
    containerRef: ElementRef<HTMLDivElement> | undefined,
    destroyRef: DestroyRef,
    callbacks: MapShellInitCallbacks,
  ): void {
    const isJsdom =
      typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
    if (isJsdom || this.mapInitialized) {
      return;
    }

    this.markerMotionService.initPreference();
    this.doInitMap(containerRef, callbacks);
    this.mapSubscriptionService.subscribe(destroyRef);
    this.mapMediaDeleteSyncService.subscribe(destroyRef);
    this.scheduleDeferredStartupWork();
    this.mapInitialized = true;
  }

  cleanup(): void {
    this.gpsService.stopTracking();
    this.gpsService.removeLocationMarker();
    this.mapDeferredStartupService.cancelDeferredStartup(this.deferredStartupHandles);
    this.mapMoveEndHandlerService.clearDebounceTimer();
    this.mapViewportCoordinatorService.cancelPendingQuery();
    this.markerMotionService.detachPreferenceListener();
    this.cleanupMarkerLayersAndCaches();
    this.cleanupMapUiState();
    this.mapViewportCoordinatorService.persistMapSessionCache();
    this.destroyMapInstance();
    this.mapInitialized = false;
  }

  private doInitMap(containerRef: ElementRef<HTMLDivElement> | undefined, callbacks: MapShellInitCallbacks): void {
    if (!containerRef) {
      return;
    }

    const map = this.mapLeafletService.createMap(containerRef.nativeElement);
    this.instance.map = map;
    this.instance.mapContainerElement = containerRef.nativeElement;

    this.basemapService.applyToMap(map);
    this.instance.photoMarkerLayer = this.mapLeafletService.createPhotoMarkerLayer(map);

    this.markerSelectionService.bind({
      isRadiusDraftHighlighted: (key) => this.radiusDrawingService.isDraftHighlighted(key),
    });

    this.markerBindingService.bind({
      handlePhotoMarkerClick: (markerKey, event) =>
        this.photoMarkerLifecycleService.handlePhotoMarkerClick(markerKey, event),
    });

    this.mapContextMenuHandlerService.bind({
      openDetailView: (mediaId) => callbacks.openDetailView(mediaId),
      onDetailAddressSearchRequestConsumed: (requestId) =>
        callbacks.onDetailAddressSearchRequestConsumed(requestId),
    });

    this.photoMarkerLifecycleService.bind({
      openDetailView: (mediaId) => callbacks.openDetailView(mediaId),
    });

    this.mapClickHandlerService.bind({
      closeWorkspacePane: () => callbacks.closeWorkspacePane(),
    });

    this.searchService.updateViewportBounds(map);
    this.applyPendingMapFocus(map, callbacks);
    this.applyPendingLocationMapPickNav(callbacks);

    if (this.searchService.pendingSearchMapCenter) {
      this.mapViewFlyService.applySearchMapCenter(this.searchService.pendingSearchMapCenter);
      this.searchService.pendingSearchMapCenter = null;
    }

    const pendingZoom = this.mapZoomOrchestrator.consumePending();
    if (pendingZoom) {
      this.mapViewFlyService.onZoomToLocation(pendingZoom);
    }

    map.on('click', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapClick(e));
    map.on('mousedown', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapMouseDown(e));
    map.on('mousemove', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapMouseMove(e));
    map.on('mouseup', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapMouseUp(e));
    map.on('contextmenu', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapContextMenu(e));
    map
      .getContainer()
      .addEventListener('contextmenu', this.mapClickHandlerService.getContainerContextMenuHandler(), true);

    map.on('zoomstart', () => this.mapMoveEndHandlerService.onZoomStart());
    map.on('zoomend', () => this.mapMoveEndHandlerService.onZoomEnd());
    map.on('moveend', () => {
      this.instance.lastMapMoveAt = Date.now();
      this.mapMoveEndHandlerService.handleMoveEnd();
      this.searchService.updateViewportBounds(map);
    });
    map.on('idle', () => {
      this.instance.lastMapIdleAt = Date.now();
      this.zoomHighlightOrchestrator.flushPendingZoomHighlight();
    });
  }

  private applyPendingMapFocus(map: MapInstance, callbacks: MapShellInitCallbacks): void {
    const payload = callbacks.getPendingMapFocus();
    if (!payload) {
      return;
    }
    this.mapViewFlyService.setViewWithPaneOffset(payload.lat, payload.lng, DETAIL_LOCATION_FOCUS_ZOOM);
    callbacks.clearPendingMapFocus();
  }

  private applyPendingLocationMapPickNav(callbacks: MapShellInitCallbacks): void {
    const payload = callbacks.getPendingLocationMapPickNav();
    if (!payload) {
      return;
    }
    callbacks.clearPendingLocationMapPickNav();
    this.mapLocationPickService.setReturnUrl(payload.returnUrl);
    this.mapPlacementService.onUploadLocationMapPickRequested(payload.request);
  }

  private scheduleDeferredStartupWork(): void {
    this.mapDeferredStartupService.scheduleDeferredStartup({
      handles: this.deferredStartupHandles,
      runStartup: () => {
        if (!this.instance.map) {
          return;
        }
        this.gpsService.initBackground((coords) => {
          void this.searchService.refreshCountryCode(coords[0], coords[1]);
        });
        void this.workspaceViewService.loadMetadataFields();

        this.deferredStartupHandles.markerBootstrapTimer = setTimeout(() => {
          this.deferredStartupHandles.markerBootstrapTimer = null;
          if (!this.instance.map) {
            return;
          }
          if (this.mapViewportCoordinatorService.tryRestoreViewportFromSessionCache()) {
            this.instance.map.invalidateSize();
            return;
          }
          void this.mapViewportCoordinatorService.queryViewportMarkers();
        }, 120);
      },
    });
  }

  private cleanupMarkerLayersAndCaches(): void {
    this.markerStateMutationsService.cleanupMarkerLayersAndCaches({
      uploadedPhotoMarkers: this.instance.uploadedPhotoMarkers,
      photoMarkerLayer: this.instance.photoMarkerLayer,
      markersByMediaId: this.instance.markersByMediaId,
      cancelMarkerMoveAnimation: (marker) => this.markerBindingService.cancelMarkerMoveAnimation(marker),
    });
  }

  private cleanupMapUiState(): void {
    this.gpsService.removeLocationMarker();
    this.photoMarkerLifecycleService.removeDraftMediaMarker();
    this.searchService.clearLocationMarker();
    this.radiusDrawingService.cancelDraw();
    this.mapClickHandlerService.clearPendingSecondaryPress();
    this.state.closeAllContextMenus();
    this.mapProjectDialogService.closeAllDialogs(this.state);
    this.radiusDrawingService.clearSelectionVisuals();
  }

  private destroyMapInstance(): void {
    const map = this.instance.map;
    const getContainer = map?.getContainer;
    const mapContainer =
      typeof getContainer === 'function' ? getContainer.call(map) : undefined;
    if (mapContainer && typeof mapContainer.removeEventListener === 'function') {
      mapContainer.removeEventListener(
        'contextmenu',
        this.mapClickHandlerService.getContainerContextMenuHandler(),
        true,
      );
    }
    map?.remove?.();
    this.instance.map = undefined;
    this.instance.mapContainerElement = undefined;
    this.instance.photoMarkerLayer = null;
  }
}
