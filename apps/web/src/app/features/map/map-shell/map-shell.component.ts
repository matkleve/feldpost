/**
 * MapShellComponent — the main application shell after authentication.
 *
 * Full-screen map with:
 *  - UploadButton: fixed top-right, click-toggles the UploadPanel.
 *  - SearchBar: floating top-center with Nominatim geocoding.
 *  - GPSButton: floating bottom-right, re-centres map on user position.
 *  - PhotoPanel: slides in from right (desktop) / bottom (mobile) on marker click.
 *  - DragDivider: resize handle shown when PhotoPanel is open.
 *
 * Ground rules:
 *  - Leaflet is initialised in afterNextRender so it only runs in the browser.
 *  - `map` is protected (not private) so unit tests can inject a mock instance.
 *  - Signals for all local UI state; no RxJS subjects.
 *  - Nominatim results are fetched with debounce (300 ms) via native fetch().
 */

/* eslint-disable max-lines, max-lines-per-function, no-magic-numbers, @typescript-eslint/explicit-function-return-type, @typescript-eslint/consistent-type-imports */

import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import {
  UploadPanelComponent,
  ImageUploadedEvent,
  type UploadLocationMapPickRequest,
  type UploadLocationPreviewEvent,
} from '../../upload/upload-panel.component';
import { ExifCoords } from '../../../core/upload/upload.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../core/geocoding.service';
import {
  UploadManagerService,
  ImageReplacedEvent,
  ImageAttachedEvent,
  UploadFailedEvent,
  type UploadJob,
} from '../../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../../core/workspace-view.service';
import { WorkspaceSelectionService } from '../../../core/workspace-selection.service';
import { PhotoLoadService, PHOTO_PLACEHOLDER_ICON } from '../../../core/photo-load.service';
import { ToastService } from '../../../core/toast.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { SearchQueryContext } from '../../../core/search/search.models';
import { WorkspacePaneComponent } from '../workspace-pane/workspace-pane.component';
import { WorkspacePaneShellComponent } from '../workspace-pane/workspace-pane-shell.component';
import type { ThumbnailCardHoverEvent } from '../workspace-pane/thumbnail-card/thumbnail-card.component';
import { SettingsPaneService } from '../../../core/settings-pane.service';
import { ProjectSelectDialogComponent } from '../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../shared/text-input-dialog/text-input-dialog.component';
import {
  SegmentedSwitchComponent,
  type SegmentedSwitchOption,
} from '../../../shared/segmented-switch/segmented-switch.component';
import { DropdownShellComponent } from '../../../shared/dropdown-trigger/dropdown-shell.component';
import { ActionEngineService } from '../../action-system/action-engine.service';
import { ResolvedAction } from '../../action-system/action-types';
import { fileTypeBadge } from '../../../core/media/file-type-registry';
import {
  buildPhotoMarkerHtml,
  PHOTO_MARKER_ICON_ANCHOR,
  PHOTO_MARKER_ICON_SIZE,
  PHOTO_MARKER_POPUP_ANCHOR,
  PhotoMarkerZoomLevel,
} from '../../../core/map/marker-factory';
import { MapShellState } from './map-shell.state';
import { DetailZoomHighlightService } from './detail-zoom-highlight.service';
import { MarkerInteractionService } from './marker-interaction.service';
import { ViewportMarkerQueryService } from './viewport-marker-query.service';
import {
  MapMarkerReconcileFacade,
  PhotoMarkerState,
  ReconcileDependencies,
  ReconcileIncomingRow,
} from './map-marker-reconcile.facade';
import { MapMarkerClusterMergeService } from './map-marker-cluster-merge.service';
import { MapMarkerReuseStrategyService } from './map-marker-reuse-strategy.service';
import { RadiusSelectionService } from './radius-selection.service';
import { ZoomTargetMarkerService } from './zoom-target-marker.service';
import { RadiusCommittedVisual, RadiusVisualsService } from './radius-visuals.service';
import { RadiusDraftHighlightService } from './radius-draft-highlight.service';
import { MapContextActionsService } from './map-context-actions.service';
import { MarkerContextPhotoDeleteService } from './marker-context-photo-delete.service';
import { PhotoMarkerIconStateService } from './photo-marker-icon-state.service';
import { MarkerSelectionSyncService } from './marker-selection-sync.service';
import { MarkerMotionService } from './marker-motion.service';
import { MapBasemapPreference, MapPreferencesService } from './map-preferences.service';
import { MapBasemapLayerService } from './map-basemap-layer.service';
import { MapFocusPayloadService } from './map-focus-payload.service';
import { ShareTokenSelectionService } from './share-token-selection.service';
import { MapGeolocationService } from './map-geolocation.service';
import { DeferredStartupHandles, MapDeferredStartupService } from './map-deferred-startup.service';
import { MapProjectActionsService } from './map-project-actions.service';
import { MapProjectDialogService } from './map-project-dialog.service';
import { MarkerStateMutationsService } from './marker-state-mutations.service';
import { WorkspacePaneObserverAdapter } from '../../../core/workspace-pane-observer.adapter';
import { MediaLocationUpdateService } from '../../../core/media-location-update.service';
import type { SelectedItemsContextPort } from '../../../core/workspace-pane-context.port';
import { getLaneForJob } from '../../upload/upload-phase.helpers';
import {
  MAP_MENU_ACTION_DEFINITIONS,
  MARKER_MENU_ACTION_DEFINITIONS,
} from './map-workspace-actions.registry';
import { RADIUS_SELECTION_ACTION_DEFINITIONS } from './radius-selection-actions.registry';
import { MapWorkspaceContextResolverService } from './map-workspace-context-resolver.service';
import { MapWorkspaceActionExecutorService } from './map-workspace-action-executor.service';
import type {
  MapMenuActionId,
  MarkerMenuActionId,
  RadiusActionContext,
  RadiusMenuActionId,
} from './map-workspace-actions.types';
import {
  UiButtonDirective,
  UiButtonGhostDirective,
  UiButtonIconOnlyDirective,
} from '../../../shared/ui-primitives/ui-primitives.directive';

