/**
 * MapShellComponent – radius draw gesture & marker context menus.
 * Shared setup: map-shell.spec-setup.ts.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { buildTestBed, createMapStub, createMarkerStub } from './map-shell.spec-setup';

describe('MapShellComponent – radius draw', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('right-click drag starts radius draw instead of opening map menu', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = createMapStub({
      mouseEventToContainerPoint: vi.fn((evt: { clientX: number; clientY: number }) => ({
        x: evt.clientX,
        y: evt.clientY,
      })),
      on: vi.fn(),
      off: vi.fn(),
      distance: vi.fn().mockReturnValue(100),
    });

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      mapContextMenuOpen: { (): boolean };
      radiusDrawActive: boolean;
      handleMapMouseDown: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          ctrlKey?: boolean;
          metaKey?: boolean;
          preventDefault: () => void;
        };
      }) => void;
      handleMapMouseMove: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          clientX: number;
          clientY: number;
        };
      }) => void;
    };

    component.map = mapStub;
    component.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    });

    component.handleMapMouseMove({
      latlng: { lat: 48.2, lng: 16.39 },
      originalEvent: {
        clientX: 130,
        clientY: 132,
      },
    });

    expect(component.radiusDrawActive).toBe(true);
    expect(component.mapContextMenuOpen()).toBe(false);
  });

  it('short right-click does not start radius on later mouse move', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

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

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      mapContextMenuOpen: { (): boolean };
      radiusDrawActive: boolean;
      handleMapMouseDown: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
        };
      }) => void;
      handleMapMouseUp: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
        };
      }) => void;
      handleMapMouseMove: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          clientX: number;
          clientY: number;
        };
      }) => void;
    };

    component.map = mapStub;
    component.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    });

    component.handleMapMouseUp({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 100,
        clientY: 100,
        preventDefault: vi.fn(),
      },
    });

    component.handleMapMouseMove({
      latlng: { lat: 48.2, lng: 16.39 },
      originalEvent: {
        clientX: 130,
        clientY: 132,
      },
    });

    expect(component.mapContextMenuOpen()).toBe(true);
    expect(component.radiusDrawActive).toBe(false);
  });

  it('opens marker context menu payload for right-clicked marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      latLngToContainerPoint: vi.fn().mockReturnValue({ x: 10, y: 10 }),
      getContainer: vi.fn().mockReturnValue({
        getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
      }),
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
          mediaId?: string;
          sourceCells?: Array<{ lat: number; lng: number }>;
        }
      >;
      markerContextMenuOpen: { (): boolean };
      markerContextMenuPayload: {
        (): {
          markerKey: string;
          count: number;
          lat: number;
          lng: number;
          mediaId?: string;
        } | null;
      };
      openMarkerContextMenu: (
        markerKey: string,
        sourceEvent?: { clientX: number; clientY: number },
      ) => void;
    };

    component.map = mapStub;
    component.uploadedPhotoMarkers.set('single-1', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
      mediaId: 'img-1',
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });

    component.openMarkerContextMenu('single-1', { clientX: 220, clientY: 240 });

    expect(component.markerContextMenuOpen()).toBe(true);
    expect(component.markerContextMenuPayload()?.markerKey).toBe('single-1');
    expect(component.markerContextMenuPayload()?.mediaId).toBe('img-1');
  });

  it('opens marker context as multi-selection when multiple markers are selected', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      latLngToContainerPoint: vi.fn().mockReturnValue({ x: 10, y: 10 }),
      getContainer: vi.fn().mockReturnValue({
        getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0 }),
      }),
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
          mediaId?: string;
          sourceCells?: Array<{ lat: number; lng: number }>;
        }
      >;
      selectedMarkerKeys: { set: (value: Set<string>) => void };
      markerContextMenuPayload: {
        (): {
          markerKey: string;
          count: number;
          lat: number;
          lng: number;
          mediaId?: string;
          isMultiSelection?: boolean;
          sourceCells: Array<{ lat: number; lng: number }>;
        } | null;
      };
      openMarkerContextMenu: (
        markerKey: string,
        sourceEvent?: { clientX: number; clientY: number },
      ) => void;
    };

    component.map = mapStub;
    component.uploadedPhotoMarkers.set('single-1', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2,
      lng: 16.37,
      mediaId: 'img-1',
      sourceCells: [{ lat: 48.2, lng: 16.37 }],
    });
    component.uploadedPhotoMarkers.set('single-2', {
      marker: createMarkerStub(),
      count: 1,
      lat: 48.2007,
      lng: 16.3707,
      mediaId: 'img-2',
      sourceCells: [{ lat: 48.2007, lng: 16.3707 }],
    });

    TestBed.inject(MapShellState).setSelectedMarkerKeys(new Set(['single-1', 'single-2']));
    component.openMarkerContextMenu('single-1', { clientX: 220, clientY: 240 });

    expect(component.markerContextMenuPayload()?.isMultiSelection).toBe(true);
    expect(component.markerContextMenuPayload()?.count).toBe(2);
    expect(component.markerContextMenuPayload()?.mediaId).toBeUndefined();
    expect(component.markerContextMenuPayload()?.sourceCells.length).toBe(2);
  });

  it('enterPlacementMode auto-places missing-data jobs at active draft marker', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const uploadShellUi = TestBed.inject(UploadShellUiService);
    const placeFile = vi.spyOn(uploadShellUi, 'placeFile');
    const component = fixture.componentInstance as unknown as {
      draftMediaMarker: {
        set: (value: { lat: number; lng: number; uploadCount: number } | null) => void;
      };
      placementActive: { (): boolean };
      enterPlacementMode: (key: string) => void;
    };

    TestBed.inject(MapShellState).setDraftMediaMarker({
      lat: 48.2,
      lng: 16.37,
      uploadCount: 0,
    });

    component.enterPlacementMode('job-1');

    expect(placeFile).toHaveBeenCalledWith('job-1', { lat: 48.2, lng: 16.37 });
    expect(component.placementActive()).toBe(false);
  });
});
