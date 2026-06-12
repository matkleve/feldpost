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
import { GeocodingService } from '../../../../core/geocoding/geocoding.service';
import {
  UploadManagerService,
  ImageReplacedEvent,
  ImageAttachedEvent,
} from '../../../../core/upload/upload-manager.service';
import { buildLocationUpdateFailureToast } from '../../../../core/media-location-update/location-update-toast.util';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import {
  MediaDownloadService,
  MEDIA_PLACEHOLDER_ICON,
} from '../../../../core/media-download/media-download.service';
import { ToastService } from '../../../../core/toast/toast.service';
import { MediaDeleteUndoService } from '../../../../core/media-delete/media-delete-undo.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import { SearchBarComponent } from '../../search-bar/search-bar.component';
import { SearchQueryContext } from '../../../../core/search/search.models';
import type { ThumbnailCardHoverEvent } from '../../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { SettingsPaneService } from '../../../../core/settings-pane/settings-pane.service';
import { MapSessionCacheService } from '../../../../core/map-session-cache/map-session-cache.service';
import { ROUTE_SESSION_SHELL_KEYS } from '../../../../core/route-session-cache/route-session-cache.keys';
import { RouteSessionCacheService } from '../../../../core/route-session-cache/route-session-cache.service';
import type {
  MapSessionSnapshot,
  MapViewportMarkerRow,
} from '../../../../core/map-session-cache/map-session-cache.types';
import { ProjectSelectDialogComponent } from '../../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../../shared/text-input-dialog/text-input-dialog.component';
import { BrnToggleGroupImports, type ToggleValue } from '@spartan-ng/brain/toggle-group';
import { HLM_TOGGLE_GROUP_IMPORTS } from '../../../../shared/ui/toggle-group';
import type { ToggleGroupOption } from '../../../../shared/ui/toggle-group/toggle-group-option.types';
import { toggleSingleStringValue } from '../../../../shared/ui/toggle-group/toggle-group-option.helpers';
import { DropdownShellComponent } from '../../../../shared/dropdown-trigger/dropdown-shell.component';
import { HlmMenuItemDirective, HlmMenuSeparatorDirective } from '../../../../shared/ui/menu';
import { ActionEngineService } from '../../../../core/action/action-engine.service';
import { ResolvedAction } from '../../../../core/action/action-types';
import { fileTypeBadge } from '../../../../core/media/file-type-registry';
import {
  buildPhotoMarkerHtml,
  PHOTO_MARKER_ICON_SIZE,
  PhotoMarkerZoomLevel,
} from '../../../../core/map/marker-factory';
import { MapShellState } from './map-shell.state';
import { DetailZoomHighlightService } from '../markers/detail-zoom-highlight.service';
import { MarkerInteractionService } from '../markers/marker-interaction.service';
import { ViewportMarkerQueryService } from '../markers/viewport-marker-query.service';
import {
  MapMarkerReconcileFacade,
  PhotoMarkerState,
  ReconcileDependencies,
  ReconcileIncomingRow,
} from '../markers/map-marker-reconcile.facade';
import { MapMarkerClusterMergeService } from '../markers/map-marker-cluster-merge.service';
import { MapMarkerReuseStrategyService } from '../markers/map-marker-reuse-strategy.service';
import { RadiusSelectionService } from '../radius/radius-selection.service';
import { ZoomTargetMarkerService } from '../markers/zoom-target-marker.service';
import { RadiusCommittedVisual, RadiusVisualsService } from '../radius/radius-visuals.service';
import { RadiusDraftHighlightService } from '../radius/radius-draft-highlight.service';
import {
  MapContextActionsService,
  type RemoveImagesFromProjectsResult,
} from '../context-menu/map-context-actions.service';
import { MarkerContextPhotoDeleteService } from '../markers/marker-context-photo-delete.service';
import { PhotoMarkerIconStateService } from '../markers/photo-marker-icon-state.service';
import { MarkerSelectionSyncService } from '../markers/marker-selection-sync.service';
import { MarkerMotionService } from '../markers/marker-motion.service';
import { MapBasemapPreference, MapPreferencesService } from '../leaflet/map-preferences.service';
import { MapBasemapLayerService } from '../leaflet/map-basemap-layer.service';
import {
  MapCircle,
  MapDivIcon,
  MapInstance,
  MapLatLng,
  MapLatLngBounds,
  MapLayerGroup,
  MapMarker,
  MapMouseEvent,
  MapPoint,
  MapPolyline,
  MapTileLayer,
  MapLeafletService,
} from '../leaflet/map-leaflet.service';
import { MapFocusPayloadService } from '../context-menu/map-focus-payload.service';
import { MapZoomOrchestratorService } from '../../../../core/map-zoom/map-zoom-orchestrator.service';
import { LocationMapPickNavigationService } from '../../../../core/workspace-pane/location-map-pick-navigation.service';
import { MediaDetailLocationSyncService } from '../../../../core/media-detail-data/media-detail-location-sync.service';
import { MapGeolocationService } from '../leaflet/map-geolocation.service';
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
import { LocationResolverService } from '../../../../core/location-resolver/location-resolver.service';
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

type MarkerMotionPreference = 'off' | 'smooth';
type MapViewMode = 'street' | 'photo';

type ViewportMarkerRow = {
  cluster_lat: number;
  cluster_lng: number;
  image_count: number;
  image_id: string | null;
  media_item_id?: string | null;
  location_id?: string | null;
  direction: number | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  created_at: string | null;
};

type MergedViewportRow = ViewportMarkerRow & { sourceCells: Array<{ lat: number; lng: number }> };

type MarkerRenderSnapshot = {
  count: number;
  thumbnailUrl?: string;
  thumbnailLoading?: boolean;
  fallbackLabel?: string;
  direction?: number;
  corrected?: boolean;
  uploading?: boolean;
  selected: boolean;
  linkedHover: boolean;
  zoomLevel: PhotoMarkerZoomLevel;
};

const MAP_MARKER_MOTION_STORAGE_KEY = 'sitesnap.settings.map.markerMotion';
const MAP_MARKER_MOTION_EVENT = 'sitesnap:map-marker-motion-changed';
const MAP_BASEMAP_STORAGE_KEY = 'sitesnap.settings.map.basemap';

