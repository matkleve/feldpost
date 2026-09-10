/**
 * MapShellComponent – radius image selection & live draft highlights.
 * Shared setup: map-shell.spec-setup.ts.
 *
 * Rewritten 2026-09-10 for the facade refactor — see
 * docs/audits/2026-09-10-map-shell-test-migration-plan.md. Like its sibling
 * files, this one compiled clean before the rewrite only because every
 * access went through `fixture.componentInstance as unknown as {...}` casts
 * — it would have thrown at runtime.
 *
 * `selectRadiusImages(center, radiusMeters, additive)` →
 * `RadiusDrawingOrchestratorService.selectImages(...)` (renamed, same
 * signature). `updateRadiusSelectionDraft(latlng)` →
 * `RadiusDrawingOrchestratorService.updateDraft(latlng)` — but its
 * prerequisite state (`radiusDrawStartLatLng` and the draft line/circle/
 * label) is now private and only set by calling `startDraw(...)` first, the
 * same way a real drag does. `startDraw` creates real Leaflet draft visuals
 * via MapLeafletService/RadiusVisualsService, so this file overrides both
 * (scoped to it — no sibling spec draws a radius). `selectedMarkerKeys` is
 * `component.state.selectedMarkerKeys`. `uploadedPhotoMarkers`/`map` are on
 * MapShellInstanceService. `refreshPhotoMarker` is spied on
 * MapPhotoMarkerRenderService directly, not assigned onto the component.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { MapShellInstanceService } from './map-shell-instance.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import { RadiusVisualsService } from '../radius/radius-visuals.service';
import { MapPhotoMarkerRenderService } from '../markers/map-photo-marker-render.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { buildTestBed, createMarkerStub } from './map-shell.spec-setup';

/** Scoped to this file only — no other map-shell spec drives a radius draw,
 *  so overriding these two providers has no blast radius elsewhere. */
function stubRadiusVisuals(): void {
  TestBed.overrideProvider(MapLeafletService, {
    useValue: {
      createRadiusDraftLine: vi.fn().mockReturnValue({ setLatLngs: vi.fn(), remove: vi.fn() }),
      createRadiusDraftCircle: vi.fn().mockReturnValue({ setRadius: vi.fn(), remove: vi.fn() }),
    },
  });
  TestBed.overrideProvider(RadiusVisualsService, {
    useValue: {
      createLabelMarker: vi.fn().mockReturnValue({
        addTo: vi.fn().mockReturnValue({
          setLatLng: vi.fn(),
          remove: vi.fn(),
          getElement: vi.fn().mockReturnValue(null),
        }),
      }),
      updateLabelMarker: vi.fn(),
      getLabelLatLng: vi.fn().mockReturnValue({ lat: 48.2, lng: 16.375 }),
      getReadableLineAngleDeg: vi.fn().mockReturnValue(0),
      // MapShellInitService.cleanup() calls this unconditionally on
      // ngOnDestroy — without a stub, fixture teardown throws.
      clearCommittedSelectionVisuals: vi.fn(),
    },
  });
}

describe('MapShellComponent – radius selection', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('radius selection replaces workspace images when Ctrl is not pressed', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      distance: vi.fn((_center: unknown, target: [number, number]) =>
        target[0] === 48.2 ? 80 : 600,
      ),
      remove: vi.fn(),
    };
    const instance = TestBed.inject(MapShellInstanceService);
    instance.map = mapStub as never;
    instance.uploadedPhotoMarkers.set('in-radius', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });
    instance.uploadedPhotoMarkers.set('out-radius', {
      marker: createMarkerStub() as never,
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

    await TestBed.inject(RadiusDrawingOrchestratorService).selectImages(
      { lat: 48.2, lng: 16.37 } as never,
      200,
      false,
    );

    expect(fetchSpy).toHaveBeenCalledWith([{ lat: 48.2, lng: 16.37 }], 15);
    expect(selectSpy).toHaveBeenCalledWith(['img-radius-1']);
    expect(Array.from(state.selectedMarkerKeys())).toEqual(['in-radius']);
  });

  it('radius selection merges workspace images when Ctrl-additive is used', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      distance: vi.fn(() => 70),
      remove: vi.fn(),
    };
    const instance = TestBed.inject(MapShellInstanceService);
    instance.map = mapStub as never;
    instance.uploadedPhotoMarkers.set('in-radius', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });
    instance.uploadedPhotoMarkers.set('already-selected', {
      marker: createMarkerStub() as never,
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

    await TestBed.inject(RadiusDrawingOrchestratorService).selectImages(
      { lat: 48.2, lng: 16.37 } as never,
      200,
      true,
    );

    const mergedIds = selectSpy.mock.calls[0]?.[0] ?? [];
    expect([...mergedIds].sort()).toEqual(['img-added', 'img-existing']);
    expect(Array.from(state.selectedMarkerKeys()).sort()).toEqual([
      'already-selected',
      'in-radius',
    ]);
  });

  it('radius draft highlights markers live while dragging', () => {
    stubRadiusVisuals();
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      // updateDraft() calls distance(start, currentLatLng) with LatLng-shaped
      // objects for the circle radius; RadiusDraftHighlightService calls it
      // again per marker with a [lat, lng] tuple. Handle both shapes so the
      // outer radius (used as the highlight threshold) and the per-marker
      // distances agree on which fixture marker is "in range".
      distance: vi.fn((_center: unknown, target: [number, number] | { lat: number }) => {
        const targetLat = Array.isArray(target) ? target[0] : target.lat;
        return targetLat === 48.2 ? 80 : 600;
      }),
      latLngToContainerPoint: vi.fn(() => ({ x: 0, y: 0 })),
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
    };
    const instance = TestBed.inject(MapShellInstanceService);
    instance.map = mapStub as never;
    instance.uploadedPhotoMarkers.set('in-radius', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2,
      lng: 16.37,
    });
    instance.uploadedPhotoMarkers.set('out-radius', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 47.5,
      lng: 15.9,
    });

    const refreshSpy = vi
      .spyOn(TestBed.inject(MapPhotoMarkerRenderService), 'refreshPhotoMarker')
      .mockImplementation(() => {});

    const radiusService = TestBed.inject(RadiusDrawingOrchestratorService);
    radiusService.startDraw({ lat: 48.2, lng: 16.37 } as never, false);
    radiusService.updateDraft({ lat: 48.2, lng: 16.38 } as never);

    expect(radiusService.isDraftHighlighted('in-radius')).toBe(true);
    expect(radiusService.isDraftHighlighted('out-radius')).toBe(false);
    expect(refreshSpy).toHaveBeenCalledWith('in-radius');
  });
});
