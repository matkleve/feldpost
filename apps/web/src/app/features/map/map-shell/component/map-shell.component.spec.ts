/**
 * MapShellComponent – structure, upload panel, placement mode, photo panel.
 *
 * GPS, search bar, context menus, radius selection, and marker interaction
 * live in their own sibling spec files. Shared setup: map-shell.spec-setup.ts.
 *
 * Rewritten 2026-09-10 for the facade refactor — see
 * docs/audits/2026-09-10-map-shell-test-migration-plan.md.
 *
 * `uploadPanelOpen`/`uploadPanelPinned` moved to UploadShellUiService (the
 * component field is private, so tests reach it via TestBed.inject).
 * `setMapViewMode`/`mapBasemap`/`mapViewMode` moved to
 * `component.basemapService` (setViewMode gained a `map` param and the
 * old rename). `activeBaseTileLayer` is now a private field of that service
 * with no accessor — the tile-swap test proves the tracking behavior across
 * two calls instead of poking the field directly. `handleMapClick` and the
 * state it touches (`suppressMapClickUntil`, radius-selection clearing) moved
 * to MapClickHandlerService / MapShellInstanceService /
 * RadiusDrawingOrchestratorService. `enterPlacementMode`/`cancelPlacement`
 * are on `component.mapPlacementService`; `placementActive`/`photoPanelOpen`/
 * `selectedMarkerKey`/`selectedMarkerKeys`/`detailMediaId` are all on
 * `component.state`.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { MapShellInstanceService } from './map-shell-instance.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { MapBasemapLayerService } from '../leaflet/map-basemap-layer.service';
import { MapClickHandlerService } from '../handlers/map-click-handler.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { buildTestBed, createMapStub } from './map-shell.spec-setup';
import type { MapMouseEvent } from '../leaflet/map-leaflet.service';

describe('MapShellComponent – structure, upload panel & placement', () => {
  beforeEach(async () => {
    localStorage.clear();
    await buildTestBed();
  });

  // ── Basic structure ────────────────────────────────────────────────────────

  it('creates', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the floating search bar', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const bar = (fixture.nativeElement as HTMLElement).querySelector('ss-search-bar');
    expect(bar).not.toBeNull();
  });

  it('renders the map style switch with basemap indicator dots', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const switchRoot = (fixture.nativeElement as HTMLElement).querySelector('.map-style-switch');
    const button = switchRoot?.querySelector('.map-style-switch__btn');
    const dots = switchRoot?.querySelectorAll('.map-style-switch__dot');
    const icon = switchRoot?.querySelector('.map-style-switch__icon');

    expect(switchRoot).not.toBeNull();
    expect(button).not.toBeNull();
    expect(dots?.length).toBe(2);
    expect(icon?.textContent?.trim()).toBe('satellite_alt');
  });

  it('renders the map container element', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const container = (fixture.nativeElement as HTMLElement).querySelector('.map-container');
    expect(container).not.toBeNull();
  });

  it('does not mount the floating upload button (hosted by AuthenticatedAppLayout)', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.map-upload-btn');
    expect(btn).toBeNull();
  });

  // ── Upload panel state ─────────────────────────────────────────────────────

  it('upload panel is not visible by default', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    expect(TestBed.inject(UploadShellUiService).uploadPanelOpen()).toBe(false);
  });

  it('toggleUploadPanel() makes the panel visible', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();

    expect(TestBed.inject(UploadShellUiService).uploadPanelOpen()).toBe(true);
  });

  it('setViewMode("photo") persists photo map preference', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const basemapService = fixture.componentInstance.basemapService;

    expect(basemapService.mapBasemap()).toBe('default');

    basemapService.setViewMode('photo', undefined);

    expect(basemapService.mapBasemap()).toBe('satellite');
    expect(basemapService.mapViewMode()).toBe('photo');
    expect(window.localStorage.getItem('sitesnap.settings.map.basemap')).toBe('satellite');
  });

  it('setViewMode("street") resets analog material', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const basemapService = fixture.componentInstance.basemapService;

    basemapService.setViewMode('photo', undefined);
    basemapService.setViewMode('street', undefined);

    expect(basemapService.mapBasemap()).toBe('default');
    expect(basemapService.mapViewMode()).toBe('street');
    expect(window.localStorage.getItem('sitesnap.settings.map.basemap')).toBe('default');
  });

  it('setViewMode("photo") replaces the active tile layer when map exists', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const previousLayer = { addTo: vi.fn() };
    const nextLayer = { addTo: vi.fn() };
    const mapStub = createMapStub();
    const basemapLayerService = TestBed.inject(MapBasemapLayerService);
    const applyBasemapLayerSpy = vi
      .spyOn(basemapLayerService, 'applyBasemapLayer')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValueOnce({ activeBaseTileLayer: previousLayer as any })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValueOnce({ activeBaseTileLayer: nextLayer as any });

    const basemapService = fixture.componentInstance.basemapService;

    // First call establishes `previousLayer` as the service's tracked tile
    // layer (its own field is private — there is no other way to set it up).
    basemapService.setViewMode('photo', mapStub as never);
    // Second call proves it was actually tracked: the service must pass it
    // back in as `activeBaseTileLayer` so the old layer can be removed.
    basemapService.setViewMode('street', mapStub as never);

    expect(applyBasemapLayerSpy).toHaveBeenNthCalledWith(2, {
      map: mapStub,
      activeBaseTileLayer: previousLayer,
      basemap: 'default',
    });
  });

  it('toggleUploadPanel() hides the panel when called twice', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();
    fixture.componentInstance.toggleUploadPanel();

    expect(TestBed.inject(UploadShellUiService).uploadPanelOpen()).toBe(false);
  });

  it('upload panel stays open until explicitly toggled closed', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const uploadShellUi = TestBed.inject(UploadShellUiService);

    fixture.componentInstance.toggleUploadPanel();
    expect(uploadShellUi.uploadPanelOpen()).toBe(true);

    fixture.componentInstance.toggleUploadPanel();
    expect(uploadShellUi.uploadPanelOpen()).toBe(false);

    fixture.componentInstance.toggleUploadPanel();
    expect(uploadShellUi.uploadPanelOpen()).toBe(true);
  });

  it('map click closes upload panel when it is open', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const uploadShellUi = TestBed.inject(UploadShellUiService);

    uploadShellUi.openUploadPanel();
    expect(uploadShellUi.uploadPanelOpen()).toBe(true);

    TestBed.inject(MapClickHandlerService).handleMapClick({
      latlng: { lat: 48.2082, lng: 16.3738 },
    } as MapMouseEvent);

    expect(uploadShellUi.uploadPanelOpen()).toBe(false);
  });

  it('plain map click clears all map selection state', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    const workspaceView = TestBed.inject(WorkspaceViewService);
    const clearActiveSelectionSpy = vi
      .spyOn(workspaceView, 'clearActiveSelection')
      .mockImplementation(() => {});
    const clearSelectionVisualsSpy = vi
      .spyOn(TestBed.inject(RadiusDrawingOrchestratorService), 'clearSelectionVisuals')
      .mockImplementation(() => {});

    state.setSelectedMarkerKey('cluster-1');
    state.setSelectedMarkerKeys(new Set(['cluster-1', 'cluster-2']));
    state.setDetailMediaId('img-1');

    TestBed.inject(MapClickHandlerService).handleMapClick({
      latlng: { lat: 48.2082, lng: 16.3738 },
      originalEvent: { button: 0 },
    } as MapMouseEvent);

    expect(state.selectedMarkerKey()).toBeNull();
    expect(state.selectedMarkerKeys().size).toBe(0);
    expect(state.detailMediaId()).toBeNull();
    expect(clearActiveSelectionSpy).toHaveBeenCalled();
    expect(clearSelectionVisualsSpy).toHaveBeenCalled();
  });

  it('primary map click clears marker selection even during click guard', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const state = fixture.componentInstance.state;

    state.setSelectedMarkerKey('cluster-1');
    state.setSelectedMarkerKeys(new Set(['cluster-1', 'cluster-2']));
    TestBed.inject(MapShellInstanceService).suppressMapClickUntil = Date.now() + 60_000;

    TestBed.inject(MapClickHandlerService).handleMapClick({
      latlng: { lat: 48.2082, lng: 16.3738 },
      originalEvent: { button: 0 },
    } as MapMouseEvent);

    expect(state.selectedMarkerKey()).toBeNull();
    expect(state.selectedMarkerKeys().size).toBe(0);
  });

  it('does not mount app-upload-panel (hosted by AuthenticatedAppLayout)', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector('app-upload-panel');
    expect(panel).toBeNull();
  });

  // ── Placement mode ─────────────────────────────────────────────────────────

  it('enterPlacementMode sets placementActive to true', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.mapPlacementService.enterPlacementMode('test-key');

    expect(fixture.componentInstance.state.placementActive()).toBe(true);
  });

  it('cancelPlacement resets placementActive to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.mapPlacementService.enterPlacementMode('test-key');
    fixture.componentInstance.mapPlacementService.cancelPlacement();

    expect(fixture.componentInstance.state.placementActive()).toBe(false);
  });

  it('shows placement banner when placementActive is true', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.mapPlacementService.enterPlacementMode('test-key');
    fixture.detectChanges();

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.map-placement-banner');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain('Click the map to place the image');
  });

  it('hides placement banner when placementActive is false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.map-placement-banner');
    expect(banner).toBeNull();
  });

  // ── Photo panel ────────────────────────────────────────────────────────────

  it('photoPanelOpen signal defaults to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    expect(fixture.componentInstance.state.photoPanelOpen()).toBe(false);
  });

  it('photo panel DOM is not mounted on MapShellComponent (hosted by AuthenticatedAppLayout)', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();
    const panel = (fixture.nativeElement as HTMLElement).querySelector('app-workspace-pane');
    expect(panel).toBeNull();
  });

  it('photoPanelOpen signal can be set true for layout-hosted workspace pane', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    TestBed.inject(MapShellState).setPhotoPanelOpen(true);
    fixture.detectChanges();

    expect(fixture.componentInstance.state.photoPanelOpen()).toBe(true);
    const panelShell = (fixture.nativeElement as HTMLElement).querySelector(
      'app-workspace-pane-shell',
    );
    expect(panelShell).toBeNull();
  });

  it('workspace pane shell is not a child of MapShellComponent (layout host)', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    TestBed.inject(MapShellState).setPhotoPanelOpen(true);
    fixture.detectChanges();

    const panelShell = (fixture.nativeElement as HTMLElement).querySelector(
      'app-workspace-pane-shell',
    );
    expect(panelShell).toBeNull();
  });
});
