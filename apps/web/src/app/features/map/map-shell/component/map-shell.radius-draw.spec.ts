/**
 * MapShellComponent – radius draw gesture & marker context menus.
 * Shared setup: map-shell.spec-setup.ts.
 *
 * Rewritten 2026-09-10 for the facade refactor — see
 * docs/audits/2026-09-10-map-shell-test-migration-plan.md. Like
 * map-shell.context-menu.spec.ts, this file compiled clean before the
 * rewrite only because every access went through
 * `fixture.componentInstance as unknown as {...}` casts — it would have
 * thrown at runtime.
 *
 * `handleMapMouseDown`/`handleMapMouseUp`/`handleMapMouseMove` moved to
 * MapClickHandlerService. `radiusDrawActive` → `RadiusDrawingOrchestratorService.isDrawActive()`.
 * `mapContextMenuOpen`/`markerContextMenuOpen`/`markerContextMenuPayload`/
 * `draftMediaMarker`/`placementActive` are on `component.state`.
 * `openMarkerContextMenu` moved to `MapContextMenuOpenService`.
 * `enterPlacementMode` is `component.mapPlacementService.enterPlacementMode`.
 * `uploadedPhotoMarkers`/`map` are on `MapShellInstanceService` (plain
 * public fields).
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { MapShellInstanceService } from './map-shell-instance.service';
import { MapClickHandlerService } from '../handlers/map-click-handler.service';
import { MapContextMenuOpenService } from '../context-menu/map-context-menu-open.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { buildTestBed, createMapStub, createMarkerStub } from './map-shell.spec-setup';
import type { MapMouseEvent } from '../leaflet/map-leaflet.service';

describe('MapShellComponent – radius draw', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('right-click drag starts radius draw instead of opening map menu', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const mapStub = createMapStub({
      mouseEventToContainerPoint: vi.fn((evt: { clientX: number; clientY: number }) => ({
        x: evt.clientX,
        y: evt.clientY,
      })),
      on: vi.fn(),
      off: vi.fn(),
      distance: vi.fn().mockReturnValue(100),
    });
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    const clickHandler = TestBed.inject(MapClickHandlerService);

    clickHandler.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    } as unknown as MapMouseEvent);

    clickHandler.handleMapMouseMove({
      latlng: { lat: 48.2, lng: 16.39 },
      originalEvent: {
        clientX: 130,
        clientY: 132,
      },
    } as unknown as MapMouseEvent);

    expect(TestBed.inject(RadiusDrawingOrchestratorService).isDrawActive()).toBe(true);
    expect(state.mapContextMenuOpen()).toBe(false);
  });

  it('short right-click does not start radius on later mouse move', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

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
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    const clickHandler = TestBed.inject(MapClickHandlerService);

    clickHandler.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    } as unknown as MapMouseEvent);

    clickHandler.handleMapMouseUp({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    } as unknown as MapMouseEvent);

    clickHandler.handleMapMouseMove({
      latlng: { lat: 48.2, lng: 16.39 },
      originalEvent: {
        clientX: 130,
        clientY: 132,
      },
    } as unknown as MapMouseEvent);

    expect(state.mapContextMenuOpen()).toBe(true);
    expect(TestBed.inject(RadiusDrawingOrchestratorService).isDrawActive()).toBe(false);
  });

  it('opens marker context menu payload for right-clicked marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const mapStub = {
      latLngToContainerPoint: vi.fn().mockReturnValue({ x: 10, y: 10 }),
      getContainer: vi.fn().mockReturnValue({
        getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
      }),
      remove: vi.fn(),
    };
    const instance = TestBed.inject(MapShellInstanceService);
    instance.map = mapStub as never;
    instance.uploadedPhotoMarkers.set('single-1', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2,
      lng: 16.37,
      mediaId: 'img-1',
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });

    TestBed.inject(MapContextMenuOpenService).openMarkerContextMenu('single-1', {
      clientX: 220,
      clientY: 240,
    } as MouseEvent);

    expect(state.markerContextMenuOpen()).toBe(true);
    expect(state.markerContextMenuPayload()?.markerKey).toBe('single-1');
    expect(state.markerContextMenuPayload()?.mediaId).toBe('img-1');
  });

  it('opens marker context as multi-selection when multiple markers are selected', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const mapStub = {
      latLngToContainerPoint: vi.fn().mockReturnValue({ x: 10, y: 10 }),
      getContainer: vi.fn().mockReturnValue({
        getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
      }),
      remove: vi.fn(),
    };
    const instance = TestBed.inject(MapShellInstanceService);
    instance.map = mapStub as never;
    instance.uploadedPhotoMarkers.set('single-1', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2,
      lng: 16.37,
      mediaId: 'img-1',
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });
    instance.uploadedPhotoMarkers.set('single-2', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2007,
      lng: 16.3707,
      mediaId: 'img-2',
      sourceCells: [{ lat: 48.2007, lng: 16.3707 }],
    });

    TestBed.inject(MapShellState).setSelectedMarkerKeys(new Set(['single-1', 'single-2']));
    TestBed.inject(MapContextMenuOpenService).openMarkerContextMenu('single-1', {
      clientX: 220,
      clientY: 240,
    } as MouseEvent);

    expect(state.markerContextMenuPayload()?.isMultiSelection).toBe(true);
    expect(state.markerContextMenuPayload()?.count).toBe(2);
    expect(state.markerContextMenuPayload()?.mediaId).toBeUndefined();
    expect(state.markerContextMenuPayload()?.sourceCells?.length).toBe(2);
  });

  it('enterPlacementMode auto-places missing-data jobs at active draft marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const uploadShellUi = TestBed.inject(UploadShellUiService);
    const placeFile = vi.spyOn(uploadShellUi, 'placeFile');

    TestBed.inject(MapShellState).setDraftMediaMarker({
      lat: 48.2,
      lng: 16.37,
      uploadCount: 0,
    });

    fixture.componentInstance.mapPlacementService.enterPlacementMode('job-1');

    expect(placeFile).toHaveBeenCalledWith('job-1', { lat: 48.2, lng: 16.37 });
    expect(state.placementActive()).toBe(false);
  });
});
