/**
 * MapShellComponent — map route content (Leaflet map zone) after authentication.
 *
 * Renders inside **`AuthenticatedAppLayoutComponent`** main column. Includes:
 *  - UploadButton: fixed top-right, click-toggles the UploadPanel.
 *  - SearchBar: floating top-center with Nominatim geocoding.
 *  - GPSButton: floating bottom-right, re-centres map on user position.
 *  - Placement mode banner when placing uploads or search pins.
 *
 * **Workspace pane** (drag divider + right panel) is **not** in this template — it is owned by
 * `AuthenticatedAppLayoutComponent` (`layout/authenticated-app-layout.component.ts`).
 *
 * Ground rules:
 *  - Leaflet is initialised in afterNextRender so it only runs in the browser.
 *  - `map` is protected (not private) so unit tests can inject a mock instance.
 *  - Signals for all local UI state; no RxJS subjects.
 *  - Nominatim results are fetched with debounce (300 ms) via native fetch().
 *  - Map / radius / marker floating menus use `app-dropdown-shell` (`DropdownShellComponent`); dismiss
 *    (outside click, Escape) is owned by the shell — templates bind `(closeRequested)` to `onMapMenuCloseRequested()`.
 */

/* eslint-disable max-lines, max-lines-per-function, no-magic-numbers, @typescript-eslint/explicit-function-return-type, @typescript-eslint/consistent-type-imports */

import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../../../../core/workspace-pane/workspace-pane-shell-events.types';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../../../core/filter/filter.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MEDIA_PLACEHOLDER_ICON } from '../../../../core/media-download/media-download.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { MapFilterToolbarComponent } from '../../map-filter-toolbar/map-filter-toolbar.component';
import { MapSearchContextService } from '../handlers/map-search-context.service';
import type { MapMenuActionId, MarkerMenuActionId, RadiusMenuActionId } from '../workspace/map-workspace-actions.types';
import type { ThumbnailCardHoverEvent } from '../../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { ProjectSelectDialogComponent } from '../../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../../shared/text-input-dialog/text-input-dialog.component';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../../shared/ui/toggle-group';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/shell/dropdown-shell.component';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../../shared/ui/menu';
import { MapShellState } from './map-shell.state';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapContextMenuHandlerService } from '../context-menu/map-context-menu-handler.service';
import { MapContextMenuOpenService } from '../context-menu/map-context-menu-open.service';
import { MapClickHandlerService } from '../handlers/map-click-handler.service';
import { MapLocationPickService } from '../handlers/map-location-pick.service';
import { MapMoveEndHandlerService } from '../handlers/map-move-end-handler.service';
import { MapViewFlyService } from '../handlers/map-view-fly.service';
import { MapPlacementService } from '../handlers/map-placement.service';
import { MapSubscriptionService } from '../handlers/map-subscription.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapMediaDeleteSyncService } from '../markers/map-media-delete-sync.service';
import { MarkerMotionService } from '../markers/marker-motion.service';
import { MapThumbnailLoaderService } from '../markers/map-thumbnail-loader.service';
import {
  MapZoomHighlightOrchestratorService,
  DETAIL_LOCATION_FOCUS_ZOOM,
} from '../markers/map-zoom-highlight-orchestrator.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { MapMarkerBindingService } from '../markers/map-marker-binding.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { MapShellBasemapService } from '../leaflet/map-shell-basemap.service';
import {
  MapInstance,
  MapMouseEvent,
  MapLeafletService,
} from '../leaflet/map-leaflet.service';
import { MapFocusPayloadService } from '../context-menu/map-focus-payload.service';
import { MapZoomOrchestratorService } from '../../../../core/map-zoom/map-zoom-orchestrator.service';
import { LocationMapPickNavigationService } from '../../../../core/workspace-pane/location-map-pick-navigation.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { DeferredStartupHandles, MapDeferredStartupService } from '../leaflet/map-deferred-startup.service';
import { MapProjectDialogService } from '../workspace/map-project-dialog.service';
import { MarkerStateMutationsService } from '../markers/marker-state-mutations.service';
import { getFirstMarkerKeyForMedia } from '../markers/marker-media-index.helpers';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import type { SelectedItemsContextPort } from '../../../../core/workspace-pane/workspace-pane-context.port';
import { WORKSPACE_PANE_SHELL_HOST } from '../../../../core/workspace-pane/workspace-pane-shell-host.token';
import type { WorkspacePaneLayoutMapEffects } from '../../../../core/workspace-pane/workspace-pane-layout-map-effects.service';
import { WorkspacePaneLayoutMapEffectsService } from '../../../../core/workspace-pane/workspace-pane-layout-map-effects.service';
import { MapMenuViewModelService } from '../workspace/map-menu-view-model.service';
import { HLM_BUTTON_IMPORTS } from '../../../../shared/ui/button';
import { MapShellInstanceService } from './map-shell-instance.service';


