/**
 * MapShellComponent – search bar & geocoding context.
 * Shared setup: map-shell.spec-setup.ts.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
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
    remove: vi.fn(),
  };
}

describe('MapShellComponent – search bar', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('onSearchMapCenterRequested() recenters the map and shows a search marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = createMapStub();
    (fixture.componentInstance as unknown as { map: unknown }).map = mapStub;

    fixture.componentInstance.onSearchMapCenterRequested({
      lat: 48.2082,
      lng: 16.3738,
      label: 'Stephansplatz 1, 1010 Wien Austria',
    });

    expect(mapStub.setView).toHaveBeenCalledWith([48.2082, 16.3738], 17, { animate: false });
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

    const mapStub = createMapStub();
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

    const mapStub = createMapStub();
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
});