@Component({
  selector: 'app-map-shell',
  imports: [
    SearchBarComponent,
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
  private static readonly GPS_TRACKING_INTERVAL_MS = 60000;
  private static readonly GPS_RECENTER_MIN_ZOOM = 16;
  private static readonly PLACEMENT_CLICK_GUARD_MS = 220;
  private static readonly DETAIL_LOCATION_FOCUS_ZOOM = 21;
  private static readonly DETAIL_LOCATION_MARKER_PULSE_MS = 1500;
  private static readonly DETAIL_LOCATION_HIGHLIGHT_RETRY_MS = 120;
  private static readonly DETAIL_LOCATION_HIGHLIGHT_MAX_RETRIES = 50;
  private static readonly DETAIL_LOCATION_RENDER_SETTLE_MS = 180;
  private static readonly DETAIL_LOCATION_CLUSTER_FALLBACK_MAX_METERS = 260;
  private static readonly DETAIL_LOCATION_WAIT_FOR_SINGLE_MS = 2800;
  private static readonly DETAIL_LOCATION_IDLE_FALLBACK_MS = 1400;
  private static readonly DETAIL_LOCATION_PENDING_TTL_MS = 12000;
  private static readonly MARKER_MOVE_DURATION_MS = 320;
  private static readonly RADIUS_SELECTION_MIN_METERS = 10;
  private static readonly RADIUS_CLICK_GUARD_MS = 220;
  private static readonly CONTEXT_MENU_DRAG_THRESHOLD_PX = 8;
  private static readonly CONTEXT_MENU_NATIVE_HANDSHAKE_MS = 2000;
  private static readonly CONTEXT_MENU_NATIVE_HANDSHAKE_PX = 24;
  private static readonly CONTEXT_MENU_NATIVE_BYPASS_TTL_MS = 250;
  private static readonly MARKER_CONTEXT_MENU_SUPPRESS_MS = 320;
  private static readonly QUICK_RADIUS_METERS = 250;
  private static readonly HOUSE_PROXIMITY_ZOOM = 19;
  private static readonly STREET_PROXIMITY_ZOOM = 17;
  private static readonly CONTEXT_MENU_SHEET_BREAKPOINT_PX = 768;
  private static readonly MARKER_LONG_PRESS_MS = 500;
  private static readonly WORKSPACE_PANE_DEFAULT_WIDTH = 360;
  private static readonly WORKSPACE_PANE_MIN_WIDTH = 280;
  private static readonly WORKSPACE_PANE_MAX_WIDTH = 640;
  private static readonly MAP_SAFE_MIN_WIDTH = 320;

  readonly placeholderIconUrl = `url("${MEDIA_PLACEHOLDER_ICON}")`;
  /** Template helper: icon/text layout for map style pill options. */
  private readonly geocodingService = inject(GeocodingService);
  private readonly uploadManagerService = inject(UploadManagerService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly toastService = inject(ToastService);
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly settingsPaneService = inject(SettingsPaneService);
  private readonly mapSessionCache = inject(MapSessionCacheService);
  private readonly routeSessionCache = inject(RouteSessionCacheService);
  private readonly state = inject(MapShellState);
  private readonly detailZoomHighlightService = inject(DetailZoomHighlightService);
  private readonly markerInteractionService = inject(MarkerInteractionService);
  private readonly viewportMarkerQueryService = inject(ViewportMarkerQueryService);
  private readonly mapMarkerReconcileFacade = inject(MapMarkerReconcileFacade);
  private readonly mapMarkerClusterMergeService = inject(MapMarkerClusterMergeService);
  private readonly radiusSelectionService = inject(RadiusSelectionService);
  private readonly mapMarkerReuseStrategyService = inject(MapMarkerReuseStrategyService);
  private readonly zoomTargetMarkerService = inject(ZoomTargetMarkerService);
  private readonly radiusVisualsService = inject(RadiusVisualsService);
  private readonly radiusDraftHighlightService = inject(RadiusDraftHighlightService);
  private readonly mapContextActionsService = inject(MapContextActionsService);
  private readonly markerContextPhotoDeleteService = inject(MarkerContextPhotoDeleteService);
  private readonly photoMarkerIconStateService = inject(PhotoMarkerIconStateService);
  private readonly markerMotionService = inject(MarkerMotionService);
  private readonly markerSelectionSyncService = inject(MarkerSelectionSyncService);
  private readonly mapPreferencesService = inject(MapPreferencesService);
  private readonly mapBasemapLayerService = inject(MapBasemapLayerService);
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly mapFocusPayloadService = inject(MapFocusPayloadService);
  private readonly mapZoomOrchestrator = inject(MapZoomOrchestratorService);
  private readonly locationMapPickNavigationService = inject(LocationMapPickNavigationService);
  private readonly mediaDetailLocationSync = inject(MediaDetailLocationSyncService);
  private readonly mapGeolocationService = inject(MapGeolocationService);
  private readonly mapDeferredStartupService = inject(MapDeferredStartupService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly workspacePaneShellHost = inject(WORKSPACE_PANE_SHELL_HOST);
  private readonly workspacePaneLayoutMapEffectsService = inject(WorkspacePaneLayoutMapEffectsService);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly mediaLocationsService = inject(MediaLocationsService);
  private readonly locationResolverService = inject(LocationResolverService);
  private readonly actionEngineService = inject(ActionEngineService);
  private readonly mapWorkspaceContextResolverService = inject(MapWorkspaceContextResolverService);
  private readonly mapWorkspaceActionExecutorService = inject(MapWorkspaceActionExecutorService);
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
  readonly searchPlacementActive = signal(false);
  private readonly searchViewportBounds = signal<
    { north: number; east: number; south: number; west: number } | undefined
  >(undefined);
  private readonly searchCountryCodes = signal<string[] | undefined>(undefined);

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
      const pos = this.userPosition();
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

  readonly searchQueryContext = computed<SearchQueryContext>(() => {
    const selectedProjectIds = this.workspaceViewService.selectedProjectIds();
    const activeProjectId =
      selectedProjectIds.size > 0 ? Array.from(selectedProjectIds.values())[0] : undefined;
    const userPos = this.userPosition();

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
      viewportBounds: this.searchViewportBounds(),
      dataCentroid: this.searchDataCentroid(),
      countryCodes: this.searchCountryCodes(),
    };
  });

  // ── GPS state ────────────────────────────────────────────────────────────

  /**
   * User's GPS position, populated after geolocation resolves.
   * Null when geolocation is denied/unavailable or not yet resolved.
   */
  readonly userPosition = signal<[number, number] | null>(null);

  /** True while waiting for a GPS fix after pressing the button. */
  readonly gpsLocating = signal(false);
  /** True when GPS tracking mode is enabled via the toggle button. */
  readonly gpsTrackingActive = signal(false);
  readonly mapBasemap = signal<MapBasemapPreference>(
    this.mapPreferencesService.readBasemapPreference(MAP_BASEMAP_STORAGE_KEY),
  );
  readonly mapViewOptions = computed<ReadonlyArray<ToggleGroupOption>>(() => [
    {
      id: 'street',
      label: 'Street',
      icon: 'map',
      ariaLabel: 'Street map',
      title: 'Street map',
    },
    {
      id: 'photo',
      label: 'Photo',
      icon: 'satellite_alt',
      ariaLabel: 'Photo map',
      title: 'Photo map',
    },
  ]);
  readonly mapViewMode = computed<MapViewMode>(() => {
    if (this.mapBasemap() === 'satellite') {
      return 'photo';
    }
    return 'street';
  });

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

  private userLocationMarker: MapMarker | null = null;
  private searchLocationMarker: MapMarker | null = null;
  private searchLocationPreviewMarkers: MapMarker[] = [];
  private draftMediaMarkerLeaflet: MapMarker | null = null;
  private readonly uploadedPhotoMarkers = new Map<
    string,
    PhotoMarkerState & {
      /** Snapshot of the last rendered state for dirty-checking. */
      lastRendered?: {
        count: number;
        thumbnailUrl?: string;
        thumbnailLoading?: boolean;
        fallbackLabel?: string;
        direction?: number;
        corrected?: boolean;
        uploading?: boolean;
        selected: boolean;
        linkedHover: boolean;
        zoomLevel: PhotoMarkerZoomLevel;
      };
    }
  >();

  /** Timer handle for the moveend debounce. */
  private moveEndDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  /** AbortController for in-flight viewport queries. */
  private viewportQueryController: AbortController | null = null;

  /** Tracks the last zoom level to detect threshold crossings. */
  private lastZoomLevel: PhotoMarkerZoomLevel = 'mid';

  /** LayerGroup for all photo markers — enables batch add/remove. */
  private photoMarkerLayer: MapLayerGroup | null = null;
  private activeBaseTileLayer: MapTileLayer | null = null;
  private radiusDrawStartLatLng: MapLatLng | null = null;
  private radiusDrawActive = false;
  private radiusDrawAdditive = false;
  private radiusDraftLine: MapPolyline | null = null;
  private radiusDraftCircle: MapCircle | null = null;
  private radiusDraftLabel: MapMarker | null = null;
  private radiusDrawMoveHandler: ((event: MapMouseEvent) => void) | null = null;
  private radiusDrawMouseUpHandler: ((event: MapMouseEvent) => void) | null = null;
  private pendingSecondaryPress: {
    startPoint: MapPoint;
    startLatLng: MapLatLng;
    startClientX: number;
    startClientY: number;
    additive: boolean;
  } | null = null;
  private radiusDraftHighlightedKeys = new Set<string>();
  private readonly radiusCommittedVisuals: RadiusCommittedVisual[] = [];
  private suppressMapClickUntil = 0;
  private lastSecondaryContextClickAt: number | null = null;
  private lastSecondaryContextClickPos: { x: number; y: number } | null = null;
  private nativeContextMenuBypassUntil = 0;
  private markerContextMenuSuppressUntil = 0;

  /**
   * Bounds that were last fetched (including 10% buffer).
   * Used to skip RPC when the viewport is still within the buffered area.
   */
  private lastFetchedBounds: MapLatLngBounds | null = null;
  private lastFetchedZoom: number | null = null;
  /** Last viewport RPC payload — persisted to session cache on destroy. */
  private lastViewportRpcRows: ViewportMarkerRow[] | null = null;
  private isRestoringFromSessionCache = false;
  /** Set true after first Leaflet init; never cleared on activeShell hide/show. */
  private mapInitialized = false;

  /** True while a zoom animation is in progress — suppresses moveend queries. */
  private zoomAnimating = false;

  /**
   * Secondary index: mediaId → markerKey for O(1) lookups when
   * handling upload manager events (replace, attach).
   */
  private readonly markersByMediaId = new Map<string, string[]>();
  private readonly markerMotionPreference = signal<MarkerMotionPreference>('smooth');
  private readonly markerMotionEventHandler = (event: Event): void => {
    const detail = (event as CustomEvent<{ markerMotion?: MarkerMotionPreference }>).detail;
    const candidate = detail?.markerMotion;
    if (candidate === 'off' || candidate === 'smooth') {
      this.markerMotionPreference.set(candidate);
      return;
    }
    this.markerMotionPreference.set(
      this.markerMotionService.readMarkerMotionPreference(MAP_MARKER_MOTION_STORAGE_KEY),
    );
  };
  private readonly mapContainerContextMenuHandler = (event: MouseEvent): void => {
    if (event.button !== 2) {
      return;
    }

    if (this.isMarkerDomTarget(event)) {
      // Keep native browser menu suppressed, but let marker listeners receive
      // the event so marker context actions can open reliably.
      event.preventDefault();
      return;
    }

    if (this.shouldAllowNativeContextMenu(event)) {
      this.nativeContextMenuBypassUntil =
        Date.now() + MapShellComponent.CONTEXT_MENU_NATIVE_BYPASS_TTL_MS;
      this.pendingSecondaryPress = null;
      this.closeContextMenus();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  /** Subscriptions for upload manager events — cleaned up in ngOnDestroy. */
  private uploadManagerSubs: { unsubscribe(): void }[] = [];
  private readonly deferredStartupHandles: DeferredStartupHandles = {
    rafId: null,
    startupTimer: null,
    markerBootstrapTimer: null,
  };
  private userLocationFoundTimer: ReturnType<typeof setTimeout> | null = null;
  private gpsTrackingTimer: ReturnType<typeof setInterval> | null = null;
  private lastMapMoveAt = 0;
  private lastMapIdleAt = 0;
  private activeWorkspaceHover: ThumbnailCardHoverEvent | null = null;
  private linkedHoverMarkerFromWorkspaceKey: string | null = null;
  private linkedHoverMarkerFromMapKey: string | null = null;
  private pendingZoomHighlight: {
    mediaId: string;
    lat: number;
    lng: number;
    requestedAt: number;
  } | null = null;
  private workspacePaneMapEffectsRegistration: WorkspacePaneLayoutMapEffects | null = null;
  private readonly mapSelectedItemsContext: SelectedItemsContextPort = {
    contextKey: 'map',
    selectedMediaIds$: this.workspaceSelectionService.selectedMediaIds,
    requestOpenDetail: (mediaId: string) => this.openDetailView(mediaId),
    requestSetHover: (mediaId: string | null) => {
      if (!mediaId) {
        this.setLinkedHoverMarkerFromWorkspace(null);
        return;
      }
      this.setLinkedHoverMarkerFromWorkspace(getFirstMarkerKeyForMedia(this.markersByMediaId, mediaId) ?? null);
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

    afterNextRender(() => {
      const isJsdom =
        typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
      if (isJsdom) {
        return;
      }

      if (this.mapInitialized) {
        return;
      }

      this.markerMotionPreference.set(
        this.markerMotionService.readMarkerMotionPreference(MAP_MARKER_MOTION_STORAGE_KEY),
      );
      window.addEventListener(MAP_MARKER_MOTION_EVENT, this.markerMotionEventHandler);
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
    this.persistMapSessionCache();
    this.destroyMapInstance();
  }

  private cleanupGpsAndTracking(): void {
    this.gpsLocating.set(false);
    this.stopGpsTracking();

    if (this.userLocationFoundTimer) {
      clearTimeout(this.userLocationFoundTimer);
      this.userLocationFoundTimer = null;
    }
  }

  private cleanupDeferredAndQueryState(): void {
    this.cancelDeferredStartupWork();

    if (this.moveEndDebounceTimer) {
      clearTimeout(this.moveEndDebounceTimer);
      this.moveEndDebounceTimer = null;
    }

    this.viewportQueryController?.abort();
    this.viewportQueryController = null;
  }

  private detachGlobalListeners(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(MAP_MARKER_MOTION_EVENT, this.markerMotionEventHandler);
    }
  }

  private cleanupMarkerLayersAndCaches(): void {
    this.markerStateMutationsService.cleanupMarkerLayersAndCaches({
      uploadedPhotoMarkers: this.uploadedPhotoMarkers,
      photoMarkerLayer: this.photoMarkerLayer,
      markersByMediaId: this.markersByMediaId,
      cancelMarkerMoveAnimation: (marker) => this.cancelMarkerMoveAnimation(marker),
    });
  }

  private cleanupUploadManagerSubscriptions(): void {
    for (const sub of this.uploadManagerSubs) {
      sub.unsubscribe();
    }
    this.uploadManagerSubs = [];
  }

  private cleanupMapUiState(): void {
    this.removeUserLocationMarker();
    this.removeDraftMediaMarker();
    this.clearSearchLocationMarker();
    this.cancelRadiusDrawing();
    this.pendingSecondaryPress = null;
    this.closeContextMenus();
    this.mapProjectDialogService.closeAllDialogs(this.state);
    this.clearRadiusSelectionVisuals();
  }

  private destroyMapInstance(): void {
    const mapContainer = this.map?.getContainer();
    if (mapContainer) {
      mapContainer.removeEventListener('contextmenu', this.mapContainerContextMenuHandler, true);
    }
    this.map?.remove();
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

  onMapContextCreateMarkerHere(): void {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;
    this.state.setDraftMediaMarker({ lat: coords.lat, lng: coords.lng, uploadCount: 0 });
    this.renderOrUpdateDraftMediaMarker([coords.lat, coords.lng]);
    this.searchPlacementActive.set(false);
    this.placementActive.set(false);
    if (!this.photoPanelOpen()) {
      this.state.setWorkspacePaneWidth(this.getWorkspacePaneOpeningWidth());
    }
    this.state.setPhotoPanelOpen(true);
    this.patchDetailMediaId(null);
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.uploadShellUi.openUploadPanel();
    this.map?.getContainer().classList.remove('map-container--placing');
    this.toastService.show({
      message: 'Media Marker erstellt. Upload starten.',
      type: 'success',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  onMapContextZoomHouseHere(): void {
    const coords = this.mapContextMenuCoords();
    if (!coords || !this.map) return;
    this.map.setView([coords.lat, coords.lng], MapShellComponent.HOUSE_PROXIMITY_ZOOM);
    this.onMapMenuCloseRequested();
  }

  onMapContextZoomStreetHere(): void {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;
    this.zoomContextTo(coords.lat, coords.lng, MapShellComponent.STREET_PROXIMITY_ZOOM);
    this.onMapMenuCloseRequested();
  }

  private zoomContextTo(lat: number, lng: number, zoomLevel: number): void {
    if (!this.map) {
      return;
    }

    this.map.setView([lat, lng], zoomLevel);
  }

  private async copyAddressWithFeedback(lat: number, lng: number): Promise<void> {
    const copied = await this.mapContextActionsService.copyAddressFromCoords(lat, lng);
    if (copied) {
      this.toastService.show({ message: 'Adresse kopiert.', type: 'success', dedupe: true });
      return;
    }

    this.toastService.show({
      message: this.t(
        'workspace.export.error.addressNotFound',
        'Address could not be resolved.',
      ),
      type: 'warning',
      dedupe: true,
    });
  }

  private async copyGpsWithFeedback(lat: number, lng: number): Promise<void> {
    const text = this.mapContextActionsService.formatGps(lat, lng);
    const copied = await this.mapContextActionsService.copyTextToClipboard(text);
    this.toastService.show({
      message: copied ? 'GPS kopiert.' : text,
      type: copied ? 'success' : 'info',
      dedupe: true,
    });
  }

  private openGoogleMapsForCoords(lat: number, lng: number): void {
    if (typeof window === 'undefined') {
      return;
    }

    const url = this.mapContextActionsService.buildGoogleMapsUrl(lat, lng);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async onMapContextCopyAddress(): Promise<void> {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;

    await this.copyAddressWithFeedback(coords.lat, coords.lng);
    this.onMapMenuCloseRequested();
  }

  async onMapContextCopyGps(): Promise<void> {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;
    await this.copyGpsWithFeedback(coords.lat, coords.lng);
    this.onMapMenuCloseRequested();
  }

  onMapContextOpenGoogleMaps(): void {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;
    this.openGoogleMapsForCoords(coords.lat, coords.lng);
    this.onMapMenuCloseRequested();
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

  // Backwards-compatible wrappers kept for existing tests and call sites.
  onMapContextCenterHere(): void {
    this.onMapContextZoomStreetHere();
  }

  async onMapContextCopyCoordinates(): Promise<void> {
    await this.onMapContextCopyGps();
  }

  async onMapContextStartRadiusFromHere(): Promise<void> {
    const coords = this.mapContextMenuCoords();
    if (!coords || !this.map) return;

    const center = this.mapLeafletService.createLatLng(coords.lat, coords.lng);
    const radiusMeters = MapShellComponent.QUICK_RADIUS_METERS;
    const edge = this.radiusVisualsService.offsetLatLngEast(center, radiusMeters);

    this.clearRadiusSelectionVisuals();
    this.addRadiusSelectionVisual(center, radiusMeters, edge);
    await this.selectRadiusImages(center, radiusMeters, false);
    this.onMapMenuCloseRequested();
  }

  async onRadiusContextCreateProjectFromSelection(): Promise<void> {
    const mediaIds = this.radiusMenuContext().mediaIds;
    if (mediaIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien in Radius-Auswahl verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    const projectName = await this.promptProjectNameFromRadius();
    if (!projectName) {
      this.closeContextMenus();
      return;
    }

    const created = await this.mapProjectActionsService.createProjectFromFirstImage({
      projectName,
      firstImageId: mediaIds[0],
    });
    if (!created.ok || !created.project) {
      if (created.reason === 'organization-missing') {
        this.toastService.show({
          message: 'Projekt konnte nicht erstellt werden (Organisation unbekannt).',
          type: 'error',
          dedupe: true,
        });
      } else {
        this.toastService.show({
          message: created.errorMessage ?? 'Projekt konnte nicht erstellt werden.',
          type: 'error',
          dedupe: true,
        });
      }
      this.closeContextMenus();
      return;
    }

    const assigned = await this.mapContextActionsService.assignImagesToProject(
      mediaIds,
      created.project.id,
    );
    const assignFailureMessage =
      this.mapProjectActionsService.getAssignmentFailureMessage(assigned);
    if (assignFailureMessage) {
      this.toastService.show({
        message: assignFailureMessage,
        type: assigned.reason === 'empty' ? 'warning' : 'error',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    this.toastService.show({
      message: `Projekt "${created.project.name}" erstellt und ${mediaIds.length} Medien zugewiesen.`,
      type: 'success',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  async onRadiusContextAssignToProject(): Promise<void> {
    const mediaIds = this.radiusMenuContext().mediaIds;
    if (mediaIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien in Radius-Auswahl verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    const project = await this.promptProjectSelection();
    if (!project) {
      this.closeContextMenus();
      return;
    }

    const assigned = await this.mapContextActionsService.assignImagesToProject(mediaIds, project.id);
    const assignFailureMessage =
      this.mapProjectActionsService.getAssignmentFailureMessage(assigned);
    if (!assignFailureMessage) {
      this.toastService.show({
        message: this.mapProjectActionsService.formatProjectAssignmentSuccess(
          project.name,
          mediaIds.length,
        ),
        type: 'success',
        dedupe: true,
      });
    } else {
      this.toastService.show({
        message: assignFailureMessage,
        type: assigned.reason === 'empty' ? 'warning' : 'error',
        dedupe: true,
      });
    }
    this.closeContextMenus();
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

  onRadiusContextOpenSelection(): void {
    this.ensurePhotoPanelOpen();
    this.patchDetailMediaId(null);
    this.onMapMenuCloseRequested();
  }

  async onRadiusContextRemoveFromProject(): Promise<void> {
    const uniqueImageIds = Array.from(new Set(this.radiusMenuContext().mediaIds));
    if (uniqueImageIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien fuer Projektentfernung gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const removed = await this.mapContextActionsService.removeImagesFromProjects(uniqueImageIds);
    if (!removed.ok) {
      this.toastService.show({
        message: this.getRemoveImagesFromProjectsFailureMessage(removed),
        type: removed.reason === 'empty' ? 'warning' : 'error',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    this.toastService.show({
      message: 'Medien aus Projekten entfernt.',
      type: 'success',
      dedupe: true,
    });
    this.onMapMenuCloseRequested();
  }

  async onRadiusContextDeleteMedia(): Promise<void> {
    const uniqueImageIds = Array.from(new Set(this.radiusMenuContext().mediaIds));
    if (uniqueImageIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien zum Loeschen gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    if (!this.markerContextPhotoDeleteService.confirmPhotoDeleteCount(uniqueImageIds.length)) {
      this.onMapMenuCloseRequested();
      return;
    }

    const result = await this.mediaDeleteUndo.deleteWithUndo({
      mediaItemIds: uniqueImageIds,
      onAfterDelete: async () => {
        this.patchDetailMediaId(null);
        this.setSelectedMarker(null);
        this.setSelectedMarkerKeys(new Set());
        this.workspaceSelectionService.clearSelection();
        this.workspaceViewService.clearActiveSelection();
        await this.queryViewportMarkers();
      },
      onAfterUndo: async () => {
        await this.queryViewportMarkers();
      },
    });

    if (!result.ok) {
      this.toastService.show({
        message: result.errorMessage ?? this.t('map.shell.toast.deleteFailed', 'Delete failed.'),
        type: 'error',
        dedupe: true,
      });
    }

    this.onMapMenuCloseRequested();
  }

  get markerContextIsSingle(): boolean {
    const payload = this.markerContextMenuPayload();
    return !!payload && payload.count === 1;
  }

  get markerContextIsCluster(): boolean {
    const payload = this.markerContextMenuPayload();
    return !!payload && payload.count > 1 && !payload.isMultiSelection;
  }

  get markerContextIsMulti(): boolean {
    const payload = this.markerContextMenuPayload();
    return !!payload?.isMultiSelection;
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

  onMarkerContextOpenDetailsOrSelection(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;
    this.closeContextMenus();
    this.handlePhotoMarkerClick(payload.markerKey);
  }

  async onMarkerContextOpenInMedia(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    const mediaId = payload?.mediaId;
    if (!mediaId) {
      this.toastService.show({
        message: 'Diese Aktion ist nur fuer einzelne Marker verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    this.workspaceSelectionService.setSingle(mediaId);
    this.workspacePaneShellHost.openDetailView(mediaId);
    await this.router.navigate(['/media']);
    this.onMapMenuCloseRequested();
  }

  onMarkerContextMoveMarker(): void {
    void this.onMarkerContextChangeLocationMap();
  }

  async onMarkerContextChangeLocationMap(): Promise<void> {
    const mediaIds = await this.resolveMarkerContextMediaIds();
    if (mediaIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien fuer Standortaenderung gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    if (mediaIds.length > 1) {
      this.toastService.show({
        message: `${mediaIds.length} Medien ausgewaehlt. Kartenbasierte Massenverschiebung folgt im naechsten Schritt.`,
        type: 'info',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const mediaId = mediaIds[0];

    this.onUploadLocationMapPickRequested({
      mediaId,
      fileName: mediaId,
    });
    this.onMapMenuCloseRequested();
  }

  async onMarkerContextChangeLocationAddress(): Promise<void> {
    const mediaIds = await this.resolveMarkerContextMediaIds();
    if (mediaIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien fuer Adressaenderung gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    if (mediaIds.length > 1) {
      this.state.setBatchAddressDialogTitle('Adresse fuer Auswahl aendern');
      this.state.setBatchAddressDialogMessage(
        `${mediaIds.length} Medien erhalten dieselbe Adresse.`,
      );
      this.state.setBatchAddressTargetMediaIds(mediaIds);
      this.state.setBatchAddressDialogOpen(true);
      this.onMapMenuCloseRequested();
      return;
    }

    const mediaId = mediaIds[0];

    this.openDetailView(mediaId);
    const currentRequestId = this.detailAddressSearchRequest()?.requestId ?? 0;
    this.state.setDetailAddressSearchRequest({ mediaId, requestId: currentRequestId + 1 });
    this.onMapMenuCloseRequested();
  }

  async onMarkerContextResolveLocation(): Promise<void> {
    const mediaIds = await this.resolveMarkerContextMediaIds();
    if (mediaIds.length !== 1) {
      this.toastService.show({
        message: 'Standortaufloesung ist nur fuer ein einzelnes Medium verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const result = await this.locationResolverService.resolvePendingMediaItem(mediaIds[0]);
    if (result.status === 'resolved') {
      this.toastService.show({
        message: 'Standort erfolgreich aufgeloest.',
        type: 'success',
        dedupe: true,
      });
      await this.queryViewportMarkers();
      this.onMapMenuCloseRequested();
      return;
    }

    if (result.status === 'unresolvable') {
      this.toastService.show({
        message: 'Standort konnte nicht aufgeloest werden (terminal).',
        type: 'warning',
        dedupe: true,
      });
      if (result.changed) {
        await this.queryViewportMarkers();
      }
      this.onMapMenuCloseRequested();
      return;
    }

    this.toastService.show({
      message: 'Standort ist bereits aufgeloest oder nicht retry-faehig.',
      type: 'info',
      dedupe: true,
    });
    this.onMapMenuCloseRequested();
  }

  onBatchAddressDialogCancelled(): void {
    this.state.setBatchAddressDialogOpen(false);
    this.state.setBatchAddressTargetMediaIds([]);
  }

  async onBatchAddressDialogConfirmed(addressInput: string): Promise<void> {
    const input = addressInput.trim();
    if (!input) {
      return;
    }

    const targetMediaIds = this.state.batchAddressTargetMediaIds();
    if (targetMediaIds.length === 0) {
      this.onBatchAddressDialogCancelled();
      return;
    }

    const suggestion = await this.geocodingService.forward(input);
    if (!suggestion) {
      this.toastService.show({
        message: this.t(
          'workspace.export.error.addressNotFound',
          'Address could not be resolved.',
        ),
        type: 'warning',
        dedupe: true,
      });
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
      this.toastService.show({
        message: 'Adressaenderung ist fehlgeschlagen.',
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.toastService.show({
      message: `${updatedCount} Medienadresse(n) aktualisiert.`,
      type: 'success',
      dedupe: true,
    });
    this.onBatchAddressDialogCancelled();
    await this.queryViewportMarkers();
  }

  onDetailAddressSearchRequestConsumed(requestId: number): void {
    this.workspacePaneShellHost.onDetailAddressSearchRequestConsumed(requestId);
  }

  async onMarkerContextAssignToProject(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;

    const project = await this.promptProjectSelection();
    if (!project) {
      this.closeContextMenus();
      return;
    }

    const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
      payload,
      (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
      this.map?.getZoom() ?? 13,
    );
    if (mediaIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien fuer Projektzuweisung gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    const assigned = await this.mapContextActionsService.assignImagesToProject(mediaIds, project.id);
    const assignFailureMessage =
      this.mapProjectActionsService.getAssignmentFailureMessage(assigned);
    if (assignFailureMessage) {
      this.toastService.show({
        message: assignFailureMessage,
        type: assigned.reason === 'empty' ? 'warning' : 'error',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    this.toastService.show({
      message: this.mapProjectActionsService.formatProjectAssignmentSuccess(
        project.name,
        mediaIds.length,
      ),
      type: 'success',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  onMarkerContextZoomHouse(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload || !this.map) return;
    this.map.setView([payload.lat, payload.lng], MapShellComponent.HOUSE_PROXIMITY_ZOOM);
    this.onMapMenuCloseRequested();
  }

  onMarkerContextZoomStreet(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload || !this.map) return;
    this.map.setView([payload.lat, payload.lng], MapShellComponent.STREET_PROXIMITY_ZOOM);
    this.onMapMenuCloseRequested();
  }

  async onMarkerContextCopyAddress(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;

    const copied = await this.mapContextActionsService.copyAddressFromCoords(
      payload.lat,
      payload.lng,
    );
    if (copied) {
      this.toastService.show({ message: 'Adresse kopiert.', type: 'success', dedupe: true });
    } else {
      this.toastService.show({
        message: this.t(
          'workspace.export.error.addressNotFound',
          'Address could not be resolved.',
        ),
        type: 'warning',
        dedupe: true,
      });
    }
    this.onMapMenuCloseRequested();
  }

  async onMarkerContextCopyGps(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;
    const text = this.mapContextActionsService.formatGps(payload.lat, payload.lng);
    const copied = await this.mapContextActionsService.copyTextToClipboard(text);
    this.toastService.show({
      message: copied ? 'GPS kopiert.' : text,
      type: copied ? 'success' : 'info',
      dedupe: true,
    });
    this.onMapMenuCloseRequested();
  }

  onMarkerContextOpenGoogleMaps(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload || typeof window === 'undefined') return;
    const url = this.mapContextActionsService.buildGoogleMapsUrl(payload.lat, payload.lng);
    window.open(url, '_blank', 'noopener,noreferrer');
    this.onMapMenuCloseRequested();
  }

  async onMarkerContextRemoveFromProject(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload) {
      return;
    }

    const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
      payload,
      (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
      this.map?.getZoom() ?? 13,
    );
    const uniqueImageIds = Array.from(new Set(mediaIds));
    if (uniqueImageIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien fuer Projektentfernung gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const removed = await this.mapContextActionsService.removeImagesFromProjects(uniqueImageIds);
    if (!removed.ok) {
      this.toastService.show({
        message: this.getRemoveImagesFromProjectsFailureMessage(removed),
        type: removed.reason === 'empty' ? 'warning' : 'error',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    this.toastService.show({
      message: 'Medien aus Projekten entfernt.',
      type: 'success',
      dedupe: true,
    });
    this.onMapMenuCloseRequested();
  }

  // Backwards-compatible wrapper kept for existing tests/call sites.
  async onMarkerContextCopyCoordinates(): Promise<void> {
    await this.onMarkerContextCopyGps();
  }

  async onMarkerContextDeletePhoto(): Promise<void> {
    const payload = this.markerContextMenuPayload();

    if (payload && payload.count > 1) {
      const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
        payload,
        (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
        this.map?.getZoom() ?? 13,
      );
      const uniqueImageIds = Array.from(new Set(mediaIds));
      if (uniqueImageIds.length === 0) {
        this.toastService.show({
          message: 'Keine Medien zum Loeschen gefunden.',
          type: 'warning',
          dedupe: true,
        });
        this.onMapMenuCloseRequested();
        return;
      }

      if (!this.markerContextPhotoDeleteService.confirmPhotoDeleteCount(uniqueImageIds.length)) {
        this.onMapMenuCloseRequested();
        return;
      }

      const result = await this.mediaDeleteUndo.deleteWithUndo({
        mediaItemIds: uniqueImageIds,
        onAfterDelete: async () => {
          this.patchDetailMediaId(null);
          this.setSelectedMarker(null);
          this.setSelectedMarkerKeys(new Set());
          this.workspaceSelectionService.clearSelection();
          this.workspaceViewService.clearActiveSelection();
          await this.queryViewportMarkers();
        },
        onAfterUndo: async () => {
          await this.queryViewportMarkers();
        },
      });

      if (!result.ok) {
        this.toastService.show({
          message: result.errorMessage ?? this.t('map.shell.toast.deleteFailed', 'Delete failed.'),
          type: 'error',
          dedupe: true,
        });
      }

      this.onMapMenuCloseRequested();
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
          uploadedPhotoMarkers: this.uploadedPhotoMarkers,
          photoMarkerLayer: this.photoMarkerLayer,
          markersByMediaId: this.markersByMediaId,
          selectedMarkerKey: this.selectedMarkerKey(),
          selectedMarkerKeys: this.selectedMarkerKeys(),
          detailMediaId: this.detailMediaId(),
          cancelMarkerMoveAnimation: (marker) => this.cancelMarkerMoveAnimation(marker),
          setSelectedMarker: (markerKey) => this.setSelectedMarker(markerKey),
          setSelectedMarkerKeys: (markerKeys) => this.setSelectedMarkerKeys(markerKeys),
          setDetailImageId: (mediaId) => this.patchDetailMediaId(mediaId),
        });
      },
      onAfterUndo: async () => {
        await this.queryViewportMarkers();
      },
    });

    if (!result.ok) {
      this.toastService.show({
        message: result.errorMessage ?? this.t('map.shell.toast.deleteFailed', 'Delete failed.'),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.onMapMenuCloseRequested();
  }

  // ── Workspace pane (DOM + split owned by AuthenticatedAppLayoutComponent) ─

  private applyWorkspacePaneClosingMapSideEffects(): void {
    if ((this.draftMediaMarker()?.uploadCount ?? 0) === 0) {
      this.removeDraftMediaMarker();
    }
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.clearRadiusSelectionVisuals();
  }

  onQrInviteCommandRequested(): void {
    void this.router.navigateByUrl('/map/settings/invite-management/qr');
    this.settingsPaneService.openInviteManagementFromCommand('worker');
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
          : MapShellComponent.DETAIL_LOCATION_FOCUS_ZOOM;

    this.pendingZoomHighlight = {
      mediaId: event.mediaId,
      lat: event.lat,
      lng: event.lng,
      requestedAt: Date.now(),
    };

    // Keep Leaflet dimensions in sync with the currently visible map area
    // before calculating the fly-to center.
    this.map.invalidateSize();
    this.map.setView([event.lat, event.lng], requestedZoom, {
      animate: false,
    });

    this.waitForMapIdleThenFlushZoomHighlight();

    // Safety flush while waiting for marker query / reconciliation.
    setTimeout(() => this.flushPendingZoomHighlight(), 140);

    void this.mapZoomOrchestrator.consumePending();
  }

  onWorkspaceItemHoverStarted(event: ThumbnailCardHoverEvent): void {
    this.activeWorkspaceHover = event;
    const markerKey = this.resolveZoomTargetMarkerKey(event.mediaId, event.lat, event.lng, true);
    this.setLinkedHoverMarkerFromWorkspace(markerKey);
  }

  onWorkspaceItemHoverEnded(mediaId: string): void {
    if (this.activeWorkspaceHover?.mediaId === mediaId) {
      this.activeWorkspaceHover = null;
    }
    this.setLinkedHoverMarkerFromWorkspace(null);
  }

  private highlightZoomTargetMarker(mediaId: string, lat: number, lng: number, attempt = 0): void {
    const pendingForImage = this.detailZoomHighlightService.getPendingForImage(
      this.pendingZoomHighlight,
      mediaId,
    );
    const allowClusterFallback = this.detailZoomHighlightService.shouldAllowClusterFallback(
      pendingForImage,
      MapShellComponent.DETAIL_LOCATION_WAIT_FOR_SINGLE_MS,
    );

    const markerKey = this.resolveZoomTargetMarkerKey(mediaId, lat, lng, allowClusterFallback);
    if (!markerKey) {
      this.scheduleZoomHighlightRetry(mediaId, lat, lng, attempt);
      return;
    }

    if (
      this.detailZoomHighlightService.shouldWaitForMapIdle(
        pendingForImage,
        this.lastMapIdleAt,
        MapShellComponent.DETAIL_LOCATION_IDLE_FALLBACK_MS,
      )
    ) {
      this.scheduleZoomHighlightRetry(mediaId, lat, lng, attempt);
      return;
    }

    const markerWrapper = this.resolveZoomHighlightMarkerWrapper(markerKey);
    if (!markerWrapper || !this.isZoomHighlightRenderReady(markerWrapper)) {
      this.scheduleZoomHighlightRetry(mediaId, lat, lng, attempt);
      return;
    }

    this.startZoomMarkerSpotlight(markerWrapper);
    this.clearPendingZoomHighlightForImage(mediaId);
  }

  private scheduleZoomHighlightRetry(
    mediaId: string,
    lat: number,
    lng: number,
    attempt: number,
  ): void {
    this.detailZoomHighlightService.scheduleRetry(
      attempt,
      MapShellComponent.DETAIL_LOCATION_HIGHLIGHT_MAX_RETRIES,
      MapShellComponent.DETAIL_LOCATION_HIGHLIGHT_RETRY_MS,
      () => this.highlightZoomTargetMarker(mediaId, lat, lng, attempt + 1),
    );
  }

  private resolveZoomHighlightMarkerWrapper(markerKey: string): HTMLElement | null {
    const markerElement = this.uploadedPhotoMarkers
      .get(markerKey)
      ?.marker.getElement() as HTMLElement | null;
    return this.detailZoomHighlightService.resolveMarkerWrapper(markerElement);
  }

  private clearPendingZoomHighlightForImage(mediaId: string): void {
    if (this.pendingZoomHighlight?.mediaId === mediaId) {
      this.pendingZoomHighlight = null;
    }
  }

  private flushPendingZoomHighlight(): void {
    const pending = this.pendingZoomHighlight;
    if (!pending) return;

    if (Date.now() - pending.requestedAt > MapShellComponent.DETAIL_LOCATION_PENDING_TTL_MS) {
      this.pendingZoomHighlight = null;
      return;
    }

    this.highlightZoomTargetMarker(pending.mediaId, pending.lat, pending.lng);
  }

  private waitForMapIdleThenFlushZoomHighlight(): void {
    if (!this.map) return;

    this.detailZoomHighlightService.waitForIdleOrTimeout(
      this.map,
      MapShellComponent.DETAIL_LOCATION_IDLE_FALLBACK_MS,
      () => this.flushPendingZoomHighlight(),
    );
  }

  private isZoomHighlightRenderReady(markerElement: HTMLElement): boolean {
    return this.detailZoomHighlightService.isRenderReady(
      markerElement,
      this.lastMapMoveAt,
      MapShellComponent.DETAIL_LOCATION_RENDER_SETTLE_MS,
    );
  }

  private startZoomMarkerSpotlight(markerElement: HTMLElement): void {
    this.detailZoomHighlightService.startSpotlight(
      markerElement,
      MapShellComponent.DETAIL_LOCATION_MARKER_PULSE_MS,
    );
  }

  private resolveZoomTargetMarkerKey(
    mediaId: string,
    lat: number,
    lng: number,
    allowClusterFallback: boolean,
  ): string | null {
    return this.zoomTargetMarkerService.findMarkerKeyForZoomTarget({
      mediaId,
      lat,
      lng,
      allowClusterFallback,
      map: this.map,
      markersByMediaId: this.markersByMediaId,
      uploadedPhotoMarkers: this.uploadedPhotoMarkers,
      toMarkerKey: (latValue: number, lngValue: number) => this.toMarkerKey(latValue, lngValue),
      clusterFallbackMaxMeters: MapShellComponent.DETAIL_LOCATION_CLUSTER_FALLBACK_MAX_METERS,
    });
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
    this.upsertUploadedPhotoMarker(event);
    this.resolveDraftMediaMarkerUpload(event);
    void this.queryViewportMarkers();
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
    this.searchPlacementActive.set(false);
    this.map?.getContainer().classList.remove('map-container--placing');
    this.navigateBackAfterLocationMapPick();
  }

  // ── GPS button ────────────────────────────────────────────────────────────

  /**
   * Activates GPS tracking and recenters only after a fresh browser fix resolves.
   * @see docs/specs/component/map/gps-button.md
   */
  goToUserPosition(): void {
    if (this.gpsTrackingActive()) {
      this.stopGpsTracking();
      return;
    }

    this.gpsTrackingActive.set(true);
    this.gpsLocating.set(true);

    this.mapGeolocationService.requestCurrentPosition(
      {
        onSuccess: (coords) => {
          if (!this.gpsTrackingActive()) {
            this.gpsLocating.set(false);
            return;
          }

          this.userPosition.set(coords);
          void this.refreshSearchCountryCode(coords[0], coords[1]);
          const zoom = Math.max(this.map?.getZoom() ?? 0, MapShellComponent.GPS_RECENTER_MIN_ZOOM);
          this.map?.setView(coords, zoom);
          this.renderOrUpdateUserLocationMarker(coords);
          this.triggerUserLocationFoundState();
          this.startGpsTracking();
          this.gpsLocating.set(false);
        },
        onError: () => {
          this.stopGpsTracking();
          this.gpsLocating.set(false);
        },
      },
      { maximumAge: 0 },
    );
  }

  toggleMapBasemap(): void {
    const next: MapBasemapPreference = this.mapBasemap() === 'default' ? 'satellite' : 'default';
    this.mapBasemap.set(next);
    this.mapPreferencesService.persistBasemapPreference(MAP_BASEMAP_STORAGE_KEY, next);
    this.applyMapBasemapLayer();
  }

  setMapViewMode(mode: MapViewMode): void {
    const previousBasemap = this.mapBasemap();

    if (mode === 'photo') {
      this.mapBasemap.set('satellite');
    } else {
      this.mapBasemap.set('default');
    }

    this.mapPreferencesService.persistBasemapPreference(MAP_BASEMAP_STORAGE_KEY, this.mapBasemap());

    if (this.mapBasemap() !== previousBasemap) {
      this.applyMapBasemapLayer();
    }
  }

  onMapViewModeChange(raw: ToggleValue<string>): void {
    const mode = toggleSingleStringValue(raw);
    if (mode === 'street' || mode === 'photo') {
      this.setMapViewMode(mode);
    }
  }

  onSearchMapCenterRequested(event: { lat: number; lng: number; label: string }): void {
    if (!this.map) return;

    this.map.setView([event.lat, event.lng], 14);
    this.renderOrUpdateSearchLocationMarker([event.lat, event.lng]);
  }

  onSearchClearRequested(): void {
    this.clearSearchLocationMarker();
  }

  onSearchDropPinRequested(): void {
    this.pendingPlacementKey = null;
    this.pendingUploadedLocationMapPick = null;
    this.placementActive.set(false);
    this.searchPlacementActive.set(true);
    this.map?.getContainer().classList.add('map-container--placing');
  }

  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void {
    const points =
      event.points?.length && event.points.length > 0
        ? event.points
        : [{ lat: event.lat, lng: event.lng }];
    this.renderSearchLocationPreviewMarkers(points);
  }

  onUploadLocationPreviewCleared(): void {
    if (this.searchPlacementActive()) {
      return;
    }
    this.clearSearchLocationPreviewMarkers();
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.pendingPlacementKey = null;
    this.pendingUploadedLocationMapPick = event;
    this.placementActive.set(false);
    this.searchPlacementActive.set(true);
    this.map?.getContainer().classList.add('map-container--placing');
  }

  placementBannerText(): string {
    if (this.placementActive()) {
      return this.t('upload.placement.banner.placeImage', 'Click the map to place the image');
    }
    if (this.pendingUploadedLocationMapPick) {
      return this.t(
        'upload.placement.banner.setNewLocation',
        'Click the map to set the new location',
      );
    }
    return this.t('upload.placement.banner.dropPin', 'Click the map to drop a pin');
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

    this.updateSearchViewportBounds();
    this.applyPendingMapFocus();
    this.applyPendingLocationMapPickNavigation();

    const pendingZoom = this.mapZoomOrchestrator.consumePending();
    if (pendingZoom) {
      this.onZoomToLocation(pendingZoom);
    }

    // Map click handler: closes upload panel and, when active, places images
    // that had no GPS EXIF data.
    this.map.on('click', (e: MapMouseEvent) => this.handleMapClick(e));
    this.map.on('mousedown', (e: MapMouseEvent) => this.handleMapMouseDown(e));
    this.map.on('mousemove', (e: MapMouseEvent) => this.handleMapMouseMove(e));
    this.map.on('mouseup', (e: MapMouseEvent) => this.handleMapMouseUp(e));
    this.map.on('contextmenu', (e: MapMouseEvent) => this.handleMapContextMenu(e));

    // Capture-phase suppression ensures the native browser menu never opens
    // above the custom app context menu.
    this.map
      .getContainer()
      .addEventListener('contextmenu', this.mapContainerContextMenuHandler, true);

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
      this.updateSearchViewportBounds();
    });

    this.map.on('idle', () => {
      this.lastMapIdleAt = Date.now();
      this.flushPendingZoomHighlight();
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
          if (this.tryRestoreViewportFromSessionCache()) {
            this.map.invalidateSize();
            return;
          }
          void this.queryViewportMarkers();
        }, 120);
      },
    });
  }

  private cancelDeferredStartupWork(): void {
    this.mapDeferredStartupService.cancelDeferredStartup(this.deferredStartupHandles);
  }

  private initGeolocation(): void {
    this.mapGeolocationService.requestCurrentPosition({
      onSuccess: (coords) => {
        this.userPosition.set(coords);
        void this.refreshSearchCountryCode(coords[0], coords[1]);
      },
      onError: () => {
        // Geolocation denied or unavailable — Vienna fallback already set.
      },
    });
  }

  private startGpsTracking(): void {
    this.gpsTrackingTimer = this.mapGeolocationService.clearTrackingTimer(this.gpsTrackingTimer);

    this.gpsTrackingTimer = this.mapGeolocationService.startTracking({
      intervalMs: MapShellComponent.GPS_TRACKING_INTERVAL_MS,
      isTrackingActive: () => this.gpsTrackingActive(),
      onTickStart: () => this.gpsLocating.set(true),
      onSuccess: (coords) => {
        this.userPosition.set(coords);
        void this.refreshSearchCountryCode(coords[0], coords[1]);
        this.renderOrUpdateUserLocationMarker(coords);
        this.triggerUserLocationFoundState();
        this.gpsLocating.set(false);
      },
      onError: () => {
        // When tracking can no longer get a fix, leave toggle mode.
        this.stopGpsTracking();
        this.gpsLocating.set(false);
      },
    });
  }

  private stopGpsTracking(): void {
    this.gpsTrackingActive.set(false);
    this.gpsTrackingTimer = this.mapGeolocationService.clearTrackingTimer(this.gpsTrackingTimer);
    this.removeUserLocationMarker();
  }

  private removeUserLocationMarker(): void {
    if (this.userLocationFoundTimer) {
      clearTimeout(this.userLocationFoundTimer);
      this.userLocationFoundTimer = null;
    }

    this.userLocationMarker?.remove();
    this.userLocationMarker = null;
  }

  private applyMapBasemapLayer(): void {
    const result = this.mapBasemapLayerService.applyBasemapLayer({
      map: this.map,
      activeBaseTileLayer: this.activeBaseTileLayer,
      basemap: this.mapBasemap(),
    });
    this.activeBaseTileLayer = result.activeBaseTileLayer;
  }

  private applyPendingMapFocus(): void {
    if (!this.map) {
      return;
    }

    const payload = this.pendingMapFocus();
    if (!payload) {
      return;
    }

    this.map.setView([payload.lat, payload.lng], MapShellComponent.DETAIL_LOCATION_FOCUS_ZOOM);
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

  private handleMapClick(e: MapMouseEvent): void {
    this.closeContextMenus();

    const clickButton = e.originalEvent?.button ?? 0;
    const isPrimaryClick = clickButton === 0;
    const allowPrimaryDeselection = this.shouldAllowPrimaryDeselection(isPrimaryClick);

    if (Date.now() < this.suppressMapClickUntil && !allowPrimaryDeselection) {
      return;
    }

    if (this.tryClearEmptyDraftOnPrimaryClick(isPrimaryClick)) {
      return;
    }

    if (this.tryCompletePendingPlacement(e.latlng)) {
      return;
    }

    if (!this.searchPlacementActive()) {
      this.clearMapSelectionState();
      return;
    }

    this.completeSearchPlacement(e.latlng);
  }

  private shouldAllowPrimaryDeselection(isPrimaryClick: boolean): boolean {
    if (!isPrimaryClick || this.searchPlacementActive()) {
      return false;
    }

    const hasMarkerSelection =
      this.selectedMarkerKey() !== null || this.selectedMarkerKeys().size > 0;
    const hasRadiusSelection = this.radiusSelectionService.hasCommittedSelection(
      this.radiusCommittedVisuals,
    );
    const hasWorkspaceSelection = this.workspaceViewService.selectionActive();
    return hasMarkerSelection || hasRadiusSelection || hasWorkspaceSelection;
  }

  private tryClearEmptyDraftOnPrimaryClick(isPrimaryClick: boolean): boolean {
    const activeDraft = this.draftMediaMarker();
    if (
      !isPrimaryClick ||
      !activeDraft ||
      activeDraft.uploadCount !== 0 ||
      !!this.pendingPlacementKey ||
      this.searchPlacementActive()
    ) {
      return false;
    }

    this.uploadShellUi.closeUploadPanel();
    this.removeDraftMediaMarker();
    this.workspacePaneShellHost.closeWorkspacePane();
    return true;
  }

  private tryCompletePendingPlacement(latlng: MapLatLng): boolean {
    if (!this.pendingPlacementKey) {
      return false;
    }

    // Prevent accidental placement immediately after drag/pan movement.
    if (Date.now() - this.lastMapMoveAt < MapShellComponent.PLACEMENT_CLICK_GUARD_MS) {
      return true;
    }

    const coords: ExifCoords = { lat: latlng.lat, lng: latlng.lng };
    this.uploadShellUi.placeFile(this.pendingPlacementKey, coords);

    this.pendingPlacementKey = null;
    this.placementActive.set(false);
    this.map?.getContainer().classList.remove('map-container--placing');
    return true;
  }

  private clearMapSelectionState(): void {
    this.uploadShellUi.closeUploadPanel();
    // Deselect the active marker but keep the workspace pane open.
    // The pane is closed only via its own close button.
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.patchDetailMediaId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.clearRadiusSelectionVisuals();
  }

  private completeSearchPlacement(latlng: MapLatLng): void {
    this.renderOrUpdateSearchLocationMarker([latlng.lat, latlng.lng]);
    const pendingUploadLocation = this.pendingUploadedLocationMapPick;
    this.pendingUploadedLocationMapPick = null;
    this.searchPlacementActive.set(false);
    this.map?.getContainer().classList.remove('map-container--placing');

    if (!pendingUploadLocation) {
      return;
    }

    void this.applyUploadedLocationMapPick(pendingUploadLocation, {
      lat: latlng.lat,
      lng: latlng.lng,
    }).then((saved) => {
      if (saved) {
        this.navigateBackAfterLocationMapPick();
      }
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
    this.toastService.show({
      message: this.t('upload.location.update.success', 'Standort wurde aktualisiert.'),
      type: 'success',
      dedupe: true,
    });
    return true;
  }

  private handleMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button !== 2) {
      return;
    }

    event.originalEvent.preventDefault();
    if (!this.map || this.placementActive() || this.searchPlacementActive()) {
      return;
    }

    this.pendingSecondaryPress = {
      startPoint: this.map.mouseEventToContainerPoint(event.originalEvent),
      startLatLng: event.latlng,
      startClientX: event.originalEvent.clientX,
      startClientY: event.originalEvent.clientY,
      additive: !!(event.originalEvent.ctrlKey || event.originalEvent.metaKey),
    };
    this.closeContextMenus();
  }

  private handleMapMouseMove(event: MapMouseEvent): void {
    if (!this.map || !this.pendingSecondaryPress || this.radiusDrawActive) {
      return;
    }

    const currentPoint = this.map.mouseEventToContainerPoint(event.originalEvent);
    const dx = currentPoint.x - this.pendingSecondaryPress.startPoint.x;
    const dy = currentPoint.y - this.pendingSecondaryPress.startPoint.y;
    const movedPx = Math.hypot(dx, dy);

    if (movedPx < MapShellComponent.CONTEXT_MENU_DRAG_THRESHOLD_PX) {
      return;
    }

    const { startLatLng, additive } = this.pendingSecondaryPress;
    this.pendingSecondaryPress = null;
    this.startRadiusSelectionDraw(startLatLng, additive);
    this.updateRadiusSelectionDraft(event.latlng);
  }

  private handleMapMouseUp(event: MapMouseEvent): void {
    if (event.originalEvent.button !== 2) {
      return;
    }

    event.originalEvent.preventDefault();

    if (this.isMarkerDomTarget(event.originalEvent)) {
      this.pendingSecondaryPress = null;
      return;
    }

    if (Date.now() <= this.markerContextMenuSuppressUntil) {
      this.pendingSecondaryPress = null;
      return;
    }

    // Short secondary click should open the context menu. Radius drawing already
    // clears pendingSecondaryPress during mousemove once drag threshold is crossed.
    if (!this.pendingSecondaryPress || this.radiusDrawActive) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = this.pendingSecondaryPress;
    this.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(startLatLng, startClientX, startClientY);
  }

  private handleMapContextMenu(event: MapMouseEvent): void {
    if (this.consumeNativeContextMenuBypass()) {
      return;
    }

    if (this.isMarkerDomTarget(event.originalEvent)) {
      this.pendingSecondaryPress = null;
      return;
    }

    if (Date.now() <= this.markerContextMenuSuppressUntil) {
      this.pendingSecondaryPress = null;
      return;
    }

    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();

    // Mouse-up opens the menu for short right-click interactions. Keep this as a
    // fallback for platforms where only contextmenu is emitted.
    if (this.radiusDrawActive || !this.pendingSecondaryPress) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = this.pendingSecondaryPress;
    this.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(startLatLng, startClientX, startClientY);
  }

  private openContextMenuForShortSecondaryClick(
    latlng: MapLatLng,
    clientX: number,
    clientY: number,
  ): void {
    if (this.radiusSelectionService.hasCommittedSelection(this.radiusCommittedVisuals)) {
      if (
        this.radiusSelectionService.isInsideAnyCommittedRadius(
          this.map,
          this.radiusCommittedVisuals,
          latlng,
        )
      ) {
        this.openRadiusContextMenuAt(latlng, clientX, clientY);
        return;
      }

      this.clearActiveRadiusSelection();
      this.closeContextMenus();
      this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
      return;
    }

    this.openMapContextMenuAt(latlng, clientX, clientY);
  }

  private shouldAllowNativeContextMenu(event: MouseEvent): boolean {
    const now = Date.now();
    const currentPos = { x: event.clientX, y: event.clientY };
    const previousAt = this.lastSecondaryContextClickAt;
    const previousPos = this.lastSecondaryContextClickPos;

    const withinTime =
      previousAt !== null && now - previousAt <= MapShellComponent.CONTEXT_MENU_NATIVE_HANDSHAKE_MS;
    const withinDistance =
      previousPos !== null &&
      Math.hypot(currentPos.x - previousPos.x, currentPos.y - previousPos.y) <=
        MapShellComponent.CONTEXT_MENU_NATIVE_HANDSHAKE_PX;

    const allowNative = withinTime && withinDistance;

    if (allowNative) {
      this.lastSecondaryContextClickAt = null;
      this.lastSecondaryContextClickPos = null;
      return true;
    }

    this.lastSecondaryContextClickAt = now;
    this.lastSecondaryContextClickPos = currentPos;
    return false;
  }

  private consumeNativeContextMenuBypass(): boolean {
    if (Date.now() > this.nativeContextMenuBypassUntil) {
      this.nativeContextMenuBypassUntil = 0;
      return false;
    }

    this.nativeContextMenuBypassUntil = 0;
    return true;
  }

  private isMarkerDomTarget(event: MouseEvent): boolean {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    return !!target.closest('.map-photo-marker, .leaflet-marker-icon');
  }

  private startRadiusSelectionDraw(startLatLng: MapLatLng, additive: boolean): void {
    if (!this.map || this.placementActive() || this.searchPlacementActive()) {
      return;
    }

    this.cancelRadiusDrawing();
    this.closeContextMenus();

    this.radiusDrawActive = true;
    this.radiusDrawAdditive = additive;
    this.radiusDrawStartLatLng = startLatLng;
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;

    this.radiusDraftLine = this.mapLeafletService.createRadiusDraftLine(this.map, startLatLng);

    this.radiusDraftCircle = this.mapLeafletService.createRadiusDraftCircle(this.map, startLatLng);

    this.radiusDraftLabel = this.radiusVisualsService
      .createLabelMarker(startLatLng, 0, 0)
      .addTo(this.map);

    this.radiusDrawMoveHandler = (moveEvent: MapMouseEvent) => {
      this.updateRadiusSelectionDraft(moveEvent.latlng);
    };

    this.radiusDrawMouseUpHandler = (upEvent: MapMouseEvent) => {
      void this.commitRadiusSelection(upEvent.latlng);
    };

    this.map.on('mousemove', this.radiusDrawMoveHandler);
    this.map.on('mouseup', this.radiusDrawMouseUpHandler);
  }

  private updateRadiusSelectionDraft(currentLatLng: MapLatLng): void {
    if (!this.map || !this.radiusDrawStartLatLng) {
      return;
    }

    const radiusMeters = this.map.distance(this.radiusDrawStartLatLng, currentLatLng);
    const labelLatLng = this.radiusVisualsService.getLabelLatLng(
      this.radiusDrawStartLatLng,
      currentLatLng,
    );
    const labelAngleDeg = this.radiusVisualsService.getReadableLineAngleDeg(
      this.map,
      this.radiusDrawStartLatLng,
      currentLatLng,
    );

    this.radiusDraftLine?.setLatLngs([this.radiusDrawStartLatLng, currentLatLng]);
    this.radiusDraftCircle?.setRadius(radiusMeters);
    this.radiusDraftLabel?.setLatLng(labelLatLng);
    this.radiusVisualsService.updateLabelMarker(this.radiusDraftLabel, radiusMeters, labelAngleDeg);
    this.updateRadiusDraftMarkerHighlights(this.radiusDrawStartLatLng, radiusMeters);
  }

  private async commitRadiusSelection(endLatLng: MapLatLng): Promise<void> {
    if (!this.map || !this.radiusDrawStartLatLng) {
      this.cancelRadiusDrawing();
      return;
    }

    const center = this.radiusDrawStartLatLng;
    const radiusMeters = this.map.distance(center, endLatLng);
    const additive = this.radiusDrawAdditive;

    this.cancelRadiusDrawing(true);

    if (radiusMeters < MapShellComponent.RADIUS_SELECTION_MIN_METERS) {
      this.clearRadiusDraftMarkerHighlights();
      return;
    }

    if (!additive) {
      this.clearRadiusSelectionVisuals();
    }

    this.addRadiusSelectionVisual(center, radiusMeters, endLatLng);
    await this.selectRadiusImages(center, radiusMeters, additive);
    this.clearRadiusDraftMarkerHighlights();
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
  }

  private cancelRadiusDrawing(preserveDraftHighlights = false): void {
    if (this.map && this.radiusDrawMoveHandler) {
      this.map.off('mousemove', this.radiusDrawMoveHandler);
    }

    if (this.map && this.radiusDrawMouseUpHandler) {
      this.map.off('mouseup', this.radiusDrawMouseUpHandler);
    }

    this.radiusDrawMoveHandler = null;
    this.radiusDrawMouseUpHandler = null;
    this.radiusDrawActive = false;
    this.radiusDrawAdditive = false;
    this.radiusDrawStartLatLng = null;

    this.radiusDraftLine?.remove();
    this.radiusDraftLine = null;
    this.radiusDraftCircle?.remove();
    this.radiusDraftCircle = null;
    this.radiusDraftLabel?.remove();
    this.radiusDraftLabel = null;

    if (!preserveDraftHighlights) {
      this.clearRadiusDraftMarkerHighlights();
    }
  }

  private updateRadiusDraftMarkerHighlights(center: MapLatLng, radiusMeters: number): void {
    if (!this.map) {
      return;
    }

    const previousKeys = this.radiusDraftHighlightedKeys;
    const nextKeys = this.radiusDraftHighlightService.updateDraftHighlights({
      map: this.map,
      uploadedPhotoMarkers: this.uploadedPhotoMarkers,
      currentKeys: previousKeys,
      center,
      radiusMeters,
    });

    if (nextKeys === previousKeys) {
      return;
    }

    this.radiusDraftHighlightedKeys = nextKeys;

    for (const markerKey of previousKeys) {
      if (!nextKeys.has(markerKey)) {
        this.refreshPhotoMarker(markerKey);
      }
    }

    for (const markerKey of nextKeys) {
      if (!previousKeys.has(markerKey)) {
        this.refreshPhotoMarker(markerKey);
      }
    }
  }

  private clearRadiusDraftMarkerHighlights(): void {
    const previousKeys = this.radiusDraftHighlightedKeys;
    const nextKeys = this.radiusDraftHighlightService.clearDraftHighlights(previousKeys);
    if (nextKeys === previousKeys) {
      return;
    }

    this.radiusDraftHighlightedKeys = nextKeys;
    for (const markerKey of previousKeys) {
      this.refreshPhotoMarker(markerKey);
    }
  }

  private clearRadiusSelectionVisuals(): void {
    this.radiusVisualsService.clearCommittedSelectionVisuals(this.radiusCommittedVisuals);
  }

  private addRadiusSelectionVisual(center: MapLatLng, radiusMeters: number, edge: MapLatLng): void {
    if (!this.map) return;

    this.radiusCommittedVisuals.push(
      this.radiusVisualsService.addCommittedSelectionVisual(this.map, center, radiusMeters, edge),
    );
  }

  private async selectRadiusImages(
    center: MapLatLng,
    radiusMeters: number,
    additive: boolean,
  ): Promise<void> {
    if (!this.map) return;

    const result = await this.radiusSelectionService.selectRadiusImages({
      map: this.map,
      center,
      radiusMeters,
      additive,
      uploadedPhotoMarkers: this.uploadedPhotoMarkers,
      selectedMarkerKeys: this.selectedMarkerKeys(),
      toMarkerKey: (lat: number, lng: number) => this.toMarkerKey(lat, lng),
      currentImages: this.workspaceViewService.rawImages(),
      fetchClusterImages: (cells, zoom) =>
        this.workspaceViewService.fetchClusterImages(cells, zoom),
    });

    this.setSelectedMarkerKeys(result.selectedMarkerKeys);
    const imageIds = result.images.map((image) => image.id);
    if (additive) {
      const mergedIds = Array.from(
        new Set([...this.workspaceSelectionService.selectedMediaIds(), ...imageIds]),
      );
      this.workspaceSelectionService.selectAllInScope(mergedIds);
    } else {
      this.workspaceSelectionService.selectAllInScope(imageIds);
    }

    if (!this.photoPanelOpen()) {
      this.state.setWorkspacePaneWidth(this.getWorkspacePaneOpeningWidth());
    }
    this.state.setPhotoPanelOpen(true);
    this.patchDetailMediaId(null);
    this.setSelectedMarker(null);
  }

  private renderOrUpdateUserLocationMarker(coords: [number, number]): void {
    if (!this.map) return;

    if (!this.userLocationMarker) {
      this.userLocationMarker = this.mapLeafletService.createUserLocationMarker(coords);

      try {
        this.userLocationMarker.addTo(this.map);
      } catch {
        // Leaflet map not yet fully initialized (panes not ready).
        // Reset marker to null and silently fail; will retry on next call.
        this.userLocationMarker = null;
        return;
      }
      return;
    }

    this.userLocationMarker.setLatLng(coords);
  }

  private triggerUserLocationFoundState(): void {
    if (!this.userLocationMarker) {
      return;
    }

    const markerElement = this.userLocationMarker.getElement();
    if (!markerElement) {
      return;
    }

    markerElement.classList.add('map-user-location-marker--fresh');
    if (this.userLocationFoundTimer) {
      clearTimeout(this.userLocationFoundTimer);
    }

    this.userLocationFoundTimer = setTimeout(() => {
      markerElement.classList.remove('map-user-location-marker--fresh');
      this.userLocationFoundTimer = null;
    }, 1000);
  }

  private renderOrUpdateSearchLocationMarker(coords: [number, number]): void {
    if (!this.map) return;

    if (!this.searchLocationMarker) {
      this.searchLocationMarker = this.mapLeafletService.createSearchLocationMarker(coords);

      try {
        this.searchLocationMarker.addTo(this.map);
      } catch {
        // Leaflet map not yet fully initialized (panes not ready).
        // Reset marker to null and silently fail; will retry on next call.
        this.searchLocationMarker = null;
        return;
      }
      return;
    }

    this.searchLocationMarker.setLatLng(coords);
  }

  private renderOrUpdateDraftMediaMarker(coords: [number, number]): void {
    if (!this.map) return;

    const icon = this.buildDraftMediaMarkerIcon();
    if (!this.draftMediaMarkerLeaflet) {
      this.draftMediaMarkerLeaflet = this.mapLeafletService.createStaticPhotoMarker(coords, icon);

      try {
        if (this.photoMarkerLayer) {
          this.photoMarkerLayer.addLayer(this.draftMediaMarkerLeaflet);
        } else {
          this.draftMediaMarkerLeaflet.addTo(this.map);
        }
      } catch {
        // Leaflet map not yet fully initialized (panes not ready).
        // Reset marker to null and silently fail; will retry on next call.
        this.draftMediaMarkerLeaflet = null;
        return;
      }
      return;
    }

    this.draftMediaMarkerLeaflet.setLatLng(coords);
    this.draftMediaMarkerLeaflet.setIcon(icon);
  }

  private buildDraftMediaMarkerIcon(): MapDivIcon {
    return this.mapLeafletService.createPhotoMarkerIcon(
      buildPhotoMarkerHtml({
        count: 1,
        selected: true,
        zoomLevel: this.getPhotoMarkerZoomLevel(),
      }),
    );
  }

  private removeDraftMediaMarker(): void {
    if (this.draftMediaMarkerLeaflet) {
      if (this.photoMarkerLayer) {
        this.photoMarkerLayer.removeLayer(this.draftMediaMarkerLeaflet);
      } else {
        this.draftMediaMarkerLeaflet.remove();
      }
      this.draftMediaMarkerLeaflet = null;
    }
    this.state.setDraftMediaMarker(null);
  }

  private resolveDraftMediaMarkerUpload(event: ImageUploadedEvent): void {
    const draft = this.draftMediaMarker();
    if (!draft) return;

    const draftKey = this.toMarkerKey(draft.lat, draft.lng);
    const uploadedKey = this.toMarkerKey(event.lat, event.lng);
    if (draftKey !== uploadedKey) {
      return;
    }

    this.removeDraftMediaMarker();
    this.setSelectedMarker(uploadedKey);
    this.setSelectedMarkerKeys(new Set([uploadedKey]));
  }

  private clearSearchLocationMarker(): void {
    this.searchLocationMarker?.remove();
    this.searchLocationMarker = null;
  }

  private renderSearchLocationPreviewMarkers(
    points: ReadonlyArray<{ lat: number; lng: number }>,
  ): void {
    if (!this.map) {
      return;
    }
    this.clearSearchLocationPreviewMarkers();
    if (points.length === 1) {
      this.renderOrUpdateSearchLocationMarker([points[0]!.lat, points[0]!.lng]);
      return;
    }
    for (const point of points) {
      const marker = this.mapLeafletService.createSearchLocationMarker([point.lat, point.lng]);
      try {
        marker.addTo(this.map);
        this.searchLocationPreviewMarkers.push(marker);
      } catch {
        marker.remove();
      }
    }
  }

  private clearSearchLocationPreviewMarkers(): void {
    for (const marker of this.searchLocationPreviewMarkers) {
      marker.remove();
    }
    this.searchLocationPreviewMarkers = [];
    this.clearSearchLocationMarker();
  }

  private async refreshSearchCountryCode(lat: number, lng: number): Promise<void> {
    const result = await this.geocodingService.reverse(lat, lng);
    const countryCode = result?.countryCode?.toLowerCase();
    if (!countryCode) return;
    this.searchCountryCodes.set([countryCode]);
  }

  private updateSearchViewportBounds(): void {
    const bounds = this.map?.getBounds();
    if (!bounds) return;

    this.searchViewportBounds.set({
      north: bounds.getNorth(),
      east: bounds.getEast(),
      south: bounds.getSouth(),
      west: bounds.getWest(),
    });
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

        void this.queryViewportMarkers();
      }),
    );
  }

  private subscribeToUploadManagerEvents(): void {
    this.uploadManagerSubs.push(
      this.uploadManagerService.imageReplaced$.subscribe((event: ImageReplacedEvent) => {
        this.handleImageReplaced(event);
      }),
      this.uploadManagerService.imageAttached$.subscribe((event: ImageAttachedEvent) => {
        this.handleImageAttached(event);
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
        void this.queryViewportMarkers();
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
        cancelMarkerMoveAnimation: (marker) => this.cancelMarkerMoveAnimation(marker),
        setSelectedMarker: (key) => this.setSelectedMarker(key),
        setSelectedMarkerKeys: (keys) => this.setSelectedMarkerKeys(keys),
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

    void this.queryViewportMarkers();
  }

  /**
   * Handles imageReplaced$ — rebuilds the marker DivIcon with the new
   * localObjectUrl so the thumbnail swaps instantly (no placeholder flash).
   */
  private handleImageReplaced(event: ImageReplacedEvent): void {
    for (const markerKey of getMarkerKeysForMedia(this.markersByMediaId, event.mediaId)) {
      const state = this.uploadedPhotoMarkers.get(markerKey);
      if (!state) continue;

      if (state.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(state.thumbnailUrl);
      }

      state.thumbnailUrl = event.localObjectUrl;
      state.signedAt = undefined;
      state.direction = event.direction ?? state.direction;
      this.refreshPhotoMarker(markerKey);
    }
  }

  /**
   * Handles imageAttached$ — transitions the marker from CSS placeholder
   * to real thumbnail using the localObjectUrl from the upload.
   */
  private handleImageAttached(event: ImageAttachedEvent): void {
    for (const markerKey of getMarkerKeysForMedia(this.markersByMediaId, event.mediaId)) {
      const state = this.uploadedPhotoMarkers.get(markerKey);
      if (!state) continue;

      if (state.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(state.thumbnailUrl);
      }

      state.thumbnailUrl = event.localObjectUrl;
      state.signedAt = undefined;
      state.direction = event.direction ?? state.direction;
      state.thumbnailSourcePath = event.newStoragePath;
      this.refreshPhotoMarker(markerKey);
    }
  }

  private upsertUploadedPhotoMarker(event: ImageUploadedEvent): void {
    if (!this.map) return;

    const markerKey = this.toMarkerKey(event.lat, event.lng);
    const existing = this.uploadedPhotoMarkers.get(markerKey);

    if (existing) {
      const nextCount = existing.count + 1;
      const nextThumb = existing.thumbnailUrl ?? event.thumbnailUrl;
      existing.count = nextCount;
      existing.thumbnailUrl = nextThumb;
      existing.direction ??= event.direction;

      if (nextCount > 1 && this.selectedMarkerKey() === markerKey) {
        this.setSelectedMarker(null);
        this.state.setPhotoPanelOpen(false);
      }

      existing.marker.setIcon(this.buildPhotoMarkerIcon(markerKey));
      return;
    }

    const marker = this.mapLeafletService.createPhotoMarker(
      [event.lat, event.lng],
      this.buildPhotoMarkerIcon(markerKey, {
        count: 1,
        thumbnailUrl: event.thumbnailUrl,
        direction: event.direction,
      }),
    );

    this.photoMarkerLayer!.addLayer(marker);
    this.attachMarkerInteractions(markerKey, marker);

    this.uploadedPhotoMarkers.set(markerKey, {
      marker,
      count: 1,
      lat: event.lat,
      lng: event.lng,
      thumbnailUrl: event.thumbnailUrl,
      direction: event.direction,
      mediaId: event.id,
      optimistic: true,
    });

    // Maintain secondary index for upload manager event lookups.
    if (event.id) {
      registerMarkerKeyForMedia(this.markersByMediaId, event.id, markerKey);
    }
  }

  private persistMapSessionCache(): void {
    if (!this.map || !this.lastFetchedBounds || this.lastFetchedZoom === null || !this.lastViewportRpcRows) {
      return;
    }

    const center = this.map.getCenter();
    this.mapSessionCache.write({
      centerLat: center.lat,
      centerLng: center.lng,
      zoom: this.map.getZoom() ?? this.lastFetchedZoom,
      fetchSouth: this.lastFetchedBounds.getSouth(),
      fetchWest: this.lastFetchedBounds.getWest(),
      fetchNorth: this.lastFetchedBounds.getNorth(),
      fetchEast: this.lastFetchedBounds.getEast(),
      roundedZoom: this.lastFetchedZoom,
      viewportRows: this.lastViewportRpcRows,
      cachedAt: Date.now(),
    });
  }

  private tryRestoreViewportFromSessionCache(): boolean {
    if (this.uploadedPhotoMarkers.size > 0) {
      return true;
    }

    const snapshot = this.mapSessionCache.read();
    if (!snapshot || !this.map) {
      return false;
    }

    this.isRestoringFromSessionCache = true;

    try {
      return this.restoreViewportFromSessionSnapshot(snapshot);
    } finally {
      this.isRestoringFromSessionCache = false;
    }
  }

  private restoreViewportFromSessionSnapshot(snapshot: MapSessionSnapshot): boolean {
    if (!this.map) {
      return false;
    }

    this.map.setView([snapshot.centerLat, snapshot.centerLng], snapshot.zoom, { animate: false });
    this.lastFetchedBounds = this.mapLeafletService.createBounds(
      [snapshot.fetchSouth, snapshot.fetchWest],
      [snapshot.fetchNorth, snapshot.fetchEast],
    );
    this.lastFetchedZoom = snapshot.roundedZoom;
    this.lastViewportRpcRows = [...snapshot.viewportRows];

    const rows = snapshot.viewportRows as ViewportMarkerRow[];
    const incoming = this.buildIncomingViewportMarkers(rows);
    const recyclableKeys = this.collectRecyclableMarkerKeys(incoming);
    this.mapMarkerReconcileFacade.reconcileIncomingViewportMarkers(
      incoming as Map<string, ReconcileIncomingRow>,
      recyclableKeys,
      this.getReconcileDependencies(),
    );
    this.mapMarkerReconcileFacade.removeRecyclableMarkers(
      recyclableKeys,
      this.getReconcileDependencies(),
    );

    this.pruneStaleSelectedMarkerKeys();

    for (const state of this.uploadedPhotoMarkers.values()) {
      state.optimistic = false;
    }

    this.maybeLoadThumbnails();
    this.flushPendingZoomHighlight();
    this.refreshActiveWorkspaceHoverLink();

    return true;
  }

  /**
   * Viewport-driven marker query.
   * Calls the `viewport_markers` RPC which returns server-side clusters
   * at low zoom and individual markers at high zoom. Reconciles the
   * result against existing markers (add / remove / update).
   */
  private async queryViewportMarkers(): Promise<void> {
    if (!this.map) return;

    // Abort any in-flight query.
    this.viewportQueryController?.abort();
    const controller = new AbortController();
    this.viewportQueryController = controller;

    const result = await this.viewportMarkerQueryService.fetchViewportMarkers<ViewportMarkerRow>(
      this.map,
      controller.signal,
    );

    // If this query was aborted, discard the result.
    if (result.aborted) return;
    this.viewportQueryController = null;

    // Cache the fetched bounds so small pans can skip the RPC.
    this.lastFetchedBounds = this.mapLeafletService.createBounds(
      [result.fetchSouth, result.fetchWest],
      [result.fetchNorth, result.fetchEast],
    );
    this.lastFetchedZoom = result.roundedZoom;

    if (result.error || !result.data) {
      this.flushPendingZoomHighlight();
      return;
    }

    this.lastViewportRpcRows = result.data;

    const incoming = this.buildIncomingViewportMarkers(result.data);
    const recyclableKeys = this.collectRecyclableMarkerKeys(incoming);
    this.mapMarkerReconcileFacade.reconcileIncomingViewportMarkers(
      incoming as Map<string, ReconcileIncomingRow>,
      recyclableKeys,
      this.getReconcileDependencies(),
    );
    this.mapMarkerReconcileFacade.removeRecyclableMarkers(
      recyclableKeys,
      this.getReconcileDependencies(),
    );

    this.pruneStaleSelectedMarkerKeys();

    // Clear optimistic flag from surviving markers.
    for (const state of this.uploadedPhotoMarkers.values()) {
      state.optimistic = false;
    }

    // Lazy-load thumbnails for all single-image markers in viewport.
    this.maybeLoadThumbnails();

    // If a zoom target was requested while this area was still loading,
    // try highlighting now that markers are reconciled.
    this.flushPendingZoomHighlight();
    this.refreshActiveWorkspaceHoverLink();

    if (
      this.linkedHoverMarkerFromMapKey &&
      !this.uploadedPhotoMarkers.has(this.linkedHoverMarkerFromMapKey)
    ) {
      this.setLinkedHoverMarkerFromMap(null);
      this.state.setLinkedHoveredWorkspaceMediaIds(new Set());
    }
  }

  private buildIncomingViewportMarkers(rows: ViewportMarkerRow[]): Map<string, MergedViewportRow> {
    const merged = this.mapMarkerClusterMergeService.mergeOverlappingClusters(
      this.map,
      rows,
      PHOTO_MARKER_ICON_SIZE[0],
    );

    // Build the incoming marker set keyed the same way we store them.
    const incoming = new Map<string, MergedViewportRow>();
    for (const row of merged) {
      if (typeof row.cluster_lat !== 'number' || typeof row.cluster_lng !== 'number') continue;
      const key =
        row.image_count === 1 && row.location_id
          ? `loc:${row.location_id}`
          : this.toMarkerKey(row.cluster_lat, row.cluster_lng);
      incoming.set(key, row);
    }

    return incoming;
  }

  private collectRecyclableMarkerKeys(incoming: Map<string, MergedViewportRow>): Set<string> {
    // Mark non-optimistic outgoing markers as recyclable first. Some can be
    // re-used for incoming markers so they animate to the new centroid.
    const recyclableKeys = new Set<string>();
    for (const [key, state] of this.uploadedPhotoMarkers) {
      if (state.optimistic) continue;
      if (!incoming.has(key)) {
        recyclableKeys.add(key);
      }
    }
    return recyclableKeys;
  }

  private getReconcileDependencies(): ReconcileDependencies {
    return {
      photoMarkerLayer: this.photoMarkerLayer!,
      uploadedPhotoMarkers: this.uploadedPhotoMarkers,
      markersByMediaId: this.markersByMediaId,
      selectedMarkerKey: () => this.selectedMarkerKey(),
      setSelectedMarkerKey: (markerKey: string | null) =>
        this.state.setSelectedMarkerKey(markerKey),
      findReusableMarkerKey: (row, keys) =>
        this.mapMarkerReuseStrategyService.findReusableMarkerKey(
          this.map,
          this.markersByMediaId,
          this.uploadedPhotoMarkers,
          row,
          keys,
        ),
      findSpawnOriginForIncomingRow: (row, keys) =>
        this.mapMarkerReuseStrategyService.findSpawnOriginForIncomingRow(
          this.map,
          this.uploadedPhotoMarkers,
          row,
          keys,
        ),
      buildFallbackLabelFromPath: (path) => this.buildFallbackLabelFromPath(path),
      buildPhotoMarkerIcon: (markerKey, override) => this.buildPhotoMarkerIcon(markerKey, override),
      attachMarkerInteractions: (markerKey, marker, fadeIn) =>
        this.attachMarkerInteractions(markerKey, marker, { fadeIn }),
      bindMarkerClickInteraction: (markerKey, marker) =>
        this.bindMarkerClickInteraction(markerKey, marker),
      bindMarkerContextInteraction: (markerKey, marker) =>
        this.bindMarkerContextInteraction(markerKey, marker),
      bindMarkerHoverInteraction: (markerKey, marker) =>
        this.bindMarkerHoverInteraction(markerKey, marker),
      animateMarkerPosition: (marker, lat, lng) => this.animateMarkerPosition(marker, lat, lng),
      refreshPhotoMarker: (markerKey) => this.refreshPhotoMarker(markerKey),
      cancelMarkerMoveAnimation: (marker) => this.cancelMarkerMoveAnimation(marker),
      suppressMarkerFadeIn: this.isRestoringFromSessionCache,
    };
  }

  private pruneStaleSelectedMarkerKeys(): void {
    const staleSelectedKeys = new Set(this.selectedMarkerKeys());
    let selectedKeysChanged = false;
    for (const markerKey of staleSelectedKeys) {
      if (this.uploadedPhotoMarkers.has(markerKey)) {
        continue;
      }
      staleSelectedKeys.delete(markerKey);
      selectedKeysChanged = true;
    }
    if (selectedKeysChanged) {
      this.state.setSelectedMarkerKeys(staleSelectedKeys);
    }
  }

  private buildPhotoMarkerIcon(
    markerKey: string,
    override?: Partial<{
      count: number;
      thumbnailUrl?: string;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
    }>,
  ): MapDivIcon {
    const markerState = this.uploadedPhotoMarkers.get(markerKey);
    const fallbackLabel =
      override?.fallbackLabel ??
      markerState?.fallbackLabel ??
      this.getMarkerFallbackLabel(markerState);
    const iconState = this.photoMarkerIconStateService.resolveIconState(
      markerState,
      override,
      fallbackLabel,
    );

    return this.mapLeafletService.createPhotoMarkerIcon(
      buildPhotoMarkerHtml({
        count: iconState.count,
        thumbnailUrl: iconState.thumbnailUrl,
        fallbackLabel: iconState.fallbackLabel,
        bearing: iconState.direction,
        selected: this.isMarkerSelected(markerKey),
        linkedHover: this.isMarkerLinkedHovered(markerKey),
        corrected: iconState.corrected,
        uploading: iconState.uploading,
        loading: iconState.loading,
        zoomLevel: this.getPhotoMarkerZoomLevel(),
      }),
    );
  }

  private handlePhotoMarkerClick(markerKey: string, clickEvent?: MapMouseEvent): void {
    const markerState = this.uploadedPhotoMarkers.get(markerKey);
    if (!markerState) {
      return;
    }

    // Always open pane and mark marker selected.
    this.setSelectedMarker(markerKey);
    this.ensurePhotoPanelOpen();

    // Load images at this marker's grid position(s) into the workspace view.
    const zoom = Math.round(this.map?.getZoom() ?? 13);
    const cells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
    const additive = this.isAdditiveMarkerSelection(clickEvent);

    if (additive) {
      this.handleAdditiveMarkerSelection(markerKey, cells, zoom);
      return;
    }

    this.handleExclusiveMarkerSelection(
      markerKey,
      markerState.count,
      markerState.mediaId,
      cells,
      zoom,
    );
  }

  private ensurePhotoPanelOpen(): void {
    if (!this.photoPanelOpen()) {
      this.state.setWorkspacePaneWidth(this.getWorkspacePaneOpeningWidth());
    }
    this.state.setPhotoPanelOpen(true);
  }

  private isAdditiveMarkerSelection(clickEvent?: MapMouseEvent): boolean {
    return !!(clickEvent?.originalEvent.ctrlKey || clickEvent?.originalEvent.metaKey);
  }

  private handleAdditiveMarkerSelection(
    markerKey: string,
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): void {
    // Ctrl/Meta-click appends marker results to the current active selection.
    const selectedKeys = new Set(this.selectedMarkerKeys());
    selectedKeys.add(markerKey);
    this.setSelectedMarkerKeys(selectedKeys);
    void this.addMarkerCellsToSelection(cells, zoom);
    this.patchDetailMediaId(null);
  }

  private handleExclusiveMarkerSelection(
    markerKey: string,
    markerCount: number,
    mediaId: string | undefined,
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): void {
    this.setSelectedMarkerKeys(new Set([markerKey]));

    if (markerCount === 1 && mediaId) {
      this.workspaceSelectionService.setSingle(mediaId);
      this.openDetailView(mediaId);
      return;
    }

    void this.selectClusterImages(cells, zoom);
    this.patchDetailMediaId(null);
  }

  private async selectClusterImages(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<void> {
    const images = await this.workspaceViewService.fetchClusterImages(cells, zoom);
    this.workspaceSelectionService.selectAllInScope(images.map((image) => image.id));
  }

  /** Attach click + touch long-press interactions consistently for each new marker. */
  private attachMarkerInteractions(
    markerKey: string,
    marker: MapMarker,
    options?: { fadeIn?: boolean },
  ): void {
    const shouldFadeIn = options?.fadeIn ?? true;
    this.bindMarkerClickInteraction(markerKey, marker);
    this.bindMarkerContextInteraction(markerKey, marker);
    this.bindMarkerHoverInteraction(markerKey, marker);
    // Attach long-press handler for touch direction cone after element is in DOM.
    marker.once('add', () => {
      const el = marker.getElement();
      if (el) {
        this.attachLongPressHandler(el, markerKey);
        if (shouldFadeIn) {
          this.triggerMarkerFadeIn(el);
        }
      }
    });
  }

  /** Ensure marker click always resolves to the current marker key. */
  private bindMarkerClickInteraction(markerKey: string, marker: MapMarker): void {
    this.markerInteractionService.bindClick(marker, (event: MapMouseEvent) =>
      this.handlePhotoMarkerClick(markerKey, event),
    );
  }

  private bindMarkerContextInteraction(markerKey: string, marker: MapMarker): void {
    this.markerInteractionService.bindContextMenu(marker, {
      shouldBypass: () => this.consumeNativeContextMenuBypass(),
      onSecondaryReset: () => {
        this.pendingSecondaryPress = null;
      },
      onOpen: (event: MouseEvent) => {
        this.handleMarkerSecondaryOpen(markerKey, event);
      },
    });
  }

  /**
   * Marker right-click and touch long-press must share the same precedence as
   * map-secondary-click-system (radius-inside → radius menu; outside → dismiss
   * radius then marker menu).
   */
  private handleMarkerSecondaryOpen(markerKey: string, event: MouseEvent | PointerEvent): void {
    if (this.radiusSelectionService.hasCommittedSelection(this.radiusCommittedVisuals)) {
      const state = this.uploadedPhotoMarkers.get(markerKey);
      if (state) {
        const markerLatLng = this.mapLeafletService.createLatLng(state.lat, state.lng);
        const isInsideCommittedRadius = this.radiusSelectionService.isInsideAnyCommittedRadius(
          this.map,
          this.radiusCommittedVisuals,
          markerLatLng,
        );

        if (isInsideCommittedRadius) {
          this.openRadiusContextMenuAt(markerLatLng, event.clientX, event.clientY);
          return;
        }

        // Clicking a marker outside the active radius exits radius mode
        // and falls through to marker/cluster context for that marker.
        this.clearActiveRadiusSelection();
      }
    }

    this.markerContextMenuSuppressUntil =
      Date.now() + MapShellComponent.MARKER_CONTEXT_MENU_SUPPRESS_MS;
    this.openMarkerContextMenu(markerKey, event);
  }

  private bindMarkerHoverInteraction(markerKey: string, marker: MapMarker): void {
    this.markerInteractionService.bindHover(marker, {
      onEnter: () => {
        this.setLinkedHoverMarkerFromMap(markerKey);
        this.setLinkedHoveredWorkspaceImageIdsForMarker(markerKey);
      },
      onLeave: () => {
        if (this.linkedHoverMarkerFromMapKey !== markerKey) {
          return;
        }
        this.setLinkedHoverMarkerFromMap(null);
        this.state.setLinkedHoveredWorkspaceMediaIds(new Set());
      },
    });
  }

  private async addMarkerCellsToSelection(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<void> {
    const incoming = await this.workspaceViewService.fetchClusterImages(cells, zoom);
    const mergedIds = Array.from(
      new Set([
        ...this.workspaceSelectionService.selectedMediaIds(),
        ...incoming.map((image) => image.id),
      ]),
    );
    this.workspaceSelectionService.selectAllInScope(mergedIds);
  }

  /** Fade in newly added marker elements for smoother cluster reconciliation. */
  private triggerMarkerFadeIn(el: HTMLElement): void {
    if (
      this.markerMotionPreference() === 'off' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    this.markerInteractionService.triggerFadeIn(el, 300);
  }

  /**
   * Animate marker movement when a surviving marker gets a new centroid.
   * Uses frame-based interpolation with easing so interrupted updates
   * can be retargeted cleanly without visual popping.
   */
  private animateMarkerPosition(marker: MapMarker, lat: number, lng: number): void {
    this.markerMotionService.animateMarkerPosition(
      marker,
      lat,
      lng,
      this.markerMotionPreference(),
      MapShellComponent.MARKER_MOVE_DURATION_MS,
    );
  }

  private cancelMarkerMoveAnimation(marker: MapMarker): void {
    this.markerMotionService.cancelMarkerMoveAnimation(marker);
  }

  /**
   * Attach a 500 ms long-press handler to a marker element.
   * On long press, toggles `.map-photo-marker--long-pressed` so the direction
   * cone is visible on touch devices (mirrors the desktop `:hover` affordance).
   */
  private attachLongPressHandler(el: HTMLElement, markerKey: string): void {
    this.markerInteractionService.attachLongPress(
      el,
      MapShellComponent.MARKER_LONG_PRESS_MS,
      (event: PointerEvent) => {
        el.classList.add('map-photo-marker--long-pressed');
        this.handleMarkerSecondaryOpen(markerKey, event);
      },
    );

    // Dismiss on tap/click.
    el.addEventListener('click', () => {
      el.classList.remove('map-photo-marker--long-pressed');
    });
  }

  private setSelectedMarker(markerKey: string | null): void {
    const previousMarkerKey = this.selectedMarkerKey();
    if (previousMarkerKey === markerKey) {
      return;
    }

    this.state.setSelectedMarkerKey(markerKey);

    if (previousMarkerKey) {
      this.refreshPhotoMarker(previousMarkerKey);
    }

    if (markerKey) {
      this.refreshPhotoMarker(markerKey);
    }
  }

  private setSelectedMarkerKeys(nextKeys: Set<string>): void {
    const previousKeys = this.selectedMarkerKeys();

    if (this.markerSelectionSyncService.areSameKeySet(previousKeys, nextKeys)) {
      return;
    }

    this.state.setSelectedMarkerKeys(nextKeys);
    this.markerSelectionSyncService.refreshChangedKeySet(previousKeys, nextKeys, (markerKey) =>
      this.refreshPhotoMarker(markerKey),
    );
  }

  private isMarkerSelected(markerKey: string): boolean {
    return (
      markerKey === this.selectedMarkerKey() ||
      this.selectedMarkerKeys().has(markerKey) ||
      this.radiusDraftHighlightedKeys.has(markerKey)
    );
  }

  private isMarkerLinkedHovered(markerKey: string): boolean {
    // Map hover visuals are handled by CSS :hover to avoid icon re-renders while hovering.
    // Keep JS-linked hover only for workspace-originated hover state.
    return markerKey === this.linkedHoverMarkerFromWorkspaceKey;
  }

  private setLinkedHoverMarkerFromWorkspace(markerKey: string | null): void {
    const previous = this.linkedHoverMarkerFromWorkspaceKey;
    const changed = this.markerSelectionSyncService.applySingleMarkerChange(
      previous,
      markerKey,
      (key) => this.refreshPhotoMarker(key),
    );
    if (!changed) return;
    this.linkedHoverMarkerFromWorkspaceKey = markerKey;
  }

  private setLinkedHoverMarkerFromMap(markerKey: string | null): void {
    if (this.linkedHoverMarkerFromMapKey === markerKey) {
      return;
    }
    this.linkedHoverMarkerFromMapKey = markerKey;
  }

  private setLinkedHoveredWorkspaceImageIdsForMarker(markerKey: string | null): void {
    if (!markerKey) {
      this.state.setLinkedHoveredWorkspaceMediaIds(new Set());
      return;
    }

    const markerState = this.uploadedPhotoMarkers.get(markerKey);
    const matchedIds = this.markerSelectionSyncService.buildLinkedWorkspaceImageIds(
      markerState,
      this.workspaceViewService.rawImages(),
      (lat, lng) => this.toMarkerKey(lat, lng),
    );
    this.state.setLinkedHoveredWorkspaceMediaIds(matchedIds);
  }

  private refreshActiveWorkspaceHoverLink(): void {
    const activeHover = this.activeWorkspaceHover;
    if (!activeHover) {
      this.setLinkedHoverMarkerFromWorkspace(null);
      return;
    }

    const markerKey = this.resolveZoomTargetMarkerKey(
      activeHover.mediaId,
      activeHover.lat,
      activeHover.lng,
      true,
    );
    this.setLinkedHoverMarkerFromWorkspace(markerKey);
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

    const currentZoom = this.getPhotoMarkerZoomLevel();
    this.closeContextMenus();
    const zoomChanged = currentZoom !== this.lastZoomLevel;

    if (!this.isViewportStillInFetchedBuffer(zoomChanged)) {
      void this.queryViewportMarkers();
    }

    // Refresh existing marker icons if zoom-level threshold changed.
    if (zoomChanged) {
      this.lastZoomLevel = currentZoom;
      for (const markerKey of this.uploadedPhotoMarkers.keys()) {
        this.refreshPhotoMarker(markerKey);
      }
    }
  }

  private isViewportStillInFetchedBuffer(zoomChanged: boolean): boolean {
    if (zoomChanged || !this.lastFetchedBounds || !this.map) {
      return false;
    }

    const mapZoom = Math.round(this.map.getZoom() ?? 0);
    return (
      this.lastFetchedZoom === mapZoom && this.lastFetchedBounds.contains(this.map.getBounds())
    );
  }

  /**
   * Lazy-load thumbnails for single-image markers visible in the current viewport.
   * Fires for all zoom levels — single-image markers always show a photo.
   * Only requests signed URLs for markers without a URL yet, and proactively
   * refreshes URLs older than 50 minutes.
   */
  private maybeLoadThumbnails(): void {
    if (!this.map) return;

    const bounds = this.map.getBounds();
    const staleThreshold = 50 * 60 * 1000; // 50 minutes

    this.mediaDownloadService.invalidateStale(staleThreshold);

    for (const [key, state] of this.uploadedPhotoMarkers) {
      if (!this.isSingleMarkerInBounds(state, bounds)) continue;
      this.clearStaleThumbnailIfNeeded(state, staleThreshold);
      this.scheduleThumbnailLoadIfNeeded(key, state);
    }
  }

  private isSingleMarkerInBounds(
    state: { count: number; lat: number; lng: number },
    bounds: MapLatLngBounds,
  ): boolean {
    return state.count === 1 && bounds.contains([state.lat, state.lng]);
  }

  private clearStaleThumbnailIfNeeded(
    state: { thumbnailUrl?: string; signedAt?: number },
    staleThreshold: number,
  ): void {
    if (!state.thumbnailUrl || !state.signedAt) {
      return;
    }
    if (Date.now() - state.signedAt <= staleThreshold) {
      return;
    }

    // Proactively clear stale URLs so they get re-signed.
    state.thumbnailUrl = undefined;
    state.signedAt = undefined;
  }

  private scheduleThumbnailLoadIfNeeded(
    key: string,
    state: {
      thumbnailSourcePath?: string;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      signedAt?: number;
    },
  ): void {
    if (state.thumbnailUrl || !state.thumbnailSourcePath || state.thumbnailLoading) {
      return;
    }
    void this.lazyLoadThumbnail(key, state);
  }

  /**
   * Fetch a signed thumbnail URL for one marker with server-side
   * image transformation (80×80 cover). Updates the marker icon
   * once the URL is available, or leaves the placeholder on error.
   */
  private async lazyLoadThumbnail(
    key: string,
    state: {
      mediaId?: string;
      thumbnailSourcePath?: string;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      signedAt?: number;
    },
  ): Promise<void> {
    if (!state.thumbnailSourcePath || state.thumbnailUrl || state.thumbnailLoading) return;

    state.thumbnailLoading = true;
    this.refreshPhotoMarker(key);

    const mediaId = state.mediaId;
    if (mediaId) {
      const cached = this.mediaDownloadService.getCachedUrl(mediaId, 'marker');
      if (cached) {
        state.thumbnailLoading = false;
        state.thumbnailUrl = cached;
        state.signedAt = Date.now();
        this.refreshPhotoMarker(key);
        return;
      }
    }

    const result = mediaId
      ? await this.mediaDownloadService.resolveMarkerPreview(mediaId, state.thumbnailSourcePath)
      : await this.mediaDownloadService.getSignedUrl(state.thumbnailSourcePath, 'marker');

    if (result.url) {
      const loaded = await this.mediaDownloadService.preload(result.url);
      state.thumbnailLoading = false;
      if (loaded) {
        state.thumbnailUrl = result.url;
        state.signedAt = Date.now();
      }
    } else {
      state.thumbnailLoading = false;
    }
    // On error or preload failure: thumbnailUrl stays undefined → placeholder remains visible.
    this.refreshPhotoMarker(key);
  }

  private refreshPhotoMarker(markerKey: string): void {
    const markerState = this.uploadedPhotoMarkers.get(markerKey);
    if (!markerState) {
      return;
    }

    const snapshot = this.buildMarkerRenderSnapshot(markerKey, markerState);

    // Skip DOM update when nothing visual has changed.
    if (this.hasSameMarkerRender(markerState.lastRendered, snapshot)) {
      return;
    }

    markerState.lastRendered = snapshot;
    this.renderPhotoMarker(markerKey, markerState, snapshot);
  }

  private buildMarkerRenderSnapshot(
    markerKey: string,
    markerState: {
      count: number;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
    },
  ): MarkerRenderSnapshot {
    return {
      count: markerState.count,
      thumbnailUrl: markerState.thumbnailUrl,
      thumbnailLoading: markerState.thumbnailLoading,
      fallbackLabel: markerState.fallbackLabel,
      direction: markerState.direction,
      corrected: markerState.corrected,
      uploading: markerState.uploading,
      selected: this.isMarkerSelected(markerKey),
      linkedHover: this.isMarkerLinkedHovered(markerKey),
      zoomLevel: this.getPhotoMarkerZoomLevel(),
    };
  }

  private hasSameMarkerRender(
    previous: MarkerRenderSnapshot | undefined,
    next: MarkerRenderSnapshot,
  ): boolean {
    if (!previous) {
      return false;
    }

    const checks = [
      previous.count === next.count,
      previous.thumbnailUrl === next.thumbnailUrl,
      previous.thumbnailLoading === next.thumbnailLoading,
      previous.fallbackLabel === next.fallbackLabel,
      previous.direction === next.direction,
      previous.corrected === next.corrected,
      previous.uploading === next.uploading,
      previous.selected === next.selected,
      previous.linkedHover === next.linkedHover,
      previous.zoomLevel === next.zoomLevel,
    ];

    return checks.every(Boolean);
  }

  private renderPhotoMarker(
    markerKey: string,
    markerState: {
      marker: MapMarker;
      count: number;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
      thumbnailSourcePath?: string;
    },
    snapshot: MarkerRenderSnapshot,
  ): void {
    const markerElement = markerState.marker.getElement();

    // Direct innerHTML swap instead of setIcon() — avoids destroying
    // and recreating the entire DOM subtree for every update.
    if (markerElement) {
      markerElement.innerHTML = buildPhotoMarkerHtml({
        count: markerState.count,
        thumbnailUrl: markerState.thumbnailUrl,
        fallbackLabel: markerState.fallbackLabel ?? this.getMarkerFallbackLabel(markerState),
        bearing: markerState.direction,
        selected: snapshot.selected,
        linkedHover: snapshot.linkedHover,
        corrected: markerState.corrected,
        uploading: markerState.uploading,
        loading: markerState.thumbnailLoading,
        zoomLevel: snapshot.zoomLevel,
      });
      return;
    }

    // Fallback if element not yet in DOM.
    markerState.marker.setIcon(this.buildPhotoMarkerIcon(markerKey));
  }

  private getMarkerFallbackLabel(
    state:
      | {
          count: number;
          thumbnailSourcePath?: string;
          fallbackLabel?: string;
        }
      | undefined,
  ): string | undefined {
    if (!state || state.count !== 1) return undefined;
    if (state.fallbackLabel) return state.fallbackLabel;
    return this.buildFallbackLabelFromPath(state.thumbnailSourcePath);
  }

  private buildFallbackLabelFromPath(path: string | undefined): string | undefined {
    if (!path) return undefined;

    return fileTypeBadge({ fileName: path }) ?? undefined;
  }

  private getPhotoMarkerZoomLevel(): PhotoMarkerZoomLevel {
    const zoom = this.map?.getZoom() ?? 13;

    if (zoom >= 16) {
      return 'near';
    }

    if (zoom >= 13) {
      return 'mid';
    }

    return 'far';
  }

  private openMapContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.state.setRadiusContextMenuOpen(false);
    this.state.setMarkerContextMenuOpen(false);
    this.state.setMapContextMenuCoords({ lat: latlng.lat, lng: latlng.lng });
    this.state.setMapContextMenuPosition(position);
    this.state.setMapContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
  }

  private openRadiusContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.state.setMapContextMenuOpen(false);
    this.state.setMarkerContextMenuOpen(false);
    this.state.setRadiusContextMenuCoords({ lat: latlng.lat, lng: latlng.lng });
    this.state.setRadiusContextMenuPosition(position);
    this.state.setRadiusContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
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
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
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
    this.clearRadiusSelectionVisuals();
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.patchDetailMediaId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
  }

  private async promptProjectSelection(): Promise<{ id: string; name: string } | null> {
    const projects = await this.mapProjectActionsService.loadProjectOptions();

    if (!projects.ok) {
      this.toastService.show({
        message: 'Keine Projekte verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      return null;
    }

    return this.mapProjectDialogService.openProjectSelectionDialog(
      this.state,
      projects.options,
      'Projekt auswaehlen',
      'Waehle ein bestehendes Projekt fuer die Zuweisung aus.',
    );
  }

  private getRemoveImagesFromProjectsFailureMessage(
    result: RemoveImagesFromProjectsResult,
  ): string {
    switch (result.reason) {
      case 'lookup-error':
        return 'Projektzuordnungen konnten nicht geladen werden.';
      case 'remove-error':
        return 'Entfernen aus Projekten ist fehlgeschlagen.';
      case 'empty':
        return 'Keine Projektzuordnungen gefunden.';
      default:
        return 'Entfernen aus Projekten ist fehlgeschlagen.';
    }
  }

  private async promptProjectNameFromRadius(): Promise<string | null> {
    return this.mapProjectDialogService.openProjectNameDialog(
      this.state,
      'Name fuer neues Projekt aus Radius',
      'Neues Radius Projekt',
      'Gib einen Projektnamen ein.',
    );
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

  private async resolveMarkerContextMediaIds(): Promise<string[]> {
    const payload = this.markerContextMenuPayload();
    if (!payload) {
      return [];
    }

    const mediaIds = await this.mapContextActionsService.resolveMarkerContextMediaIds(
      payload,
      (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
      this.map?.getZoom() ?? 13,
    );

    return Array.from(new Set(mediaIds));
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