@Component({
  selector: 'app-map-shell',
  imports: [
    SearchBarComponent,
    MapFilterToolbarComponent,
    ProjectSelectDialogComponent,
    TextInputDialogComponent,
    ...BrnToggleGroupImports,
    ...HLM_TOGGLE_GROUP_IMPORTS,
    DropdownShellComponent,
    HlmMenuItemDirective,
    HlmMenuSeparatorDirective,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './map-shell.component.html',
  styleUrl: './map-shell.component.scss',
  host: {
    '[style.--placeholder-icon]': 'placeholderIconUrl',
  },
})
export class MapShellComponent implements OnDestroy {
  private static readonly CONTEXT_MENU_SHEET_BREAKPOINT_PX = 768;

  readonly placeholderIconUrl = `url("${MEDIA_PLACEHOLDER_ICON}")`;
  /** Template helper: icon/text layout for map style pill options. */
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  private readonly state = inject(MapShellState);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly mapContextMenuHandlerService = inject(MapContextMenuHandlerService);
  private readonly mapContextMenuOpenService = inject(MapContextMenuOpenService);
  private readonly mapClickHandlerService = inject(MapClickHandlerService);
  private readonly mapMoveEndHandlerService = inject(MapMoveEndHandlerService);
  private readonly mapViewFlyService = inject(MapViewFlyService);
  private readonly mapLocationPickService = inject(MapLocationPickService);
  private readonly photoMarkerLifecycleService = inject(PhotoMarkerLifecycleService);
  private readonly mapMediaDeleteSyncService = inject(MapMediaDeleteSyncService);
  private readonly markerMotionService = inject(MarkerMotionService);
  private readonly thumbnailLoaderService = inject(MapThumbnailLoaderService);
  private readonly zoomHighlightOrchestrator = inject(MapZoomHighlightOrchestratorService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly markerBindingService = inject(MapMarkerBindingService);
  private readonly radiusDrawingService = inject(RadiusDrawingOrchestratorService);
  readonly basemapService = inject(MapShellBasemapService);
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly mapFocusPayloadService = inject(MapFocusPayloadService);
  private readonly mapZoomOrchestrator = inject(MapZoomOrchestratorService);
  private readonly locationMapPickNavigationService = inject(LocationMapPickNavigationService);
  readonly gpsService = inject(MapShellGpsService);
  readonly searchService = inject(MapShellSearchService);
  private readonly mapDeferredStartupService = inject(MapDeferredStartupService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly workspacePaneShellHost = inject(WORKSPACE_PANE_SHELL_HOST);
  private readonly workspacePaneLayoutMapEffectsService = inject(WorkspacePaneLayoutMapEffectsService);
  readonly menuVm = inject(MapMenuViewModelService);
  readonly searchContext = inject(MapSearchContextService);
  private readonly mapPlacementService = inject(MapPlacementService);
  private readonly mapSubscriptionService = inject(MapSubscriptionService);
  private readonly mapShellInstance = inject(MapShellInstanceService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  /** Reference to the Leaflet map container div. */
  private readonly mapContainerRef = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  private readonly pendingMapFocus = signal<{ mediaId: string; lat: number; lng: number } | null>(
    this.mapFocusPayloadService.readMapFocusPayload(this.router),
  );
  private readonly pendingLocationMapPickNav =
    signal<ReturnType<LocationMapPickNavigationService['readPayload']>>(
      this.locationMapPickNavigationService.readPayload(this.router),
    );
  /**
   * Leaflet map instance. Protected (not private) so unit tests can inject
   * a mock to test behaviour without initialising the real Leaflet map.
   */
  protected map?: MapInstance;

  // ── Upload / placement state ─────────────────────────────────────────────

  private readonly uploadShellUi = inject(UploadShellUiService);

  /** Global upload shell (layout); map shell toggles panel for placement flows. */
  readonly uploadPanelPinned = this.uploadShellUi.uploadPanelPinned;
  readonly uploadPanelOpen = this.uploadShellUi.uploadPanelOpen;

  /** Whether the map is in placement mode (drives the banner + cursor class). */
  readonly placementActive = this.state.placementActive;

  readonly searchQueryContext = this.searchContext.searchQueryContext;

  // ── Workspace pane / photo panel state ───────────────────────────────────

  /** Whether the workspace pane (photo panel) is open. */
  readonly photoPanelOpen = this.state.photoPanelOpen;

  /** Current workspace pane width in px. Uses restored user preference or design-system default. */
  readonly workspacePaneWidth = this.state.workspacePaneWidth;

  readonly selectedMarkerKey = this.state.selectedMarkerKey;
  readonly selectedMarkerKeys = this.state.selectedMarkerKeys;
  readonly linkedHoveredWorkspaceMediaIds = this.state.linkedHoveredWorkspaceMediaIds;
  readonly mapContextMenuOpen = this.state.mapContextMenuOpen;
  readonly mapContextMenuPosition = this.state.mapContextMenuPosition;
  readonly mapContextMenuCoords = this.state.mapContextMenuCoords;
  readonly radiusContextMenuOpen = this.state.radiusContextMenuOpen;
  readonly radiusContextMenuPosition = this.state.radiusContextMenuPosition;
  readonly radiusContextMenuCoords = this.state.radiusContextMenuCoords;
  readonly markerContextMenuOpen = this.state.markerContextMenuOpen;
  readonly markerContextMenuPosition = this.state.markerContextMenuPosition;
  readonly markerContextMenuPayload = this.state.markerContextMenuPayload;
  readonly draftMediaMarker = this.state.draftMediaMarker;
  readonly projectSelectionDialogOpen = this.state.projectSelectionDialogOpen;
  readonly projectSelectionDialogTitle = this.state.projectSelectionDialogTitle;
  readonly projectSelectionDialogMessage = this.state.projectSelectionDialogMessage;
  readonly projectSelectionDialogOptions = this.state.projectSelectionDialogOptions;
  readonly projectSelectionDialogSelectedId = this.state.projectSelectionDialogSelectedId;
  readonly projectNameDialogOpen = this.state.projectNameDialogOpen;
  readonly projectNameDialogTitle = this.state.projectNameDialogTitle;
  readonly projectNameDialogMessage = this.state.projectNameDialogMessage;
  readonly projectNameDialogInitialValue = this.state.projectNameDialogInitialValue;
  readonly batchAddressDialogOpen = this.state.batchAddressDialogOpen;
  readonly batchAddressDialogTitle = this.state.batchAddressDialogTitle;
  readonly batchAddressDialogMessage = this.state.batchAddressDialogMessage;
  readonly detailAddressSearchRequest = this.state.detailAddressSearchRequest;

  /**
   * When non-null, the Image Detail View is shown inside the photo panel.
   * Set to a DB image UUID when the user clicks a thumbnail or marker detail action.
   * Set to null to return to the thumbnail grid.
   */
  readonly detailMediaId = this.state.detailMediaId;

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Aliased from MapShellInstanceService for local brevity. */
  private get uploadedPhotoMarkers() { return this.mapShellInstance.uploadedPhotoMarkers; }
  private get photoMarkerLayer() { return this.mapShellInstance.photoMarkerLayer; }
  private get markersByMediaId() { return this.mapShellInstance.markersByMediaId; }

  /** Set true after first Leaflet init; never cleared on activeShell hide/show. */
  private mapInitialized = false;

  private readonly deferredStartupHandles: DeferredStartupHandles = {
    rafId: null,
    startupTimer: null,
    markerBootstrapTimer: null,
  };
  private workspacePaneMapEffectsRegistration: WorkspacePaneLayoutMapEffects | null = null;
  private readonly mapSelectedItemsContext: SelectedItemsContextPort = {
    contextKey: 'map',
    selectedMediaIds$: this.workspaceSelectionService.selectedMediaIds,
    requestOpenDetail: (mediaId: string) => this.openDetailView(mediaId),
    requestSetHover: (mediaId: string | null) => {
      if (!mediaId) {
        this.markerSelectionService.setLinkedHoverMarkerFromWorkspace(null);
        return;
      }
      this.markerSelectionService.setLinkedHoverMarkerFromWorkspace(getFirstMarkerKeyForMedia(this.markersByMediaId, mediaId) ?? null);
    },
  };

  constructor() {
    this.workspacePaneObserver.onContextRebind(this.mapSelectedItemsContext);

    this.workspacePaneMapEffectsRegistration = {
      onZoomToLocation: (event) => this.onZoomToLocation(event),
      onImageUploaded: (event) => this.onImageUploaded(event),
      enterPlacementMode: (key) => this.enterPlacementMode(key),
      onUploadLocationPreviewRequested: (event) => this.onUploadLocationPreviewRequested(event),
      onUploadLocationPreviewCleared: () => this.onUploadLocationPreviewCleared(),
      onUploadLocationMapPickRequested: (event) => this.onUploadLocationMapPickRequested(event),
      onWorkspaceItemHoverStarted: (event) => this.onWorkspaceItemHoverStarted(event),
      onWorkspaceItemHoverEnded: (mediaId) => this.onWorkspaceItemHoverEnded(mediaId),
      onWorkspacePaneClosing: () => this.applyWorkspacePaneClosingMapSideEffects(),
      invalidateMapSize: () => this.map?.invalidateSize(),
    };
    this.workspacePaneLayoutMapEffectsService.registerMapEffects(
      this.workspacePaneMapEffectsRegistration,
    );

    let mapFilterEffectReady = false;
    effect(() => {
      this.workspaceViewService.filteredImageIds();
      this.workspaceViewService.selectedProjectIds();
      this.workspaceViewService.timeRange();
      this.filterService.rules();
      if (!mapFilterEffectReady) {
        mapFilterEffectReady = true;
        return;
      }
      this.mapViewportCoordinatorService.reapplyViewportMarkerFilter();
    });

    afterNextRender(() => {
      const isJsdom =
        typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
      if (isJsdom) {
        return;
      }

      if (this.mapInitialized) {
        return;
      }

      this.markerMotionService.initPreference();
      this.initMap();
      this.mapSubscriptionService.subscribe(this.destroyRef);
      this.mapMediaDeleteSyncService.subscribe(this.destroyRef);
      this.scheduleDeferredStartupWork();
      this.mapInitialized = true;
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    if (this.workspacePaneMapEffectsRegistration) {
      this.workspacePaneLayoutMapEffectsService.unregisterMapEffects(
        this.workspacePaneMapEffectsRegistration,
      );
      this.workspacePaneMapEffectsRegistration = null;
    }
    this.cleanupGpsAndTracking();
    this.cleanupDeferredAndQueryState();
    this.detachGlobalListeners();
    this.cleanupMarkerLayersAndCaches();
    this.cleanupMapUiState();
    this.mapViewportCoordinatorService.persistMapSessionCache();
    this.destroyMapInstance();
  }

  private cleanupGpsAndTracking(): void {
    this.gpsService.stopTracking();
    this.gpsService.removeLocationMarker();
  }

  private cleanupDeferredAndQueryState(): void {
    this.cancelDeferredStartupWork();

    this.mapMoveEndHandlerService.clearDebounceTimer();
    this.mapViewportCoordinatorService.cancelPendingQuery();
  }

  private detachGlobalListeners(): void {
    this.markerMotionService.detachPreferenceListener();
  }

  private cleanupMarkerLayersAndCaches(): void {
    this.markerStateMutationsService.cleanupMarkerLayersAndCaches({
      uploadedPhotoMarkers: this.uploadedPhotoMarkers,
      photoMarkerLayer: this.photoMarkerLayer,
      markersByMediaId: this.markersByMediaId,
      cancelMarkerMoveAnimation: (marker) => this.markerBindingService.cancelMarkerMoveAnimation(marker),
    });
  }

  private cleanupMapUiState(): void {
    this.gpsService.removeLocationMarker();
    this.photoMarkerLifecycleService.removeDraftMediaMarker();
    this.searchService.clearLocationMarker();
    this.radiusDrawingService.cancelDraw();
    this.mapClickHandlerService.clearPendingSecondaryPress();
    this.closeContextMenus();
    this.mapProjectDialogService.closeAllDialogs(this.state);
    this.radiusDrawingService.clearSelectionVisuals();
  }

  private destroyMapInstance(): void {
    const getContainer = this.map?.getContainer;
    const mapContainer = typeof getContainer === 'function' ? getContainer.call(this.map) : undefined;
    if (mapContainer && typeof mapContainer.removeEventListener === 'function') {
      mapContainer.removeEventListener('contextmenu', this.mapClickHandlerService.getContainerContextMenuHandler(), true);
    }
    this.map?.remove?.();
    this.mapShellInstance.map = undefined;
    this.mapShellInstance.mapContainerElement = undefined;
    this.mapShellInstance.photoMarkerLayer = null;
    this.mapInitialized = false;
  }

  closeContextMenus(): void {
    this.state.closeAllContextMenus();
  }

  onMapMenuCloseRequested(): void {
    this.closeContextMenus();
    this.mapContainerRef()?.nativeElement?.focus();
  }

  mapMenuPanelClass(viewportWidth?: number): string {
    return this.isContextMenuSheetViewport(viewportWidth)
      ? 'map-context-menu option-menu-surface map-context-menu--sheet'
      : 'map-context-menu option-menu-surface';
  }

  private isContextMenuSheetViewport(viewportWidth?: number): boolean {
    const resolvedViewportWidth =
      typeof viewportWidth === 'number'
        ? viewportWidth
        : typeof window !== 'undefined'
          ? window.innerWidth
          : 1280;

    return resolvedViewportWidth < MapShellComponent.CONTEXT_MENU_SHEET_BREAKPOINT_PX;
  }

  onMapMenuKeydown(event: KeyboardEvent): void {
    this.mapContextMenuOpenService.handleMenuKeydown(event);
  }

  async onMapMenuActionSelected(actionId: MapMenuActionId): Promise<void> {
    return this.mapContextMenuHandlerService.onMapMenuActionSelected(actionId);
  }

  async onMapContextStartRadiusFromHere(): Promise<void> {
    return this.mapContextMenuHandlerService.onMapContextStartRadiusFromHere();
  }

  async onRadiusMenuActionSelected(actionId: RadiusMenuActionId): Promise<void> {
    return this.mapContextMenuHandlerService.onRadiusMenuActionSelected(actionId);
  }

  get markerContextIsSingle(): boolean { return this.mapContextMenuHandlerService.markerContextIsSingle; }
  get markerContextIsCluster(): boolean { return this.mapContextMenuHandlerService.markerContextIsCluster; }
  get markerContextIsMulti(): boolean { return this.mapContextMenuHandlerService.markerContextIsMulti; }

  async onMarkerMenuActionSelected(actionId: MarkerMenuActionId): Promise<void> {
    return this.mapContextMenuHandlerService.onMarkerMenuActionSelected(actionId);
  }

  onBatchAddressDialogCancelled(): void { this.mapContextMenuHandlerService.onBatchAddressDialogCancelled(); }

  async onBatchAddressDialogConfirmed(addressInput: string): Promise<void> {
    return this.mapContextMenuHandlerService.onBatchAddressDialogConfirmed(addressInput);
  }

  onDetailAddressSearchRequestConsumed(requestId: number): void {
    this.mapContextMenuHandlerService.onDetailAddressSearchRequestConsumed(requestId);
  }

  // ── Workspace pane (DOM + split owned by AuthenticatedAppLayoutComponent) ─

  private applyWorkspacePaneClosingMapSideEffects(): void {
    if ((this.draftMediaMarker()?.uploadCount ?? 0) === 0) {
      this.photoMarkerLifecycleService.removeDraftMediaMarker();
    }
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.radiusDrawingService.clearSelectionVisuals();
  }

  onQrInviteCommandRequested(): void {
    void this.router.navigateByUrl('/colleagues?tab=invites');
  }

  /** Closes the Image Detail View and returns to the thumbnail grid. */
  closeDetailView(): void {
    this.workspacePaneShellHost.closeDetailView();
  }

  /**
   * Opens the Image Detail View for the given DB image UUID.
   * Also ensures the photo panel is open.
   */
  openDetailView(mediaId: string): void {
    this.workspacePaneShellHost.openDetailView(mediaId);
  }

  onZoomToLocation(event: { mediaId: string; lat: number; lng: number; zoomMode?: 'house' | 'street' }): void {
    this.mapViewFlyService.onZoomToLocation(event);
  }

  onWorkspaceItemHoverStarted(event: ThumbnailCardHoverEvent): void {
    this.markerSelectionService.onWorkspaceHoverStarted(event);
  }

  onWorkspaceItemHoverEnded(mediaId: string): void {
    this.markerSelectionService.onWorkspaceHoverEnded(mediaId);
  }

  // ── Upload panel ──────────────────────────────────────────────────────────

  toggleUploadPanel(): void { this.uploadShellUi.toggleUploadPanel(); }
  onImageUploaded(event: ImageUploadedEvent): void { this.mapPlacementService.onImageUploaded(event); }
  enterPlacementMode(key: string): void { this.mapPlacementService.enterPlacementMode(key); }
  cancelPlacement(): void { this.mapPlacementService.cancelPlacement(); }
  goToUserPosition(): void { this.mapPlacementService.goToUserPosition(); }
  onMapViewModeChange(raw: ToggleValue<string>): void { this.mapPlacementService.onMapViewModeChange(raw); }
  onSearchMapCenterRequested(event: { lat: number; lng: number; label: string }): void { this.mapPlacementService.onSearchMapCenterRequested(event); }
  onSearchClearRequested(): void { this.mapPlacementService.onSearchClearRequested(); }
  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void { this.mapPlacementService.onUploadLocationPreviewRequested(event); }
  onUploadLocationPreviewCleared(): void { this.mapPlacementService.onUploadLocationPreviewCleared(); }
  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void { this.mapPlacementService.onUploadLocationMapPickRequested(event); }
  placementBannerText(): string { return this.mapPlacementService.placementBannerText(); }

  // ── Map init ──────────────────────────────────────────────────────────────

  private initMap(): void {
    const containerRef = this.mapContainerRef();
    if (!containerRef) {
      return;
    }

    this.map = this.mapLeafletService.createMap(containerRef.nativeElement);
    this.mapShellInstance.map = this.map;
    this.mapShellInstance.mapContainerElement = containerRef.nativeElement;

    this.applyMapBasemapLayer();

    // LayerGroup for all photo markers — batch add/remove.
    this.mapShellInstance.photoMarkerLayer = this.mapLeafletService.createPhotoMarkerLayer(this.map);

    this.markerSelectionService.bind({
      isRadiusDraftHighlighted: (key) => this.radiusDrawingService.isDraftHighlighted(key),
    });

    this.markerBindingService.bind({
      handlePhotoMarkerClick: (markerKey, event) => this.photoMarkerLifecycleService.handlePhotoMarkerClick(markerKey, event),
    });

    this.mapContextMenuHandlerService.bind({
      openDetailView: (mediaId) => this.openDetailView(mediaId),
      onDetailAddressSearchRequestConsumed: (requestId) => this.workspacePaneShellHost.onDetailAddressSearchRequestConsumed(requestId),
    });

    this.photoMarkerLifecycleService.bind({
      openDetailView: (mediaId) => this.openDetailView(mediaId),
    });

    this.mapLocationPickService.bind({
      onImageUploaded: (event) => this.onImageUploaded(event),
    });

    this.mapClickHandlerService.bind({
      closeWorkspacePane: () => this.workspacePaneShellHost.closeWorkspacePane(),
    });

    this.searchService.updateViewportBounds(this.map);
    this.applyPendingMapFocus();
    this.applyPendingLocationMapPickNavigation();
    if (this.searchService.pendingSearchMapCenter) {
      this.mapViewFlyService.applySearchMapCenter(this.searchService.pendingSearchMapCenter);
      this.searchService.pendingSearchMapCenter = null;
    }

    const pendingZoom = this.mapZoomOrchestrator.consumePending();
    if (pendingZoom) {
      this.onZoomToLocation(pendingZoom);
    }

    // Map click handler: closes upload panel and, when active, places images
    // that had no GPS EXIF data.
    this.map.on('click', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapClick(e));
    this.map.on('mousedown', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapMouseDown(e));
    this.map.on('mousemove', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapMouseMove(e));
    this.map.on('mouseup', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapMouseUp(e));
    this.map.on('contextmenu', (e: MapMouseEvent) => this.mapClickHandlerService.handleMapContextMenu(e));

    // Capture-phase suppression ensures the native browser menu never opens
    // above the custom app context menu.
    this.map
      .getContainer()
      .addEventListener('contextmenu', this.mapClickHandlerService.getContainerContextMenuHandler(), true);

    this.map.on('zoomstart', () => this.mapMoveEndHandlerService.onZoomStart());
    this.map.on('zoomend', () => this.mapMoveEndHandlerService.onZoomEnd());
    this.map.on('moveend', () => {
      this.mapShellInstance.lastMapMoveAt = Date.now();
      this.mapMoveEndHandlerService.handleMoveEnd();
      this.searchService.updateViewportBounds(this.map);
    });

    this.map.on('idle', () => {
      this.mapShellInstance.lastMapIdleAt = Date.now();
      this.zoomHighlightOrchestrator.flushPendingZoomHighlight();
    });
  }

  private scheduleDeferredStartupWork(): void {
    this.mapDeferredStartupService.scheduleDeferredStartup({
      handles: this.deferredStartupHandles,
      runStartup: () => {
        if (!this.map) {
          return;
        }

        // Keep first route paint responsive, then run startup data work.
        this.initGeolocation();
        void this.workspaceViewService.loadMetadataFields();

        this.deferredStartupHandles.markerBootstrapTimer = setTimeout(() => {
          this.deferredStartupHandles.markerBootstrapTimer = null;
          if (!this.map) {
            return;
          }
          if (this.mapViewportCoordinatorService.tryRestoreViewportFromSessionCache()) {
            this.map.invalidateSize();
            return;
          }
          void this.mapViewportCoordinatorService.queryViewportMarkers();
        }, 120);
      },
    });
  }

  private cancelDeferredStartupWork(): void {
    this.mapDeferredStartupService.cancelDeferredStartup(this.deferredStartupHandles);
  }

  private initGeolocation(): void {
    this.gpsService.initBackground((coords) => {
      void this.searchService.refreshCountryCode(coords[0], coords[1]);
    });
  }


  private applyMapBasemapLayer(): void {
    this.basemapService.applyToMap(this.map);
  }

  private applyPendingMapFocus(): void {
    if (!this.map) {
      return;
    }

    const payload = this.pendingMapFocus();
    if (!payload) {
      return;
    }

    this.mapViewFlyService.setViewWithPaneOffset(payload.lat, payload.lng, DETAIL_LOCATION_FOCUS_ZOOM);
    this.pendingMapFocus.set(null);
  }

  /** Resume map pick after layout navigated here from /media (or another non-map route). */
  private applyPendingLocationMapPickNavigation(): void {
    const payload = this.pendingLocationMapPickNav();
    if (!payload) {
      return;
    }

    this.pendingLocationMapPickNav.set(null);
    this.mapLocationPickService.setReturnUrl(payload.returnUrl);
    this.onUploadLocationMapPickRequested(payload.request);
  }

  onProjectSelectionDialogSelected(projectId: string): void {
    this.mapContextMenuHandlerService.onProjectSelectionDialogSelected(projectId);
  }

  onProjectSelectionDialogConfirmed(projectId: string): void {
    this.mapContextMenuHandlerService.onProjectSelectionDialogConfirmed(projectId);
  }

  onProjectSelectionDialogCancelled(): void {
    this.mapContextMenuHandlerService.onProjectSelectionDialogCancelled();
  }

  onProjectNameDialogConfirmed(projectName: string): void {
    this.mapContextMenuHandlerService.onProjectNameDialogConfirmed(projectName);
  }

  onProjectNameDialogCancelled(): void {
    this.mapContextMenuHandlerService.onProjectNameDialogCancelled();
  }

}
