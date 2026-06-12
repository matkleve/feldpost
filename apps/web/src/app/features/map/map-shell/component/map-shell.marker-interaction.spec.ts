/**
 * MapShellComponent – Ctrl-click multi-select & marker hover.
 * Shared setup: map-shell.spec-setup.ts.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MarkerInteractionService } from '../markers/marker-interaction.service';
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

    component.handlePhotoMarkerClick('cluster-1', { originalEvent: { ctrlKey: true } });
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
          mediaId?: string;
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

    component.handlePhotoMarkerClick('single-1', { originalEvent: { ctrlKey: true } });
    await vi.waitUntil(() => selectSpy.mock.calls.length > 0);

    expect(selectSpy).toHaveBeenCalledWith(['img-single']);
    expect(fixture.componentInstance.detailMediaId()).toBeNull();
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

    const component = fixture.componentInstance as unknown as {
      uploadedPhotoMarkers: Map<
        string,
        {
          marker: unknown;
          count: number;
          lat: number;
          lng: number;
          mediaId?: string;
        }
      >;
      bindMarkerHoverInteraction: (markerKey: string, marker: unknown) => void;
    };

    component.uploadedPhotoMarkers.set('cluster-1', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
      mediaId: 'img-hovered',
    });

    component.bindMarkerHoverInteraction('cluster-1', createMarkerStub());
    expect(onEnter).toBeTypeOf('function');
    expect(onLeave).toBeTypeOf('function');

    onEnter?.();

    expect(fixture.componentInstance.selectedMarkerKey()).toBeNull();
    expect(fixture.componentInstance.selectedMarkerKeys().size).toBe(0);
    expect(Array.from(fixture.componentInstance.linkedHoveredWorkspaceMediaIds())).toEqual([
      'img-hovered',
    ]);

    onLeave?.();
    expect(fixture.componentInstance.linkedHoveredWorkspaceMediaIds().size).toBe(0);
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

    const component = fixture.componentInstance as unknown as {
      refreshPhotoMarker: ReturnType<typeof vi.fn>;
      bindMarkerHoverInteraction: (markerKey: string, marker: unknown) => void;
    };

    component.refreshPhotoMarker = vi.fn();

    component.bindMarkerHoverInteraction('cluster-1', createMarkerStub());
    expect(onEnter).toBeTypeOf('function');
    expect(onLeave).toBeTypeOf('function');

    onEnter?.();
    onLeave?.();

    expect(component.refreshPhotoMarker).not.toHaveBeenCalled();
  });
});
