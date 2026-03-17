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
import { Router } from '@angular/router';
import * as L from 'leaflet';
import {
  UploadPanelComponent,
  ImageUploadedEvent,
} from '../../upload/upload-panel/upload-panel.component';
import { ExifCoords } from '../../../core/upload.service';
import { SupabaseService } from '../../../core/supabase.service';
import { GeocodingService } from '../../../core/geocoding.service';
import {
  UploadManagerService,
  ImageReplacedEvent,
  ImageAttachedEvent,
  UploadFailedEvent,
} from '../../../core/upload-manager.service';
import { WorkspaceViewService } from '../../../core/workspace-view.service';
import { WorkspaceSelectionService } from '../../../core/workspace-selection.service';
import { PhotoLoadService, PHOTO_PLACEHOLDER_ICON } from '../../../core/photo-load.service';
import { ToastService } from '../../../core/toast.service';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { SearchQueryContext } from '../../../core/search/search.models';
import type { WorkspaceImage } from '../../../core/workspace-view.types';
import { WorkspacePaneComponent } from '../workspace-pane/workspace-pane.component';
import { DragDividerComponent } from '../workspace-pane/drag-divider/drag-divider.component';
import { SettingsPaneService } from '../../../core/settings-pane.service';
import {
  ProjectSelectDialogComponent,
  ProjectSelectOption,
} from '../../../shared/project-select-dialog/project-select-dialog.component';
import { TextInputDialogComponent } from '../../../shared/text-input-dialog/text-input-dialog.component';
import {
  buildPhotoMarkerHtml,
  PHOTO_MARKER_ICON_ANCHOR,
  PHOTO_MARKER_ICON_SIZE,
  PHOTO_MARKER_POPUP_ANCHOR,
  PhotoMarkerZoomLevel,
} from '../../../core/map/marker-factory';

type MarkerMotionPreference = 'off' | 'smooth';
type MapBasemapPreference = 'default' | 'satellite';
type MapMaterialPreference = 'default' | 'analog';
type MapViewMode = 'street' | 'photo' | 'historic';

const MAP_MARKER_MOTION_STORAGE_KEY = 'sitesnap.settings.map.markerMotion';
const MAP_MARKER_MOTION_EVENT = 'sitesnap:map-marker-motion-changed';
const MAP_BASEMAP_STORAGE_KEY = 'sitesnap.settings.map.basemap';
const MAP_MATERIAL_STORAGE_KEY = 'sitesnap.settings.map.material';
const HISTORIC_BASE_PANE = 'historic-base';
const HISTORIC_LABEL_PANE = 'historic-label';

@Component({
  selector: 'app-map-shell',
  imports: [
    UploadPanelComponent,
    SearchBarComponent,
    WorkspacePaneComponent,
    DragDividerComponent,
    ProjectSelectDialogComponent,
    TextInputDialogComponent,
  ],
  templateUrl: './map-shell.component.html',
  styleUrl: './map-shell.component.scss',
  host: {
    '[style.--placeholder-icon]': 'placeholderIconUrl',
    '(document:keydown.escape)': 'closeContextMenus()',
  },
})
export class MapShellComponent implements OnDestroy {
  private static readonly GPS_TRACKING_INTERVAL_MS = 60000;
  private static readonly GPS_RECENTER_MIN_ZOOM = 16;
  private static readonly PLACEMENT_CLICK_GUARD_MS = 220;
  private static readonly DETAIL_LOCATION_FOCUS_ZOOM = 21;
  private static readonly DETAIL_LOCATION_FLY_DURATION_S = 0.35;
  private static readonly MARKER_MOVE_DURATION_MS = 320;
  private static readonly RADIUS_SELECTION_MIN_METERS = 10;
  private static readonly RADIUS_CLICK_GUARD_MS = 220;
  private static readonly CONTEXT_MENU_DRAG_THRESHOLD_PX = 8;
  private static readonly CONTEXT_MENU_NATIVE_HANDSHAKE_MS = 2000;
  private static readonly CONTEXT_MENU_NATIVE_HANDSHAKE_PX = 24;
  private static readonly CONTEXT_MENU_NATIVE_BYPASS_TTL_MS = 250;
  private static readonly QUICK_RADIUS_METERS = 250;
  private static readonly HOUSE_PROXIMITY_ZOOM = 19;
  private static readonly STREET_PROXIMITY_ZOOM = 17;
  private static readonly MARKER_LONG_PRESS_MS = 500;

