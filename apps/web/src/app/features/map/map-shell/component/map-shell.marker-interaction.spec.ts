/**
 * MapShellComponent – Ctrl-click multi-select & marker hover.
 * Shared setup: map-shell.spec-setup.ts.
 *
 * Rewritten 2026-09-10 for the facade refactor — see
 * docs/audits/2026-09-10-map-shell-test-migration-plan.md.
 *
 * This file went further out of date than a path rename: it used
 * `fixture.componentInstance as unknown as {...}` casts to reach
 * `handlePhotoMarkerClick`, `bindMarkerHoverInteraction`,
 * `refreshPhotoMarker` and `uploadedPhotoMarkers` — none of which are on the
 * component any more, and none of which the compiler flagged, because an
 * `as unknown as X` cast tells TypeScript to stop checking. These would have
 * thrown at runtime (`Cannot read properties of undefined`), not failed
 * loudly at compile time — worse than the other three files in this
 * migration, and worth flagging as its own lesson: an unsafe cast in a test
 * is a hole the same size as a `readonly` signal with no `.asReadonly()`
 * (docs/audits/2026-09-10-spartan-and-state.md § 2) — it hides drift instead
 * of catching it.
 *
 * Current homes: `handlePhotoMarkerClick` → PhotoMarkerLifecycleService
 * (called directly here — its `MarkerBindingContext` indirection is
 * real-app click wiring, not needed to unit test the method itself).
 * `bindMarkerHoverInteraction` → MapMarkerBindingService.
 * `refreshPhotoMarker` → MapPhotoMarkerRenderService (spied on directly).
 * `uploadedPhotoMarkers` and `map` → MapShellInstanceService (both plain
 * public fields, not private).
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellInstanceService } from './map-shell-instance.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MarkerInteractionService } from '../markers/marker-interaction.service';
import { MapMarkerBindingService } from '../markers/map-marker-binding.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapPhotoMarkerRenderService } from '../markers/map-photo-marker-render.service';
import { buildTestBed, createMarkerStub } from './map-shell.spec-setup';

describe('MapShellComponent – marker interaction', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('Ctrl-click on marker appends marker images to active selection', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      remove: vi.fn(),
    };
    const instance = TestBed.inject(MapShellInstanceService);
    instance.map = mapStub as never;
    instance.uploadedPhotoMarkers.set('cluster-1', {
      marker: createMarkerStub() as never,
      count: 3,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });

    const workspaceView = TestBed.inject(WorkspaceViewService);
    const selectionService = TestBed.inject(WorkspaceSelectionService);
    selectionService.selectAllInScope(['img-existing']);

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

    const selectSpy = vi.spyOn(selectionService, 'selectAllInScope');

    TestBed.inject(PhotoMarkerLifecycleService).handlePhotoMarkerClick('cluster-1', {
      originalEvent: { ctrlKey: true },
    } as never);
    await vi.waitUntil(() => selectSpy.mock.calls.length > 0);

    const mergedIds = selectSpy.mock.calls.at(-1)?.[0] ?? [];
    expect([...mergedIds].sort()).toEqual(['img-added', 'img-existing']);
  });

  it('Ctrl-click on single marker appends selection without opening detail view', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      getZoom: vi.fn().mockReturnValue(15),
      remove: vi.fn(),
    };
    const instance = TestBed.inject(MapShellInstanceService);
    instance.map = mapStub as never;
    instance.uploadedPhotoMarkers.set('single-1', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2,
      lng: 16.37,
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
      mediaId: 'img-single',
    });

    const workspaceView = TestBed.inject(WorkspaceViewService);
    const selectionService = TestBed.inject(WorkspaceSelectionService);
    selectionService.clearSelection();

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

    const selectSpy = vi.spyOn(selectionService, 'selectAllInScope');

    TestBed.inject(PhotoMarkerLifecycleService).handlePhotoMarkerClick('single-1', {
      originalEvent: { ctrlKey: true },
    } as never);
    await vi.waitUntil(() => selectSpy.mock.calls.length > 0);

    expect(selectSpy).toHaveBeenCalledWith(['img-single']);
    expect(fixture.componentInstance.state.detailMediaId()).toBeNull();
  });

  it('marker hover links workspace items without selecting marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const markerInteractionService = TestBed.inject(MarkerInteractionService);
    let onEnter: (() => void) | undefined;
    let onLeave: (() => void) | undefined;
    vi.spyOn(markerInteractionService, 'bindHover').mockImplementation((_marker, handlers) => {
      onEnter = handlers.onEnter;
      onLeave = handlers.onLeave;
    });

    const workspaceView = TestBed.inject(WorkspaceViewService);
    workspaceView.setActiveSelectionImages([
      {
        id: 'img-hovered',
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

    TestBed.inject(MapShellInstanceService).uploadedPhotoMarkers.set('cluster-1', {
      marker: createMarkerStub() as never,
      count: 1,
      lat: 48.2,
      lng: 16.37,
      mediaId: 'img-hovered',
    });

    TestBed.inject(MapMarkerBindingService).bindMarkerHoverInteraction(
      'cluster-1',
      createMarkerStub() as never,
    );
    expect(onEnter).toBeTypeOf('function');
    expect(onLeave).toBeTypeOf('function');

    onEnter?.();

    expect(fixture.componentInstance.state.selectedMarkerKey()).toBeNull();
    expect(fixture.componentInstance.state.selectedMarkerKeys().size).toBe(0);
    expect(Array.from(fixture.componentInstance.state.linkedHoveredWorkspaceMediaIds())).toEqual([
      'img-hovered',
    ]);

    onLeave?.();
    expect(fixture.componentInstance.state.linkedHoveredWorkspaceMediaIds().size).toBe(0);
  });

  it('marker hover enter/leave does not refresh marker icons', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const markerInteractionService = TestBed.inject(MarkerInteractionService);
    let onEnter: (() => void) | undefined;
    let onLeave: (() => void) | undefined;
    vi.spyOn(markerInteractionService, 'bindHover').mockImplementation((_marker, handlers) => {
      onEnter = handlers.onEnter;
      onLeave = handlers.onLeave;
    });

    const refreshSpy = vi
      .spyOn(TestBed.inject(MapPhotoMarkerRenderService), 'refreshPhotoMarker')
      .mockImplementation(() => {});

    TestBed.inject(MapMarkerBindingService).bindMarkerHoverInteraction(
      'cluster-1',
      createMarkerStub() as never,
    );
    expect(onEnter).toBeTypeOf('function');
    expect(onLeave).toBeTypeOf('function');

    onEnter?.();
    onLeave?.();

    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
