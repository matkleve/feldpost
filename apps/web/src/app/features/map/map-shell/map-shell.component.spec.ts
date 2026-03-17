/**
 * MapShellComponent unit tests.
 *
 * Strategy:
 *  - Leaflet is NOT initialised in tests (afterNextRender doesn't fire in jsdom).
 *  - UploadService, AuthService, and SupabaseService are faked.
 *  - All existing tests preserved + new tests for GPS, search, photo panel.
 */

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MapShellComponent } from './map-shell.component';
import { UploadService } from '../../../core/upload.service';
import { AuthService } from '../../../core/auth.service';
import { SupabaseService } from '../../../core/supabase.service';
import { GeocodingService } from '../../../core/geocoding.service';
import { WorkspaceViewService } from '../../../core/workspace-view.service';

function createMarkerStub() {
  return {
    getElement: vi.fn().mockReturnValue(null),
    setIcon: vi.fn(),
  };
}

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createSupabaseQueryMock() {
  const query = {
    select: vi.fn(),
    not: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  query.select.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [], error: null });

  return query;
}

function buildTestBed() {
  const imageQueryMock = createSupabaseQueryMock();

  return TestBed.configureTestingModule({
    imports: [MapShellComponent],
    providers: [
      {
        provide: UploadService,
        useValue: {
          validateFile: vi.fn().mockReturnValue({ valid: true }),
          parseExif: vi.fn().mockResolvedValue({}),
          uploadFile: vi.fn().mockResolvedValue({ error: 'not called in tests' }),
        },
      },
      {
        provide: AuthService,
        useValue: {
          user: vi.fn().mockReturnValue(null),
          session: { set: vi.fn() },
          loading: { set: vi.fn() },
          initialize: vi.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: SupabaseService,
        useValue: {
          client: {
            auth: {
              getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
              onAuthStateChange: vi
                .fn()
                .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
            },
            from: vi.fn().mockReturnValue(imageQueryMock),
            rpc: vi.fn().mockResolvedValue({ data: 0, error: null }),
            storage: {
              from: vi.fn().mockReturnValue({
                createSignedUrl: vi.fn().mockResolvedValue({
                  data: { signedUrl: '' },
                  error: null,
                }),
              }),
            },
          },
        },
      },
      {
        provide: GeocodingService,
        useValue: {
          reverse: vi.fn().mockResolvedValue(null),
          search: vi.fn().mockResolvedValue([]),
        },
      },
      {
        provide: Router,
        useValue: {
          navigate: vi.fn(),
          getCurrentNavigation: vi.fn().mockReturnValue(null),
        },
      },
    ],
  }).compileComponents();
}

describe('MapShellComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  // ── Basic structure ────────────────────────────────────────────────────────

  it('creates', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the floating search bar', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('ss-search-bar');
    expect(bar).not.toBeNull();
  });

  it('renders the top-left map style switch with three options', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const switchRoot = (fixture.nativeElement as HTMLElement).querySelector('.map-style-switch');
    const options = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.map-style-switch__option',
    );
    expect(switchRoot).not.toBeNull();
    expect(options).toHaveLength(3);
    expect(options[0]?.textContent?.trim()).toBe('Street');
    expect(options[1]?.textContent?.trim()).toBe('Photo');
    expect(options[2]?.textContent?.trim()).toBe('Historic');
  });

  it('renders the map container element', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const container = (fixture.nativeElement as HTMLElement).querySelector('.map-container');
    expect(container).not.toBeNull();
  });

  it('renders the floating upload button', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.map-upload-btn');
    expect(btn).not.toBeNull();
    expect((btn as HTMLButtonElement)?.getAttribute('aria-label')).toBe('Upload images');
  });

  // ── Upload panel state ─────────────────────────────────────────────────────

  it('upload panel is not visible by default', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);
  });

  it('toggleUploadPanel() makes the panel visible', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();

    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);
  });

  it('setMapViewMode("photo") persists photo map preference', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.mapBasemap()).toBe('default');
    expect(fixture.componentInstance.mapMaterial()).toBe('default');

    fixture.componentInstance.setMapViewMode('photo');

    expect(fixture.componentInstance.mapBasemap()).toBe('satellite');
    expect(fixture.componentInstance.mapMaterial()).toBe('default');
    expect(fixture.componentInstance.mapViewMode()).toBe('photo');
    expect(window.localStorage.getItem('sitesnap.settings.map.basemap')).toBe('satellite');
    expect(window.localStorage.getItem('sitesnap.settings.map.material')).toBe('default');
  });

  it('setMapViewMode("historic") enables analog material and persists preferences', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.setMapViewMode('historic');

    expect(fixture.componentInstance.mapBasemap()).toBe('default');
    expect(fixture.componentInstance.mapMaterial()).toBe('analog');
    expect(fixture.componentInstance.analogMaterialActive()).toBe(true);
    expect(fixture.componentInstance.mapViewMode()).toBe('historic');
    expect(window.localStorage.getItem('sitesnap.settings.map.basemap')).toBe('default');
    expect(window.localStorage.getItem('sitesnap.settings.map.material')).toBe('analog');
  });

  it('setMapViewMode("street") resets analog material', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.setMapViewMode('historic');
    fixture.componentInstance.setMapViewMode('street');

    expect(fixture.componentInstance.mapBasemap()).toBe('default');
    expect(fixture.componentInstance.mapMaterial()).toBe('default');
    expect(fixture.componentInstance.analogMaterialActive()).toBe(false);
    expect(fixture.componentInstance.mapViewMode()).toBe('street');
    expect(window.localStorage.getItem('sitesnap.settings.map.basemap')).toBe('default');
    expect(window.localStorage.getItem('sitesnap.settings.map.material')).toBe('default');
  });

  it('setMapViewMode("photo") replaces the active tile layer when map exists', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const previousLayer = { addTo: vi.fn() };
    const nextLayer = { addTo: vi.fn() };
    const mapStub = {
      removeLayer: vi.fn(),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: { removeLayer: ReturnType<typeof vi.fn> };
      activeBaseTileLayer: { addTo: ReturnType<typeof vi.fn> } | null;
      createMapBasemapLayer: (mode: 'default' | 'satellite') => { addTo: ReturnType<typeof vi.fn> };
      setMapViewMode: (mode: 'street' | 'photo' | 'historic') => void;
    };

    component.map = mapStub;
    component.activeBaseTileLayer = previousLayer;
    component.createMapBasemapLayer = vi.fn().mockReturnValue(nextLayer);

    component.setMapViewMode('photo');

    expect(mapStub.removeLayer).toHaveBeenCalledWith(previousLayer);
    expect(component.createMapBasemapLayer).toHaveBeenCalledWith('satellite');
    expect(nextLayer.addTo).toHaveBeenCalledWith(mapStub);
  });

  it('toggleUploadPanel() hides the panel when called twice', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();
    fixture.componentInstance.toggleUploadPanel();

    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);
  });

  it('upload panel stays open until explicitly toggled closed', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);

    fixture.componentInstance.toggleUploadPanel();
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);

    fixture.componentInstance.toggleUploadPanel();
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);
  });

  it('map click closes upload panel when it is open', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.uploadPanelPinned.set(true);
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);

    (
      fixture.componentInstance as unknown as {
        handleMapClick: (event: { latlng: { lat: number; lng: number } }) => void;
      }
    ).handleMapClick({ latlng: { lat: 48.2082, lng: 16.3738 } });

    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);
  });

  it('plain map click clears all map selection state', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      selectedMarkerKey: { set: (value: string | null) => void; (): string | null };
      selectedMarkerKeys: { set: (value: Set<string>) => void; (): Set<string> };
      detailImageId: { set: (value: string | null) => void; (): string | null };
      clearRadiusSelectionVisuals: ReturnType<typeof vi.fn>;
      handleMapClick: (event: {
        latlng: { lat: number; lng: number };
        originalEvent?: { button?: number };
      }) => void;
    };

    const workspaceView = TestBed.inject(WorkspaceViewService);
    const clearActiveSelectionSpy = vi
      .spyOn(workspaceView, 'clearActiveSelection')
      .mockImplementation(() => {});

    component.selectedMarkerKey.set('cluster-1');
    component.selectedMarkerKeys.set(new Set(['cluster-1', 'cluster-2']));
    component.detailImageId.set('img-1');
    component.clearRadiusSelectionVisuals = vi.fn();

    component.handleMapClick({
      latlng: { lat: 48.2082, lng: 16.3738 },
      originalEvent: { button: 0 },
    });

    expect(component.selectedMarkerKey()).toBeNull();
    expect(component.selectedMarkerKeys().size).toBe(0);
    expect(component.detailImageId()).toBeNull();
    expect(clearActiveSelectionSpy).toHaveBeenCalled();
    expect(component.clearRadiusSelectionVisuals).toHaveBeenCalled();
  });

  it('primary map click clears marker selection even during click guard', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      selectedMarkerKey: { set: (value: string | null) => void; (): string | null };
      selectedMarkerKeys: { set: (value: Set<string>) => void; (): Set<string> };
      suppressMapClickUntil: number;
      handleMapClick: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: { button: number };
      }) => void;
    };

    component.selectedMarkerKey.set('cluster-1');
    component.selectedMarkerKeys.set(new Set(['cluster-1', 'cluster-2']));
    component.suppressMapClickUntil = Date.now() + 60_000;

    component.handleMapClick({
      latlng: { lat: 48.2082, lng: 16.3738 },
      originalEvent: { button: 0 },
    });

    expect(component.selectedMarkerKey()).toBeNull();
    expect(component.selectedMarkerKeys().size).toBe(0);
  });

  it('renders the app-upload-panel element', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector('app-upload-panel');
    expect(panel).not.toBeNull();
  });

  // ── Placement mode ─────────────────────────────────────────────────────────

  it('enterPlacementMode sets placementActive to true', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.enterPlacementMode('test-key');

    expect(fixture.componentInstance.placementActive()).toBe(true);
  });

  it('cancelPlacement resets placementActive to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.enterPlacementMode('test-key');
    fixture.componentInstance.cancelPlacement();

    expect(fixture.componentInstance.placementActive()).toBe(false);
  });

  it('shows placement banner when placementActive is true', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.enterPlacementMode('test-key');
    fixture.detectChanges();

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.map-placement-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Click the map to place the image');
  });

  it('hides placement banner when placementActive is false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.map-placement-banner');
    expect(banner).toBeNull();
  });

  // ── GPS button ─────────────────────────────────────────────────────────────

  it('renders the GPS button', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn');
    expect(btn).not.toBeNull();
    expect((btn as HTMLButtonElement).getAttribute('aria-label')).toBe('Go to my location');
  });

  it('gpsLocating signal defaults to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.gpsLocating()).toBe(false);
  });

  it('gpsTrackingActive signal defaults to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.gpsTrackingActive()).toBe(false);
  });

  it('userPosition signal defaults to null', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.userPosition()).toBeNull();
  });

  it('goToUserPosition() does not throw when map is undefined', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    expect(() => fixture.componentInstance.goToUserPosition()).not.toThrow();
  });

  it('GPS button shows spinner while locating', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.gpsLocating.set(true);
    fixture.detectChanges();

    const spinner = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn__spinner');
    expect(spinner).not.toBeNull();
  });

  it('goToUserPosition() requests current position when unknown', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(13),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    const originalGeolocation = navigator.geolocation;
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 48.2,
          longitude: 16.37,
        },
      } as GeolocationPosition);
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    fixture.componentInstance.goToUserPosition();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mapStub.setView).toHaveBeenCalledWith([48.2, 16.37], 16);
    expect(fixture.componentInstance.gpsLocating()).toBe(false);
    expect(fixture.componentInstance.gpsTrackingActive()).toBe(true);
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.userPosition()).toEqual([48.2, 16.37]);

    fixture.componentInstance.goToUserPosition();
    expect(fixture.componentInstance.gpsTrackingActive()).toBe(false);
    expect(clearIntervalSpy).toHaveBeenCalled();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('goToUserPosition() recenters immediately when userPosition is already known', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(12),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;
    fixture.componentInstance.userPosition.set([51.5, -0.12]);

    const originalGeolocation = navigator.geolocation;
    const getCurrentPosition = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    fixture.componentInstance.goToUserPosition();

    expect(mapStub.setView).toHaveBeenCalledWith([51.5, -0.12], 16);
    expect(fixture.componentInstance.gpsLocating()).toBe(true);
    expect(fixture.componentInstance.gpsTrackingActive()).toBe(true);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    fixture.componentInstance.goToUserPosition();
    expect(fixture.componentInstance.gpsTrackingActive()).toBe(false);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });

    setIntervalSpy.mockRestore();
  });

  it('goToUserPosition() deactivates tracking when location lookup fails', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const originalGeolocation = navigator.geolocation;
    const getCurrentPosition = vi.fn((_success: PositionCallback, error: PositionErrorCallback) => {
      error({
        code: 3,
        message: 'timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      });
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    fixture.componentInstance.goToUserPosition();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.gpsTrackingActive()).toBe(false);
    expect(fixture.componentInstance.gpsLocating()).toBe(false);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  it('initGeolocation() resolves user position without auto-recentering map', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(13),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    const originalGeolocation = navigator.geolocation;
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 48.2082,
          longitude: 16.3738,
        },
      } as GeolocationPosition);
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    (
      fixture.componentInstance as unknown as {
        initGeolocation: () => void;
      }
    ).initGeolocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mapStub.setView).not.toHaveBeenCalled();
    expect(fixture.componentInstance.userPosition()).toEqual([48.2082, 16.3738]);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  it('goToUserPosition() highlights the user marker for one second after recenter', () => {
    vi.useFakeTimers();

    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(12),
      getBounds: vi.fn().mockReturnValue({
        getNorth: () => 48.3,
        getSouth: () => 48.1,
        getEast: () => 16.5,
        getWest: () => 16.2,
      }),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;
    fixture.componentInstance.userPosition.set([51.5, -0.12]);

    const add = vi.fn();
    const remove = vi.fn();
    (
      fixture.componentInstance as unknown as {
        userLocationMarker: {
          getElement: () => { classList: { add: typeof add; remove: typeof remove } };
          setLatLng: ReturnType<typeof vi.fn>;
          remove: ReturnType<typeof vi.fn>;
        };
      }
    ).userLocationMarker = {
      getElement: () => ({ classList: { add, remove } }),
      setLatLng: vi.fn(),
      remove: vi.fn(),
    };

    const originalGeolocation = navigator.geolocation;
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 51.5,
          longitude: -0.12,
        },
      } as GeolocationPosition);
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    fixture.componentInstance.goToUserPosition();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith('map-user-location-marker--fresh');

    vi.advanceTimersByTime(1000);
    expect(remove).toHaveBeenCalledWith('map-user-location-marker--fresh');

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
    vi.useRealTimers();
  });

  // ── Search bar ─────────────────────────────────────────────────────────────

  it('onSearchMapCenterRequested() recenters the map and shows a search marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(13),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    fixture.componentInstance.onSearchMapCenterRequested({
      lat: 48.2082,
      lng: 16.3738,
      label: 'Stephansplatz 1, 1010 Wien Austria',
    });

    expect(mapStub.setView).toHaveBeenCalledWith([48.2082, 16.3738], 14);
    expect(
      (fixture.componentInstance as unknown as { searchLocationMarker: unknown })
        .searchLocationMarker,
    ).not.toBeNull();
  });

  it('onZoomToLocation() centers map to tighter detail zoom without animation', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      invalidateSize: vi.fn(),
      setView: vi.fn(),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    fixture.componentInstance.onZoomToLocation({
      imageId: 'img-1',
      lat: 48.2082,
      lng: 16.3738,
    });

    expect(mapStub.invalidateSize).toHaveBeenCalledTimes(1);
    expect(mapStub.setView).toHaveBeenCalledWith([48.2082, 16.3738], 21, {
      animate: false,
    });
  });

  it('searchQueryContext includes centroid from active selection images', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const workspaceView = TestBed.inject(WorkspaceViewService);
    workspaceView.rawImages.set([
      {
        id: 'img-1',
        latitude: 48.8566,
        longitude: 2.3522,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: 'project-paris',
        projectName: 'Paris Site',
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: 'Rue de Rivoli, Paris',
        city: 'Paris',
        district: null,
        street: 'Rue de Rivoli',
        country: 'France',
        userName: null,
      },
      {
        id: 'img-2',
        latitude: 48.8666,
        longitude: 2.3322,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: 'project-paris',
        projectName: 'Paris Site',
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: 'Boulevard Haussmann, Paris',
        city: 'Paris',
        district: null,
        street: 'Boulevard Haussmann',
        country: 'France',
        userName: null,
      },
    ]);

    const context = fixture.componentInstance.searchQueryContext();
    expect(context.dataCentroid?.lat).toBeCloseTo(48.8616, 4);
    expect(context.dataCentroid?.lng).toBeCloseTo(2.3422, 4);
  });

  it('goToUserPosition() updates search countryCodes from reverse geocode', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const geocodingService = TestBed.inject(GeocodingService) as unknown as {
      reverse: ReturnType<typeof vi.fn>;
    };
    geocodingService.reverse.mockResolvedValue({
      addressLabel: 'Rue de Rivoli, 75001 Paris',
      city: 'Paris',
      district: 'Louvre',
      street: 'Rue de Rivoli',
      country: 'France',
      countryCode: 'fr',
    });

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(13),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    const originalGeolocation = navigator.geolocation;
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 48.8566,
          longitude: 2.3522,
        },
      } as GeolocationPosition);
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    fixture.componentInstance.goToUserPosition();
    await Promise.resolve();

    expect(fixture.componentInstance.searchQueryContext().countryCodes).toEqual(['fr']);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  it('onSearchClearRequested() removes the search marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(13),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    fixture.componentInstance.onSearchMapCenterRequested({
      lat: 48.2082,
      lng: 16.3738,
      label: 'Stephansplatz 1, 1010 Wien Austria',
    });
    fixture.componentInstance.onSearchClearRequested();

    expect(
      (fixture.componentInstance as unknown as { searchLocationMarker: unknown })
        .searchLocationMarker,
    ).toBeNull();
  });

  it('onSearchDropPinRequested() enables manual pin placement mode', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSearchDropPinRequested();

    expect(fixture.componentInstance.searchPlacementActive()).toBe(true);
  });

  it('map click in search placement mode drops a search marker and exits the mode', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(13),
      remove: vi.fn(),
      getContainer: vi.fn().mockReturnValue({ classList: { add: vi.fn(), remove: vi.fn() } }),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    fixture.componentInstance.onSearchDropPinRequested();

    (
      fixture.componentInstance as unknown as {
        handleMapClick: (event: { latlng: { lat: number; lng: number } }) => void;
      }
    ).handleMapClick({ latlng: { lat: 48.2082, lng: 16.3738 } });

    expect(fixture.componentInstance.searchPlacementActive()).toBe(false);
    expect(
      (fixture.componentInstance as unknown as { searchLocationMarker: unknown })
        .searchLocationMarker,
    ).not.toBeNull();
  });

  // ── Radius selection ───────────────────────────────────────────────────────

  it('short right-click on map opens map context menu', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      mouseEventToContainerPoint: vi.fn((evt: { clientX: number; clientY: number }) => ({
        x: evt.clientX,
        y: evt.clientY,
      })),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      mapContextMenuOpen: { (): boolean };
      mapContextMenuCoords: { (): { lat: number; lng: number } | null };
      handleMapMouseDown: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          ctrlKey?: boolean;
          metaKey?: boolean;
          preventDefault: () => void;
        };
      }) => void;
      handleMapMouseUp: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
        };
      }) => void;
      handleMapContextMenu: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
          stopPropagation: () => void;
        };
      }) => void;
    };

    component.map = mapStub;
    component.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 160,
        clientY: 220,
        preventDefault: vi.fn(),
      },
    });
    component.handleMapMouseUp({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 162,
        clientY: 224,
        preventDefault: vi.fn(),
      },
    });
    component.handleMapContextMenu({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 162,
        clientY: 224,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      },
    });

    expect(component.mapContextMenuOpen()).toBe(true);
    expect(component.mapContextMenuCoords()).toEqual({ lat: 48.2, lng: 16.37 });
  });

  it('map context create marker action opens draft workspace flow', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      mapContextMenuCoords: { set: (value: { lat: number; lng: number } | null) => void };
      draftMediaMarker: {
        (): { lat: number; lng: number; uploadCount: number } | null;
      };
      photoPanelOpen: { (): boolean };
      uploadPanelOpen: { (): boolean };
      onMapContextCreateMarkerHere: () => void;
    };

    component.mapContextMenuCoords.set({ lat: 48.2, lng: 16.37 });
    component.onMapContextCreateMarkerHere();

    expect(component.draftMediaMarker()).toEqual({ lat: 48.2, lng: 16.37, uploadCount: 0 });
    expect(component.photoPanelOpen()).toBe(true);
    expect(component.uploadPanelOpen()).toBe(true);
  });

  it('left click dismisses empty draft marker and closes workspace pane', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      draftMediaMarker: {
        set: (value: { lat: number; lng: number; uploadCount: number } | null) => void;
        (): { lat: number; lng: number; uploadCount: number } | null;
      };
      photoPanelOpen: { set: (value: boolean) => void; (): boolean };
      handleMapClick: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: { button: number };
      }) => void;
    };

    component.draftMediaMarker.set({ lat: 48.2, lng: 16.37, uploadCount: 0 });
    component.photoPanelOpen.set(true);

    component.handleMapClick({
      latlng: { lat: 48.21, lng: 16.38 },
      originalEvent: { button: 0 },
    });

    expect(component.draftMediaMarker()).toBeNull();
    expect(component.photoPanelOpen()).toBe(false);
  });

  it('right-click drag starts radius draw instead of opening map menu', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      mouseEventToContainerPoint: vi.fn((evt: { clientX: number; clientY: number }) => ({
        x: evt.clientX,
        y: evt.clientY,
      })),
      on: vi.fn(),
      off: vi.fn(),
      distance: vi.fn().mockReturnValue(100),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      mapContextMenuOpen: { (): boolean };
      radiusDrawActive: boolean;
      handleMapMouseDown: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          ctrlKey?: boolean;
          metaKey?: boolean;
          preventDefault: () => void;
        };
      }) => void;
      handleMapMouseMove: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          clientX: number;
          clientY: number;
        };
      }) => void;
    };

    component.map = mapStub;
    component.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    });

    component.handleMapMouseMove({
      latlng: { lat: 48.2, lng: 16.39 },
      originalEvent: {
        clientX: 130,
        clientY: 132,
      },
    });

    expect(component.radiusDrawActive).toBe(true);
    expect(component.mapContextMenuOpen()).toBe(false);
  });

  it('short right-click does not start radius on later mouse move', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      mouseEventToContainerPoint: vi.fn((evt: { clientX: number; clientY: number }) => ({
        x: evt.clientX,
        y: evt.clientY,
      })),
      on: vi.fn(),
      off: vi.fn(),
      distance: vi.fn().mockReturnValue(100),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      mapContextMenuOpen: { (): boolean };
      radiusDrawActive: boolean;
      handleMapMouseDown: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
        };
      }) => void;
      handleMapMouseUp: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
        };
      }) => void;
      handleMapMouseMove: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          clientX: number;
          clientY: number;
        };
      }) => void;
    };

    component.map = mapStub;
    component.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    });

    component.handleMapMouseUp({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    });

    component.handleMapMouseMove({
      latlng: { lat: 48.2, lng: 16.39 },
      originalEvent: {
        clientX: 130,
        clientY: 132,
      },
    });

    expect(component.mapContextMenuOpen()).toBe(true);
    expect(component.radiusDrawActive).toBe(false);
  });

  it('opens marker context menu payload for right-clicked marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      latLngToContainerPoint: vi.fn().mockReturnValue({ x: 10, y: 10 }),
      getContainer: vi.fn().mockReturnValue({
        getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
      }),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      uploadedPhotoMarkers: Map<
        string,
        {
          marker: unknown;
          count: number;
          lat: number;
          lng: number;
          imageId?: string;
          sourceCells?: Array<{ lat: number; lng: number }>;
        }
      >;
      markerContextMenuOpen: { (): boolean };
      markerContextMenuPayload: {
        (): {
          markerKey: string;
          count: number;
          lat: number;
          lng: number;
          imageId?: string;
        } | null;
      };
      openMarkerContextMenu: (
        markerKey: string,
        sourceEvent?: { clientX: number; clientY: number },
      ) => void;
    };

    component.map = mapStub;
    component.uploadedPhotoMarkers.set('single-1', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
      imageId: 'img-1',
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });

    component.openMarkerContextMenu('single-1', { clientX: 220, clientY: 240 });

    expect(component.markerContextMenuOpen()).toBe(true);
    expect(component.markerContextMenuPayload()?.markerKey).toBe('single-1');
    expect(component.markerContextMenuPayload()?.imageId).toBe('img-1');
  });

  it('enterPlacementMode auto-places missing-data jobs at active draft marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const placeFile = vi.fn();
    const component = fixture.componentInstance as unknown as {
      draftMediaMarker: {
        set: (value: { lat: number; lng: number; uploadCount: number } | null) => void;
      };
      uploadPanelChild: () => {
        placeFile: (key: string, coords: { lat: number; lng: number }) => void;
      };
      placementActive: { (): boolean };
      enterPlacementMode: (key: string) => void;
    };

    component.draftMediaMarker.set({ lat: 48.2, lng: 16.37, uploadCount: 0 });
    component.uploadPanelChild = () => ({ placeFile });

    component.enterPlacementMode('job-1');

    expect(placeFile).toHaveBeenCalledWith('job-1', { lat: 48.2, lng: 16.37 });
    expect(component.placementActive()).toBe(false);
  });

  it('radius selection replaces workspace images when Ctrl is not pressed', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      distance: vi.fn((_center: unknown, target: [number, number]) =>
        target[0] === 48.2 ? 80 : 600,
      ),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      selectedMarkerKeys: { set: (value: Set<string>) => void; (): Set<string> };
      uploadedPhotoMarkers: Map<
        string,
        {
          marker: unknown;
          count: number;
          lat: number;
          lng: number;
          sourceCells?: Array<{ lat: number; lng: number }>;
        }
      >;
      selectRadiusImages: (
        center: { lat: number; lng: number },
        radiusMeters: number,
        additive: boolean,
      ) => Promise<void>;
    };

    component.map = mapStub;
    component.uploadedPhotoMarkers.set('in-radius', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });
    component.uploadedPhotoMarkers.set('out-radius', {
      marker: createMarkerStub(),
      count: 1,
      lat: 47.5,
      lng: 15.9,
      sourceCells: [{ lat: 47.5, lng: 15.9 }],
    });

    const workspaceView = TestBed.inject(WorkspaceViewService);
    const incoming = [
      {
        id: 'img-radius-1',
        latitude: 48.2,
        longitude: 16.37,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: null,
        projectName: null,
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: null,
        city: null,
        district: null,
        street: null,
        country: null,
        userName: null,
      },
    ];

    const fetchSpy = vi.spyOn(workspaceView, 'fetchClusterImages').mockResolvedValue(incoming);
    const setSpy = vi.spyOn(workspaceView, 'setActiveSelectionImages').mockImplementation(() => {});

    await component.selectRadiusImages({ lat: 48.2, lng: 16.37 }, 200, false);

    expect(fetchSpy).toHaveBeenCalledWith([{ lat: 48.2, lng: 16.37 }], 15);
    expect(setSpy).toHaveBeenCalledWith(incoming);
    expect(Array.from(component.selectedMarkerKeys())).toEqual(['in-radius']);
  });

  it('radius selection merges workspace images when Ctrl-additive is used', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      distance: vi.fn(() => 70),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      selectedMarkerKeys: { set: (value: Set<string>) => void; (): Set<string> };
      uploadedPhotoMarkers: Map<
        string,
        {
          marker: unknown;
          count: number;
          lat: number;
          lng: number;
          sourceCells?: Array<{ lat: number; lng: number }>;
        }
      >;
      selectRadiusImages: (
        center: { lat: number; lng: number },
        radiusMeters: number,
        additive: boolean,
      ) => Promise<void>;
    };

    component.map = mapStub;
    component.uploadedPhotoMarkers.set('in-radius', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });
    component.uploadedPhotoMarkers.set('already-selected', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.25,
      lng: 16.35,
      sourceCells: [{ lat: 48.25, lng: 16.35 }],
    });
    component.selectedMarkerKeys.set(new Set(['already-selected']));

    const workspaceView = TestBed.inject(WorkspaceViewService);
    workspaceView.rawImages.set([
      {
        id: 'img-existing',
        latitude: 48.25,
        longitude: 16.35,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: null,
        projectName: null,
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: null,
        city: null,
        district: null,
        street: null,
        country: null,
        userName: null,
      },
    ]);

    const incoming = [
      {
        id: 'img-existing',
        latitude: 48.25,
        longitude: 16.35,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: null,
        projectName: null,
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: null,
        city: null,
        district: null,
        street: null,
        country: null,
        userName: null,
      },
      {
        id: 'img-added',
        latitude: 48.21,
        longitude: 16.38,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: null,
        projectName: null,
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: null,
        city: null,
        district: null,
        street: null,
        country: null,
        userName: null,
      },
    ];

    vi.spyOn(workspaceView, 'fetchClusterImages').mockResolvedValue(incoming);
    const setSpy = vi.spyOn(workspaceView, 'setActiveSelectionImages').mockImplementation(() => {});

    await component.selectRadiusImages({ lat: 48.2, lng: 16.37 }, 200, true);

    const merged = setSpy.mock.calls[0]?.[0] ?? [];
    expect(merged.map((image) => image.id).sort()).toEqual(['img-added', 'img-existing']);
    expect(Array.from(component.selectedMarkerKeys()).sort()).toEqual([
      'already-selected',
      'in-radius',
    ]);
  });

  it('radius draft highlights markers live while dragging', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      distance: vi.fn((_center: unknown, target: [number, number] | { lat: number }) => {
        const targetLat = Array.isArray(target) ? target[0] : target.lat;
        return targetLat === 48.2 ? 80 : 600;
      }),
      latLngToContainerPoint: vi.fn(() => ({ x: 0, y: 0 })),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      uploadedPhotoMarkers: Map<
        string,
        {
          marker: unknown;
          count: number;
          lat: number;
          lng: number;
        }
      >;
      radiusDrawStartLatLng: { lat: number; lng: number } | null;
      radiusDraftLine: {
        setLatLngs: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
      } | null;
      radiusDraftCircle: {
        setRadius: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
      } | null;
      radiusDraftLabel: {
        setLatLng: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
        getElement: ReturnType<typeof vi.fn>;
      } | null;
      radiusDraftHighlightedKeys: Set<string>;
      updateRadiusSelectionDraft: (currentLatLng: { lat: number; lng: number }) => void;
      refreshPhotoMarker: ReturnType<typeof vi.fn>;
    };

    component.map = mapStub;
    component.radiusDrawStartLatLng = { lat: 48.2, lng: 16.37 };
    component.radiusDraftLine = { setLatLngs: vi.fn(), remove: vi.fn() };
    component.radiusDraftCircle = { setRadius: vi.fn(), remove: vi.fn() };
    component.radiusDraftLabel = {
      setLatLng: vi.fn(),
      remove: vi.fn(),
      getElement: vi.fn().mockReturnValue(null),
    };
    component.refreshPhotoMarker = vi.fn();

    component.uploadedPhotoMarkers.set('in-radius', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
    });
    component.uploadedPhotoMarkers.set('out-radius', {
      marker: createMarkerStub(),
      count: 1,
      lat: 47.5,
      lng: 15.9,
    });

    component.updateRadiusSelectionDraft({ lat: 48.2, lng: 16.38 });

    expect(Array.from(component.radiusDraftHighlightedKeys)).toEqual(['in-radius']);
    expect(component.refreshPhotoMarker).toHaveBeenCalledWith('in-radius');
  });

  it('Ctrl-click on marker appends marker images to active selection', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      uploadedPhotoMarkers: Map<
        string,
        {
          marker: unknown;
          count: number;
          lat: number;
          lng: number;
          sourceCells?: Array<{ lat: number; lng: number }>;
        }
      >;
      handlePhotoMarkerClick: (
        markerKey: string,
        clickEvent?: { originalEvent: { ctrlKey?: boolean; metaKey?: boolean } },
      ) => Promise<void>;
    };

    component.map = mapStub;
    component.uploadedPhotoMarkers.set('cluster-1', {
      marker: createMarkerStub(),
      count: 3,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });

    const workspaceView = TestBed.inject(WorkspaceViewService);
    workspaceView.rawImages.set([
      {
        id: 'img-existing',
        latitude: 48.25,
        longitude: 16.35,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: null,
        projectName: null,
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: null,
        city: null,
        district: null,
        street: null,
        country: null,
        userName: null,
      },
    ]);

    vi.spyOn(workspaceView, 'fetchClusterImages').mockResolvedValue([
      {
        id: 'img-added',
        latitude: 48.21,
        longitude: 16.38,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: null,
        projectName: null,
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: null,
        city: null,
        district: null,
        street: null,
        country: null,
        userName: null,
      },
    ]);

    const setSpy = vi.spyOn(workspaceView, 'setActiveSelectionImages').mockImplementation(() => {});

    await component.handlePhotoMarkerClick('cluster-1', { originalEvent: { ctrlKey: true } });

    const merged = setSpy.mock.calls[0]?.[0] ?? [];
    expect(merged.map((image) => image.id).sort()).toEqual(['img-added', 'img-existing']);
  });

  it('Ctrl-click on single marker appends selection without opening detail view', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      uploadedPhotoMarkers: Map<
        string,
        {
          marker: unknown;
          count: number;
          lat: number;
          lng: number;
          sourceCells?: Array<{ lat: number; lng: number }>;
          imageId?: string;
        }
      >;
      handlePhotoMarkerClick: (
        markerKey: string,
        clickEvent?: { originalEvent: { ctrlKey?: boolean; metaKey?: boolean } },
      ) => Promise<void>;
    };

    component.map = mapStub;
    component.uploadedPhotoMarkers.set('single-1', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
      imageId: 'img-single',
    });

    const workspaceView = TestBed.inject(WorkspaceViewService);
    workspaceView.rawImages.set([]);

    vi.spyOn(workspaceView, 'fetchClusterImages').mockResolvedValue([
      {
        id: 'img-single',
        latitude: 48.2,
        longitude: 16.37,
        thumbnailPath: null,
        storagePath: null,
        capturedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        projectId: null,
        projectName: null,
        direction: null,
        exifLatitude: null,
        exifLongitude: null,
        addressLabel: null,
        city: null,
        district: null,
        street: null,
        country: null,
        userName: null,
      },
    ]);

    const setSpy = vi.spyOn(workspaceView, 'setActiveSelectionImages').mockImplementation(() => {});

    await component.handlePhotoMarkerClick('single-1', { originalEvent: { ctrlKey: true } });

    expect(setSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.detailImageId()).toBeNull();
  });

  // ── Photo panel ────────────────────────────────────────────────────────────

  it('photoPanelOpen signal defaults to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.photoPanelOpen()).toBe(false);
  });

  it('photo panel is not rendered when photoPanelOpen is false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector('app-workspace-pane');
    expect(panel).toBeNull();
  });

  it('photo panel is rendered when photoPanelOpen is true', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.photoPanelOpen.set(true);
    fixture.detectChanges();

    const panel = (fixture.nativeElement as HTMLElement).querySelector('app-workspace-pane');
    expect(panel).not.toBeNull();
  });

  it('drag divider is visible when photoPanelOpen is true', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.photoPanelOpen.set(true);
    fixture.detectChanges();

    const divider = (fixture.nativeElement as HTMLElement).querySelector('app-drag-divider');
    expect(divider).not.toBeNull();
  });
});
