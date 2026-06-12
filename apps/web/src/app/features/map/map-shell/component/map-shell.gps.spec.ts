/**
 * MapShellComponent – GPS button & geolocation tracking.
 * Shared setup: map-shell.spec-setup.ts.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { buildTestBed } from './map-shell.spec-setup';

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
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn .material-icons'),
    ).toBeNull();
  });

  it('GPS button uses crosshair without center dot when inactive', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const icon = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn .material-icons');
    expect(icon?.textContent?.trim()).toBe('gps_not_fixed');
  });

  it('GPS button uses crosshair with center dot when tracking active', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.gpsTrackingActive.set(true);
    fixture.detectChanges();

    const icon = (fixture.nativeElement as HTMLElement).querySelector('.map-gps-btn .material-icons');
    expect(icon?.textContent?.trim()).toBe('gps_fixed');
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
    expect(
      (fixture.componentInstance as unknown as { userLocationMarker: unknown }).userLocationMarker,
    ).toBeNull();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('goToUserPosition() removes the user marker when tracking is turned off', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const markerRemove = vi.fn();
    (
      fixture.componentInstance as unknown as {
        userLocationMarker: { remove: ReturnType<typeof vi.fn> };
      }
    ).userLocationMarker = { remove: markerRemove };

    fixture.componentInstance.gpsTrackingActive.set(true);
    fixture.componentInstance.goToUserPosition();

    expect(fixture.componentInstance.gpsTrackingActive()).toBe(false);
    expect(markerRemove).toHaveBeenCalledTimes(1);
    expect(
      (fixture.componentInstance as unknown as { userLocationMarker: unknown }).userLocationMarker,
    ).toBeNull();
  });

  it('goToUserPosition() recenters only after a fresh fix when userPosition is already known', () => {
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
    const getCurrentPosition = vi.fn(
      (success: PositionCallback, _error: PositionErrorCallback | null, options?: PositionOptions) => {
        expect(options?.maximumAge).toBe(0);
        success({
          coords: {
            latitude: 48.2,
            longitude: 16.37,
          },
        } as GeolocationPosition);
      },
    );

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
      },
    });

    fixture.componentInstance.goToUserPosition();

    expect(mapStub.setView).not.toHaveBeenCalledWith([51.5, -0.12], expect.anything());
    expect(mapStub.setView).toHaveBeenCalledWith([48.2, 16.37], 16);
    expect(fixture.componentInstance.gpsLocating()).toBe(false);
    expect(fixture.componentInstance.gpsTrackingActive()).toBe(true);
    expect(setIntervalSpy).toHaveBeenCalled();
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
    expect(
      (fixture.componentInstance as unknown as { userLocationMarker: unknown }).userLocationMarker,
    ).toBeNull();

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
});
