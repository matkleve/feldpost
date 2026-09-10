/**
 * MapShellComponent – search bar & geocoding context.
 * Shared setup: map-shell.spec-setup.ts.
 *
 * Rewritten 2026-09-10 for the facade refactor — see
 * docs/audits/2026-09-10-map-shell-test-migration-plan.md.
 * `onSearchMapCenterRequested`/`onSearchClearRequested`/`goToUserPosition` are
 * on `component.mapPlacementService`. `onZoomToLocation` lives on
 * `MapViewFlyService`, injected directly — it's called from
 * map-shell-init.service.ts's deferred-startup path, not exposed anywhere on
 * the component. `map` is `TestBed.inject(MapShellInstanceService).map` (a
 * plain mutable field). `searchLocationMarker` is now private inside
 * MapShellSearchService with no external hook, so marker-presence assertions
 * go through a `MapLeafletService` override the same way the GPS spec does.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellInstanceService } from './map-shell-instance.service';
import { MapViewFlyService } from '../handlers/map-view-fly.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import { GeocodingService } from '../../../../core/geocoding/geocoding.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { buildTestBed } from './map-shell.spec-setup';

function createMapStub() {
  const bounds = {
    getNorth: vi.fn().mockReturnValue(49),
    getEast: vi.fn().mockReturnValue(17),
    getSouth: vi.fn().mockReturnValue(47),
    getWest: vi.fn().mockReturnValue(15),
  };

  return {
    addLayer: vi.fn(),
    setView: vi.fn(),
    getZoom: vi.fn().mockReturnValue(13),
    getBounds: vi.fn().mockReturnValue(bounds),
    invalidateSize: vi.fn(),
    project: vi.fn().mockReturnValue({ add: vi.fn().mockReturnValue({ x: 0, y: 0 }) }),
    remove: vi.fn(),
  };
}

function createSearchMarkerMock() {
  // getElement() is needed even here: the same mock backs
  // createUserLocationMarker below, and MapShellGpsService.triggerLocationFoundState()
  // calls it on a successful goToUserPosition() fix (returning null is fine —
  // that just skips the fresh-highlight animation this file doesn't assert on).
  return {
    addTo: vi.fn().mockReturnThis(),
    setLatLng: vi.fn(),
    remove: vi.fn(),
    getElement: vi.fn().mockReturnValue(null),
  };
}

/** Scoped to this file only — no other map-shell spec creates search/user
 *  location markers, so overriding MapLeafletService here has no blast radius
 *  on the other suites sharing buildTestBed(). */
function stubLeafletForSearch(): { searchMarker: ReturnType<typeof createSearchMarkerMock> } {
  const searchMarker = createSearchMarkerMock();
  TestBed.overrideProvider(MapLeafletService, {
    useValue: {
      createSearchLocationMarker: vi.fn().mockReturnValue(searchMarker),
      createUserLocationMarker: vi.fn().mockReturnValue(createSearchMarkerMock()),
    },
  });
  return { searchMarker };
}

describe('MapShellComponent – search bar', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('onSearchMapCenterRequested() recenters the map and shows a search marker', () => {
    // Providers must be overridden before the fixture is created — once
    // TestBed instantiates the module's injector, overrideProvider throws.
    const { searchMarker } = stubLeafletForSearch();
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = createMapStub();
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    fixture.componentInstance.mapPlacementService.onSearchMapCenterRequested({
      lat: 48.2082,
      lng: 16.3738,
      label: 'Stephansplatz 1, 1010 Wien Austria',
    });

    expect(mapStub.setView).toHaveBeenCalledWith([48.2082, 16.3738], 17, { animate: false });
    expect(searchMarker.addTo).toHaveBeenCalledWith(mapStub);
  });

  it('onZoomToLocation() centers map to tighter detail zoom without animation', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = createMapStub();
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    TestBed.inject(MapViewFlyService).onZoomToLocation({
      mediaId: 'img-1',
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
    workspaceView.setActiveSelectionImages([
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

    const context = fixture.componentInstance.searchContext.searchQueryContext();
    expect(context.dataCentroid?.lat).toBeCloseTo(48.8616, 4);
    expect(context.dataCentroid?.lng).toBeCloseTo(2.3422, 4);
  });

  it('goToUserPosition() updates search countryCodes from reverse geocode', async () => {
    stubLeafletForSearch();
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

    const mapStub = createMapStub();
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

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

    fixture.componentInstance.mapPlacementService.goToUserPosition();
    await Promise.resolve();

    expect(fixture.componentInstance.searchContext.searchQueryContext().countryCodes).toEqual(['fr']);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: originalGeolocation,
    });
  });

  it('onSearchClearRequested() removes the search marker', () => {
    const { searchMarker } = stubLeafletForSearch();
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = createMapStub();
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    fixture.componentInstance.mapPlacementService.onSearchMapCenterRequested({
      lat: 48.2082,
      lng: 16.3738,
      label: 'Stephansplatz 1, 1010 Wien Austria',
    });
    fixture.componentInstance.mapPlacementService.onSearchClearRequested();

    expect(searchMarker.remove).toHaveBeenCalledTimes(1);
  });
});
