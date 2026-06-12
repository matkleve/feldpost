/**
 * MapShellComponent – radius image selection & live draft highlights.
 * Shared setup: map-shell.spec-setup.ts.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { buildTestBed, createMarkerStub } from './map-shell.spec-setup';

describe('MapShellComponent – radius selection', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
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

    const selectionService = TestBed.inject(WorkspaceSelectionService);
    const fetchSpy = vi.spyOn(workspaceView, 'fetchClusterImages').mockResolvedValue(incoming);
    const selectSpy = vi.spyOn(selectionService, 'selectAllInScope');

    await component.selectRadiusImages({ lat: 48.2, lng: 16.37 }, 200, false);

    expect(fetchSpy).toHaveBeenCalledWith([{ lat: 48.2, lng: 16.37 }], 15);
    expect(selectSpy).toHaveBeenCalledWith(['img-radius-1']);
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
    TestBed.inject(MapShellState).setSelectedMarkerKeys(new Set(['already-selected']));

    const workspaceView = TestBed.inject(WorkspaceViewService);
    const selectionService = TestBed.inject(WorkspaceSelectionService);
    selectionService.selectAllInScope(['img-existing']);

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
    const selectSpy = vi.spyOn(selectionService, 'selectAllInScope');

    await component.selectRadiusImages({ lat: 48.2, lng: 16.37 }, 200, true);

    const mergedIds = selectSpy.mock.calls[0]?.[0] ?? [];
    expect([...mergedIds].sort()).toEqual(['img-added', 'img-existing']);
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
});
