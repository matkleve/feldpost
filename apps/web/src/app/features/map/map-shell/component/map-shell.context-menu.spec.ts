/**
 * MapShellComponent – map context menu & draft marker dismiss.
 * Shared setup: map-shell.spec-setup.ts.
 *
 * Rewritten 2026-09-10 for the facade refactor — see
 * docs/audits/2026-09-10-map-shell-test-migration-plan.md. This file compiled
 * clean before the rewrite because every access went through
 * `fixture.componentInstance as unknown as {...}` casts, which suppress
 * TypeScript's property-existence checking — the same trap documented in
 * map-shell.marker-interaction.spec.ts. All of these would have thrown at
 * runtime, not failed at compile time.
 *
 * `handleMapMouseDown`/`handleMapMouseUp`/`handleMapContextMenu` and the
 * container contextmenu handler moved to MapClickHandlerService.
 * `onMapContextCreateMarkerHere`/`onMapContextZoomStreetHere` are now
 * *private* on MapContextMenuHandlerService — reached only through its public
 * `onMapMenuActionSelected(actionId)` dispatcher, the same way the real menu
 * calls them. `mapContextMenuOpen`/`mapContextMenuCoords`/
 * `radiusContextMenuOpen`/`markerContextMenuOpen`/`draftMediaMarker`/
 * `photoPanelOpen` are on `component.state`. `anyContextMenuOpen` is a
 * computed on `component.menuVm` (MapMenuViewModelService), not the
 * component itself. `uploadPanelOpen` is on the injected
 * UploadShellUiService. `mapContainerRef` is a private `viewChild` signal —
 * instead of replacing it, the focus assertion spies on the real
 * `.map-container` DOM node the ref resolves to.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { MapShellInstanceService } from './map-shell-instance.service';
import { MapClickHandlerService } from '../handlers/map-click-handler.service';
import { MapContextMenuHandlerService } from '../context-menu/map-context-menu-handler.service';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { WORKSPACE_PANE_SHELL_HOST } from '../../../../core/workspace-pane/workspace-pane-shell-host.token';
import { buildTestBed } from './map-shell.spec-setup';
import type { MapMouseEvent } from '../leaflet/map-leaflet.service';

describe('MapShellComponent – context menu', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  it('short right-click on map opens map context menu', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const mapStub = {
      mouseEventToContainerPoint: vi.fn((evt: { clientX: number; clientY: number }) => ({
        x: evt.clientX,
        y: evt.clientY,
      })),
      remove: vi.fn(),
    };
    TestBed.inject(MapShellInstanceService).map = mapStub as never;

    const clickHandler = TestBed.inject(MapClickHandlerService);

    clickHandler.handleMapMouseDown({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 160,
        clientY: 220,
        preventDefault: vi.fn(),
      },
    } as unknown as MapMouseEvent);
    clickHandler.handleMapMouseUp({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 162,
        clientY: 224,
        preventDefault: vi.fn(),
      },
    } as unknown as MapMouseEvent);
    clickHandler.handleMapContextMenu({
      latlng: { lat: 48.2, lng: 16.37 },
      originalEvent: {
        button: 2,
        clientX: 162,
        clientY: 224,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      },
    } as unknown as MapMouseEvent);

    expect(state.mapContextMenuOpen()).toBe(true);
    expect(state.mapContextMenuCoords()).toEqual({ lat: 48.2, lng: 16.37 });
  });

  it('map container contextmenu handler keeps marker events propagating', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const containerHandler = TestBed.inject(MapClickHandlerService).getContainerContextMenuHandler();

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

    containerHandler(event);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).not.toHaveBeenCalled();
  });

  it('tracks whether any context menu is open for trigger semantics', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    const anyContextMenuOpen = fixture.componentInstance.menuVm.anyContextMenuOpen;

    TestBed.inject(MapShellState).setMapContextMenuOpen(false);
    TestBed.inject(MapShellState).setRadiusContextMenuOpen(false);
    TestBed.inject(MapShellState).setMarkerContextMenuOpen(false);
    expect(anyContextMenuOpen()).toBe(false);

    TestBed.inject(MapShellState).setMapContextMenuOpen(true);
    expect(anyContextMenuOpen()).toBe(true);

    TestBed.inject(MapShellState).setMapContextMenuOpen(false);
    TestBed.inject(MapShellState).setRadiusContextMenuOpen(true);
    expect(anyContextMenuOpen()).toBe(true);

    TestBed.inject(MapShellState).setRadiusContextMenuOpen(false);
    TestBed.inject(MapShellState).setMarkerContextMenuOpen(true);
    expect(anyContextMenuOpen()).toBe(true);
  });

  it('map context create marker action opens draft workspace flow', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    TestBed.inject(MapShellState).setMapContextMenuCoords({ lat: 48.2, lng: 16.37 });
    await TestBed.inject(MapContextMenuHandlerService).onMapMenuActionSelected(
      'create_marker_here',
    );

    expect(state.draftMediaMarker()).toEqual({ lat: 48.2, lng: 16.37, uploadCount: 0 });
    expect(state.photoPanelOpen()).toBe(true);
    expect(TestBed.inject(UploadShellUiService).uploadPanelOpen()).toBe(true);
  });

  it('map context street zoom action closes the menu', async () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const mapStub = {
      setView: vi.fn(),
      getContainer: vi.fn().mockReturnValue({ focus: vi.fn() }),
      remove: vi.fn(),
    };

    TestBed.inject(MapShellInstanceService).map = mapStub as never;
    TestBed.inject(MapShellState).setMapContextMenuOpen(true);
    TestBed.inject(MapShellState).setMapContextMenuCoords({ lat: 48.2, lng: 16.37 });

    await TestBed.inject(MapContextMenuHandlerService).onMapMenuActionSelected('zoom_street');

    expect(state.mapContextMenuOpen()).toBe(false);
    expect(mapStub.setView).toHaveBeenCalled();
  });

  it('menu close request closes menus and invokes focus return', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const container = (fixture.nativeElement as HTMLElement).querySelector(
      '.map-container',
    ) as HTMLElement;
    const focusSpy = vi.spyOn(container, 'focus');
    TestBed.inject(MapShellState).setMapContextMenuOpen(true);

    fixture.componentInstance.onMapMenuCloseRequested();

    expect(state.mapContextMenuOpen()).toBe(false);
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
    const state = fixture.componentInstance.state;

    // The real app wires this via MapShellInitService's afterNextRender
    // callback, which this fixture never triggers — bind it directly so
    // "closes workspace pane" is actually exercised, not just skipped
    // through the handler's `ctx?.` optional chain.
    TestBed.inject(MapClickHandlerService).bind({
      closeWorkspacePane: () => TestBed.inject(WORKSPACE_PANE_SHELL_HOST).closeWorkspacePane(),
    });

    TestBed.inject(MapShellState).setDraftMediaMarker({
      lat: 48.2,
      lng: 16.37,
      uploadCount: 0,
    });
    TestBed.inject(MapShellState).setPhotoPanelOpen(true);

    TestBed.inject(MapClickHandlerService).handleMapClick({
      latlng: { lat: 48.21, lng: 16.38 },
      originalEvent: { button: 0 },
    } as MapMouseEvent);

    expect(state.draftMediaMarker()).toBeNull();
    expect(state.photoPanelOpen()).toBe(false);
  });
});
