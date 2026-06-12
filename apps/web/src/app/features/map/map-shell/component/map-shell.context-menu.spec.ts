/**
 * MapShellComponent – map context menu & draft marker dismiss.
 * Shared setup: map-shell.spec-setup.ts.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { buildTestBed } from './map-shell.spec-setup';

describe('MapShellComponent – context menu', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('short right-click on map opens map context menu', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      mouseEventToContainerPoint: vi.fn((evt: { clientX: number; clientY: number }) => ({
        x: evt.clientX,
        y: evt.clientY,
      })),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      mapContextMenuOpen: { (): boolean };
      mapContextMenuCoords: { (): { lat: number; lng: number } | null };
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
      handleMapMouseUp: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
        };
      }) => void;
      handleMapContextMenu: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: {
          button: number;
          clientX: number;
          clientY: number;
          preventDefault: () => void;
          stopPropagation: () => void;
        };
      }) => void;
    };

    component.map = mapStub;
    component.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 160,
        clientY: 220,
        preventDefault: vi.fn(),
      },
    });
    component.handleMapMouseUp({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 162,
        clientY: 224,
        preventDefault: vi.fn(),
      },
    });
    component.handleMapContextMenu({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 162,
        clientY: 224,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      },
    });

    expect(component.mapContextMenuOpen()).toBe(true);
    expect(component.mapContextMenuCoords()).toEqual({ lat: 48.2, lng: 16.37 });
  });

  it('map container contextmenu handler keeps marker events propagating', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      mapContainerContextMenuHandler: (event: MouseEvent) => void;
    };

    const markerEl = document.createElement('div');
    markerEl.className = 'map-photo-marker';
    const child = document.createElement('span');
    markerEl.appendChild(child);

    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    const event = {
      button: 2,
      target: child,
      preventDefault,
      stopPropagation,
    } as unknown as MouseEvent;

    component.mapContainerContextMenuHandler(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it('tracks whether any context menu is open for trigger semantics', () => {
    const fixture = TestBed.createComponent(MapShellComponent);

    const component = fixture.componentInstance as unknown as {
      mapContextMenuOpen: { set: (value: boolean) => void };
      radiusContextMenuOpen: { set: (value: boolean) => void };
      markerContextMenuOpen: { set: (value: boolean) => void };
      anyContextMenuOpen: () => boolean;
    };

    TestBed.inject(MapShellState).setMapContextMenuOpen(false);
    TestBed.inject(MapShellState).setRadiusContextMenuOpen(false);
    TestBed.inject(MapShellState).setMarkerContextMenuOpen(false);
    expect(component.anyContextMenuOpen()).toBe(false);

    TestBed.inject(MapShellState).setMapContextMenuOpen(true);
    expect(component.anyContextMenuOpen()).toBe(true);

    TestBed.inject(MapShellState).setMapContextMenuOpen(false);
    TestBed.inject(MapShellState).setRadiusContextMenuOpen(true);
    expect(component.anyContextMenuOpen()).toBe(true);

    TestBed.inject(MapShellState).setRadiusContextMenuOpen(false);
    TestBed.inject(MapShellState).setMarkerContextMenuOpen(true);
    expect(component.anyContextMenuOpen()).toBe(true);
  });

  it('map context create marker action opens draft workspace flow', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      mapContextMenuCoords: { set: (value: { lat: number; lng: number } | null) => void };
      draftMediaMarker: {
        (): { lat: number; lng: number; uploadCount: number } | null;
      };
      photoPanelOpen: { (): boolean };
      uploadPanelOpen: { (): boolean };
      onMapContextCreateMarkerHere: () => void;
    };

    TestBed.inject(MapShellState).setMapContextMenuCoords({ lat: 48.2, lng: 16.37 });
    component.onMapContextCreateMarkerHere();

    expect(component.draftMediaMarker()).toEqual({ lat: 48.2, lng: 16.37, uploadCount: 0 });
    expect(component.photoPanelOpen()).toBe(true);
    expect(component.uploadPanelOpen()).toBe(true);
  });

  it('map context street zoom action closes the menu', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const mapStub = {
      setView: vi.fn(),
      getContainer: vi.fn().mockReturnValue({ focus: vi.fn() }),
      remove: vi.fn(),
    };

    const component = fixture.componentInstance as unknown as {
      map: unknown;
      mapContextMenuOpen: { set: (value: boolean) => void; (): boolean };
      mapContextMenuCoords: { set: (value: { lat: number; lng: number } | null) => void };
      onMapContextZoomStreetHere: () => void;
    };

    component.map = mapStub;
    TestBed.inject(MapShellState).setMapContextMenuOpen(true);
    TestBed.inject(MapShellState).setMapContextMenuCoords({ lat: 48.2, lng: 16.37 });

    component.onMapContextZoomStreetHere();

    expect(component.mapContextMenuOpen()).toBe(false);
    expect(mapStub.setView as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it('menu close request closes menus and invokes focus return', () => {
    const fixture = TestBed.createComponent(MapShellComponent);

    const component = fixture.componentInstance as unknown as {
      mapContextMenuOpen: { set: (value: boolean) => void; (): boolean };
      onMapMenuCloseRequested: () => void;
      mapContainerRef: () => { nativeElement: { focus: () => void } };
    };

    const focusSpy = vi.fn();
    component.mapContainerRef = () => ({ nativeElement: { focus: focusSpy } });
    TestBed.inject(MapShellState).setMapContextMenuOpen(true);

    component.onMapMenuCloseRequested();

    expect(component.mapContextMenuOpen()).toBe(false);
    expect(focusSpy).toHaveBeenCalled();
  });

  it('uses sheet panel class for context menus on compact viewport widths', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    const component = fixture.componentInstance;

    expect(component.mapMenuPanelClass(640)).toContain('map-context-menu--sheet');
  });

  it('uses anchored panel class for context menus on desktop viewport widths', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    const component = fixture.componentInstance;

    expect(component.mapMenuPanelClass(1200)).toBe('map-context-menu option-menu-surface');
  });

  it('left click dismisses empty draft marker and closes workspace pane', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      draftMediaMarker: {
        set: (value: { lat: number; lng: number; uploadCount: number } | null) => void;
        (): { lat: number; lng: number; uploadCount: number } | null;
      };
      photoPanelOpen: { set: (value: boolean) => void; (): boolean };
      handleMapClick: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: { button: number };
      }) => void;
    };

    TestBed.inject(MapShellState).setDraftMediaMarker({
      lat: 48.2,
      lng: 16.37,
      uploadCount: 0,
    });
    TestBed.inject(MapShellState).setPhotoPanelOpen(true);

    component.handleMapClick({
      latlng: { lat: 48.21, lng: 16.38 },
      originalEvent: { button: 0 },
    });

    expect(component.draftMediaMarker()).toBeNull();
    expect(component.photoPanelOpen()).toBe(false);
  });
});