type MarkerMotionPreference = 'off' | 'smooth';
type MapViewMode = 'street' | 'photo';

type ViewportMarkerRow = {
  cluster_lat: number;
  cluster_lng: number;
  image_count: number;
  image_id: string | null;
  media_item_id?: string | null;
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
const WORKSPACE_PANE_WIDTH_STORAGE_KEY = 'sitesnap.settings.layout.workspacePaneWidth';

@Component({
  selector: 'app-map-shell',
  imports: [
    UploadPanelComponent,
    SearchBarComponent,
    WorkspacePaneComponent,
    WorkspacePaneShellComponent,
    ProjectSelectDialogComponent,
    TextInputDialogComponent,
    SegmentedSwitchComponent,
    DropdownShellComponent,
    UiButtonDirective,
    UiButtonIconOnlyDirective,
    UiButtonGhostDirective,
  ],
  templateUrl: './map-shell.component.html',
  styleUrl: './map-shell.component.scss',
  providers: [MapShellState],
  host: {
    '[style.--placeholder-icon]': 'placeholderIconUrl',
    '(document:keydown.escape)': 'onMapMenuCloseRequested()',
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

  readonly placeholderIconUrl = `url("${PHOTO_PLACEHOLDER_ICON}")`;
  private readonly supabaseService = inject(SupabaseService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly uploadManagerService = inject(UploadManagerService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly photoLoadService = inject(PhotoLoadService);
  private readonly toastService = inject(ToastService);
  private readonly i18nService = inject(I18nService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly settingsPaneService = inject(SettingsPaneService);
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
  private readonly mapFocusPayloadService = inject(MapFocusPayloadService);
  private readonly shareTokenSelectionService = inject(ShareTokenSelectionService);
  private readonly mapGeolocationService = inject(MapGeolocationService);
  private readonly mapDeferredStartupService = inject(MapDeferredStartupService);
  private readonly mapProjectActionsService = inject(MapProjectActionsService);
  private readonly mapProjectDialogService = inject(MapProjectDialogService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly mediaLocationUpdateService = inject(MediaLocationUpdateService);
  private readonly actionEngineService = inject(ActionEngineService);
  private readonly mapWorkspaceContextResolverService = inject(MapWorkspaceContextResolverService);
  private readonly mapWorkspaceActionExecutorService = inject(MapWorkspaceActionExecutorService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  /** Reference to the Leaflet map container div. */
  private readonly mapContainerRef = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  /** Reference to the UploadPanelComponent child (for placeFile calls). */
  private readonly uploadPanelChild = viewChild(UploadPanelComponent);
  private readonly pendingMapFocus = signal<{ mediaId: string; lat: number; lng: number } | null>(
    this.mapFocusPayloadService.readMapFocusPayload(this.router),
  );

  /**
   * Leaflet map instance. Protected (not private) so unit tests can inject
   * a mock to test behaviour without initialising the real Leaflet map.
   */
  protected map?: L.Map;

  // ── Upload / placement state ─────────────────────────────────────────────

  /** True when user explicitly opened the upload panel via click. */
  readonly uploadPanelPinned = signal(false);

  /** Final visibility state: click-pinned open only. */
  readonly uploadPanelOpen = this.uploadPanelPinned;
  readonly workspacePaneActiveTab = this.workspacePaneObserver.activeTab$;
  readonly uploadBatch = this.uploadManagerService.activeBatch;
  readonly uploadBatchProgress = computed(() => this.uploadBatch()?.overallProgress ?? 0);
  readonly uploadBatchActive = computed(() => {
    const batch = this.uploadBatch();
    return !!batch && (batch.status === 'uploading' || batch.status === 'scanning');
  });
  readonly collapsedPreviewItems = computed(() => {
    if (this.uploadPanelOpen()) {
      return [] as UploadJob[];
    }

    const jobs = this.uploadManagerService
      .jobs()
      .filter((job) => getLaneForJob(job) === 'uploading')
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

    return jobs.slice(0, 3);
  });
  readonly showExpandedUploadButton = computed(
    () => !this.uploadPanelOpen() && this.uploadBatchActive(),
  );
  readonly uploadHasIssues = computed(() =>
    this.uploadManagerService.jobs().some((job) => getLaneForJob(job) === 'issues'),
  );
  readonly uploadSummaryCurrent = computed(() => {
    const batch = this.uploadBatch();
    if (!batch || batch.totalFiles <= 0) {
      return 0;
    }

    const doneCount = batch.completedFiles + batch.failedFiles + batch.skippedFiles;
    const inFlight = this.uploadBatchActive() ? 1 : 0;
    return Math.min(batch.totalFiles, Math.max(0, doneCount + inFlight));
  });
  readonly uploadSummaryTotal = computed(() => this.uploadBatch()?.totalFiles ?? 0);

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
  readonly mapViewOptions = computed<ReadonlyArray<SegmentedSwitchOption>>(() => [
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
  readonly detailAddressSearchRequest = signal<{ mediaId: string; requestId: number } | null>(null);

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

  private userLocationMarker: L.Marker | null = null;
  private searchLocationMarker: L.Marker | null = null;
  private draftMediaMarkerLeaflet: L.Marker | null = null;
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
  private photoMarkerLayer: L.LayerGroup | null = null;
  private activeBaseTileLayer: L.TileLayer | null = null;
  private radiusDrawStartLatLng: L.LatLng | null = null;
  private radiusDrawActive = false;
  private radiusDrawAdditive = false;
  private radiusDraftLine: L.Polyline | null = null;
  private radiusDraftCircle: L.Circle | null = null;
  private radiusDraftLabel: L.Marker | null = null;
  private radiusDrawMoveHandler: ((event: L.LeafletMouseEvent) => void) | null = null;
  private radiusDrawMouseUpHandler: ((event: L.LeafletMouseEvent) => void) | null = null;
  private pendingSecondaryPress: {
    startPoint: L.Point;
    startLatLng: L.LatLng;
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
  private lastFetchedBounds: L.LatLngBounds | null = null;
  private lastFetchedZoom: number | null = null;

  /** True while a zoom animation is in progress — suppresses moveend queries. */
  private zoomAnimating = false;

  /**
   * Secondary index: mediaId → markerKey for O(1) lookups when
   * handling upload manager events (replace, attach).
   */
  private readonly markersByMediaId = new Map<string, string>();
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
  private shareTokenResolved = false;
  private readonly preferredWorkspacePaneWidth = signal<number | null>(null);
  private readonly mapSelectedItemsContext: SelectedItemsContextPort = {
    contextKey: 'map',
    selectedMediaIds$: this.workspaceSelectionService.selectedMediaIds,
    requestOpenDetail: (mediaId: string) => this.openDetailView(mediaId),
    requestSetHover: (mediaId: string | null) => {
      if (!mediaId) {
        this.setLinkedHoverMarkerFromWorkspace(null);
        return;
      }
      this.setLinkedHoverMarkerFromWorkspace(this.markersByMediaId.get(mediaId) ?? null);
    },
  };

  constructor() {
    this.workspacePaneObserver.onContextRebind(this.mapSelectedItemsContext);

    afterNextRender(() => {
      const isJsdom =
        typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom');
      if (isJsdom) {
        return;
      }

      this.restoreWorkspacePaneWidthPreference();
      this.markerMotionPreference.set(
        this.markerMotionService.readMarkerMotionPreference(MAP_MARKER_MOTION_STORAGE_KEY),
      );
      window.addEventListener(MAP_MARKER_MOTION_EVENT, this.markerMotionEventHandler);
      this.initMap();
      this.subscribeToUploadManagerEvents();
      void this.tryResolveShareTokenFromQuery();
      this.scheduleDeferredStartupWork();
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.workspacePaneObserver.onRouteLeave('map');
    this.cleanupGpsAndTracking();
    this.cleanupDeferredAndQueryState();
    this.detachGlobalListeners();
    this.cleanupMarkerLayersAndCaches();
    this.cleanupUploadManagerSubscriptions();
    this.cleanupMapUiState();
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
    this.userLocationMarker?.remove();
    this.userLocationMarker = null;
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
  }

  closeContextMenus(): void {
    this.mapContextMenuOpen.set(false);
    this.radiusContextMenuOpen.set(false);
    this.markerContextMenuOpen.set(false);
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
    const container = currentTarget?.closest('.dd-items') as HTMLElement | null;
    if (!container) {
      return;
    }

    const focusableItems = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.dd-item:not(:disabled)'),
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
    this.draftMediaMarker.set({ lat: coords.lat, lng: coords.lng, uploadCount: 0 });
    this.renderOrUpdateDraftMediaMarker([coords.lat, coords.lng]);
    this.searchPlacementActive.set(false);
    this.placementActive.set(false);
    if (!this.photoPanelOpen()) {
      this.workspacePaneWidth.set(this.getWorkspacePaneOpeningWidth());
    }
    this.photoPanelOpen.set(true);
    this.detailMediaId.set(null);
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.uploadPanelPinned.set(true);
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
      message: 'Adresse konnte nicht aufgeloest werden.',
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

    const center = L.latLng(coords.lat, coords.lng);
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
      client: this.supabaseService.client,
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
      this.supabaseService.client,
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

    const assigned = await this.mapContextActionsService.assignImagesToProject(
      this.supabaseService.client,
      mediaIds,
      project.id,
    );
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
    this.detailMediaId.set(null);
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

    const idList = uniqueImageIds.join(',');
    const { data: mediaRows, error: mediaLookupError } = await this.supabaseService.client
      .from('media_items')
      .select('id,source_image_id')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (mediaLookupError) {
      this.toastService.show({
        message: 'Projektzuordnungen konnten nicht geladen werden.',
        type: 'error',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const mediaItemIds = Array.from(
      new Set((mediaRows ?? []).map((row: { id: string }) => row.id).filter(Boolean)),
    );
    if (mediaItemIds.length === 0) {
      this.toastService.show({
        message: 'Keine Projektzuordnungen gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const { error: removeError } = await this.supabaseService.client
      .from('media_projects')
      .delete()
      .in('media_item_id', mediaItemIds);

    if (removeError) {
      this.toastService.show({
        message: 'Entfernen aus Projekten ist fehlgeschlagen.',
        type: 'error',
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

    let deletedCount = 0;
    let failedCount = 0;
    for (const mediaId of uniqueImageIds) {
      const deleted = await this.markerContextPhotoDeleteService.deleteImageById(
        this.supabaseService.client,
        mediaId,
      );
      if (!deleted.ok) {
        failedCount += 1;
        continue;
      }
      deletedCount += 1;
    }

    if (deletedCount > 0) {
      this.detailMediaId.set(null);
      this.setSelectedMarker(null);
      this.setSelectedMarkerKeys(new Set());
      this.workspaceSelectionService.clearSelection();
      this.workspaceViewService.clearActiveSelection();
      await this.queryViewportMarkers();
      this.toastService.show({
        message: `${deletedCount} Medien geloescht.`,
        type: 'success',
        dedupe: true,
      });
    }

    if (failedCount > 0) {
      this.toastService.show({
        message: `${failedCount} Medien konnten nicht geloescht werden.`,
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
    this.workspacePaneObserver.setDetailImageId(mediaId);
    this.workspacePaneObserver.setOpen(true);
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
      this.state.batchAddressDialogTitle.set('Adresse fuer Auswahl aendern');
      this.state.batchAddressDialogMessage.set(
        `${mediaIds.length} Medien erhalten dieselbe Adresse.`,
      );
      this.state.batchAddressTargetMediaIds.set(mediaIds);
      this.state.batchAddressDialogOpen.set(true);
      this.onMapMenuCloseRequested();
      return;
    }

    const mediaId = mediaIds[0];

    this.openDetailView(mediaId);
    const currentRequestId = this.detailAddressSearchRequest()?.requestId ?? 0;
    this.detailAddressSearchRequest.set({ mediaId, requestId: currentRequestId + 1 });
    this.onMapMenuCloseRequested();
  }

  onBatchAddressDialogCancelled(): void {
    this.state.batchAddressDialogOpen.set(false);
    this.state.batchAddressTargetMediaIds.set([]);
  }

  async onBatchAddressDialogConfirmed(addressInput: string): Promise<void> {
    const input = addressInput.trim();
    if (!input) {
      return;
    }

    const targetImageIds = this.state.batchAddressTargetMediaIds();
    if (targetImageIds.length === 0) {
      this.onBatchAddressDialogCancelled();
      return;
    }

    const suggestion = await this.geocodingService.forward(input);
    if (!suggestion) {
      this.toastService.show({
        message: 'Adresse konnte nicht aufgeloest werden.',
        type: 'warning',
        dedupe: true,
      });
      return;
    }

    let updatedCount = 0;
    for (const mediaId of targetImageIds) {
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
    const currentRequest = this.detailAddressSearchRequest();
    if (!currentRequest || currentRequest.requestId !== requestId) {
      return;
    }

    this.detailAddressSearchRequest.set(null);
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

    const assigned = await this.mapContextActionsService.assignImagesToProject(
      this.supabaseService.client,
      mediaIds,
      project.id,
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
        message: 'Adresse konnte nicht aufgeloest werden.',
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

    const idList = uniqueImageIds.join(',');
    const { data: mediaRows, error: mediaLookupError } = await this.supabaseService.client
      .from('media_items')
      .select('id,source_image_id')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (mediaLookupError) {
      this.toastService.show({
        message: 'Projektzuordnungen konnten nicht geladen werden.',
        type: 'error',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const mediaItemIds = Array.from(
      new Set((mediaRows ?? []).map((row: { id: string }) => row.id).filter(Boolean)),
    );
    if (mediaItemIds.length === 0) {
      this.toastService.show({
        message: 'Keine Projektzuordnungen gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.onMapMenuCloseRequested();
      return;
    }

    const { error: removeError } = await this.supabaseService.client
      .from('media_projects')
      .delete()
      .in('media_item_id', mediaItemIds);

    if (removeError) {
      this.toastService.show({
        message: 'Entfernen aus Projekten ist fehlgeschlagen.',
        type: 'error',
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

      let deletedCount = 0;
      let failedCount = 0;
      for (const mediaId of uniqueImageIds) {
        const deleted = await this.markerContextPhotoDeleteService.deleteImageById(
          this.supabaseService.client,
          mediaId,
        );
        if (!deleted.ok) {
          failedCount += 1;
          continue;
        }
        deletedCount += 1;
      }

      if (deletedCount > 0) {
        this.detailMediaId.set(null);
        this.setSelectedMarker(null);
        this.setSelectedMarkerKeys(new Set());
        this.workspaceSelectionService.clearSelection();
        this.workspaceViewService.clearActiveSelection();
        await this.queryViewportMarkers();
        this.toastService.show({
          message: `${deletedCount} Medien geloescht.`,
          type: 'success',
          dedupe: true,
        });
      }

      if (failedCount > 0) {
        this.toastService.show({
          message: `${failedCount} Medien konnten nicht geloescht werden.`,
          type: 'error',
          dedupe: true,
        });
      }

      this.onMapMenuCloseRequested();
      return;
    }

    const target = this.markerContextPhotoDeleteService.getSingleImageTarget(payload);
    if (!target || !this.markerContextPhotoDeleteService.confirmPhotoDelete()) return;

    const deleted = await this.markerContextPhotoDeleteService.deleteImageById(
      this.supabaseService.client,
      target.mediaId,
    );
    if (!deleted.ok) {
      this.toastService.show({
        message: deleted.errorMessage ?? 'Loeschen fehlgeschlagen.',
        type: 'error',
        dedupe: true,
      });
      return;
    }

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
      setDetailImageId: (mediaId) => this.detailMediaId.set(mediaId),
    });

    this.toastService.show({ message: 'Foto geloescht.', type: 'success', dedupe: true });
    this.onMapMenuCloseRequested();
  }

  // ── Workspace pane resize ─────────────────────────────────────────────────

  onWorkspaceWidthChange(newWidth: number): void {
    const clampedWidth = this.clampWorkspacePaneWidth(newWidth);
    this.workspacePaneWidth.set(clampedWidth);
    this.persistWorkspacePaneWidthPreference(clampedWidth);
    // After resize, invalidate the Leaflet map size so tiles re-render.
    this.map?.invalidateSize();
  }

  onQrInviteCommandRequested(): void {
    this.settingsPaneService.openInviteManagementFromCommand('worker');
  }

  /** Closes the Image Detail View and returns to the thumbnail grid. */
  closeDetailView(): void {
    this.detailMediaId.set(null);
  }

  /** Closes the workspace pane entirely and clears selection state. */
  closeWorkspacePane(): void {
    if ((this.draftMediaMarker()?.uploadCount ?? 0) === 0) {
      this.removeDraftMediaMarker();
    }
    this.photoPanelOpen.set(false);
    this.detailMediaId.set(null);
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.clearRadiusSelectionVisuals();
    // Let Angular remove the pane from the DOM, then tell Leaflet to reclaim the space.
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  /**
   * Opens the Image Detail View for the given DB image UUID.
   * Also ensures the photo panel is open.
   */
  openDetailView(mediaId: string): void {
    if (!this.photoPanelOpen()) {
      this.workspacePaneWidth.set(this.getWorkspacePaneOpeningWidth());
    }
    this.detailMediaId.set(mediaId);
    this.photoPanelOpen.set(true);
  }

  private clampWorkspacePaneWidth(width: number): number {
    return Math.min(Math.max(width, this.workspacePaneMinWidth()), this.workspacePaneMaxWidth());
  }

  private getWorkspacePaneOpeningWidth(): number {
    const preferredWidth = this.preferredWorkspacePaneWidth();
    if (typeof preferredWidth === 'number') {
      return this.clampWorkspacePaneWidth(preferredWidth);
    }
    return this.workspacePaneDefaultWidth();
  }

  private restoreWorkspacePaneWidthPreference(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const rawValue = window.localStorage.getItem(WORKSPACE_PANE_WIDTH_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    const parsedWidth = Number.parseInt(rawValue, 10);
    if (Number.isNaN(parsedWidth)) {
      return;
    }

    const clampedWidth = this.clampWorkspacePaneWidth(parsedWidth);
    this.preferredWorkspacePaneWidth.set(clampedWidth);
    this.workspacePaneWidth.set(clampedWidth);
  }

  private persistWorkspacePaneWidthPreference(width: number): void {
    this.preferredWorkspacePaneWidth.set(width);
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(WORKSPACE_PANE_WIDTH_STORAGE_KEY, String(width));
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
    if (!this.map) return;

    // Spec link: docs/element-specs/media-detail-actions.md -> detail menu supports house/street zoom variants.
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

  onWorkspacePaneActiveTabChange(tab: 'selected-items' | 'upload'): void {
    this.workspacePaneObserver.setActiveTab(tab);
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
    this.uploadPanelPinned.update((v) => !v);
  }

  /**
   * Called when an image with GPS coords is uploaded. Adds a Leaflet marker.
   * Clicking the marker pins the side panel open (M-UI4 will populate it).
   */
  onImageUploaded(event: ImageUploadedEvent): void {
    if (!this.map) return;
    this.upsertUploadedPhotoMarker(event);
    this.resolveDraftMediaMarkerUpload(event);
  }

  /** Enters placement mode for a file with no GPS EXIF data. */
  enterPlacementMode(key: string): void {
    const draft = this.draftMediaMarker();
    if (draft) {
      const panel = this.uploadPanelChild();
      if (panel) {
        panel.placeFile(key, { lat: draft.lat, lng: draft.lng });
        return;
      }
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
  }

  // ── GPS button ────────────────────────────────────────────────────────────

  /**
   * Recenters on the user's position once.
   * If a recent position is already known, recenters immediately.
   */
  goToUserPosition(): void {
    if (this.gpsTrackingActive()) {
      this.stopGpsTracking();
      return;
    }

    this.gpsTrackingActive.set(true);
    this.gpsLocating.set(true);

    // Known coordinates provide immediate recentering, but activation still
    // requests a fresh high-accuracy fix before tracking continues.
    this.recenterOnKnownUserPosition();

    this.mapGeolocationService.requestCurrentPosition({
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
    });
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

  onMapViewModeChange(mode: string | null): void {
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
    this.renderOrUpdateSearchLocationMarker([event.lat, event.lng]);
  }

  onUploadLocationPreviewCleared(): void {
    if (this.searchPlacementActive()) {
      return;
    }
    this.clearSearchLocationMarker();
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

    this.map = L.map(containerRef.nativeElement, {
      center: [48.2082, 16.3738], // Vienna, Austria (fallback)
      zoom: 13,
      maxZoom: 22,
      zoomControl: false,
    });

    this.applyMapBasemapLayer();

    // LayerGroup for all photo markers — batch add/remove.
    this.photoMarkerLayer = L.layerGroup().addTo(this.map);

    this.updateSearchViewportBounds();
    this.applyPendingMapFocus();

    // Map click handler: closes upload panel and, when active, places images
    // that had no GPS EXIF data.
    this.map.on('click', (e: L.LeafletMouseEvent) => this.handleMapClick(e));
    this.map.on('mousedown', (e: L.LeafletMouseEvent) => this.handleMapMouseDown(e));
    this.map.on('mousemove', (e: L.LeafletMouseEvent) => this.handleMapMouseMove(e));
    this.map.on('mouseup', (e: L.LeafletMouseEvent) => this.handleMapMouseUp(e));
    this.map.on('contextmenu', (e: L.LeafletMouseEvent) => this.handleMapContextMenu(e));

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
        void this.workspaceViewService.loadCustomProperties();

        this.deferredStartupHandles.markerBootstrapTimer = setTimeout(() => {
          this.deferredStartupHandles.markerBootstrapTimer = null;
          if (!this.map) {
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
        this.renderOrUpdateUserLocationMarker(coords);
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

  private async tryResolveShareTokenFromQuery(): Promise<void> {
    if (this.shareTokenResolved) {
      return;
    }

    this.shareTokenResolved = true;
    const shareToken = this.shareTokenSelectionService.readShareTokenFromRoute(this.route.snapshot);
    if (!shareToken) {
      return;
    }

    const result = await this.shareTokenSelectionService.loadSelectionFromShareToken(shareToken);
    try {
      if (result.status === 'invalid') {
        this.toastService.show({
          message: 'Freigabelink ungueltig, abgelaufen oder ohne Zugriff.',
          type: 'warning',
          dedupe: true,
        });
        return;
      }

      if (result.status === 'no-images') {
        this.toastService.show({
          message: 'Freigabelink enthaelt keine verfuegbaren Medien.',
          type: 'warning',
          dedupe: true,
        });
        return;
      }

      if (result.status === 'error') {
        this.toastService.show({
          message: 'Freigabelink konnte nicht aufgeloest werden.',
          type: 'error',
          dedupe: true,
        });
        return;
      }

      this.detailMediaId.set(null);
      this.setSelectedMarker(null);
      this.setSelectedMarkerKeys(new Set());
      this.searchPlacementActive.set(false);
      this.placementActive.set(false);
      if (!this.photoPanelOpen()) {
        this.workspacePaneWidth.set(this.getWorkspacePaneOpeningWidth());
      }
      this.photoPanelOpen.set(true);

      this.toastService.show({
        message: `${result.selectionIds.length} Medien aus Freigabelink geladen.`,
        type: 'success',
        dedupe: true,
      });
    } finally {
      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { share: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  private recenterOnKnownUserPosition(): boolean {
    const coords = this.userPosition();
    if (!coords) return false;
    void this.refreshSearchCountryCode(coords[0], coords[1]);
    const zoom = Math.max(this.map?.getZoom() ?? 0, MapShellComponent.GPS_RECENTER_MIN_ZOOM);
    this.map?.setView(coords, zoom);
    return true;
  }

  private handleMapClick(e: L.LeafletMouseEvent): void {
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

    this.uploadPanelPinned.set(false);
    this.removeDraftMediaMarker();
    this.closeWorkspacePane();
    return true;
  }

  private tryCompletePendingPlacement(latlng: L.LatLng): boolean {
    if (!this.pendingPlacementKey) {
      return false;
    }

    // Prevent accidental placement immediately after drag/pan movement.
    if (Date.now() - this.lastMapMoveAt < MapShellComponent.PLACEMENT_CLICK_GUARD_MS) {
      return true;
    }

    const coords: ExifCoords = { lat: latlng.lat, lng: latlng.lng };
    const panel = this.uploadPanelChild();
    if (panel) {
      panel.placeFile(this.pendingPlacementKey, coords);
    }

    this.pendingPlacementKey = null;
    this.placementActive.set(false);
    this.map?.getContainer().classList.remove('map-container--placing');
    return true;
  }

  private clearMapSelectionState(): void {
    this.uploadPanelPinned.set(false);
    // Deselect the active marker but keep the workspace pane open.
    // The pane is closed only via its own close button.
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.detailMediaId.set(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.clearRadiusSelectionVisuals();
  }

  private completeSearchPlacement(latlng: L.LatLng): void {
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
    });
  }

  private async applyUploadedLocationMapPick(
    request: UploadLocationMapPickRequest,
    coords: { lat: number; lng: number },
  ): Promise<void> {
    const result = await this.mediaLocationUpdateService.updateFromCoordinates(
      request.mediaId,
      coords,
    );
    if (!result.ok || typeof result.lat !== 'number' || typeof result.lng !== 'number') {
      this.toastService.show({
        message: this.t(
          'upload.location.update.failed',
          'Standort konnte nicht aktualisiert werden.',
        ),
        type: 'error',
        dedupe: true,
      });
      return;
    }

    this.onImageUploaded({ id: request.mediaId, lat: result.lat, lng: result.lng });
    this.toastService.show({
      message: this.t('upload.location.update.success', 'Standort wurde aktualisiert.'),
      type: 'success',
      dedupe: true,
    });
  }

  private handleMapMouseDown(event: L.LeafletMouseEvent): void {
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

  private handleMapMouseMove(event: L.LeafletMouseEvent): void {
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

  private handleMapMouseUp(event: L.LeafletMouseEvent): void {
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

  private handleMapContextMenu(event: L.LeafletMouseEvent): void {
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
    latlng: L.LatLng,
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

  private startRadiusSelectionDraw(startLatLng: L.LatLng, additive: boolean): void {
    if (!this.map || this.placementActive() || this.searchPlacementActive()) {
      return;
    }

    this.cancelRadiusDrawing();
    this.closeContextMenus();

    this.radiusDrawActive = true;
    this.radiusDrawAdditive = additive;
    this.radiusDrawStartLatLng = startLatLng;
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;

    this.radiusDraftLine = L.polyline([startLatLng, startLatLng], {
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      dashArray: '6 4',
      interactive: false,
    }).addTo(this.map);

    this.radiusDraftCircle = L.circle(startLatLng, {
      radius: 1,
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      fillColor: 'var(--color-clay)',
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(this.map);

    this.radiusDraftLabel = this.radiusVisualsService
      .createLabelMarker(startLatLng, 0, 0)
      .addTo(this.map);

    this.radiusDrawMoveHandler = (moveEvent: L.LeafletMouseEvent) => {
      this.updateRadiusSelectionDraft(moveEvent.latlng);
    };

    this.radiusDrawMouseUpHandler = (upEvent: L.LeafletMouseEvent) => {
      void this.commitRadiusSelection(upEvent.latlng);
    };

    this.map.on('mousemove', this.radiusDrawMoveHandler);
    this.map.on('mouseup', this.radiusDrawMouseUpHandler);
  }

  private updateRadiusSelectionDraft(currentLatLng: L.LatLng): void {
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

  private async commitRadiusSelection(endLatLng: L.LatLng): Promise<void> {
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

  private updateRadiusDraftMarkerHighlights(center: L.LatLng, radiusMeters: number): void {
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

  private addRadiusSelectionVisual(center: L.LatLng, radiusMeters: number, edge: L.LatLng): void {
    if (!this.map) return;

    this.radiusCommittedVisuals.push(
      this.radiusVisualsService.addCommittedSelectionVisual(this.map, center, radiusMeters, edge),
    );
  }

  private async selectRadiusImages(
    center: L.LatLng,
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
    this.workspaceViewService.setActiveSelectionImages(result.images);
    if (!additive) {
      this.workspaceSelectionService.clearSelection();
    }

    if (!this.photoPanelOpen()) {
      this.workspacePaneWidth.set(this.getWorkspacePaneOpeningWidth());
    }
    this.photoPanelOpen.set(true);
    this.detailMediaId.set(null);
    this.setSelectedMarker(null);
  }

  private renderOrUpdateUserLocationMarker(coords: [number, number]): void {
    if (!this.map) return;

    if (!this.userLocationMarker) {
      const icon = L.divIcon({
        className: 'map-user-location-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      this.userLocationMarker = L.marker(coords, {
        icon,
        interactive: false,
        keyboard: false,
        zIndexOffset: 2000,
      });

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
      const icon = L.divIcon({
        className: 'map-search-location-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      this.searchLocationMarker = L.marker(coords, {
        icon,
        interactive: false,
        keyboard: false,
      });

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
      this.draftMediaMarkerLeaflet = L.marker(coords, {
        icon,
        interactive: false,
        keyboard: false,
      });

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

  private buildDraftMediaMarkerIcon(): L.DivIcon {
    return L.divIcon({
      className: 'map-photo-marker-wrapper',
      html: buildPhotoMarkerHtml({
        count: 1,
        selected: true,
        zoomLevel: this.getPhotoMarkerZoomLevel(),
      }),
      iconSize: PHOTO_MARKER_ICON_SIZE,
      iconAnchor: PHOTO_MARKER_ICON_ANCHOR,
      popupAnchor: PHOTO_MARKER_POPUP_ANCHOR,
    });
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
    this.draftMediaMarker.set(null);
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
  private subscribeToUploadManagerEvents(): void {
    this.uploadManagerSubs.push(
      this.uploadManagerService.imageReplaced$.subscribe((event: ImageReplacedEvent) => {
        this.handleImageReplaced(event);
      }),
      this.uploadManagerService.imageAttached$.subscribe((event: ImageAttachedEvent) => {
        this.handleImageAttached(event);
      }),
      this.uploadManagerService.uploadFailed$.subscribe((event: UploadFailedEvent) => {
        this.toastService.show({ message: event.error, type: 'error', dedupe: true });
      }),
    );
  }

  /**
   * Handles imageReplaced$ — rebuilds the marker DivIcon with the new
   * localObjectUrl so the thumbnail swaps instantly (no placeholder flash).
   */
  private handleImageReplaced(event: ImageReplacedEvent): void {
    const markerKey = this.markersByMediaId.get(event.imageId);
    if (!markerKey) return;
    const state = this.uploadedPhotoMarkers.get(markerKey);
    if (!state) return;

    // Revoke the old ObjectURL if it was a blob.
    if (state.thumbnailUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.thumbnailUrl);
    }

    state.thumbnailUrl = event.localObjectUrl;
    state.signedAt = undefined; // Will be re-signed on next viewport query.
    state.direction = event.direction ?? state.direction;
    this.refreshPhotoMarker(markerKey);
  }

  /**
   * Handles imageAttached$ — transitions the marker from CSS placeholder
   * to real thumbnail using the localObjectUrl from the upload.
   */
  private handleImageAttached(event: ImageAttachedEvent): void {
    const markerKey = this.markersByMediaId.get(event.imageId);
    if (!markerKey) return;
    const state = this.uploadedPhotoMarkers.get(markerKey);
    if (!state) return;

    // Revoke the old ObjectURL if it was a blob.
    if (state.thumbnailUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(state.thumbnailUrl);
    }

    state.thumbnailUrl = event.localObjectUrl;
    state.signedAt = undefined;
    state.direction = event.direction ?? state.direction;
    state.thumbnailSourcePath = event.newStoragePath;
    this.refreshPhotoMarker(markerKey);
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
        this.photoPanelOpen.set(false);
      }

      existing.marker.setIcon(this.buildPhotoMarkerIcon(markerKey));
      return;
    }

    const marker = L.marker([event.lat, event.lng], {
      icon: this.buildPhotoMarkerIcon(markerKey, {
        count: 1,
        thumbnailUrl: event.thumbnailUrl,
        direction: event.direction,
      }),
    });

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
      this.markersByMediaId.set(event.id, markerKey);
    }
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
      this.supabaseService.client,
      this.map,
      controller.signal,
    );

    // If this query was aborted, discard the result.
    if (result.aborted) return;
    this.viewportQueryController = null;

    // Cache the fetched bounds so small pans can skip the RPC.
    this.lastFetchedBounds = L.latLngBounds(
      [result.fetchSouth, result.fetchWest],
      [result.fetchNorth, result.fetchEast],
    );
    this.lastFetchedZoom = result.roundedZoom;

    if (result.error || !result.data) {
      this.flushPendingZoomHighlight();
      return;
    }

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
      this.linkedHoveredWorkspaceMediaIds.set(new Set());
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
      const key = this.toMarkerKey(row.cluster_lat, row.cluster_lng);
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
      setSelectedMarkerKey: (markerKey: string | null) => this.selectedMarkerKey.set(markerKey),
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
      this.selectedMarkerKeys.set(staleSelectedKeys);
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
  ): L.DivIcon {
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

    return L.divIcon({
      className: 'map-photo-marker-wrapper',
      html: buildPhotoMarkerHtml({
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
      iconSize: PHOTO_MARKER_ICON_SIZE,
      iconAnchor: PHOTO_MARKER_ICON_ANCHOR,
      popupAnchor: PHOTO_MARKER_POPUP_ANCHOR,
    });
  }

  private handlePhotoMarkerClick(markerKey: string, clickEvent?: L.LeafletMouseEvent): void {
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
      this.workspacePaneWidth.set(this.getWorkspacePaneOpeningWidth());
    }
    this.photoPanelOpen.set(true);
  }

  private isAdditiveMarkerSelection(clickEvent?: L.LeafletMouseEvent): boolean {
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
    this.detailMediaId.set(null);
  }

  private handleExclusiveMarkerSelection(
    markerKey: string,
    markerCount: number,
    mediaId: string | undefined,
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): void {
    this.workspaceSelectionService.clearSelection();
    this.setSelectedMarkerKeys(new Set([markerKey]));
    void this.workspaceViewService.loadMultiClusterImages(cells, zoom);

    // Single-image marker: also jump directly to detail view.
    if (markerCount === 1 && mediaId) {
      this.openDetailView(mediaId);
      return;
    }

    // Cluster click: ensure detail view is dismissed so thumbnail grid shows.
    this.detailMediaId.set(null);
  }

  /** Attach click + touch long-press interactions consistently for each new marker. */
  private attachMarkerInteractions(
    markerKey: string,
    marker: L.Marker,
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
  private bindMarkerClickInteraction(markerKey: string, marker: L.Marker): void {
    this.markerInteractionService.bindClick(marker, (event: L.LeafletMouseEvent) =>
      this.handlePhotoMarkerClick(markerKey, event),
    );
  }

  private bindMarkerContextInteraction(markerKey: string, marker: L.Marker): void {
    this.markerInteractionService.bindContextMenu(marker, {
      shouldBypass: () => this.consumeNativeContextMenuBypass(),
      onSecondaryReset: () => {
        this.pendingSecondaryPress = null;
      },
      onOpen: (event: MouseEvent) => {
        if (this.radiusSelectionService.hasCommittedSelection(this.radiusCommittedVisuals)) {
          const state = this.uploadedPhotoMarkers.get(markerKey);
          if (state) {
            const markerLatLng = L.latLng(state.lat, state.lng);
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
      },
    });
  }

  private bindMarkerHoverInteraction(markerKey: string, marker: L.Marker): void {
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
        this.linkedHoveredWorkspaceMediaIds.set(new Set());
      },
    });
  }

  private async addMarkerCellsToSelection(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<void> {
    const incoming = await this.workspaceViewService.fetchClusterImages(cells, zoom);
    const merged = this.radiusSelectionService.mergeWorkspaceImages(
      this.workspaceViewService.rawImages(),
      incoming,
    );
    this.workspaceViewService.setActiveSelectionImages(merged);
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
  private animateMarkerPosition(marker: L.Marker, lat: number, lng: number): void {
    this.markerMotionService.animateMarkerPosition(
      marker,
      lat,
      lng,
      this.markerMotionPreference(),
      MapShellComponent.MARKER_MOVE_DURATION_MS,
    );
  }

  private cancelMarkerMoveAnimation(marker: L.Marker): void {
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
        this.openMarkerContextMenu(markerKey, event);
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

    this.selectedMarkerKey.set(markerKey);

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

    this.selectedMarkerKeys.set(nextKeys);
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
      this.linkedHoveredWorkspaceMediaIds.set(new Set());
      return;
    }

    const markerState = this.uploadedPhotoMarkers.get(markerKey);
    const matchedIds = this.markerSelectionSyncService.buildLinkedWorkspaceImageIds(
      markerState,
      this.workspaceViewService.rawImages(),
      (lat, lng) => this.toMarkerKey(lat, lng),
    );
    this.linkedHoveredWorkspaceMediaIds.set(matchedIds);
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

    this.photoLoadService.invalidateStale(staleThreshold);

    for (const [key, state] of this.uploadedPhotoMarkers) {
      if (!this.isSingleMarkerInBounds(state, bounds)) continue;
      this.clearStaleThumbnailIfNeeded(state, staleThreshold);
      this.scheduleThumbnailLoadIfNeeded(key, state);
    }
  }

  private isSingleMarkerInBounds(
    state: { count: number; lat: number; lng: number },
    bounds: L.LatLngBounds,
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
      thumbnailSourcePath?: string;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      signedAt?: number;
    },
  ): Promise<void> {
    if (!state.thumbnailSourcePath || state.thumbnailUrl || state.thumbnailLoading) return;

    state.thumbnailLoading = true;
    this.refreshPhotoMarker(key);

    const result = await this.photoLoadService.getSignedUrl(state.thumbnailSourcePath, 'marker');

    if (result.url) {
      const loaded = await this.photoLoadService.preload(result.url);
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
      marker: L.Marker;
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

  private openMapContextMenuAt(latlng: L.LatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.radiusContextMenuOpen.set(false);
    this.markerContextMenuOpen.set(false);
    this.mapContextMenuCoords.set({ lat: latlng.lat, lng: latlng.lng });
    this.mapContextMenuPosition.set(position);
    this.mapContextMenuOpen.set(true);
    this.focusFirstOpenMapMenuItem();
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
  }

  private openRadiusContextMenuAt(latlng: L.LatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.mapContextMenuOpen.set(false);
    this.markerContextMenuOpen.set(false);
    this.radiusContextMenuCoords.set({ lat: latlng.lat, lng: latlng.lng });
    this.radiusContextMenuPosition.set(position);
    this.radiusContextMenuOpen.set(true);
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

    this.mapContextMenuOpen.set(false);
    this.radiusContextMenuOpen.set(false);
    this.markerContextMenuPosition.set(position);
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

      this.markerContextMenuPayload.set({
        markerKey,
        count: combinedCount,
        lat: state.lat,
        lng: state.lng,
        isMultiSelection: true,
        sourceCells: combinedSourceCells,
      });
    } else {
      this.markerContextMenuPayload.set({
        markerKey,
        count: state.count,
        lat: state.lat,
        lng: state.lng,
        mediaId: state.mediaId,
        isMultiSelection: false,
        sourceCells: state.sourceCells ?? [{ lat: state.lat, lng: state.lng }],
      });
    }

    this.markerContextMenuOpen.set(true);
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
      const firstItem = document.querySelector<HTMLButtonElement>('.map-context-menu .dd-item');
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
    this.detailMediaId.set(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
  }

  private async promptProjectSelection(): Promise<{ id: string; name: string } | null> {
    const projects = await this.mapProjectActionsService.loadProjectOptions(
      this.supabaseService.client,
    );

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
