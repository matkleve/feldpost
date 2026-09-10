/**
 * MapShellComponent – GPS button & geolocation tracking.
 * Shared setup: map-shell.spec-setup.ts.
 *
 * Rewritten 2026-09-10 for the facade refactor — see
 * docs/audits/2026-09-10-map-shell-test-migration-plan.md. GPS state now
 * lives on `component.gpsService` (MapShellGpsService, readonly signals);
 * `goToUserPosition()` is `component.mapPlacementService.goToUserPosition()`;
 * `map` lives on `TestBed.inject(MapShellInstanceService).map` (a plain
 * mutable field, not private); `userLocationMarker` is now fully private
 * inside MapShellGpsService with no external hook, so marker-removal /
 * marker-highlight assertions go through a `MapLeafletService` override that
 * hands back a spy-able fake marker instead of poking a private field.
 *
 * State that used to be forced with `.set(...)` is now earned through the
 * real flow: mock `navigator.geolocation.getCurrentPosition` (the same layer
 * MapGeolocationService itself calls), then call
 * `mapPlacementService.goToUserPosition()` and read `gpsService.*` after.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellInstanceService } from './map-shell-instance.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import { buildTestBed } from './map-shell.spec-setup';

function createMarkerMock() {
  const add = vi.fn();
  const remove = vi.fn();
  return {
    addTo: vi.fn().mockReturnThis(),
    setLatLng: vi.fn(),
    remove: vi.fn(),
    getElement: vi.fn().mockReturnValue({ classList: { add, remove } }),
    classListAdd: add,
    classListRemove: remove,
  };
}

/** Stubs the Leaflet-facing pieces MapShellGpsService touches: user-location
 *  marker creation (spy-able, so tests can assert on it) and the map instance
 *  it centers/zooms. Scoped to this file only via TestBed.overrideProvider —
 *  no other map-shell spec depends on user-location marker creation. */
function stubLeafletForGps(): { marker: ReturnType<typeof createMarkerMock> } {
  const marker = createMarkerMock();
  TestBed.overrideProvider(MapLeafletService, {
    useValue: { createUserLocationMarker: vi.fn().mockReturnValue(marker) },
  });
  return { marker };
}

/** Mocks `navigator.geolocation.getCurrentPosition` for one test, restored
 *  by the caller. This is the same layer MapGeolocationService.requestCurrentPosition
 *  calls, so it exercises the real service, not a bypass of it. */
function mockGeolocation(
  resolve: 'success' | 'error' | 'pending',
  coords?: { latitude: number; longitude: number },
): { getCurrentPosition: ReturnType<typeof vi.fn>; restore: () => void } {
  const original = navigator.geolocation;
  const getCurrentPosition = vi.fn(
    (success: PositionCallback, error?: PositionErrorCallback | null) => {
      if (resolve === 'success') {
        success({ coords: { ...coords } } as GeolocationPosition);
      } else if (resolve === 'error') {
        error?.({
          code: 3,
          message: 'timeout',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      }
      // 'pending': never call success/error — leaves gpsLocating true.
    },
  );
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return {
    getCurrentPosition,
    restore: () => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: original,
      });
    },
  };
}

