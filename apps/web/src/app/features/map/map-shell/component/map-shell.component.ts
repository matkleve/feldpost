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
import {
  UploadManagerService,
  ImageReplacedEvent,
  ImageAttachedEvent,
} from '../../../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../../../core/filter/filter.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MEDIA_PLACEHOLDER_ICON } from '../../../../core/media-download/media-download.service';
import { ToastService } from '../../../../core/toast/toast.service';
import type { ToastOptions, ToastType } from '../../../../core/toast/toast.types';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { MapFilterToolbarComponent } from '../../map-filter-toolbar/map-filter-toolbar.component';
import { MapSearchContextService } from '../handlers/map-search-context.service';
import type { ThumbnailCardHoverEvent } from '../../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { ROUTE_SESSION_SHELL_KEYS } from '../../../../core/route-session-cache/route-session-cache.keys';
import { RouteSessionCacheService } from '../../../../core/route-session-cache/route-session-cache.service';
import { ProjectSelectDialogComponent } from '../../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../../shared/text-input-dialog/text-input-dialog.component';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../../shared/ui/toggle-group';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/shell/dropdown-shell.component';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../../shared/ui/menu';
import { MapShellState } from './map-shell.state';
import { PhotoMarkerState } from '../markers/map-marker-reconcile.facade';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapContextMenuHandlerService } from '../context-menu/map-context-menu-handler.service';
import { MapContextMenuOpenService } from '../context-menu/map-context-menu-open.service';
import { MapClickHandlerService } from '../handlers/map-click-handler.service';
import { MapLocationPickService } from '../handlers/map-location-pick.service';
import { MapMoveEndHandlerService } from '../handlers/map-move-end-handler.service';
import { MapViewFlyService } from '../handlers/map-view-fly.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapMediaDeleteSyncService } from '../markers/map-media-delete-sync.service';
import { MarkerMotionService } from '../markers/marker-motion.service';
import { MapPhotoMarkerRenderService } from '../markers/map-photo-marker-render.service';
import type { MarkerRenderSnapshot } from '../markers/map-photo-marker-render.service';
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
  MapLayerGroup,
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
  private readonly uploadManagerService = inject(UploadManagerService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  private readonly routeSessionCache = inject(RouteSessionCacheService);
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
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);
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
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  private showMapToast(
    key: string,
    fallback: string,
    type: ToastType,
    extra?: Omit<ToastOptions, 'title' | 'type'>,
  ): void {
    this.toastService.show({
      title: this.t(key, fallback),
      type,
      dedupe: true,
      ...extra,
    });
  }

  private showMapToastTitle(title: string, type: ToastType, extra?: Omit<ToastOptions, 'title' | 'type'>): void {
    this.toastService.show({
      title,
      type,
      dedupe: true,
      ...extra,
    });
  }

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

  /**
   * When non-null the map is in "placement mode": the next click places an
   * image that had no GPS EXIF data. Holds the upload-panel row key.
   */
  private pendingPlacementKey: string | null = null;
  private pendingUploadedLocationMapPick: UploadLocationMapPickRequest | null = null;

  /** Whether the map is in placement mode (drives the banner + cursor class). */
  readonly placementActive = signal(false);

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

  private readonly uploadedPhotoMarkers = new Map<
    string,
    PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }
  >();

  /** LayerGroup for all photo markers — enables batch add/remove. */
  private photoMarkerLayer: MapLayerGroup | null = null;

  /** Set true after first Leaflet init; never cleared on activeShell hide/show. */
  private mapInitialized = false;

  /**
   * Secondary index: mediaId → markerKey for O(1) lookups when
   * handling upload manager events (replace, attach).
   */
  private readonly markersByMediaId = new Map<string, string[]>();

  /** Subscriptions for upload manager events — cleaned up in ngOnDestroy. */
  private uploadManagerSubs: { unsubscribe(): void }[] = [];
  private readonly deferredStartupHandles: DeferredStartupHandles = {
    rafId: null,
    startupTimer: null,
    markerBootstrapTimer: null,
  };
  private lastMapMoveAt = 0;
  private lastMapIdleAt = 0;
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
      this.subscribeToUploadManagerEvents();
      this.mapMediaDeleteSyncService.subscribe(this.destroyRef);
      this.subscribeRouteSessionInvalidation();
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
    this.cleanupUploadManagerSubscriptions();
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

  private cleanupUploadManagerSubscriptions(): void {
    for (const sub of this.uploadManagerSubs) {
      sub.unsubscribe();
    }
    this.uploadManagerSubs = [];
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
    this.mapInitialized = false;
  }

  closeContextMenus(): void {
    this.state.setMapContextMenuOpen(false);
    this.state.setRadiusContextMenuOpen(false);
    this.state.setMarkerContextMenuOpen(false);
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

  private patchDetailMediaId(mediaId: string | null): void {
    this.state.setDetailMediaId(mediaId);
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  private clampWorkspacePaneWidth(width: number): number {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return Math.min(Math.max(width, vw * 0.25), vw * 0.75);
  }

  private getWorkspacePaneOpeningWidth(): number {
    return this.clampWorkspacePaneWidth(this.workspacePaneWidth());
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

  toggleUploadPanel(): void {
    this.uploadShellUi.toggleUploadPanel();
  }

  /**
   * Called when an image with GPS coords is uploaded. Adds a Leaflet marker.
   * Clicking the marker pins the side panel open (M-UI4 will populate it).
   */
  onImageUploaded(event: ImageUploadedEvent): void {
    if (!this.map) return;
    this.photoMarkerLifecycleService.upsertUploadedPhotoMarker(event);
    this.photoMarkerLifecycleService.resolveDraftMediaMarkerUpload(event);
    void this.mapViewportCoordinatorService.queryViewportMarkers();
  }

  /** Enters placement mode for a file with no GPS EXIF data. */
  enterPlacementMode(key: string): void {
    const draft = this.draftMediaMarker();
    if (draft) {
      this.uploadShellUi.placeFile(key, { lat: draft.lat, lng: draft.lng });
      return;
    }

    this.pendingPlacementKey = key;
    this.placementActive.set(true);
    this.map?.getContainer().classList.add('map-container--placing');
  }

  /** Cancels placement mode without placing the image. */
  cancelPlacement(): void {
    const pendingUploadedPick = this.pendingUploadedLocationMapPick;
    this.pendingPlacementKey = null;
    this.pendingUploadedLocationMapPick = null;
    this.placementActive.set(false);
    this.searchService.setPlacementActive(false);
    this.map?.getContainer().classList.remove('map-container--placing');
    this.uploadShellUi.clearPendingLocationMapPick(pendingUploadedPick?.mediaId);
    this.mapLocationPickService.navigateBackAfterLocationMapPick();
  }

  // ── GPS button ────────────────────────────────────────────────────────────

  /**
   * Activates GPS tracking and recenters only after a fresh browser fix resolves.
   * @see docs/specs/component/map/gps-button.md
   */
  goToUserPosition(): void {
    this.gpsService.goTo(
      this.map,
      (coords) => {
        this.gpsService.renderOrUpdateLocationMarker(coords, this.map);
        this.gpsService.triggerLocationFoundState();
        void this.searchService.refreshCountryCode(coords[0], coords[1]);
      },
      () => this.gpsService.removeLocationMarker(),
    );
  }

  onMapViewModeChange(raw: ToggleValue<string>): void {
    this.basemapService.onViewModeChange(raw, this.map);
  }

  onSearchMapCenterRequested(event: { lat: number; lng: number; label: string }): void {
    if (!this.map) {
      this.searchService.pendingSearchMapCenter = event;
      return;
    }
    this.mapViewFlyService.applySearchMapCenter(event);
  }

  onSearchClearRequested(): void {
    this.searchService.clearLocationMarker();
  }

  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void {
    const points =
      event.points?.length && event.points.length > 0
        ? event.points
        : [{ lat: event.lat, lng: event.lng }];
    this.searchService.renderPreviewMarkers(points, this.map);
  }

  onUploadLocationPreviewCleared(): void {
    if (this.searchService.searchPlacementActive()) {
      return;
    }
    this.searchService.clearPreviewMarkers();
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.pendingPlacementKey = null;
    this.pendingUploadedLocationMapPick = event;
    this.placementActive.set(false);
    this.searchService.setPlacementActive(true);
    this.map?.getContainer().classList.add('map-container--placing');
  }

  placementBannerText(): string {
    if (this.placementActive()) {
      return this.t('upload.placement.banner.placeImage', 'Click the map to place the image');
    }

    return this.t(
      'upload.placement.banner.setNewLocation',
      'Click the map to set the new location',
    );
  }

  // ── Map init ──────────────────────────────────────────────────────────────

  private initMap(): void {
    const containerRef = this.mapContainerRef();
    if (!containerRef) {
      return;
    }

    this.map = this.mapLeafletService.createMap(containerRef.nativeElement);

    this.applyMapBasemapLayer();

    // LayerGroup for all photo markers — batch add/remove.
    this.photoMarkerLayer = this.mapLeafletService.createPhotoMarkerLayer(this.map);

    this.markerSelectionService.bind({
      getSelectedMarkerKey: () => this.selectedMarkerKey(),
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      setSelectedMarkerKey: (key) => this.state.setSelectedMarkerKey(key),
      setSelectedMarkerKeys: (keys) => this.state.setSelectedMarkerKeys(keys),
      setLinkedHoveredWorkspaceMediaIds: (ids) => this.state.setLinkedHoveredWorkspaceMediaIds(ids),
      isRadiusDraftHighlighted: (key) => this.radiusDrawingService.isDraftHighlighted(key),
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getRawImages: () => this.workspaceViewService.rawImages(),
      toMarkerKey: (lat, lng) => this.toMarkerKey(lat, lng),
    });

    this.markerRenderService.bind({
      isSelected: (key) => this.markerSelectionService.isMarkerSelected(key),
      isLinkedHovered: (key) => this.markerSelectionService.isMarkerLinkedHovered(key),
      getMap: () => this.map,
      getMarkers: () => this.uploadedPhotoMarkers,
    });

    this.thumbnailLoaderService.bind({
      getMap: () => this.map,
      getMarkers: () => this.uploadedPhotoMarkers,
    });

    this.zoomHighlightOrchestrator.bind({
      getMap: () => this.map,
      getLastMapIdleAt: () => this.lastMapIdleAt,
      getLastMapMoveAt: () => this.lastMapMoveAt,
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getMarkersByMediaId: () => this.markersByMediaId,
      toMarkerKey: (lat, lng) => this.toMarkerKey(lat, lng),
    });

    this.radiusDrawingService.bind({
      getMap: () => this.map,
      isPlacementActive: () => this.placementActive(),
      isSearchPlacementActive: () => this.searchService.searchPlacementActive(),
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      isPhotoPanelOpen: () => this.photoPanelOpen(),
      setWorkspacePaneWidth: (width) => this.state.setWorkspacePaneWidth(width),
      patchDetailMediaId: (id) => this.patchDetailMediaId(id),
      closeContextMenus: () => this.closeContextMenus(),
      suppressMapClickFor: (ms) => this.mapClickHandlerService.suppressMapClickFor(ms),
      getWorkspacePaneOpeningWidth: () => this.getWorkspacePaneOpeningWidth(),
      toMarkerKey: (lat, lng) => this.toMarkerKey(lat, lng),
    });

    this.markerBindingService.bind({
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      handlePhotoMarkerClick: (markerKey, event) => this.photoMarkerLifecycleService.handlePhotoMarkerClick(markerKey, event),
      consumeNativeContextMenuBypass: () => this.mapClickHandlerService.consumeNativeContextMenuBypass(),
      clearPendingSecondaryPress: () => this.mapClickHandlerService.clearPendingSecondaryPress(),
      openRadiusContextMenuAt: (latlng, x, y) => this.mapContextMenuOpenService.openRadiusContextMenuAt(latlng, x, y),
      clearActiveRadiusSelection: () => this.mapClickHandlerService.clearActiveRadiusSelection(),
      openMarkerContextMenu: (markerKey, event) => this.mapContextMenuOpenService.openMarkerContextMenu(markerKey, event),
      suppressMarkerContextMenuFor: (ms) => this.mapClickHandlerService.suppressMarkerContextMenuFor(ms),
    });

    this.mapViewportCoordinatorService.bind({
      getMap: () => this.map,
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getPhotoMarkerLayer: () => this.photoMarkerLayer,
      getMarkersByMediaId: () => this.markersByMediaId,
      getSelectedMarkerKey: () => this.selectedMarkerKey(),
      setSelectedMarkerKey: (key) => this.state.setSelectedMarkerKey(key),
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      setSelectedMarkerKeys: (keys) => this.state.setSelectedMarkerKeys(keys),
      toMarkerKey: (lat, lng) => this.toMarkerKey(lat, lng),
    });

    this.mapContextMenuHandlerService.bind({
      getMap: () => this.map,
      showMapToast: (key, fallback, type, extra) => this.showMapToast(key, fallback, type, extra),
      showMapToastTitle: (title, type, extra) => this.showMapToastTitle(title, type, extra),
      closeContextMenus: () => this.closeContextMenus(),
      onMapMenuCloseRequested: () => this.onMapMenuCloseRequested(),
      openDetailView: (mediaId) => this.openDetailView(mediaId),
      onDetailAddressSearchRequestConsumed: (requestId) => this.workspacePaneShellHost.onDetailAddressSearchRequestConsumed(requestId),
      handlePhotoMarkerClick: (markerKey) => this.photoMarkerLifecycleService.handlePhotoMarkerClick(markerKey),
      patchDetailMediaId: (id) => this.patchDetailMediaId(id),
      onUploadLocationMapPickRequested: (event) => this.onUploadLocationMapPickRequested(event),
      renderOrUpdateDraftMediaMarker: (latlng) => this.photoMarkerLifecycleService.renderOrUpdateDraftMediaMarker(latlng),
      setPlacementActive: (value) => this.placementActive.set(value),
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getPhotoMarkerLayer: () => this.photoMarkerLayer,
      getMarkersByMediaId: () => this.markersByMediaId,
      getSelectedMarkerKey: () => this.selectedMarkerKey(),
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      getDetailMediaId: () => this.detailMediaId(),
    });

    this.photoMarkerLifecycleService.bind({
      getMap: () => this.map,
      getPhotoMarkerLayer: () => this.photoMarkerLayer,
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getMarkersByMediaId: () => this.markersByMediaId,
      getDraftMediaMarker: () => this.draftMediaMarker(),
      getSelectedMarkerKey: () => this.selectedMarkerKey(),
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      setPhotoPanelOpen: (open) => this.state.setPhotoPanelOpen(open),
      getPhotoPanelOpen: () => this.photoPanelOpen(),
      getWorkspacePaneWidth: () => this.workspacePaneWidth(),
      setWorkspacePaneWidth: (width) => this.state.setWorkspacePaneWidth(width),
      getWorkspacePaneOpeningWidth: () => this.getWorkspacePaneOpeningWidth(),
      setDraftMediaMarker: (marker) => this.state.setDraftMediaMarker(marker),
      setSelectedMarker: (key) => this.markerSelectionService.setSelectedMarker(key),
      setSelectedMarkerKeys: (keys) => this.markerSelectionService.setSelectedMarkerKeys(keys),
      patchDetailMediaId: (id) => this.patchDetailMediaId(id),
      openDetailView: (mediaId) => this.openDetailView(mediaId),
      toMarkerKey: (lat, lng) => this.toMarkerKey(lat, lng),
    });

    this.mapLocationPickService.bind({
      onImageUploaded: (event) => this.onImageUploaded(event),
    });

    this.mapContextMenuOpenService.bind({
      getMap: () => this.map,
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      toMarkerKey: (lat, lng) => this.toMarkerKey(lat, lng),
    });

    this.mapMediaDeleteSyncService.bind({
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
      getPhotoMarkerLayer: () => this.photoMarkerLayer,
      getMarkersByMediaId: () => this.markersByMediaId,
      getSelectedMarkerKey: () => this.selectedMarkerKey(),
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      getDetailMediaId: () => this.detailMediaId(),
      patchDetailMediaId: (id) => this.patchDetailMediaId(id),
    });

    this.mapClickHandlerService.bind({
      getMap: () => this.map,
      getPlacementActive: () => this.placementActive(),
      getSearchPlacementActive: () => this.searchService.searchPlacementActive(),
      getSelectedMarkerKey: () => this.selectedMarkerKey(),
      getSelectedMarkerKeys: () => this.selectedMarkerKeys(),
      getDraftMediaMarker: () => this.draftMediaMarker(),
      getPendingPlacementKey: () => this.pendingPlacementKey,
      setPendingPlacementKey: (key) => { this.pendingPlacementKey = key; },
      setPlacementActive: (value) => this.placementActive.set(value),
      getLastMapMoveAt: () => this.lastMapMoveAt,
      closeContextMenus: () => this.closeContextMenus(),
      openMapContextMenuAt: (latlng, x, y) => this.mapContextMenuOpenService.openMapContextMenuAt(latlng, x, y),
      openRadiusContextMenuAt: (latlng, x, y) => this.mapContextMenuOpenService.openRadiusContextMenuAt(latlng, x, y),
      removeDraftMediaMarker: () => this.photoMarkerLifecycleService.removeDraftMediaMarker(),
      closeUploadPanel: () => this.uploadShellUi.closeUploadPanel(),
      closeWorkspacePane: () => this.workspacePaneShellHost.closeWorkspacePane(),
      placeFile: (key, coords) => this.uploadShellUi.placeFile(key, coords),
      renderOrUpdateSearchLocationMarker: (latlng) => this.searchService.renderOrUpdateLocationMarker(latlng, this.map),
      clearSearchPlacement: () => {
        this.searchService.setPlacementActive(false);
        this.map?.getContainer().classList.remove('map-container--placing');
      },
      clearMapSelectionStateCallbacks: () => {},
      patchDetailMediaId: (id) => this.patchDetailMediaId(id),
      getPendingUploadedLocationMapPick: () => this.pendingUploadedLocationMapPick,
      setPendingUploadedLocationMapPick: (value) => { this.pendingUploadedLocationMapPick = value; },
      onCompleteLocationMapPick: (pick, coords) => {
        void this.mapLocationPickService.applyAndNavigate(pick, coords);
      },
    });

    this.mapMoveEndHandlerService.bind({
      closeContextMenus: () => this.closeContextMenus(),
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
    });

    this.mapViewFlyService.bind({
      getMap: () => this.map,
      getPhotoPanelOpen: () => this.photoPanelOpen(),
      getWorkspacePaneWidth: () => this.workspacePaneWidth(),
    });

    this.searchContext.bind({
      getUploadedPhotoMarkers: () => this.uploadedPhotoMarkers,
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
      this.lastMapMoveAt = Date.now();
      this.mapMoveEndHandlerService.handleMoveEnd();
      this.searchService.updateViewportBounds(this.map);
    });

    this.map.on('idle', () => {
      this.lastMapIdleAt = Date.now();
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

  /**
   * Subscribe to UploadManagerService events for replace/attach photo flows.
   * Updates marker thumbnails without a full viewport refresh.
   */
  private subscribeRouteSessionInvalidation(): void {
    this.uploadManagerSubs.push(
      this.routeSessionCache.shellInvalidated$.subscribe((shellKey) => {
        if (shellKey !== ROUTE_SESSION_SHELL_KEYS.MAP || !this.map) {
          return;
        }

        void this.mapViewportCoordinatorService.queryViewportMarkers();
      }),
    );
  }

  private subscribeToUploadManagerEvents(): void {
    this.uploadManagerSubs.push(
      this.uploadManagerService.imageReplaced$.subscribe((event: ImageReplacedEvent) => {
        this.photoMarkerLifecycleService.handleImageReplaced(event);
      }),
      this.uploadManagerService.imageAttached$.subscribe((event: ImageAttachedEvent) => {
        this.photoMarkerLifecycleService.handleImageAttached(event);
      }),
      // Upload failure toasts are owned by UploadNotificationService (global, deduped).
    );
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

  /**
   * Build a stable key from snapped coordinates the server returns.
   * Uses 7 decimal places (server rounds to 7) so the key matches
   * exactly as long as the same server row is returned.
   */
  private toMarkerKey(lat: number, lng: number): string {
    return `${lat.toFixed(7)}:${lng.toFixed(7)}`;
  }
}
