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

  it('onZoomToLocation() flies quickly to a tighter detail zoom', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      flyTo: vi.fn(),
      once: vi.fn(),
      remove: vi.fn(),
    };
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    fixture.componentInstance.onZoomToLocation({
      imageId: 'img-1',
      lat: 48.2082,
      lng: 16.3738,
    });

    expect(mapStub.flyTo).toHaveBeenCalledWith([48.2082, 16.3738], 21, {
      duration: 0.35,
    });
    expect(mapStub.once).toHaveBeenCalledWith('moveend', expect.any(Function));
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