describe('MapShellComponent – GPS', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('renders the GPS button', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn');
    expect(btn).not.toBeNull();
    expect((btn as HTMLButtonElement).getAttribute('aria-label')).toBe('Go to my location');
  });

  it('gpsLocating signal defaults to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.gpsService.gpsLocating()).toBe(false);
  });

  it('gpsTrackingActive signal defaults to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.gpsService.gpsTrackingActive()).toBe(false);
  });

  it('userPosition signal defaults to null', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.gpsService.userPosition()).toBeNull();
  });

  it('goToUserPosition() does not throw when map is undefined', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    expect(() => fixture.componentInstance.mapPlacementService.goToUserPosition()).not.toThrow();
  });

  it('GPS button shows spinner while locating', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const geo = mockGeolocation('pending');
    fixture.componentInstance.mapPlacementService.goToUserPosition();
    fixture.detectChanges();

    expect(fixture.componentInstance.gpsService.gpsLocating()).toBe(true);
    const spinner = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn__spinner');
    expect(spinner).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn .material-icons'),
    ).toBeNull();

    geo.restore();
  });

  it('GPS button uses crosshair without center dot when inactive', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const icon = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn .material-icons');
    expect(icon?.textContent?.trim()).toBe('gps_not_fixed');
  });

  it('GPS button uses crosshair with center dot when tracking active', () => {
    // Providers must be overridden before the fixture is created — once
    // TestBed instantiates the module's injector, overrideProvider throws.
    stubLeafletForGps();
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const geo = mockGeolocation('success', { latitude: 48.2, longitude: 16.37 });
    fixture.componentInstance.mapPlacementService.goToUserPosition();
    fixture.detectChanges();

    expect(fixture.componentInstance.gpsService.gpsTrackingActive()).toBe(true);
    const icon = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn .material-icons');
    expect(icon?.textContent?.trim()).toBe('gps_fixed');

    geo.restore();
  });

  it('goToUserPosition() requests current position, centers the map, and toggling again stops tracking + removes the marker', () => {
    const { marker } = stubLeafletForGps();
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
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    const geo = mockGeolocation('success', { latitude: 48.2, longitude: 16.37 });

    fixture.componentInstance.mapPlacementService.goToUserPosition();
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mapStub.setView).toHaveBeenCalledWith([48.2, 16.37], 16);
    expect(fixture.componentInstance.gpsService.gpsLocating()).toBe(false);
    expect(fixture.componentInstance.gpsService.gpsTrackingActive()).toBe(true);
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(fixture.componentInstance.gpsService.userPosition()).toEqual([48.2, 16.37]);
    expect(marker.addTo).toHaveBeenCalledWith(mapStub);

    fixture.componentInstance.mapPlacementService.goToUserPosition();
    expect(fixture.componentInstance.gpsService.gpsTrackingActive()).toBe(false);
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(marker.remove).toHaveBeenCalledTimes(1);

    geo.restore();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('goToUserPosition() recenters only after a fresh fix when userPosition is already known', () => {
    stubLeafletForGps();
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    // Seed userPosition without touching tracking state, via the same public
    // entry point the real startup flow uses (MapShellGpsService.initBackground).
    const seedGeo = mockGeolocation('success', { latitude: 51.5, longitude: -0.12 });
    TestBed.inject(MapShellGpsService).initBackground(() => {});
    expect(fixture.componentInstance.gpsService.userPosition()).toEqual([51.5, -0.12]);
    seedGeo.restore();

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(12),
      remove: vi.fn(),
    };
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    const geo = mockGeolocation('success', { latitude: 48.2, longitude: 16.37 });
    const originalRequestOptions = geo.getCurrentPosition;
    void originalRequestOptions; // options assertion covered by MapGeolocationService's own spec, not re-asserted here

    fixture.componentInstance.mapPlacementService.goToUserPosition();

    expect(mapStub.setView).not.toHaveBeenCalledWith([51.5, -0.12], expect.anything());
    expect(mapStub.setView).toHaveBeenCalledWith([48.2, 16.37], 16);
    expect(fixture.componentInstance.gpsService.gpsLocating()).toBe(false);
    expect(fixture.componentInstance.gpsService.gpsTrackingActive()).toBe(true);
    expect(setIntervalSpy).toHaveBeenCalled();
    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);

    fixture.componentInstance.mapPlacementService.goToUserPosition();
    expect(fixture.componentInstance.gpsService.gpsTrackingActive()).toBe(false);

    geo.restore();
    setIntervalSpy.mockRestore();
  });

  it('goToUserPosition() deactivates tracking when location lookup fails', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const geo = mockGeolocation('error');
    fixture.componentInstance.mapPlacementService.goToUserPosition();

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.gpsService.gpsTrackingActive()).toBe(false);
    expect(fixture.componentInstance.gpsService.gpsLocating()).toBe(false);

    geo.restore();
  });

  it('initBackground() resolves user position without auto-recentering the map', () => {
    // Tests MapShellGpsService.initBackground() directly — the real entry
    // point for this behavior (MapShellInitService's deferred-startup path
    // calls it the same way, gated behind a real Leaflet map existing, which
    // this suite doesn't construct). The component no longer exposes an
    // `initGeolocation()` method of its own; there isn't one to call through.
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(13),
      remove: vi.fn(),
    };
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    const geo = mockGeolocation('success', { latitude: 48.2082, longitude: 16.3738 });
    const onPositionResolved = vi.fn();

    TestBed.inject(MapShellGpsService).initBackground(onPositionResolved);

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mapStub.setView).not.toHaveBeenCalled();
    expect(onPositionResolved).toHaveBeenCalledWith([48.2082, 16.3738]);
    expect(fixture.componentInstance.gpsService.userPosition()).toEqual([48.2082, 16.3738]);

    geo.restore();
  });

  it('goToUserPosition() highlights the user marker for one second after recenter', () => {
    vi.useFakeTimers();

    const { marker } = stubLeafletForGps();
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      addLayer: vi.fn(),
      setView: vi.fn(),
      getZoom: vi.fn().mockReturnValue(12),
      remove: vi.fn(),
    };
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    const geo = mockGeolocation('success', { latitude: 51.5, longitude: -0.12 });
    fixture.componentInstance.mapPlacementService.goToUserPosition();

    expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(marker.classListAdd).toHaveBeenCalledWith('map-user-location-marker--fresh');

    vi.advanceTimersByTime(1000);
    expect(marker.classListRemove).toHaveBeenCalledWith('map-user-location-marker--fresh');

    geo.restore();
    vi.useRealTimers();
  });
});