  readonly placeholderIconUrl = `url("${PHOTO_PLACEHOLDER_ICON}")`;
  private readonly supabaseService = inject(SupabaseService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly uploadManagerService = inject(UploadManagerService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly photoLoadService = inject(PhotoLoadService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly settingsPaneService = inject(SettingsPaneService);

  /** Reference to the Leaflet map container div. */
  private readonly mapContainerRef = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  /** Reference to the UploadPanelComponent child (for placeFile calls). */
  private readonly uploadPanelChild = viewChild(UploadPanelComponent);
  private readonly pendingMapFocus = signal<{ imageId: string; lat: number; lng: number } | null>(
    this.readMapFocusPayload(),
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
  readonly uploadBatch = this.uploadManagerService.activeBatch;
  readonly uploadBatchProgress = computed(() => this.uploadBatch()?.overallProgress ?? 0);
  readonly uploadBatchActive = computed(() => {
    const batch = this.uploadBatch();
    return !!batch && (batch.status === 'uploading' || batch.status === 'scanning');
  });

  /**
   * When non-null the map is in "placement mode": the next click places an
   * image that had no GPS EXIF data. Holds the upload-panel row key.
   */
  private pendingPlacementKey: string | null = null;

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
  readonly mapBasemap = signal<MapBasemapPreference>(this.readMapBasemapPreference());
  readonly mapMaterial = signal<MapMaterialPreference>(this.readMapMaterialPreference());
  readonly analogMaterialActive = computed(
    () => this.mapBasemap() === 'default' && this.mapMaterial() === 'analog',
  );
  readonly mapViewMode = computed<MapViewMode>(() => {
    if (this.mapBasemap() === 'satellite') {
      return 'photo';
    }
    return this.mapMaterial() === 'analog' ? 'historic' : 'street';
  });

  // ── Workspace pane / photo panel state ───────────────────────────────────

  /** Whether the workspace pane (photo panel) is open. */
  readonly photoPanelOpen = signal(false);

  /** Current workspace pane width in px. Initialised lazily to golden-ratio default on first open. */
  readonly workspacePaneWidth = signal(360);

  /** Minimum workspace pane width in px (17.5rem). */
  readonly workspacePaneMinWidth = 280;

  /** Maximum workspace pane width: viewport minus map minimum (~320px) minus divider. */
  readonly workspacePaneMaxWidth = computed(() => {
    // Fallback to a reasonable default before DOM is available.
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return Math.max(this.workspacePaneMinWidth, viewportWidth - 320);
  });

  /**
   * Default workspace pane width when opening — golden ratio of the viewport
   * (viewport × 0.382, i.e. the minor segment of the golden cut), clamped to
   * [workspacePaneMinWidth, workspacePaneMaxWidth].
   */
  readonly workspacePaneDefaultWidth = computed(() => {
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const golden = Math.round(viewportWidth * (1 - 1 / 1.618));
    return Math.min(Math.max(golden, this.workspacePaneMinWidth), this.workspacePaneMaxWidth());
  });
  readonly selectedMarkerKey = signal<string | null>(null);
  readonly selectedMarkerKeys = signal<Set<string>>(new Set());
  readonly mapContextMenuOpen = signal(false);
  readonly mapContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly mapContextMenuCoords = signal<{ lat: number; lng: number } | null>(null);
  readonly radiusContextMenuOpen = signal(false);
  readonly radiusContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly radiusContextMenuCoords = signal<{ lat: number; lng: number } | null>(null);
  readonly markerContextMenuOpen = signal(false);
  readonly markerContextMenuPosition = signal<{ x: number; y: number } | null>(null);
  readonly markerContextMenuPayload = signal<{
    markerKey: string;
    count: number;
    lat: number;
    lng: number;
    imageId?: string;
    sourceCells: Array<{ lat: number; lng: number }>;
  } | null>(null);
  readonly draftMediaMarker = signal<{ lat: number; lng: number; uploadCount: number } | null>(
    null,
  );
  readonly projectSelectionDialogOpen = signal(false);
  readonly projectSelectionDialogTitle = signal('Projekt auswaehlen');
  readonly projectSelectionDialogMessage = signal('');
  readonly projectSelectionDialogOptions = signal<ReadonlyArray<ProjectSelectOption>>([]);
  readonly projectSelectionDialogSelectedId = signal<string | null>(null);
  readonly projectNameDialogOpen = signal(false);
  readonly projectNameDialogTitle = signal('Name fuer neues Projekt aus Radius');
  readonly projectNameDialogMessage = signal('Gib einen Projektnamen ein.');
  readonly projectNameDialogInitialValue = signal('');

  /**
   * When non-null, the Image Detail View is shown inside the photo panel.
   * Set to a DB image UUID when the user clicks a thumbnail or marker detail action.
   * Set to null to return to the thumbnail grid.
   */
  readonly detailImageId = signal<string | null>(null);

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
    return this.uploadedPhotoMarkers.get(key)?.imageId ?? null;
  });

  // ── Private helpers ───────────────────────────────────────────────────────

  private userLocationMarker: L.Marker | null = null;
  private searchLocationMarker: L.Marker | null = null;
  private draftMediaMarkerLeaflet: L.Marker | null = null;
  private readonly uploadedPhotoMarkers = new Map<
    string,
    {
      marker: L.Marker;
      count: number;
      lat: number;
      lng: number;
      thumbnailUrl?: string;
      thumbnailSourcePath?: string;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
      sourceCells?: Array<{ lat: number; lng: number }>;
      /** DB UUID of the image — set for single-image markers only. */
      imageId?: string;
      /** True for markers added via upload before the next viewport query. */
      optimistic?: boolean;
      /** True while a signed thumbnail URL is being fetched. */
      thumbnailLoading?: boolean;
      /** Epoch ms when the signed thumbnail URL was obtained. */
      signedAt?: number;
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
  private activeHistoricLabelTileLayer: L.TileLayer | null = null;
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
  private readonly radiusCommittedVisuals: Array<{
    circle: L.Circle;
    label: L.Marker;
    centerDot: L.CircleMarker;
  }> = [];
  private suppressMapClickUntil = 0;
  private lastSecondaryContextClickAt: number | null = null;
  private lastSecondaryContextClickPos: { x: number; y: number } | null = null;
  private nativeContextMenuBypassUntil = 0;
  private projectSelectionDialogResolver:
    | ((value: { id: string; name: string } | null) => void)
    | null = null;
  private projectNameDialogResolver: ((value: string | null) => void) | null = null;

  /**
   * Bounds that were last fetched (including 10% buffer).
   * Used to skip RPC when the viewport is still within the buffered area.
   */
  private lastFetchedBounds: L.LatLngBounds | null = null;
  private lastFetchedZoom: number | null = null;

  /** True while a zoom animation is in progress — suppresses moveend queries. */
  private zoomAnimating = false;

  /**
   * Secondary index: imageId → markerKey for O(1) lookups when
   * handling upload manager events (replace, attach).
   */
  private readonly markersByImageId = new Map<string, string>();
  private readonly markerMoveAnimationRaf = new WeakMap<L.Marker, number>();
  private readonly markerMotionPreference = signal<MarkerMotionPreference>('smooth');
  private readonly markerMotionEventHandler = (event: Event): void => {
    const detail = (event as CustomEvent<{ markerMotion?: MarkerMotionPreference }>).detail;
    const candidate = detail?.markerMotion;
    if (candidate === 'off' || candidate === 'smooth') {
      this.markerMotionPreference.set(candidate);
      return;
    }
    this.markerMotionPreference.set(this.readMarkerMotionPreference());
  };
  private readonly mapContainerContextMenuHandler = (event: MouseEvent): void => {
    if (event.button !== 2) {
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
  private deferredStartupRafId: number | null = null;
  private deferredStartupTimer: ReturnType<typeof setTimeout> | null = null;
  private markerBootstrapTimer: ReturnType<typeof setTimeout> | null = null;
  private userLocationFoundTimer: ReturnType<typeof setTimeout> | null = null;
  private gpsTrackingTimer: ReturnType<typeof setInterval> | null = null;
  private lastMapMoveAt = 0;

  constructor() {
    afterNextRender(() => {
      this.markerMotionPreference.set(this.readMarkerMotionPreference());
      window.addEventListener(MAP_MARKER_MOTION_EVENT, this.markerMotionEventHandler);
      this.initMap();
      this.subscribeToUploadManagerEvents();
      this.scheduleDeferredStartupWork();
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.gpsLocating.set(false);
    this.stopGpsTracking();
    if (this.userLocationFoundTimer) {
      clearTimeout(this.userLocationFoundTimer);
      this.userLocationFoundTimer = null;
    }
    this.cancelDeferredStartupWork();
    if (this.moveEndDebounceTimer) {
      clearTimeout(this.moveEndDebounceTimer);
      this.moveEndDebounceTimer = null;
    }
    this.viewportQueryController?.abort();
    this.viewportQueryController = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener(MAP_MARKER_MOTION_EVENT, this.markerMotionEventHandler);
    }
    for (const state of this.uploadedPhotoMarkers.values()) {
      this.cancelMarkerMoveAnimation(state.marker);
    }
    this.photoMarkerLayer?.clearLayers();
    this.uploadedPhotoMarkers.clear();
    this.markersByImageId.clear();
    for (const sub of this.uploadManagerSubs) sub.unsubscribe();
    this.uploadManagerSubs = [];
    this.userLocationMarker?.remove();
    this.userLocationMarker = null;
    this.removeDraftMediaMarker();
    this.clearSearchLocationMarker();
    this.cancelRadiusDrawing();
    this.pendingSecondaryPress = null;
    this.closeContextMenus();
    this.resolveAndCloseProjectSelectionDialog(null);
    this.resolveAndCloseProjectNameDialog(null);
    this.clearRadiusSelectionVisuals();
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

  onMapContextCreateMarkerHere(): void {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;
    this.draftMediaMarker.set({ lat: coords.lat, lng: coords.lng, uploadCount: 0 });
    this.renderOrUpdateDraftMediaMarker([coords.lat, coords.lng]);
    this.searchPlacementActive.set(false);
    this.placementActive.set(false);
    if (!this.photoPanelOpen()) {
      this.workspacePaneWidth.set(this.workspacePaneDefaultWidth());
    }
    this.photoPanelOpen.set(true);
    this.detailImageId.set(null);
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
    this.closeContextMenus();
  }

  onMapContextZoomStreetHere(): void {
    const coords = this.mapContextMenuCoords();
    if (!coords || !this.map) return;
    this.map.setView([coords.lat, coords.lng], MapShellComponent.STREET_PROXIMITY_ZOOM);
    this.closeContextMenus();
  }

  async onMapContextCopyAddress(): Promise<void> {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;

    const copied = await this.copyAddressFromCoords(coords.lat, coords.lng);
    if (copied) {
      this.toastService.show({ message: 'Adresse kopiert.', type: 'success', dedupe: true });
    } else {
      this.toastService.show({
        message: 'Adresse konnte nicht aufgeloest werden.',
        type: 'warning',
        dedupe: true,
      });
    }
    this.closeContextMenus();
  }

  async onMapContextCopyGps(): Promise<void> {
    const coords = this.mapContextMenuCoords();
    if (!coords) return;
    const text = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
    const copied = await this.copyTextToClipboard(text);
    this.toastService.show({
      message: copied ? 'GPS kopiert.' : text,
      type: copied ? 'success' : 'info',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  onMapContextOpenGoogleMaps(): void {
    const coords = this.mapContextMenuCoords();
    if (!coords || typeof window === 'undefined') return;
    const url = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    this.closeContextMenus();
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
    const edge = this.offsetLatLngEast(center, radiusMeters);

    this.clearRadiusSelectionVisuals();
    this.addRadiusSelectionVisual(center, radiusMeters, edge);
    await this.selectRadiusImages(center, radiusMeters, false);
    this.closeContextMenus();
  }

  async onRadiusContextCreateProjectFromSelection(): Promise<void> {
    const imageIds = this.getActiveSelectionImageIds();
    if (imageIds.length === 0) {
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

    const organizationId = await this.resolveOrganizationIdForImage(imageIds[0]);
    if (!organizationId) {
      this.toastService.show({
        message: 'Projekt konnte nicht erstellt werden (Organisation unbekannt).',
        type: 'error',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    const { data: projectData, error: projectError } = await this.supabaseService.client
      .from('projects')
      .insert({ name: projectName, organization_id: organizationId })
      .select('id,name')
      .single();

    if (projectError || !projectData) {
      this.toastService.show({
        message: projectError?.message ?? 'Projekt konnte nicht erstellt werden.',
        type: 'error',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    const assigned = await this.assignImagesToProject(imageIds, projectData.id as string);
    if (!assigned) {
      this.closeContextMenus();
      return;
    }

    this.toastService.show({
      message: `Projekt "${(projectData.name as string) ?? projectName}" erstellt und ${imageIds.length} Medien zugewiesen.`,
      type: 'success',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  async onRadiusContextAssignToProject(): Promise<void> {
    const imageIds = this.getActiveSelectionImageIds();
    if (imageIds.length === 0) {
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

    const assigned = await this.assignImagesToProject(imageIds, project.id);
    if (assigned) {
      this.toastService.show({
        message: `${imageIds.length} Medien dem Projekt "${project.name}" zugewiesen.`,
        type: 'success',
        dedupe: true,
      });
    }
    this.closeContextMenus();
  }

  get markerContextIsSingle(): boolean {
    const payload = this.markerContextMenuPayload();
    return !!payload && payload.count === 1;
  }

  get markerContextIsCluster(): boolean {
    const payload = this.markerContextMenuPayload();
    return !!payload && payload.count > 1;
  }

  onMarkerContextOpenDetailsOrSelection(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;
    this.closeContextMenus();
    this.handlePhotoMarkerClick(payload.markerKey);
  }

  onMarkerContextMoveMarker(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;
    this.toastService.show({
      message: 'Marker verschieben folgt im nächsten Schritt.',
      type: 'info',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  async onMarkerContextAssignToProject(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;

    const project = await this.promptProjectSelection();
    if (!project) {
      this.closeContextMenus();
      return;
    }

    const imageIds = await this.resolveMarkerContextImageIds(payload);
    if (imageIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien fuer Projektzuweisung gefunden.',
        type: 'warning',
        dedupe: true,
      });
      this.closeContextMenus();
      return;
    }

    const { error } = await this.supabaseService.client
      .from('images')
      .update({ project_id: project.id })
      .in('id', imageIds);

    if (error) {
      this.toastService.show({ message: error.message, type: 'error', dedupe: true });
      this.closeContextMenus();
      return;
    }

    this.toastService.show({
      message:
        imageIds.length === 1
          ? `Zum Projekt \"${project.name}\" zugewiesen.`
          : `${imageIds.length} Medien dem Projekt \"${project.name}\" zugewiesen.`,
      type: 'success',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  onMarkerContextZoomHouse(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload || !this.map) return;
    this.map.setView([payload.lat, payload.lng], MapShellComponent.HOUSE_PROXIMITY_ZOOM);
    this.closeContextMenus();
  }

  onMarkerContextZoomStreet(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload || !this.map) return;
    this.map.setView([payload.lat, payload.lng], MapShellComponent.STREET_PROXIMITY_ZOOM);
    this.closeContextMenus();
  }

  async onMarkerContextCopyAddress(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;

    const copied = await this.copyAddressFromCoords(payload.lat, payload.lng);
    if (copied) {
      this.toastService.show({ message: 'Adresse kopiert.', type: 'success', dedupe: true });
    } else {
      this.toastService.show({
        message: 'Adresse konnte nicht aufgeloest werden.',
        type: 'warning',
        dedupe: true,
      });
    }
    this.closeContextMenus();
  }

  async onMarkerContextCopyGps(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload) return;
    const text = `${payload.lat.toFixed(6)}, ${payload.lng.toFixed(6)}`;
    const copied = await this.copyTextToClipboard(text);
    this.toastService.show({
      message: copied ? 'GPS kopiert.' : text,
      type: copied ? 'success' : 'info',
      dedupe: true,
    });
    this.closeContextMenus();
  }

  onMarkerContextOpenGoogleMaps(): void {
    const payload = this.markerContextMenuPayload();
    if (!payload || typeof window === 'undefined') return;
    const url = `https://www.google.com/maps?q=${payload.lat},${payload.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    this.closeContextMenus();
  }

  // Backwards-compatible wrapper kept for existing tests/call sites.
  async onMarkerContextCopyCoordinates(): Promise<void> {
    await this.onMarkerContextCopyGps();
  }

  async onMarkerContextDeletePhoto(): Promise<void> {
    const payload = this.markerContextMenuPayload();
    if (!payload || payload.count !== 1 || !payload.imageId) return;

    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        'Foto wirklich loeschen? Dieser Vorgang kann nicht rueckgaengig gemacht werden.',
      );
    if (!confirmed) return;

    const { error } = await this.supabaseService.client
      .from('images')
      .delete()
      .eq('id', payload.imageId);
    if (error) {
      this.toastService.show({ message: error.message, type: 'error', dedupe: true });
      return;
    }

    const markerState = this.uploadedPhotoMarkers.get(payload.markerKey);
    if (markerState && this.photoMarkerLayer) {
      this.cancelMarkerMoveAnimation(markerState.marker);
      this.photoMarkerLayer.removeLayer(markerState.marker);
      this.uploadedPhotoMarkers.delete(payload.markerKey);
    }
    this.markersByImageId.delete(payload.imageId);
    if (this.selectedMarkerKey() === payload.markerKey) {
      this.setSelectedMarker(null);
    }
    if (this.selectedMarkerKeys().has(payload.markerKey)) {
      const next = new Set(this.selectedMarkerKeys());
      next.delete(payload.markerKey);
      this.setSelectedMarkerKeys(next);
    }
    if (this.detailImageId() === payload.imageId) {
      this.detailImageId.set(null);
    }

    this.toastService.show({ message: 'Foto geloescht.', type: 'success', dedupe: true });
    this.closeContextMenus();
  }

  // ── Workspace pane resize ─────────────────────────────────────────────────

  onWorkspaceWidthChange(newWidth: number): void {
    this.workspacePaneWidth.set(newWidth);
    // After resize, invalidate the Leaflet map size so tiles re-render.
    this.map?.invalidateSize();
  }

  onQrInviteCommandRequested(): void {
    this.settingsPaneService.openInviteManagementFromCommand('worker');
  }

  /** Closes the Image Detail View and returns to the thumbnail grid. */
  closeDetailView(): void {
    this.detailImageId.set(null);
  }

  /** Closes the workspace pane entirely and clears selection state. */
  closeWorkspacePane(): void {
    if ((this.draftMediaMarker()?.uploadCount ?? 0) === 0) {
      this.removeDraftMediaMarker();
    }
    this.photoPanelOpen.set(false);
    this.detailImageId.set(null);
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
  openDetailView(imageId: string): void {
    if (!this.photoPanelOpen()) {
      this.workspacePaneWidth.set(this.workspacePaneDefaultWidth());
    }
    this.detailImageId.set(imageId);
    this.photoPanelOpen.set(true);
  }

  /**
   * Handles the zoomToLocationRequested output from the detail view.
   * Flies the map to the photo's coordinates at a tight zoom and pulses the marker.
   */
  onZoomToLocation(event: { imageId: string; lat: number; lng: number }): void {
    if (!this.map) return;
    this.map.flyTo([event.lat, event.lng], MapShellComponent.DETAIL_LOCATION_FOCUS_ZOOM, {
      duration: MapShellComponent.DETAIL_LOCATION_FLY_DURATION_S,
    });

    // Pulse the marker after the fly animation completes
    this.map.once('moveend', () => {
      const markerKey = this.markersByImageId.get(event.imageId);
      const state = markerKey ? this.uploadedPhotoMarkers.get(markerKey) : undefined;
      const el = state?.marker?.getElement();
      if (el) {
        el.classList.add('marker-pulse');
        setTimeout(() => el.classList.remove('marker-pulse'), 1500);
      }
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

    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    this.gpsTrackingActive.set(true);
    this.gpsLocating.set(true);

    // Known coordinates provide immediate recentering, but activation still
    // requests a fresh high-accuracy fix before tracking continues.
    this.recenterOnKnownUserPosition();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!this.gpsTrackingActive()) {
          this.gpsLocating.set(false);
          return;
        }

        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        this.userPosition.set(coords);
        void this.refreshSearchCountryCode(coords[0], coords[1]);
        const zoom = Math.max(this.map?.getZoom() ?? 0, MapShellComponent.GPS_RECENTER_MIN_ZOOM);
        this.map?.setView(coords, zoom);
        this.renderOrUpdateUserLocationMarker(coords);
        this.triggerUserLocationFoundState();
        this.startGpsTracking();
        this.gpsLocating.set(false);
      },
      () => {
        this.stopGpsTracking();
        this.gpsLocating.set(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
    );
  }

  toggleMapBasemap(): void {
    const next: MapBasemapPreference = this.mapBasemap() === 'default' ? 'satellite' : 'default';
    this.mapBasemap.set(next);
    if (next === 'satellite') {
      this.mapMaterial.set('default');
      this.persistMapMaterialPreference('default');
    }
    this.persistMapBasemapPreference(next);
    this.applyMapBasemapLayer();
  }

  toggleMapMaterial(): void {
    const next: MapMaterialPreference = this.mapMaterial() === 'default' ? 'analog' : 'default';
    if (this.mapBasemap() === 'satellite') {
      this.mapBasemap.set('default');
      this.persistMapBasemapPreference('default');
    }
    this.mapMaterial.set(next);
    this.persistMapMaterialPreference(next);
    this.applyMapBasemapLayer();
  }

  setMapViewMode(mode: MapViewMode): void {
    const previousBasemap = this.mapBasemap();

    if (mode === 'photo') {
      this.mapBasemap.set('satellite');
      this.mapMaterial.set('default');
    } else if (mode === 'historic') {
      this.mapBasemap.set('default');
      this.mapMaterial.set('analog');
    } else {
      this.mapBasemap.set('default');
      this.mapMaterial.set('default');
    }

    this.persistMapBasemapPreference(this.mapBasemap());
    this.persistMapMaterialPreference(this.mapMaterial());

    if (this.mapBasemap() !== previousBasemap || mode === 'historic' || mode === 'street') {
      this.applyMapBasemapLayer();
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
    this.placementActive.set(false);
    this.searchPlacementActive.set(true);
    this.map?.getContainer().classList.add('map-container--placing');
  }

  // ── Map init ──────────────────────────────────────────────────────────────

  private initMap(): void {
    this.map = L.map(this.mapContainerRef().nativeElement, {
      center: [48.2082, 16.3738], // Vienna, Austria (fallback)
      zoom: 13,
      maxZoom: 22,
      zoomControl: false,
    });

    const historicBasePane = this.map.createPane(HISTORIC_BASE_PANE);
    historicBasePane.style.zIndex = '210';

    const historicLabelPane = this.map.createPane(HISTORIC_LABEL_PANE);
    historicLabelPane.style.zIndex = '211';
    historicLabelPane.style.pointerEvents = 'none';

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
  }

  private scheduleDeferredStartupWork(): void {
    const runStartup = () => {
      if (!this.map) {
        return;
      }

      // Keep first route paint responsive, then run startup data work.
      this.initGeolocation();
      void this.workspaceViewService.loadCustomProperties();

      this.markerBootstrapTimer = setTimeout(() => {
        this.markerBootstrapTimer = null;
        if (!this.map) {
          return;
        }
        void this.queryViewportMarkers();
      }, 120);
    };

    if (typeof window === 'undefined') {
      runStartup();
      return;
    }

    this.deferredStartupRafId = window.requestAnimationFrame(() => {
      this.deferredStartupRafId = null;
      this.deferredStartupTimer = setTimeout(() => {
        this.deferredStartupTimer = null;
        runStartup();
      }, 0);
    });
  }

  private cancelDeferredStartupWork(): void {
    if (this.deferredStartupRafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.deferredStartupRafId);
      this.deferredStartupRafId = null;
    }

    if (this.deferredStartupTimer) {
      clearTimeout(this.deferredStartupTimer);
      this.deferredStartupTimer = null;
    }

    if (this.markerBootstrapTimer) {
      clearTimeout(this.markerBootstrapTimer);
      this.markerBootstrapTimer = null;
    }
  }

  private initGeolocation(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        this.userPosition.set(coords);
        void this.refreshSearchCountryCode(coords[0], coords[1]);
        this.renderOrUpdateUserLocationMarker(coords);
      },
      () => {
        // Geolocation denied or unavailable — Vienna fallback already set.
      },
    );
  }

  private startGpsTracking(): void {
    if (this.gpsTrackingTimer) {
      clearInterval(this.gpsTrackingTimer);
      this.gpsTrackingTimer = null;
    }

    this.gpsTrackingTimer = setInterval(() => {
      if (!this.gpsTrackingActive()) {
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        this.stopGpsTracking();
        return;
      }

      this.gpsLocating.set(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          this.userPosition.set(coords);
          void this.refreshSearchCountryCode(coords[0], coords[1]);
          this.renderOrUpdateUserLocationMarker(coords);
          this.triggerUserLocationFoundState();
          this.gpsLocating.set(false);
        },
        () => {
          // When tracking can no longer get a fix, leave toggle mode.
          this.stopGpsTracking();
          this.gpsLocating.set(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
      );
    }, MapShellComponent.GPS_TRACKING_INTERVAL_MS);
  }

  private stopGpsTracking(): void {
    this.gpsTrackingActive.set(false);
    if (this.gpsTrackingTimer) {
      clearInterval(this.gpsTrackingTimer);
      this.gpsTrackingTimer = null;
    }
  }

  private applyMapBasemapLayer(): void {
    if (!this.map) {
      return;
    }

    if (this.activeBaseTileLayer) {
      this.map.removeLayer(this.activeBaseTileLayer);
    }

    if (this.activeHistoricLabelTileLayer) {
      this.map.removeLayer(this.activeHistoricLabelTileLayer);
      this.activeHistoricLabelTileLayer = null;
    }

    this.activeBaseTileLayer = this.createMapBasemapLayer(this.mapBasemap());
    this.activeBaseTileLayer.addTo(this.map);

    if (this.mapBasemap() === 'default' && this.mapMaterial() === 'analog') {
      this.activeHistoricLabelTileLayer = this.createHistoricLabelLayer();
      this.activeHistoricLabelTileLayer.addTo(this.map);
    }
  }

  private createMapBasemapLayer(mode: MapBasemapPreference): L.TileLayer {
    if (mode === 'satellite') {
      return L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxNativeZoom: 19,
          maxZoom: 22,
          attribution: 'Tiles &copy; Esri',
        },
      );
    }

    if (this.mapMaterial() === 'analog') {
      // Historic mode: split base and labels to preserve street readability.
      return L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
        {
          pane: HISTORIC_BASE_PANE,
          maxNativeZoom: 19,
          maxZoom: 22,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        },
      );
    }

    // CartoDB Positron — clean, uncluttered light tile (design.md §3.1).
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxNativeZoom: 19,
      maxZoom: 22,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
    });
  }

  private createHistoricLabelLayer(): L.TileLayer {
    return L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
      {
        pane: HISTORIC_LABEL_PANE,
        maxNativeZoom: 19,
        maxZoom: 22,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
    );
  }

  private readMapFocusPayload(): { imageId: string; lat: number; lng: number } | null {
    const fromNavigation = this.router.getCurrentNavigation()?.extras?.state?.['mapFocus'];
    const fromHistory =
      typeof window !== 'undefined' ? (window.history.state?.['mapFocus'] as unknown) : null;
    const candidate = fromNavigation ?? fromHistory;

    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const payload = candidate as Partial<{ imageId: string; lat: number; lng: number }>;
    if (
      typeof payload.imageId !== 'string' ||
      typeof payload.lat !== 'number' ||
      typeof payload.lng !== 'number'
    ) {
      return null;
    }

    return { imageId: payload.imageId, lat: payload.lat, lng: payload.lng };
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
    const hasMarkerSelection =
      this.selectedMarkerKey() !== null || this.selectedMarkerKeys().size > 0;
    const allowPrimaryDeselection =
      isPrimaryClick && hasMarkerSelection && !this.searchPlacementActive();

    if (Date.now() < this.suppressMapClickUntil && !allowPrimaryDeselection) {
      return;
    }

    const activeDraft = this.draftMediaMarker();
    if (
      isPrimaryClick &&
      activeDraft &&
      activeDraft.uploadCount === 0 &&
      !this.pendingPlacementKey &&
      !this.searchPlacementActive()
    ) {
      this.uploadPanelPinned.set(false);
      this.removeDraftMediaMarker();
      this.closeWorkspacePane();
      return;
    }

    if (this.pendingPlacementKey) {
      // Prevent accidental placement immediately after drag/pan movement.
      if (Date.now() - this.lastMapMoveAt < MapShellComponent.PLACEMENT_CLICK_GUARD_MS) {
        return;
      }
      const coords: ExifCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
      const panel = this.uploadPanelChild();
      if (panel) {
        panel.placeFile(this.pendingPlacementKey, coords);
      }
      this.pendingPlacementKey = null;
      this.placementActive.set(false);
      this.map?.getContainer().classList.remove('map-container--placing');
      return;
    }

    if (!this.searchPlacementActive()) {
      this.uploadPanelPinned.set(false);
      // Deselect the active marker but keep the workspace pane open.
      // The pane is closed only via its own close button.
      this.setSelectedMarker(null);
      this.setSelectedMarkerKeys(new Set());
      this.detailImageId.set(null);
      this.workspaceViewService.clearActiveSelection();
      this.workspaceSelectionService.clearSelection();
      this.clearRadiusSelectionVisuals();
      return;
    }

    this.renderOrUpdateSearchLocationMarker([e.latlng.lat, e.latlng.lng]);
    this.searchPlacementActive.set(false);
    this.map?.getContainer().classList.remove('map-container--placing');
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
    if (this.hasActiveRadiusSelection()) {
      if (this.isInsideAnyCommittedRadius(latlng)) {
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

    this.radiusDraftLabel = this.createRadiusLabelMarker(startLatLng, 0, 0).addTo(this.map);

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
    const labelLatLng = this.getRadiusLabelLatLng(this.radiusDrawStartLatLng, currentLatLng);
    const labelAngleDeg = this.getReadableLineAngleDeg(this.radiusDrawStartLatLng, currentLatLng);

    this.radiusDraftLine?.setLatLngs([this.radiusDrawStartLatLng, currentLatLng]);
    this.radiusDraftCircle?.setRadius(radiusMeters);
    this.radiusDraftLabel?.setLatLng(labelLatLng);
    this.updateRadiusLabelMarker(this.radiusDraftLabel, radiusMeters, labelAngleDeg);
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

    const nextKeys = new Set<string>();
    for (const [markerKey, markerState] of this.uploadedPhotoMarkers.entries()) {
      const markerDistance = this.map.distance(center, [markerState.lat, markerState.lng]);
      if (markerDistance <= radiusMeters) {
        nextKeys.add(markerKey);
      }
    }

    if (
      this.radiusDraftHighlightedKeys.size === nextKeys.size &&
      Array.from(this.radiusDraftHighlightedKeys).every((key) => nextKeys.has(key))
    ) {
      return;
    }

    const previousKeys = this.radiusDraftHighlightedKeys;
    this.radiusDraftHighlightedKeys = nextKeys;

    for (const key of previousKeys) {
      if (!nextKeys.has(key)) {
        this.refreshPhotoMarker(key);
      }
    }

    for (const key of nextKeys) {
      if (!previousKeys.has(key)) {
        this.refreshPhotoMarker(key);
      }
    }
  }

  private clearRadiusDraftMarkerHighlights(): void {
    if (this.radiusDraftHighlightedKeys.size === 0) {
      return;
    }

    const previousKeys = this.radiusDraftHighlightedKeys;
    this.radiusDraftHighlightedKeys = new Set<string>();
    for (const markerKey of previousKeys) {
      this.refreshPhotoMarker(markerKey);
    }
  }

  private clearRadiusSelectionVisuals(): void {
    for (const visual of this.radiusCommittedVisuals) {
      visual.circle.remove();
      visual.label.remove();
      visual.centerDot.remove();
    }
    this.radiusCommittedVisuals.length = 0;
  }

  private addRadiusSelectionVisual(center: L.LatLng, radiusMeters: number, edge: L.LatLng): void {
    if (!this.map) return;

    const labelLatLng = this.getRadiusLabelLatLng(center, edge);
    const labelAngleDeg = this.getReadableLineAngleDeg(center, edge);

    const circle = L.circle(center, {
      radius: radiusMeters,
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      fillColor: 'var(--color-clay)',
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(this.map);

    const centerDot = L.circleMarker(center, {
      radius: 4,
      color: 'var(--color-clay)',
      fillColor: 'var(--color-clay)',
      fillOpacity: 1,
      weight: 0,
      interactive: false,
    }).addTo(this.map);

    const label = this.createRadiusLabelMarker(labelLatLng, radiusMeters, labelAngleDeg).addTo(
      this.map,
    );
    this.radiusCommittedVisuals.push({ circle, label, centerDot });
  }

  private createRadiusLabelMarker(
    position: L.LatLng,
    radiusMeters: number,
    angleDeg: number,
  ): L.Marker {
    return L.marker(position, {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: 'map-radius-label',
        html: `<span class="map-radius-label__value" style="--radius-label-rotation:${angleDeg.toFixed(2)}deg">${this.formatRadiusDistance(radiusMeters)}</span>`,
        iconSize: [0, 0],
      }),
    });
  }

  private updateRadiusLabelMarker(
    marker: L.Marker | null,
    radiusMeters: number,
    angleDeg: number,
  ): void {
    const el = marker?.getElement();
    if (!el) return;
    const value = el.querySelector('.map-radius-label__value');
    if (value instanceof HTMLElement) {
      value.textContent = this.formatRadiusDistance(radiusMeters);
      value.style.setProperty('--radius-label-rotation', `${angleDeg.toFixed(2)}deg`);
    }
  }

  private getRadiusLabelLatLng(start: L.LatLng, end: L.LatLng): L.LatLng {
    return L.latLng((start.lat + end.lat) / 2, (start.lng + end.lng) / 2);
  }

  private getReadableLineAngleDeg(start: L.LatLng, end: L.LatLng): number {
    if (!this.map) return 0;

    const startPoint = this.map.latLngToContainerPoint(start);
    const endPoint = this.map.latLngToContainerPoint(end);
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    let angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return angle;
  }

  private formatRadiusDistance(radiusMeters: number): string {
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) return '0 m';
    if (radiusMeters < 1000) return `${Math.round(radiusMeters)} m`;
    if (radiusMeters < 10000) return `${(radiusMeters / 1000).toFixed(1)} km`;
    return `${Math.round(radiusMeters / 1000)} km`;
  }

  private async selectRadiusImages(
    center: L.LatLng,
    radiusMeters: number,
    additive: boolean,
  ): Promise<void> {
    if (!this.map) return;

    const cellMap = new Map<string, { lat: number; lng: number }>();
    const selectedKeys = additive ? new Set(this.selectedMarkerKeys()) : new Set<string>();

    for (const [markerKey, markerState] of this.uploadedPhotoMarkers.entries()) {
      const markerDistance = this.map.distance(center, [markerState.lat, markerState.lng]);
      if (markerDistance > radiusMeters) continue;

      selectedKeys.add(markerKey);

      const cells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
      for (const cell of cells) {
        cellMap.set(this.toMarkerKey(cell.lat, cell.lng), cell);
      }
    }

    this.setSelectedMarkerKeys(selectedKeys);

    const zoom = Math.round(this.map.getZoom() ?? 13);
    const cells = Array.from(cellMap.values());
    const incoming = await this.workspaceViewService.fetchClusterImages(cells, zoom);

    const merged = additive
      ? this.mergeWorkspaceImages(this.workspaceViewService.rawImages(), incoming)
      : incoming;
    this.workspaceViewService.setActiveSelectionImages(merged);
    if (!additive) {
      this.workspaceSelectionService.clearSelection();
    }

    if (!this.photoPanelOpen()) {
      this.workspacePaneWidth.set(this.workspacePaneDefaultWidth());
    }
    this.photoPanelOpen.set(true);
    this.detailImageId.set(null);
    this.setSelectedMarker(null);
  }

  private mergeWorkspaceImages(
    current: WorkspaceImage[],
    incoming: WorkspaceImage[],
  ): WorkspaceImage[] {
    const byId = new Map<string, WorkspaceImage>();
    for (const image of current) byId.set(image.id, image);
    for (const image of incoming) byId.set(image.id, image);
    return Array.from(byId.values());
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
      }).addTo(this.map);
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
      }).addTo(this.map);
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

      if (this.photoMarkerLayer) {
        this.photoMarkerLayer.addLayer(this.draftMediaMarkerLeaflet);
      } else {
        this.draftMediaMarkerLeaflet.addTo(this.map);
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
    const markerKey = this.markersByImageId.get(event.imageId);
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
    const markerKey = this.markersByImageId.get(event.imageId);
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
      imageId: event.id,
      optimistic: true,
    });

    // Maintain secondary index for upload manager event lookups.
    if (event.id) {
      this.markersByImageId.set(event.id, markerKey);
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

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();

    // 10 % buffer on each edge for pre-fetch.
    const latPad = (bounds.getNorth() - bounds.getSouth()) * 0.1;
    const lngPad = (bounds.getEast() - bounds.getWest()) * 0.1;

    const fetchSouth = bounds.getSouth() - latPad;
    const fetchWest = bounds.getWest() - lngPad;
    const fetchNorth = bounds.getNorth() + latPad;
    const fetchEast = bounds.getEast() + lngPad;
    const roundedZoom = Math.round(zoom);

    const { data, error } = await this.supabaseService.client
      .rpc('viewport_markers', {
        min_lat: fetchSouth,
        min_lng: fetchWest,
        max_lat: fetchNorth,
        max_lng: fetchEast,
        zoom: roundedZoom,
      })
      .abortSignal(controller.signal);

    // If this query was aborted, discard the result.
    if (controller.signal.aborted) return;
    this.viewportQueryController = null;

    // Cache the fetched bounds so small pans can skip the RPC.
    this.lastFetchedBounds = L.latLngBounds([fetchSouth, fetchWest], [fetchNorth, fetchEast]);
    this.lastFetchedZoom = roundedZoom;

    if (error || !data) return;

    type ViewportRow = {
      cluster_lat: number;
      cluster_lng: number;
      image_count: number;
      image_id: string | null;
      direction: number | null;
      storage_path: string | null;
      thumbnail_path: string | null;
      exif_latitude: number | null;
      exif_longitude: number | null;
      created_at: string | null;
    };

    // Client-side pixel-distance merge: collapse clusters whose on-screen
    // distance is less than the marker icon width. This fixes the grid
    // boundary problem where adjacent grid cells produce overlapping markers.
    const merged = this.mergeOverlappingClusters(data as ViewportRow[]);

    // Build the incoming marker set keyed the same way we store them.
    type MergedRow = ViewportRow & { sourceCells: Array<{ lat: number; lng: number }> };
    const incoming = new Map<string, MergedRow>();
    for (const row of merged) {
      if (typeof row.cluster_lat !== 'number' || typeof row.cluster_lng !== 'number') continue;
      const key = this.toMarkerKey(row.cluster_lat, row.cluster_lng);
      incoming.set(key, row);
    }

    // Mark non-optimistic outgoing markers as recyclable first. Some can be
    // re-used for incoming markers so they animate to the new centroid.
    const recyclableKeys = new Set<string>();
    for (const [key, state] of this.uploadedPhotoMarkers) {
      if (state.optimistic) continue;
      if (!incoming.has(key)) {
        recyclableKeys.add(key);
      }
    }

    // --- Add or update markers ---
    for (const [key, row] of incoming) {
      const existing = this.uploadedPhotoMarkers.get(key);
      const count = Number(row.image_count);
      const direction = row.direction ?? undefined;
      const corrected =
        count === 1 &&
        row.exif_latitude != null &&
        row.exif_longitude != null &&
        (row.cluster_lat !== row.exif_latitude || row.cluster_lng !== row.exif_longitude);
      const thumbnailSourcePath =
        count === 1 ? (row.thumbnail_path ?? row.storage_path ?? undefined) : undefined;
      const fallbackLabel = this.buildFallbackLabelFromPath(thumbnailSourcePath);

      if (existing) {
        // Revoke stale ObjectURL when signed URL takes over from optimistic blob.
        if (
          existing.thumbnailUrl &&
          existing.thumbnailUrl.startsWith('blob:') &&
          thumbnailSourcePath
        ) {
          URL.revokeObjectURL(existing.thumbnailUrl);
          existing.thumbnailUrl = undefined;
          existing.signedAt = undefined;
        }
        // Update imageId index if it changed (e.g. cluster split to single).
        const newImageId = count === 1 ? (row.image_id ?? undefined) : undefined;
        if (existing.imageId !== newImageId) {
          if (existing.imageId) this.markersByImageId.delete(existing.imageId);
          if (newImageId) this.markersByImageId.set(newImageId, key);
          existing.imageId = newImageId;
        }
        existing.fallbackLabel = fallbackLabel;
        // Update if data changed.
        if (
          existing.count !== count ||
          existing.direction !== direction ||
          existing.corrected !== corrected
        ) {
          existing.count = count;
          existing.direction = direction;
          existing.corrected = corrected;
          existing.thumbnailSourcePath = thumbnailSourcePath;
          existing.fallbackLabel = fallbackLabel;
          existing.sourceCells = row.sourceCells;
          existing.optimistic = false;
          this.refreshPhotoMarker(key);
        } else {
          // Always keep sourceCells in sync even if visuals haven't changed.
          existing.sourceCells = row.sourceCells;
        }
        existing.lat = row.cluster_lat;
        existing.lng = row.cluster_lng;
        continue;
      }

      // No exact key match: attempt marker re-use to avoid remove/add popping.
      const reusableKey = this.findReusableMarkerKey(row, recyclableKeys);
      if (reusableKey) {
        const reusableState = this.uploadedPhotoMarkers.get(reusableKey);
        if (reusableState) {
          recyclableKeys.delete(reusableKey);

          // Revoke stale ObjectURL when signed URL takes over from optimistic blob.
          if (
            reusableState.thumbnailUrl &&
            reusableState.thumbnailUrl.startsWith('blob:') &&
            thumbnailSourcePath
          ) {
            URL.revokeObjectURL(reusableState.thumbnailUrl);
            reusableState.thumbnailUrl = undefined;
            reusableState.signedAt = undefined;
          }

          const previousImageId = reusableState.imageId;
          const nextImageId = count === 1 ? (row.image_id ?? undefined) : undefined;
          if (previousImageId !== nextImageId) {
            if (previousImageId) this.markersByImageId.delete(previousImageId);
            if (nextImageId) this.markersByImageId.set(nextImageId, key);
          } else if (nextImageId) {
            this.markersByImageId.set(nextImageId, key);
          }

          // Preserve selection state if the selected marker is being re-keyed.
          if (this.selectedMarkerKey() === reusableKey) {
            this.selectedMarkerKey.set(key);
          }

          const needsVisualRefresh =
            reusableState.count !== count ||
            reusableState.direction !== direction ||
            reusableState.corrected !== corrected ||
            reusableState.uploading !== undefined ||
            reusableState.thumbnailSourcePath !== thumbnailSourcePath;

          reusableState.count = count;
          reusableState.lat = row.cluster_lat;
          reusableState.lng = row.cluster_lng;
          reusableState.sourceCells = row.sourceCells;
          reusableState.direction = direction;
          reusableState.corrected = corrected;
          reusableState.thumbnailSourcePath = thumbnailSourcePath;
          reusableState.fallbackLabel = fallbackLabel;
          reusableState.imageId = nextImageId;
          reusableState.optimistic = false;

          this.uploadedPhotoMarkers.delete(reusableKey);
          this.uploadedPhotoMarkers.set(key, reusableState);

          // Rebind click handler so interaction resolves the new marker key.
          this.bindMarkerClickInteraction(key, reusableState.marker);
          this.animateMarkerPosition(reusableState.marker, row.cluster_lat, row.cluster_lng);

          if (needsVisualRefresh) {
            this.refreshPhotoMarker(key);
          }

          continue;
        }
      }

      const spawnOrigin = this.findSpawnOriginForIncomingRow(row, recyclableKeys);

      // New marker — add to LayerGroup (not directly to map) for batch ops.
      const marker = L.marker(
        spawnOrigin ? [spawnOrigin.lat, spawnOrigin.lng] : [row.cluster_lat, row.cluster_lng],
        {
          icon: this.buildPhotoMarkerIcon(key, { count, direction, corrected }),
        },
      );

      this.photoMarkerLayer!.addLayer(marker);
      this.attachMarkerInteractions(key, marker, { fadeIn: !spawnOrigin });

      if (spawnOrigin) {
        this.animateMarkerPosition(marker, row.cluster_lat, row.cluster_lng);
      }

      this.uploadedPhotoMarkers.set(key, {
        marker,
        count,
        lat: row.cluster_lat,
        lng: row.cluster_lng,
        sourceCells: row.sourceCells,
        direction,
        corrected,
        thumbnailSourcePath,
        fallbackLabel,
        imageId: count === 1 ? (row.image_id ?? undefined) : undefined,
      });

      // Maintain secondary index for single-image markers.
      if (count === 1 && row.image_id) {
        this.markersByImageId.set(row.image_id, key);
      }
    }

    // Remove outgoing markers that were not re-used.
    for (const oldKey of recyclableKeys) {
      const oldState = this.uploadedPhotoMarkers.get(oldKey);
      if (!oldState) continue;

      this.cancelMarkerMoveAnimation(oldState.marker);
      this.photoMarkerLayer!.removeLayer(oldState.marker);
      if (oldState.imageId) {
        this.markersByImageId.delete(oldState.imageId);
      }
      if (this.selectedMarkerKey() === oldKey) {
        this.selectedMarkerKey.set(null);
      }
      this.uploadedPhotoMarkers.delete(oldKey);
    }

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

    // Clear optimistic flag from surviving markers.
    for (const state of this.uploadedPhotoMarkers.values()) {
      state.optimistic = false;
    }

    // Lazy-load thumbnails for all single-image markers in viewport.
    this.maybeLoadThumbnails();
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
    const count = override?.count ?? markerState?.count ?? 1;
    const thumbnailUrl = override?.thumbnailUrl ?? markerState?.thumbnailUrl;
    const fallbackLabel =
      override?.fallbackLabel ??
      markerState?.fallbackLabel ??
      this.getMarkerFallbackLabel(markerState);
    const direction = override?.direction ?? markerState?.direction;
    const corrected = override?.corrected ?? markerState?.corrected;
    const uploading = override?.uploading ?? markerState?.uploading;
    const loading = markerState?.thumbnailLoading ?? false;

    return L.divIcon({
      className: 'map-photo-marker-wrapper',
      html: buildPhotoMarkerHtml({
        count,
        thumbnailUrl,
        fallbackLabel,
        bearing: direction,
        selected: this.isMarkerSelected(markerKey),
        corrected,
        uploading,
        loading,
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
    if (!this.photoPanelOpen()) {
      this.workspacePaneWidth.set(this.workspacePaneDefaultWidth());
    }
    this.photoPanelOpen.set(true);

    // Load images at this marker's grid position(s) into the workspace view.
    const zoom = Math.round(this.map?.getZoom() ?? 13);
    const cells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
    const additive = !!(clickEvent?.originalEvent.ctrlKey || clickEvent?.originalEvent.metaKey);

    if (additive) {
      // Ctrl/Meta-click appends marker results to the current active selection.
      const selectedKeys = new Set(this.selectedMarkerKeys());
      selectedKeys.add(markerKey);
      this.setSelectedMarkerKeys(selectedKeys);
      void this.addMarkerCellsToSelection(cells, zoom);
      this.detailImageId.set(null);
      return;
    }

    this.workspaceSelectionService.clearSelection();

    this.setSelectedMarkerKeys(new Set([markerKey]));

    void this.workspaceViewService.loadMultiClusterImages(cells, zoom);

    // Single-image marker: also jump directly to detail view.
    if (markerState.count === 1 && markerState.imageId) {
      this.openDetailView(markerState.imageId);
    } else {
      // Cluster click: ensure detail view is dismissed so thumbnail grid shows.
      this.detailImageId.set(null);
    }
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
    marker.off('click');
    marker.on('click', (event: L.LeafletMouseEvent) =>
      this.handlePhotoMarkerClick(markerKey, event),
    );
  }

  private bindMarkerContextInteraction(markerKey: string, marker: L.Marker): void {
    marker.off('contextmenu');
    marker.off('mousedown');

    marker.on('mousedown', (event: L.LeafletMouseEvent) => {
      if (event.originalEvent.button !== 2) return;
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
      this.pendingSecondaryPress = null;
    });

    marker.on('contextmenu', (event: L.LeafletMouseEvent) => {
      if (this.consumeNativeContextMenuBypass()) {
        return;
      }

      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
      this.pendingSecondaryPress = null;
      this.openMarkerContextMenu(markerKey, event.originalEvent);
    });
  }

  private async addMarkerCellsToSelection(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<void> {
    const incoming = await this.workspaceViewService.fetchClusterImages(cells, zoom);
    const merged = this.mergeWorkspaceImages(this.workspaceViewService.rawImages(), incoming);
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

    el.classList.remove('map-photo-marker-wrapper--fade-in');
    el.classList.add('map-photo-marker-wrapper--fade-prep');

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!el.isConnected) return;
        el.classList.add('map-photo-marker-wrapper--fade-in');
        el.classList.remove('map-photo-marker-wrapper--fade-prep');
      });
    });

    window.setTimeout(() => {
      if (el.isConnected) {
        el.classList.remove('map-photo-marker-wrapper--fade-in');
      }
    }, 300);
  }

  /**
   * Animate marker movement when a surviving marker gets a new centroid.
   * Uses frame-based interpolation with easing so interrupted updates
   * can be retargeted cleanly without visual popping.
   */
  private animateMarkerPosition(marker: L.Marker, lat: number, lng: number): void {
    if (this.markerMotionPreference() === 'off') {
      this.cancelMarkerMoveAnimation(marker);
      marker.setLatLng([lat, lng]);
      return;
    }

    const from = marker.getLatLng();
    const to = L.latLng(lat, lng);

    if (!Number.isFinite(from.lat) || !Number.isFinite(from.lng)) {
      marker.setLatLng(to);
      return;
    }

    const latDelta = to.lat - from.lat;
    const lngDelta = to.lng - from.lng;
    if (Math.abs(latDelta) < 1e-9 && Math.abs(lngDelta) < 1e-9) {
      marker.setLatLng(to);
      return;
    }

    this.cancelMarkerMoveAnimation(marker);

    const start = performance.now();
    const durationMs = MapShellComponent.MARKER_MOVE_DURATION_MS;
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

    const step = (now: number): void => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = easeOutCubic(t);

      marker.setLatLng([from.lat + latDelta * eased, from.lng + lngDelta * eased]);

      if (t < 1) {
        const rafId = window.requestAnimationFrame(step);
        this.markerMoveAnimationRaf.set(marker, rafId);
        return;
      }

      this.markerMoveAnimationRaf.delete(marker);
      marker.setLatLng(to);
    };

    const rafId = window.requestAnimationFrame(step);
    this.markerMoveAnimationRaf.set(marker, rafId);
  }

  private cancelMarkerMoveAnimation(marker: L.Marker): void {
    const rafId = this.markerMoveAnimationRaf.get(marker);
    if (rafId == null) return;
    window.cancelAnimationFrame(rafId);
    this.markerMoveAnimationRaf.delete(marker);
  }

  private readMarkerMotionPreference(): MarkerMotionPreference {
    if (typeof window === 'undefined') return 'smooth';
    const stored = window.localStorage.getItem(MAP_MARKER_MOTION_STORAGE_KEY);
    return stored === 'off' ? 'off' : 'smooth';
  }

  private readMapBasemapPreference(): MapBasemapPreference {
    if (typeof window === 'undefined') return 'default';
    const stored = window.localStorage.getItem(MAP_BASEMAP_STORAGE_KEY);
    return stored === 'satellite' ? 'satellite' : 'default';
  }

  private persistMapBasemapPreference(value: MapBasemapPreference): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MAP_BASEMAP_STORAGE_KEY, value);
  }

  private readMapMaterialPreference(): MapMaterialPreference {
    if (typeof window === 'undefined') return 'default';
    const stored = window.localStorage.getItem(MAP_MATERIAL_STORAGE_KEY);
    return stored === 'analog' ? 'analog' : 'default';
  }

  private persistMapMaterialPreference(value: MapMaterialPreference): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MAP_MATERIAL_STORAGE_KEY, value);
  }

  /**
   * Select a recyclable outgoing marker that can represent an incoming row.
   * Prefer exact single-image identity; otherwise pick the nearest marker of
   * the same kind (single vs cluster) within a bounded screen distance.
   */
  private findReusableMarkerKey(
    row: { cluster_lat: number; cluster_lng: number; image_count: number; image_id: string | null },
    recyclableKeys: Set<string>,
  ): string | null {
    const count = Number(row.image_count);
    const incomingIsSingle = count === 1;

    if (incomingIsSingle && row.image_id) {
      const byImageId = this.markersByImageId.get(row.image_id);
      if (byImageId && recyclableKeys.has(byImageId)) {
        return byImageId;
      }
    }

    if (!this.map) return null;

    const incomingPoint = this.map.latLngToContainerPoint([row.cluster_lat, row.cluster_lng]);
    const maxDistancePx = incomingIsSingle ? 120 : 170;
    const maxDistanceSq = maxDistancePx * maxDistancePx;
    let bestSameKindKey: string | null = null;
    let bestSameKindDistanceSq = Number.POSITIVE_INFINITY;

    for (const candidateKey of recyclableKeys) {
      const candidate = this.uploadedPhotoMarkers.get(candidateKey);
      if (!candidate) continue;

      const candidateIsSingle = candidate.count === 1;
      if (candidateIsSingle !== incomingIsSingle) continue;

      const candidatePoint = this.map.latLngToContainerPoint([candidate.lat, candidate.lng]);
      const dx = incomingPoint.x - candidatePoint.x;
      const dy = incomingPoint.y - candidatePoint.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= maxDistanceSq && distSq < bestSameKindDistanceSq) {
        bestSameKindDistanceSq = distSq;
        bestSameKindKey = candidateKey;
      }
    }

    return bestSameKindKey;
  }

  /**
   * For cluster-split visuals, spawn new child markers at the previous
   * parent-cluster centroid so they visibly emerge from that cluster.
   */
  private findSpawnOriginForIncomingRow(
    row: { cluster_lat: number; cluster_lng: number; image_count: number },
    recyclableKeys: Set<string>,
  ): { lat: number; lng: number } | null {
    if (!this.map) return null;

    const incomingIsSingle = Number(row.image_count) === 1;
    // For split: single marker can emerge from outgoing cluster center.
    // For merge: cluster marker can emerge from outgoing single markers.

    const incomingPoint = this.map.latLngToContainerPoint([row.cluster_lat, row.cluster_lng]);
    const maxDistancePx = 240;
    const maxDistanceSq = maxDistancePx * maxDistancePx;

    let best: { lat: number; lng: number } | null = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    for (const candidateKey of recyclableKeys) {
      const candidate = this.uploadedPhotoMarkers.get(candidateKey);
      if (!candidate) continue;

      if (incomingIsSingle) {
        if (candidate.count <= 1) continue;
      } else {
        if (candidate.count !== 1) continue;
      }

      const candidatePoint = this.map.latLngToContainerPoint([candidate.lat, candidate.lng]);
      const dx = incomingPoint.x - candidatePoint.x;
      const dy = incomingPoint.y - candidatePoint.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > maxDistanceSq || distSq >= bestDistanceSq) continue;

      bestDistanceSq = distSq;
      best = { lat: candidate.lat, lng: candidate.lng };
    }

    return best;
  }

  /**
   * Attach a 500 ms long-press handler to a marker element.
   * On long press, toggles `.map-photo-marker--long-pressed` so the direction
   * cone is visible on touch devices (mirrors the desktop `:hover` affordance).
   */
  private attachLongPressHandler(el: HTMLElement, markerKey: string): void {
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    el.addEventListener(
      'pointerdown',
      (event: PointerEvent) => {
        if (event.pointerType && event.pointerType !== 'touch') {
          return;
        }
        longPressTimer = setTimeout(() => {
          el.classList.add('map-photo-marker--long-pressed');
          this.openMarkerContextMenu(markerKey, event);
        }, MapShellComponent.MARKER_LONG_PRESS_MS);
      },
      { passive: true },
    );

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    el.addEventListener('pointerup', cancelLongPress, { passive: true });
    el.addEventListener('pointercancel', cancelLongPress, { passive: true });
    el.addEventListener('pointermove', cancelLongPress, { passive: true });
    // Dismiss on tap/click.
    el.addEventListener('click', () => {
      cancelLongPress();
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

    if (
      previousKeys.size === nextKeys.size &&
      Array.from(previousKeys).every((key) => nextKeys.has(key))
    ) {
      return;
    }

    this.selectedMarkerKeys.set(nextKeys);

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

  private isMarkerSelected(markerKey: string): boolean {
    return (
      markerKey === this.selectedMarkerKey() ||
      this.selectedMarkerKeys().has(markerKey) ||
      this.radiusDraftHighlightedKeys.has(markerKey)
    );
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

    this.moveEndDebounceTimer = setTimeout(() => {
      this.moveEndDebounceTimer = null;

      // Skip query if still in a zoom animation — it'll fire after zoomend.
      if (this.zoomAnimating) return;

      const currentZoom = this.getPhotoMarkerZoomLevel();
      this.closeContextMenus();
      const zoomChanged = currentZoom !== this.lastZoomLevel;

      // Skip the RPC if zoom didn't change and viewport is still inside
      // the last-fetched bounds (which included a 10% buffer).
      const mapZoom = Math.round(this.map?.getZoom() ?? 0);
      const viewportInBuffer =
        !zoomChanged &&
        this.lastFetchedBounds &&
        this.lastFetchedZoom === mapZoom &&
        this.map &&
        this.lastFetchedBounds.contains(this.map.getBounds());

      if (!viewportInBuffer) {
        void this.queryViewportMarkers();
      }

      // Refresh existing marker icons if zoom-level threshold changed.
      if (zoomChanged) {
        this.lastZoomLevel = currentZoom;
        for (const markerKey of this.uploadedPhotoMarkers.keys()) {
          this.refreshPhotoMarker(markerKey);
        }
      }
    }, 350);
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
    const now = Date.now();
    const staleThreshold = 50 * 60 * 1000; // 50 minutes

    this.photoLoadService.invalidateStale(staleThreshold);

    for (const [key, state] of this.uploadedPhotoMarkers) {
      if (state.count !== 1 || !bounds.contains([state.lat, state.lng])) continue;

      // Proactively clear stale URLs so they get re-signed.
      if (state.thumbnailUrl && state.signedAt && now - state.signedAt > staleThreshold) {
        state.thumbnailUrl = undefined;
        state.signedAt = undefined;
      }

      if (!state.thumbnailUrl && state.thumbnailSourcePath && !state.thumbnailLoading) {
        void this.lazyLoadThumbnail(key, state);
      }
    }
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

    const selected = this.isMarkerSelected(markerKey);
    const zoomLevel = this.getPhotoMarkerZoomLevel();
    const last = markerState.lastRendered;

    // Skip DOM update when nothing visual has changed.
    if (
      last &&
      last.count === markerState.count &&
      last.thumbnailUrl === markerState.thumbnailUrl &&
      last.thumbnailLoading === markerState.thumbnailLoading &&
      last.fallbackLabel === markerState.fallbackLabel &&
      last.direction === markerState.direction &&
      last.corrected === markerState.corrected &&
      last.uploading === markerState.uploading &&
      last.selected === selected &&
      last.zoomLevel === zoomLevel
    ) {
      return;
    }

    markerState.lastRendered = {
      count: markerState.count,
      thumbnailUrl: markerState.thumbnailUrl,
      thumbnailLoading: markerState.thumbnailLoading,
      fallbackLabel: markerState.fallbackLabel,
      direction: markerState.direction,
      corrected: markerState.corrected,
      uploading: markerState.uploading,
      selected,
      zoomLevel,
    };

    // Direct innerHTML swap instead of setIcon() — avoids destroying
    // and recreating the entire DOM subtree for every update.
    const el = (markerState.marker as L.Marker).getElement();
    if (el) {
      const html = buildPhotoMarkerHtml({
        count: markerState.count,
        thumbnailUrl: markerState.thumbnailUrl,
        fallbackLabel: markerState.fallbackLabel ?? this.getMarkerFallbackLabel(markerState),
        bearing: markerState.direction,
        selected,
        corrected: markerState.corrected,
        uploading: markerState.uploading,
        loading: markerState.thumbnailLoading,
        zoomLevel: this.getPhotoMarkerZoomLevel(),
      });
      el.innerHTML = html;
    } else {
      // Fallback if element not yet in DOM.
      markerState.marker.setIcon(this.buildPhotoMarkerIcon(markerKey));
    }
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

    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'doc':
        return 'DOC';
      case 'docx':
        return 'DOCX';
      case 'xls':
        return 'XLS';
      case 'xlsx':
        return 'XLSX';
      case 'ppt':
        return 'PPT';
      case 'pptx':
        return 'PPTX';
      default:
        return undefined;
    }
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
    const position = this.clampContextMenuPosition(clientX, clientY);
    this.radiusContextMenuOpen.set(false);
    this.markerContextMenuOpen.set(false);
    this.mapContextMenuCoords.set({ lat: latlng.lat, lng: latlng.lng });
    this.mapContextMenuPosition.set(position);
    this.mapContextMenuOpen.set(true);
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
  }

  private openRadiusContextMenuAt(latlng: L.LatLng, clientX: number, clientY: number): void {
    const position = this.clampContextMenuPosition(clientX, clientY);
    this.mapContextMenuOpen.set(false);
    this.markerContextMenuOpen.set(false);
    this.radiusContextMenuCoords.set({ lat: latlng.lat, lng: latlng.lng });
    this.radiusContextMenuPosition.set(position);
    this.radiusContextMenuOpen.set(true);
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
  }

  private openMarkerContextMenu(markerKey: string, sourceEvent?: MouseEvent | PointerEvent): void {
    const state = this.uploadedPhotoMarkers.get(markerKey);
    if (!state) return;

    let x = sourceEvent?.clientX;
    let y = sourceEvent?.clientY;

    if ((x == null || y == null) && this.map) {
      const point = this.map.latLngToContainerPoint([state.lat, state.lng]);
      const containerRect = this.map.getContainer().getBoundingClientRect();
      x = containerRect.left + point.x;
      y = containerRect.top + point.y;
    }

    const position = this.clampContextMenuPosition(x ?? 0, y ?? 0);

    this.mapContextMenuOpen.set(false);
    this.radiusContextMenuOpen.set(false);
    this.markerContextMenuPosition.set(position);
    this.markerContextMenuPayload.set({
      markerKey,
      count: state.count,
      lat: state.lat,
      lng: state.lng,
      imageId: state.imageId,
      sourceCells: state.sourceCells ?? [{ lat: state.lat, lng: state.lng }],
    });
    this.markerContextMenuOpen.set(true);
    this.suppressMapClickUntil = Date.now() + MapShellComponent.RADIUS_CLICK_GUARD_MS;
  }

  private hasActiveRadiusSelection(): boolean {
    return this.radiusCommittedVisuals.length > 0;
  }

  private isInsideAnyCommittedRadius(position: L.LatLng): boolean {
    if (!this.map) {
      return false;
    }

    return this.radiusCommittedVisuals.some((visual) => {
      const center = visual.circle.getLatLng();
      const radiusMeters = visual.circle.getRadius();
      return this.map!.distance(center, position) <= radiusMeters;
    });
  }

  private clearActiveRadiusSelection(): void {
    this.clearRadiusSelectionVisuals();
    this.setSelectedMarker(null);
    this.setSelectedMarkerKeys(new Set());
    this.detailImageId.set(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
  }

  private clampContextMenuPosition(x: number, y: number): { x: number; y: number } {
    if (typeof window === 'undefined') {
      return { x, y };
    }

    const menuWidth = 240;
    const menuHeight = 280;
    const margin = 8;
    return {
      x: Math.min(Math.max(x, margin), window.innerWidth - menuWidth - margin),
      y: Math.min(Math.max(y, margin), window.innerHeight - menuHeight - margin),
    };
  }

  private async copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  private async copyAddressFromCoords(lat: number, lng: number): Promise<boolean> {
    const reverse = await this.geocodingService.reverse(lat, lng);
    const address = reverse?.addressLabel?.trim();
    if (!address) {
      return false;
    }
    return this.copyTextToClipboard(address);
  }

  private async promptProjectSelection(): Promise<{ id: string; name: string } | null> {
    const { data, error } = await this.supabaseService.client
      .from('projects')
      .select('id,name')
      .order('name', { ascending: true });

    if (error || !Array.isArray(data) || data.length === 0) {
      this.toastService.show({
        message: 'Keine Projekte verfuegbar.',
        type: 'warning',
        dedupe: true,
      });
      return null;
    }

    const options = data.map((project) => ({
      id: project.id as string,
      name: (project.name as string) ?? 'Projekt',
    }));

    return this.openProjectSelectionDialog(
      options,
      'Projekt auswaehlen',
      'Waehle ein bestehendes Projekt fuer die Zuweisung aus.',
    );
  }

  private async promptProjectNameFromRadius(): Promise<string | null> {
    return this.openProjectNameDialog('Name fuer neues Projekt aus Radius', 'Neues Radius Projekt');
  }

  onProjectSelectionDialogSelected(projectId: string): void {
    this.projectSelectionDialogSelectedId.set(projectId);
  }

  onProjectSelectionDialogConfirmed(projectId: string): void {
    const selected = this.projectSelectionDialogOptions().find((option) => option.id === projectId);
    if (!selected) {
      this.resolveAndCloseProjectSelectionDialog(null);
      return;
    }

    this.resolveAndCloseProjectSelectionDialog({ id: selected.id, name: selected.name });
  }

  onProjectSelectionDialogCancelled(): void {
    this.resolveAndCloseProjectSelectionDialog(null);
  }

  onProjectNameDialogConfirmed(projectName: string): void {
    this.resolveAndCloseProjectNameDialog(projectName);
  }

  onProjectNameDialogCancelled(): void {
    this.resolveAndCloseProjectNameDialog(null);
  }

  private openProjectSelectionDialog(
    options: ReadonlyArray<ProjectSelectOption>,
    title: string,
    message: string,
  ): Promise<{ id: string; name: string } | null> {
    this.resolveAndCloseProjectSelectionDialog(null);

    this.projectSelectionDialogOptions.set(options);
    this.projectSelectionDialogTitle.set(title);
    this.projectSelectionDialogMessage.set(message);
    this.projectSelectionDialogSelectedId.set(options.length > 0 ? options[0].id : null);
    this.projectSelectionDialogOpen.set(true);

    return new Promise((resolve) => {
      this.projectSelectionDialogResolver = resolve;
    });
  }

  private resolveAndCloseProjectSelectionDialog(value: { id: string; name: string } | null): void {
    const resolver = this.projectSelectionDialogResolver;
    this.projectSelectionDialogResolver = null;
    this.projectSelectionDialogOpen.set(false);
    this.projectSelectionDialogOptions.set([]);
    this.projectSelectionDialogSelectedId.set(null);
    if (resolver) {
      resolver(value);
    }
  }

  private openProjectNameDialog(title: string, initialValue: string): Promise<string | null> {
    this.resolveAndCloseProjectNameDialog(null);
    this.projectNameDialogTitle.set(title);
    this.projectNameDialogMessage.set('Gib einen Projektnamen ein.');
    this.projectNameDialogInitialValue.set(initialValue);
    this.projectNameDialogOpen.set(true);

    return new Promise((resolve) => {
      this.projectNameDialogResolver = resolve;
    });
  }

  private resolveAndCloseProjectNameDialog(value: string | null): void {
    const resolver = this.projectNameDialogResolver;
    this.projectNameDialogResolver = null;
    this.projectNameDialogOpen.set(false);
    if (resolver) {
      resolver(value);
    }
  }

  private getActiveSelectionImageIds(): string[] {
    const unique = new Set(this.workspaceViewService.rawImages().map((img) => img.id));
    return Array.from(unique);
  }

  private async resolveOrganizationIdForImage(imageId: string): Promise<string | null> {
    const { data, error } = await this.supabaseService.client
      .from('images')
      .select('organization_id')
      .eq('id', imageId)
      .single();

    if (error || !data?.organization_id) {
      return null;
    }

    return data.organization_id as string;
  }

  private async assignImagesToProject(imageIds: string[], projectId: string): Promise<boolean> {
    if (imageIds.length === 0) {
      this.toastService.show({
        message: 'Keine Medien fuer Projektzuweisung gefunden.',
        type: 'warning',
        dedupe: true,
      });
      return false;
    }

    const { error } = await this.supabaseService.client
      .from('images')
      .update({ project_id: projectId })
      .in('id', imageIds);

    if (error) {
      this.toastService.show({ message: error.message, type: 'error', dedupe: true });
      return false;
    }

    return true;
  }

  private async resolveMarkerContextImageIds(payload: {
    count: number;
    imageId?: string;
    sourceCells: Array<{ lat: number; lng: number }>;
  }): Promise<string[]> {
    if (payload.count === 1 && payload.imageId) {
      return [payload.imageId];
    }

    const zoom = this.map?.getZoom() ?? 13;
    const images = await this.workspaceViewService.fetchClusterImages(payload.sourceCells, zoom);
    return images.map((img) => img.id);
  }

  private offsetLatLngEast(center: L.LatLng, meters: number): L.LatLng {
    const latRad = (center.lat * Math.PI) / 180;
    const metersPerDegreeLng = 111320 * Math.max(Math.cos(latRad), 0.0001);
    const lngOffset = meters / metersPerDegreeLng;
    return L.latLng(center.lat, center.lng + lngOffset);
  }

  /**
   * Client-side pixel-distance merge pass.
   *
   * Grid-based clustering can leave cluster centers right at cell
   * boundaries, producing overlapping markers. This greedy merge
   * converts each cluster to screen-space pixels and collapses any
   * pair whose distance is less than the marker icon width (+ 20 %
   * breathing room). Runs in O(n²) on the already-small result set
   * (≤ 2 000 rows), so sub-millisecond.
   */
  private mergeOverlappingClusters<
    T extends {
      cluster_lat: number;
      cluster_lng: number;
      image_count: number;
      image_id: string | null;
      direction: number | null;
      storage_path: string | null;
      thumbnail_path: string | null;
      exif_latitude: number | null;
      exif_longitude: number | null;
      created_at: string | null;
    },
  >(rows: T[]): Array<T & { sourceCells: Array<{ lat: number; lng: number }> }> {
    if (!this.map || rows.length === 0)
      return rows.map((r) => ({ ...r, sourceCells: [{ lat: r.cluster_lat, lng: r.cluster_lng }] }));

    const minDist = PHOTO_MARKER_ICON_SIZE[0] * 1.2; // 64 px + 20 % gap
    const minDistSq = minDist * minDist;

    // Pre-compute pixel positions once.
    const points = rows.map((row) =>
      this.map!.latLngToContainerPoint([row.cluster_lat, row.cluster_lng]),
    );

    // Bucket points in screen-space cells to avoid O(n^2) scans on dense viewports.
    const cellSize = minDist;
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < points.length; i++) {
      const cellX = Math.floor(points[i].x / cellSize);
      const cellY = Math.floor(points[i].y / cellSize);
      const bucketKey = `${cellX}:${cellY}`;
      const list = buckets.get(bucketKey);
      if (list) {
        list.push(i);
      } else {
        buckets.set(bucketKey, [i]);
      }
    }

    const consumed = new Set<number>();
    const result: Array<T & { sourceCells: Array<{ lat: number; lng: number }> }> = [];

    for (let i = 0; i < rows.length; i++) {
      if (consumed.has(i)) continue;

      const point = points[i];
      const baseCellX = Math.floor(point.x / cellSize);
      const baseCellY = Math.floor(point.y / cellSize);

      // Accumulate weighted position + totals for the merge group.
      let totalCount = Number(rows[i].image_count);
      let wLat = rows[i].cluster_lat * totalCount;
      let wLng = rows[i].cluster_lng * totalCount;

      // Track original grid-cell centres so we can query all of them on click.
      const sourceCells: Array<{ lat: number; lng: number }> = [
        { lat: rows[i].cluster_lat, lng: rows[i].cluster_lng },
      ];

      // Compare only with points from the same or neighboring screen buckets.
      for (let dxCell = -1; dxCell <= 1; dxCell++) {
        for (let dyCell = -1; dyCell <= 1; dyCell++) {
          const neighborKey = `${baseCellX + dxCell}:${baseCellY + dyCell}`;
          const candidates = buckets.get(neighborKey);
          if (!candidates) continue;

          for (const j of candidates) {
            if (j <= i || consumed.has(j)) continue;
            const dx = point.x - points[j].x;
            const dy = point.y - points[j].y;
            if (dx * dx + dy * dy < minDistSq) {
              consumed.add(j);
              const jCount = Number(rows[j].image_count);
              wLat += rows[j].cluster_lat * jCount;
              wLng += rows[j].cluster_lng * jCount;
              totalCount += jCount;
              sourceCells.push({ lat: rows[j].cluster_lat, lng: rows[j].cluster_lng });
            }
          }
        }
      }

      const isSingle = totalCount === 1;
      result.push({
        ...rows[i],
        cluster_lat: wLat / totalCount,
        cluster_lng: wLng / totalCount,
        image_count: totalCount,
        // Preserve single-image fields only when there's truly one image.
        image_id: isSingle ? rows[i].image_id : null,
        direction: isSingle ? rows[i].direction : null,
        storage_path: isSingle ? rows[i].storage_path : null,
        thumbnail_path: isSingle ? rows[i].thumbnail_path : null,
        exif_latitude: isSingle ? rows[i].exif_latitude : null,
        exif_longitude: isSingle ? rows[i].exif_longitude : null,
        created_at: isSingle ? rows[i].created_at : null,
        sourceCells,
      } as T & { sourceCells: Array<{ lat: number; lng: number }> });
    }

    return result;
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
