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
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../../../../core/workspace-pane/workspace-pane-shell-events.types';
import { ExifCoords } from '../../../../core/upload/upload.service';
import {
  UploadManagerService,
  ImageReplacedEvent,
  ImageAttachedEvent,
} from '../../../../core/upload/upload-manager.service';
import { buildLocationUpdateFailureToast } from '../../../../core/media-location-update/location-update-toast.util';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { FilterService } from '../../../../core/filter/filter.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import {
  MediaDownloadService,
  MEDIA_PLACEHOLDER_ICON,
} from '../../../../core/media-download/media-download.service';
import { ToastService } from '../../../../core/toast/toast.service';
import type { ToastOptions, ToastType } from '../../../../core/toast/toast.types';
import { MediaDeleteUndoService } from '../../../../core/media-delete/media-delete-undo.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { MapFilterToolbarComponent } from '../../map-filter-toolbar/map-filter-toolbar.component';
import { SearchQueryContext } from '../../../../core/search/search.models';
import { searchQueryContextsEqual } from '../../../../core/search/search-bar-helpers';
import type { ThumbnailCardHoverEvent } from '../../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { SettingsPaneService } from '../../../../core/settings-pane/settings-pane.service';
import { ROUTE_SESSION_SHELL_KEYS } from '../../../../core/route-session-cache/route-session-cache.keys';
import { RouteSessionCacheService } from '../../../../core/route-session-cache/route-session-cache.service';
import { ProjectSelectDialogComponent } from '../../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../../shared/text-input-dialog/text-input-dialog.component';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../../shared/ui/toggle-group';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/shell/dropdown-shell.component';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../../shared/ui/menu';
import { ActionEngineService } from '../../../../core/action/action-engine.service';
import { ResolvedAction } from '../../../../core/action/action-types';
import {
  buildPhotoMarkerHtml,
  PhotoMarkerZoomLevel,
} from '../../../../core/map/marker-factory';
import { MapShellState } from './map-shell.state';
import { PhotoMarkerState } from '../markers/map-marker-reconcile.facade';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapContextActionsService } from '../context-menu/map-context-actions.service';
import { MapContextMenuHandlerService } from '../context-menu/map-context-menu-handler.service';
import { MapClickHandlerService } from '../handlers/map-click-handler.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { PhotoMarkerIconStateService } from '../markers/photo-marker-icon-state.service';
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
import {
  RadiusDrawingOrchestratorService,
  RADIUS_CLICK_GUARD_MS,
} from '../radius/radius-drawing-orchestrator.service';
import { MapShellBasemapService } from '../leaflet/map-shell-basemap.service';
import {
  MapCircle,
  MapDivIcon,
  MapInstance,
  MapLatLng,
  MapLayerGroup,
  MapMarker,
  MapMouseEvent,
  MapPoint,
  MapPolyline,
  MapLeafletService,
} from '../leaflet/map-leaflet.service';
import { MapFocusPayloadService } from '../context-menu/map-focus-payload.service';
import { MapZoomOrchestratorService } from '../../../../core/map-zoom/map-zoom-orchestrator.service';
import { LocationMapPickNavigationService } from '../../../../core/workspace-pane/location-map-pick-navigation.service';
import { MediaDetailLocationSyncService } from '../../../../core/media-detail-data/media-detail-location-sync.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { DeferredStartupHandles, MapDeferredStartupService } from '../leaflet/map-deferred-startup.service';
import { MapProjectActionsService } from '../workspace/map-project-actions.service';
import { MapProjectDialogService } from '../workspace/map-project-dialog.service';
import { MarkerStateMutationsService } from '../markers/marker-state-mutations.service';
import {
  getFirstMarkerKeyForMedia,
  getMarkerKeysForMedia,
  registerMarkerKeyForMedia,
} from '../markers/marker-media-index.helpers';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import { MediaLocationUpdateService } from '../../../../core/media-location-update/media-location-update.service';
import { MediaLocationsService } from '../../../../core/media-locations/media-locations.service';
import type { SelectedItemsContextPort } from '../../../../core/workspace-pane/workspace-pane-context.port';
import { WORKSPACE_PANE_SHELL_HOST } from '../../../../core/workspace-pane/workspace-pane-shell-host.token';
import type { WorkspacePaneLayoutMapEffects } from '../../../../core/workspace-pane/workspace-pane-layout-map-effects.service';
import { WorkspacePaneLayoutMapEffectsService } from '../../../../core/workspace-pane/workspace-pane-layout-map-effects.service';
import {
  MAP_MENU_ACTION_DEFINITIONS,
  MARKER_MENU_ACTION_DEFINITIONS,
} from '../workspace/map-workspace-actions.registry';
import { RADIUS_SELECTION_ACTION_DEFINITIONS } from '../radius/radius-selection-actions.registry';
import { MapWorkspaceContextResolverService } from '../workspace/map-workspace-context-resolver.service';
import { MapWorkspaceActionExecutorService } from '../workspace/map-workspace-action-executor.service';
import type {
  MapMenuActionId,
  MarkerMenuActionId,
  RadiusActionContext,
  RadiusMenuActionId,
} from '../workspace/map-workspace-actions.types';
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
  private static readonly QUICK_RADIUS_METERS = 250;
  private static readonly HOUSE_PROXIMITY_ZOOM = 19;
  private static readonly STREET_PROXIMITY_ZOOM = 17;
  private static readonly CONTEXT_MENU_SHEET_BREAKPOINT_PX = 768;
  private static readonly WORKSPACE_PANE_DEFAULT_WIDTH = 360;
  private static readonly WORKSPACE_PANE_MIN_WIDTH = 280;
  private static readonly WORKSPACE_PANE_MAX_WIDTH = 640;
  private static readonly MAP_SAFE_MIN_WIDTH = 320;

  readonly placeholderIconUrl = `url("${MEDIA_PLACEHOLDER_ICON}")`;
  /** Template helper: icon/text layout for map style pill options. */
  private readonly uploadManagerService = inject(UploadManagerService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly filterService = inject(FilterService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly toastService = inject(ToastService);
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly settingsPaneService = inject(SettingsPaneService);
  private readonly routeSessionCache = inject(RouteSessionCacheService);
  private readonly state = inject(MapShellState);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly mapContextActionsService = inject(MapContextActionsService);
  private readonly mapContextMenuHandlerService = inject(MapContextMenuHandlerService);
  private readonly mapClickHandlerService = inject(MapClickHandlerService);
  private readonly photoMarkerLifecycleService = inject(PhotoMarkerLifecycleService);
  private readonly photoMarkerIconStateService = inject(PhotoMarkerIconStateService);
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
  private readonly mediaDetailLocationSync = inject(MediaDetailLocationSyncService);
  readonly gpsService = inject(MapShellGpsService);
  readonly searchService = inject(MapShellSearchService);
  private readonly mapDeferredStartupService = inject(MapDeferredStartupService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly workspacePaneShellHost = inject(WORKSPACE_PANE_SHELL_HOST);
  private readonly workspacePaneLayoutMapEffectsService = inject(WorkspacePaneLayoutMapEffectsService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly mediaLocationsService = inject(MediaLocationsService);
  private readonly actionEngineService = inject(ActionEngineService);
  private readonly mapWorkspaceContextResolverService = inject(MapWorkspaceContextResolverService);
  private readonly mapWorkspaceActionExecutorService = inject(MapWorkspaceActionExecutorService);
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
  private locationMapPickReturnUrl: string | null = null;
  private lastLocationMapPickSync: {
    mediaId: string;
    lat: number;
    lng: number;
    locationRowId?: string;
    address?: import('../../../../core/media-location-update/media-location-update.types').MediaLocationAddressPatch;
  } | null = null;

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

  private readonly searchDataCentroid = computed<{ lat: number; lng: number } | undefined>(() => {
    const all = this.workspaceViewService.rawImages();
    const selectedProjectIds = this.workspaceViewService.selectedProjectIds();
    const scoped =
      selectedProjectIds.size > 0
        ? all.filter((img) => img.projectId && selectedProjectIds.has(img.projectId))
        : all;

    const points = scoped
      .filter(
        (img) =>
          typeof img.latitude === 'number' &&
          typeof img.longitude === 'number' &&
          Number.isFinite(img.latitude) &&
          Number.isFinite(img.longitude),
      )
      .map((img) => ({ lat: img.latitude, lng: img.longitude }));

    if (points.length === 0) {
      const pos = this.gpsService.userPosition();
      if (!pos) return undefined;
      return { lat: pos[0], lng: pos[1] };
    }

    const totals = points.reduce(
      (acc, point) => {
        acc.lat += point.lat;
        acc.lng += point.lng;
        return acc;
      },
      { lat: 0, lng: 0 },
    );

    return {
      lat: totals.lat / points.length,
      lng: totals.lng / points.length,
    };
  });

  private readonly searchActiveMarkerCentroid = computed<{ lat: number; lng: number } | undefined>(
    () => {
      const selectedMarkerKey = this.selectedMarkerKey();
      if (!selectedMarkerKey) return undefined;
      const markerState = this.uploadedPhotoMarkers.get(selectedMarkerKey);
      if (!markerState) return undefined;
      return { lat: markerState.lat, lng: markerState.lng };
    },
  );

  readonly searchQueryContext = computed<SearchQueryContext>(
    () => {
      const selectedProjectIds = this.workspaceViewService.selectedProjectIds();
      const activeProjectId =
        selectedProjectIds.size > 0 ? Array.from(selectedProjectIds.values())[0] : undefined;
      const userPos = this.gpsService.userPosition();

      return {
        activeProjectId,
        activeMarkerCentroid: this.searchActiveMarkerCentroid(),
        activeProjectCentroid: this.searchDataCentroid(),
        currentLocation: userPos
          ? {
              lat: userPos[0],
              lng: userPos[1],
            }
          : undefined,
        viewportBounds: this.searchService.searchViewportBounds(),
        dataCentroid: this.searchDataCentroid(),
        countryCodes: this.searchService.searchCountryCodes(),
      };
    },
    { equal: searchQueryContextsEqual },
  );

  // ── Workspace pane / photo panel state ───────────────────────────────────

  /** Whether the workspace pane (photo panel) is open. */
  readonly photoPanelOpen = this.state.photoPanelOpen;

  /** Current workspace pane width in px. Uses restored user preference or design-system default. */
  readonly workspacePaneWidth = this.state.workspacePaneWidth;

  private get viewportWidth() {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  }

  readonly workspacePaneMinWidth = computed(() => this.viewportWidth * 0.25);

  readonly workspacePaneMaxWidth = computed(() => this.viewportWidth * 0.75);

  readonly workspacePaneDefaultWidth = computed(() => this.viewportWidth * 0.618);
  readonly selectedMarkerKey = this.state.selectedMarkerKey;
  readonly selectedMarkerKeys = this.state.selectedMarkerKeys;
  readonly linkedHoveredWorkspaceMediaIds = this.state.linkedHoveredWorkspaceMediaIds;
  readonly mapContextMenuOpen = this.state.mapContextMenuOpen;
  readonly mapContextMenuPosition = this.state.mapContextMenuPosition;
  readonly mapContextMenuCoords = this.state.mapContextMenuCoords;
  readonly mapMenuContext = computed(() =>
    this.mapWorkspaceContextResolverService.resolveMapContext(this.mapContextMenuCoords()),
  );
  readonly mapMenuActions = computed<ReadonlyArray<ResolvedAction<MapMenuActionId>>>(() => {
    const context = this.mapMenuContext();
    if (!context) {
      return [];
    }

    return this.actionEngineService.resolveActions(MAP_MENU_ACTION_DEFINITIONS, context);
  });
  readonly mapPrimaryActions = computed(() =>
    this.mapMenuActions().filter((action) => action.section === 'primary'),
  );
  readonly mapSecondaryActions = computed(() =>
    this.mapMenuActions().filter((action) => action.section === 'secondary'),
  );
  readonly radiusContextMenuOpen = this.state.radiusContextMenuOpen;
  readonly radiusContextMenuPosition = this.state.radiusContextMenuPosition;
  readonly radiusContextMenuCoords = this.state.radiusContextMenuCoords;
  readonly radiusMenuContext = computed<RadiusActionContext>(() => ({
    contextType: 'radius_selection',
    count: this.mapProjectActionsService.getActiveSelectionImageIds(
      this.workspaceViewService.rawImages(),
    ).length,
    mediaIds: this.mapProjectActionsService.getActiveSelectionImageIds(
      this.workspaceViewService.rawImages(),
    ),
  }));
  readonly radiusMenuActions = computed<ReadonlyArray<ResolvedAction<RadiusMenuActionId>>>(() =>
    this.actionEngineService.resolveActions(
      RADIUS_SELECTION_ACTION_DEFINITIONS,
      this.radiusMenuContext(),
    ),
  );
  readonly radiusPrimaryActions = computed(() =>
    this.radiusMenuActions().filter((action) => action.section === 'primary'),
  );
  readonly radiusDestructiveActions = computed(() =>
    this.radiusMenuActions().filter((action) => action.section === 'destructive'),
  );
  readonly markerContextMenuOpen = this.state.markerContextMenuOpen;
  readonly markerContextMenuPosition = this.state.markerContextMenuPosition;
  readonly markerContextMenuPayload = this.state.markerContextMenuPayload;
  readonly markerMenuContext = computed(() =>
    this.mapWorkspaceContextResolverService.resolveMarkerContext(this.markerContextMenuPayload()),
  );
  readonly markerMenuActions = computed<ReadonlyArray<ResolvedAction<MarkerMenuActionId>>>(() => {
    const context = this.markerMenuContext();
    if (!context) {
      return [];
    }

    return this.actionEngineService.resolveActions(MARKER_MENU_ACTION_DEFINITIONS, context);
  });
  readonly markerPrimaryActions = computed(() =>
    this.markerMenuActions().filter((action) => action.section === 'primary'),
  );
  readonly markerSecondaryActions = computed(() =>
    this.markerMenuActions().filter((action) => action.section === 'secondary'),
  );
  readonly markerDestructiveActions = computed(() =>
    this.markerMenuActions().filter((action) => action.section === 'destructive'),
  );
  readonly anyContextMenuOpen = computed(
    () => this.mapContextMenuOpen() || this.radiusContextMenuOpen() || this.markerContextMenuOpen(),
  );
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

  /** Thumbnail URL for the currently selected single marker. */
  readonly selectedMarkerThumbnail = computed(() => {
    const key = this.selectedMarkerKey();
    if (!key) return null;
    const state = this.uploadedPhotoMarkers.get(key);
    return state?.thumbnailUrl ?? null;
  });

  /** DB image UUID for the currently selected single marker. */
  readonly selectedMarkerImageId = computed(() => {
    const key = this.selectedMarkerKey();
    if (!key) return null;
    return this.uploadedPhotoMarkers.get(key)?.mediaId ?? null;
  });

  // ── Private helpers ───────────────────────────────────────────────────────

  private readonly uploadedPhotoMarkers = new Map<
    string,
    PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }
  >();

  /** Timer handle for the moveend debounce. */
  private moveEndDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** Tracks the last zoom level to detect threshold crossings. */
  private lastZoomLevel: PhotoMarkerZoomLevel = 'mid';

  /** LayerGroup for all photo markers — enables batch add/remove. */
  private photoMarkerLayer: MapLayerGroup | null = null;

  /** Set true after first Leaflet init; never cleared on activeShell hide/show. */
  private mapInitialized = false;

  /** True while a zoom animation is in progress — suppresses moveend queries. */
  private zoomAnimating = false;

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
      this.subscribeToMediaDeleteEvents();
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

    if (this.moveEndDebounceTimer) {
      clearTimeout(this.moveEndDebounceTimer);
      this.moveEndDebounceTimer = null;
    }

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
    this.focusMapContainer();
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
    if (!this.isMapMenuNavigationKey(event.key)) {
      return;
    }

    const currentTarget = event.currentTarget as HTMLElement | null;
    const container = currentTarget?.closest('[role="menu"]') as HTMLElement | null;
    if (!container) {
      return;
    }

    const focusableItems = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)'),
    );

    if (focusableItems.length === 0) {
      return;
    }

    event.preventDefault();

    if (this.focusBoundaryMapMenuItem(event.key, focusableItems)) {
      return;
    }

    this.focusAdjacentMapMenuItem(event.key, focusableItems);
  }

  /**
   * Centers the map on (lat, lng) at zoom, visually offsetting for the workspace pane.
   * When the pane is open, Leaflet's center is shifted right by half the pane width so the
   * target point appears centered in the visible (non-pane) map area.
   * @see docs/specs/ui/workspace/workspace-view-system.md
   */
  private setViewWithPaneOffset(
    lat: number,
    lng: number,
    zoom: number,
    options?: Parameters<MapInstance['setView']>[2],
  ): void {
    if (!this.map) return;
    const paneOffset = this.photoPanelOpen() ? this.workspacePaneWidth() / 2 : 0;
    if (paneOffset === 0) {
      this.map.setView([lat, lng], zoom, options);
      return;
    }
    const targetPx = this.map.project([lat, lng], zoom);
    const shiftedPx = targetPx.add([paneOffset, 0]);
    const shiftedLatLng = this.map.unproject(shiftedPx, zoom);
    this.map.setView(shiftedLatLng, zoom, options);
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
    return Math.min(Math.max(width, this.workspacePaneMinWidth()), this.workspacePaneMaxWidth());
  }

  private getWorkspacePaneOpeningWidth(): number {
    return this.clampWorkspacePaneWidth(this.workspacePaneWidth());
  }

  /**
   * Handles the zoomToLocationRequested output from the detail view.
   * Flies the map to the photo's coordinates at a tight zoom and pulses the marker.
   */
  onZoomToLocation(event: {
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }): void {
    if (!this.map) {
      this.mapZoomOrchestrator.deferUntilMapReady({
        mediaId: event.mediaId,
        lat: event.lat,
        lng: event.lng,
        zoomMode: event.zoomMode,
      });
      return;
    }

    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> detail menu supports house/street zoom variants.
    const requestedZoom =
      event.zoomMode === 'house'
        ? MapShellComponent.HOUSE_PROXIMITY_ZOOM
        : event.zoomMode === 'street'
          ? MapShellComponent.STREET_PROXIMITY_ZOOM
          : DETAIL_LOCATION_FOCUS_ZOOM;

    this.zoomHighlightOrchestrator.setPending(event.mediaId, event.lat, event.lng);

    // Keep Leaflet dimensions in sync with the currently visible map area
    // before calculating the fly-to center.
    this.map.invalidateSize();
    this.setViewWithPaneOffset(event.lat, event.lng, requestedZoom, {
      animate: false,
    });

    this.zoomHighlightOrchestrator.waitForMapIdleThenFlushZoomHighlight();

    // Safety flush while waiting for marker query / reconciliation.
    setTimeout(() => this.zoomHighlightOrchestrator.flushPendingZoomHighlight(), 140);

    void this.mapZoomOrchestrator.consumePending();
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
    this.pendingPlacementKey = null;
    this.pendingUploadedLocationMapPick = null;
    this.placementActive.set(false);
    this.searchService.setPlacementActive(false);
    this.map?.getContainer().classList.remove('map-container--placing');
    this.navigateBackAfterLocationMapPick();
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

    this.applySearchMapCenter(event);
  }

  private applySearchMapCenter(event: { lat: number; lng: number; label: string }): void {
    if (!this.map) {
      return;
    }

    this.setViewWithPaneOffset(event.lat, event.lng, MapShellComponent.STREET_PROXIMITY_ZOOM, {
      animate: false,
    });
    this.searchService.updateViewportBounds(this.map);
    this.searchService.renderOrUpdateLocationMarker([event.lat, event.lng], this.map);
    void this.searchService.refreshCountryCode(event.lat, event.lng);
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
      openRadiusContextMenuAt: (latlng, x, y) => this.openRadiusContextMenuAt(latlng, x, y),
      clearActiveRadiusSelection: () => this.clearActiveRadiusSelection(),
      openMarkerContextMenu: (markerKey, event) => this.openMarkerContextMenu(markerKey, event),
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
      openMapContextMenuAt: (latlng, x, y) => this.openMapContextMenuAt(latlng, x, y),
      openRadiusContextMenuAt: (latlng, x, y) => this.openRadiusContextMenuAt(latlng, x, y),
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
        void this.applyUploadedLocationMapPick(pick, coords).then((saved) => {
          if (saved) {
            this.navigateBackAfterLocationMapPick();
          }
        });
      },
    });

    this.searchService.updateViewportBounds(this.map);
    this.applyPendingMapFocus();
    this.applyPendingLocationMapPickNavigation();
    if (this.searchService.pendingSearchMapCenter) {
      this.applySearchMapCenter(this.searchService.pendingSearchMapCenter);
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

    // Suppress viewport queries during zoom animation to avoid rapid
    // fire-and-cancel cycles that cause visible lag.
    this.map.on('zoomstart', () => {
      this.zoomAnimating = true;
    });
    this.map.on('zoomend', () => {
      this.zoomAnimating = false;
    });

    // Debounced moveend: refreshes markers only when zoom-level threshold changes.
    // No marker DOM work during zoom animation — all updates fire after moveend.
    this.map.on('moveend', () => {
      this.lastMapMoveAt = Date.now();
      this.handleMoveEnd();
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

    this.setViewWithPaneOffset(payload.lat, payload.lng, DETAIL_LOCATION_FOCUS_ZOOM);
    this.pendingMapFocus.set(null);
  }

  /** Resume map pick after layout navigated here from /media (or another non-map route). */
  private applyPendingLocationMapPickNavigation(): void {
    const payload = this.pendingLocationMapPickNav();
    if (!payload) {
      return;
    }

    this.pendingLocationMapPickNav.set(null);
    this.locationMapPickReturnUrl = payload.returnUrl;
    this.onUploadLocationMapPickRequested(payload.request);
  }

  private navigateBackAfterLocationMapPick(): void {
    const returnUrl = this.locationMapPickReturnUrl;
    const sync = this.lastLocationMapPickSync;
    if (!returnUrl) {
      return;
    }
    this.locationMapPickReturnUrl = null;
    void this.router.navigateByUrl(returnUrl).then(() => {
      if (!sync) {
        return;
      }
      this.lastLocationMapPickSync = null;
      this.mediaDetailLocationSync.notifyCoordinatesUpdated(
        sync.mediaId,
        sync.lat,
        sync.lng,
        sync.address,
        sync.locationRowId,
      );
    });
  }

  private async applyUploadedLocationMapPick(
    request: UploadLocationMapPickRequest,
    coords: { lat: number; lng: number },
  ): Promise<boolean> {
    const rowId = request.locationRowId;
    let lat: number | undefined;
    let lng: number | undefined;
    let address:
      | import('../../../../core/media-location-update/media-location-update.types').MediaLocationAddressPatch
      | undefined;

    if (rowId) {
      const rowResult = await this.mediaLocationsService.updateFromCoordinates(rowId, coords);
      if (!rowResult.ok) {
        this.toastService.show({
          ...buildLocationUpdateFailureToast(rowResult.error, {
            file: 'map-shell.component.ts',
            fn: 'applyUploadedLocationMapPick',
          }),
        });
        return false;
      }
      if (!('row' in rowResult)) {
        return false;
      }
      const row = rowResult.row;
      if (row.latitude == null || row.longitude == null) {
        this.toastService.show({
          ...buildLocationUpdateFailureToast('Location update failed.', {
            file: 'map-shell.component.ts',
            fn: 'applyUploadedLocationMapPick',
          }),
        });
        return false;
      }
      lat = row.latitude;
      lng = row.longitude;
      address = {
        address_label: row.address_label,
        street: row.street,
        city: row.city,
        district: row.district,
        country: row.country,
      };
    } else {
      const legacyResult = await this.mediaLocationUpdateService.updateFromCoordinates(
        request.mediaId,
        coords,
      );
      if (!legacyResult.ok || typeof legacyResult.lat !== 'number' || typeof legacyResult.lng !== 'number') {
        this.toastService.show({
          ...buildLocationUpdateFailureToast(
            legacyResult.ok ? 'Location update failed.' : legacyResult.error,
            {
              file: 'map-shell.component.ts',
              fn: 'applyUploadedLocationMapPick',
            },
          ),
        });
        return false;
      }
      lat = legacyResult.lat;
      lng = legacyResult.lng;
      address = legacyResult.address;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }

    this.onImageUploaded({ id: request.mediaId, lat, lng });
    this.lastLocationMapPickSync = {
      mediaId: request.mediaId,
      lat,
      lng,
      locationRowId: rowId,
      address,
    };
    this.mediaDetailLocationSync.notifyCoordinatesUpdated(
      request.mediaId,
      lat,
      lng,
      address,
      rowId,
    );
    this.showMapToast('upload.location.update.success', 'Location updated.', 'success');
    return true;
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

  private subscribeToMediaDeleteEvents(): void {
    this.mediaDeleteUndo.mediaDeleted$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ mediaItemIds }) => {
        this.syncMapAfterMediaDeleted(mediaItemIds);
      });

    this.mediaDeleteUndo.mediaRestored$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.mapViewportCoordinatorService.queryViewportMarkers();
      });
  }

  /** Removes optimistic/upload markers and refreshes viewport markers after hard delete. */
  private syncMapAfterMediaDeleted(mediaItemIds: readonly string[]): void {
    if (mediaItemIds.length === 0) {
      return;
    }

    const deleted = new Set(mediaItemIds);
    const removals = new Map<string, string>();

    for (const mediaId of deleted) {
      for (const markerKey of getMarkerKeysForMedia(this.markersByMediaId, mediaId)) {
        removals.set(markerKey, mediaId);
      }
    }

    for (const [markerKey, state] of this.uploadedPhotoMarkers.entries()) {
      if (state.mediaId && deleted.has(state.mediaId) && !removals.has(markerKey)) {
        removals.set(markerKey, state.mediaId);
      }
    }

    for (const [markerKey, mediaId] of removals) {
      this.markerStateMutationsService.removeDeletedPhotoFromMapUi({
        markerKey,
        mediaId,
        uploadedPhotoMarkers: this.uploadedPhotoMarkers,
        photoMarkerLayer: this.photoMarkerLayer,
        markersByMediaId: this.markersByMediaId,
        selectedMarkerKey: this.selectedMarkerKey(),
        selectedMarkerKeys: this.selectedMarkerKeys(),
        detailMediaId: this.detailMediaId(),
        cancelMarkerMoveAnimation: (marker) => this.markerBindingService.cancelMarkerMoveAnimation(marker),
        setSelectedMarker: (key) => this.markerSelectionService.setSelectedMarker(key),
        setSelectedMarkerKeys: (keys) => this.markerSelectionService.setSelectedMarkerKeys(keys),
        setDetailImageId: (id) => this.patchDetailMediaId(id),
      });
    }

    const selectedIds = [...this.workspaceSelectionService.selectedMediaIds()];
    const nextSelected = selectedIds.filter((id) => !deleted.has(id));
    if (nextSelected.length !== selectedIds.length) {
      if (nextSelected.length === 0) {
        this.workspaceSelectionService.clearSelection();
      } else {
        this.workspaceSelectionService.selectAllInScope(nextSelected);
      }
    }

    void this.mapViewportCoordinatorService.queryViewportMarkers();
  }

  /**
   * Debounced handler for the Leaflet `moveend` event.
   * Fires a viewport query on every moveend (pan or zoom) so the
   * marker set always matches the visible area + zoom-level grid.
   */
  private handleMoveEnd(): void {
    if (this.moveEndDebounceTimer) {
      clearTimeout(this.moveEndDebounceTimer);
    }

    this.moveEndDebounceTimer = setTimeout(() => this.handleMoveEndDebounced(), 350);
  }

  private handleMoveEndDebounced(): void {
    this.moveEndDebounceTimer = null;

    // Skip query if still in a zoom animation — it'll fire after zoomend.
    if (this.zoomAnimating) return;

    const currentZoom = this.markerRenderService.getPhotoMarkerZoomLevel();
    this.closeContextMenus();
    const zoomChanged = currentZoom !== this.lastZoomLevel;

    if (!this.isViewportStillInFetchedBuffer(zoomChanged)) {
      void this.mapViewportCoordinatorService.queryViewportMarkers();
    }

    // Refresh existing marker icons if zoom-level threshold changed.
    if (zoomChanged) {
      this.lastZoomLevel = currentZoom;
      for (const markerKey of this.uploadedPhotoMarkers.keys()) {
        this.markerRenderService.refreshPhotoMarker(markerKey);
      }
    }
  }

  private isViewportStillInFetchedBuffer(zoomChanged: boolean): boolean {
    return this.mapViewportCoordinatorService.isViewportStillInFetchedBuffer(zoomChanged);
  }

  /**
   * Lazy-load thumbnails for single-image markers visible in the current viewport.
   * Fires for all zoom levels — single-image markers always show a photo.
   * Only requests signed URLs for markers without a URL yet, and proactively
   * refreshes URLs older than 50 minutes.
   */
  private openMapContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.state.setRadiusContextMenuOpen(false);
    this.state.setMarkerContextMenuOpen(false);
    this.state.setMapContextMenuCoords({ lat: latlng.lat, lng: latlng.lng });
    this.state.setMapContextMenuPosition(position);
    this.state.setMapContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.mapClickHandlerService.suppressMapClickFor(RADIUS_CLICK_GUARD_MS);
  }

  private openRadiusContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.state.setMapContextMenuOpen(false);
    this.state.setMarkerContextMenuOpen(false);
    this.state.setRadiusContextMenuCoords({ lat: latlng.lat, lng: latlng.lng });
    this.state.setRadiusContextMenuPosition(position);
    this.state.setRadiusContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.mapClickHandlerService.suppressMapClickFor(RADIUS_CLICK_GUARD_MS);
  }

  private openMarkerContextMenu(markerKey: string, sourceEvent?: MouseEvent | PointerEvent): void {
    const state = this.uploadedPhotoMarkers.get(markerKey);
    if (!state) return;
    const position = this.mapContextActionsService.resolveMarkerContextMenuPosition(
      state,
      sourceEvent,
      this.map,
    );

    this.state.setMapContextMenuOpen(false);
    this.state.setRadiusContextMenuOpen(false);
    this.state.setMarkerContextMenuPosition(position);
    const selectedMarkerKeys = this.selectedMarkerKeys();
    const isMultiSelection = selectedMarkerKeys.size > 1 && selectedMarkerKeys.has(markerKey);

    if (isMultiSelection) {
      const multiStates = Array.from(selectedMarkerKeys)
        .map((key) => this.uploadedPhotoMarkers.get(key))
        .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate);

      const combinedSourceCells = Array.from(
        new Map(
          multiStates
            .flatMap((marker) => marker.sourceCells ?? [{ lat: marker.lat, lng: marker.lng }])
            .map((cell) => [this.toMarkerKey(cell.lat, cell.lng), cell]),
        ).values(),
      );

      const combinedCount = multiStates.reduce((sum, marker) => sum + Math.max(1, marker.count), 0);

      this.state.setMarkerContextMenuPayload({
        markerKey,
        count: combinedCount,
        lat: state.lat,
        lng: state.lng,
        isMultiSelection: true,
        sourceCells: combinedSourceCells,
      });
    } else {
      this.state.setMarkerContextMenuPayload({
        markerKey,
        count: state.count,
        lat: state.lat,
        lng: state.lng,
        mediaId: state.mediaId,
        isMultiSelection: false,
        sourceCells: state.sourceCells ?? [{ lat: state.lat, lng: state.lng }],
      });
    }

    this.state.setMarkerContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.mapClickHandlerService.suppressMapClickFor(RADIUS_CLICK_GUARD_MS);
  }

  private focusMapContainer(): void {
    const mapContainer = this.mapContainerRef()?.nativeElement;
    mapContainer?.focus();
  }

  private focusFirstOpenMapMenuItem(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const firstItem = document.querySelector<HTMLButtonElement>(
        '.map-context-menu button[role="menuitem"]',
      );
      firstItem?.focus();
    });
  }

  private isMapMenuNavigationKey(key: string): boolean {
    return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End';
  }

  private focusBoundaryMapMenuItem(key: string, focusableItems: HTMLButtonElement[]): boolean {
    if (key === 'Home') {
      focusableItems[0]?.focus();
      return true;
    }

    if (key === 'End') {
      focusableItems[focusableItems.length - 1]?.focus();
      return true;
    }

    return false;
  }

  private focusAdjacentMapMenuItem(key: string, focusableItems: HTMLButtonElement[]): void {
    const activeIndex = focusableItems.findIndex((item) => item === document.activeElement);
    const fallbackIndex = key === 'ArrowDown' ? -1 : 0;
    const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
    const delta = key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + delta + focusableItems.length) % focusableItems.length;
    focusableItems[nextIndex]?.focus();
  }

  private clearActiveRadiusSelection(): void {
    this.radiusDrawingService.clearSelectionVisuals();
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.patchDetailMediaId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
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
