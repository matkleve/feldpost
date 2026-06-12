/**
 * MapShellComponent – structure, upload panel, placement mode, photo panel.
 *
 * GPS, search bar, context menus, radius selection, and marker interaction
 * live in their own sibling spec files. Shared setup: map-shell.spec-setup.ts.
 */

import { TestBed } from '@angular/core/testing';
import { MapShellComponent } from './map-shell.component';
import { MapShellState } from './map-shell.state';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { MapBasemapLayerService } from '../leaflet/map-basemap-layer.service';
import { buildTestBed, createMapStub } from './map-shell.spec-setup';

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

  it('renders the top-left map style switch with two options', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const switchRoot = (fixture.nativeElement as HTMLElement).querySelector('.map-style-switch');
    const options = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.map-style-switch__option',
    );
    expect(switchRoot).not.toBeNull();
    expect(options).toHaveLength(2);
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.map-style-switch .material-icons',
    );
    expect(icons[0]?.textContent?.trim()).toBe('map');
    expect(icons[1]?.textContent?.trim()).toBe('satellite_alt');
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
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);
  });

  it('toggleUploadPanel() makes the panel visible', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();

    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);
  });

  it('setMapViewMode("photo") persists photo map preference', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.mapBasemap()).toBe('default');

    fixture.componentInstance.setMapViewMode('photo');

    expect(fixture.componentInstance.mapBasemap()).toBe('satellite');
    expect(fixture.componentInstance.mapViewMode()).toBe('photo');
    expect(window.localStorage.getItem('sitesnap.settings.map.basemap')).toBe('satellite');
  });

  it('setMapViewMode("street") resets analog material', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.setMapViewMode('photo');
    fixture.componentInstance.setMapViewMode('street');

    expect(fixture.componentInstance.mapBasemap()).toBe('default');
    expect(fixture.componentInstance.mapViewMode()).toBe('street');
    expect(window.localStorage.getItem('sitesnap.settings.map.basemap')).toBe('default');
  });

  it('setMapViewMode("photo") replaces the active tile layer when map exists', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const previousLayer = { addTo: vi.fn() };
    const nextLayer = { addTo: vi.fn() };
    const mapStub = createMapStub();
    const basemapLayerService = TestBed.inject(MapBasemapLayerService);
    const applyBasemapLayerSpy = vi
      .spyOn(basemapLayerService, 'applyBasemapLayer')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue({ activeBaseTileLayer: nextLayer as any });

    const component = fixture.componentInstance as unknown as {
      map: Record<string, unknown>;
      activeBaseTileLayer: { addTo: ReturnType<typeof vi.fn> } | null;
      setMapViewMode: (mode: 'street' | 'photo') => void;
    };

    component.map = mapStub;
    component.activeBaseTileLayer = previousLayer;

    component.setMapViewMode('photo');

    expect(applyBasemapLayerSpy).toHaveBeenCalledWith({
      map: mapStub,
      activeBaseTileLayer: previousLayer,
      basemap: 'satellite',
    });
    expect(component.activeBaseTileLayer).toBe(nextLayer);
  });

  it('toggleUploadPanel() hides the panel when called twice', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();
    fixture.componentInstance.toggleUploadPanel();

    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);
  });

  it('upload panel stays open until explicitly toggled closed', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleUploadPanel();
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);

    fixture.componentInstance.toggleUploadPanel();
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);

    fixture.componentInstance.toggleUploadPanel();
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);
  });

  it('map click closes upload panel when it is open', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.uploadPanelPinned.set(true);
    expect(fixture.componentInstance.uploadPanelOpen()).toBe(true);

    (
      fixture.componentInstance as unknown as {
        handleMapClick: (event: { latlng: { lat: number; lng: number } }) => void;
      }
    ).handleMapClick({ latlng: { lat: 48.2082, lng: 16.3738 } });

    expect(fixture.componentInstance.uploadPanelOpen()).toBe(false);
  });

  it('plain map click clears all map selection state', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      selectedMarkerKey: { set: (value: string | null) => void; (): string | null };
      selectedMarkerKeys: { set: (value: Set<string>) => void; (): Set<string> };
      detailMediaId: { set: (value: string | null) => void; (): string | null };
      clearRadiusSelectionVisuals: ReturnType<typeof vi.fn>;
      handleMapClick: (event: {
        latlng: { lat: number; lng: number };
        originalEvent?: { button?: number };
      }) => void;
    };

    const workspaceView = TestBed.inject(WorkspaceViewService);
    const clearActiveSelectionSpy = vi
      .spyOn(workspaceView, 'clearActiveSelection')
      .mockImplementation(() => {});

    TestBed.inject(MapShellState).setSelectedMarkerKey('cluster-1');
    TestBed.inject(MapShellState).setSelectedMarkerKeys(new Set(['cluster-1', 'cluster-2']));
    TestBed.inject(MapShellState).setDetailMediaId('img-1');
    component.clearRadiusSelectionVisuals = vi.fn();

    component.handleMapClick({
      latlng: { lat: 48.2082, lng: 16.3738 },
      originalEvent: { button: 0 },
    });

    expect(component.selectedMarkerKey()).toBeNull();
    expect(component.selectedMarkerKeys().size).toBe(0);
    expect(component.detailMediaId()).toBeNull();
    expect(clearActiveSelectionSpy).toHaveBeenCalled();
    expect(component.clearRadiusSelectionVisuals).toHaveBeenCalled();
  });

  it('primary map click clears marker selection even during click guard', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      selectedMarkerKey: { set: (value: string | null) => void; (): string | null };
      selectedMarkerKeys: { set: (value: Set<string>) => void; (): Set<string> };
      suppressMapClickUntil: number;
      handleMapClick: (event: {
        latlng: { lat: number; lng: number };
        originalEvent: { button: number };
      }) => void;
    };

    TestBed.inject(MapShellState).setSelectedMarkerKey('cluster-1');
    TestBed.inject(MapShellState).setSelectedMarkerKeys(new Set(['cluster-1', 'cluster-2']));
    component.suppressMapClickUntil = Date.now() + 60_000;

    component.handleMapClick({
      latlng: { lat: 48.2082, lng: 16.3738 },
      originalEvent: { button: 0 },
    });

    expect(component.selectedMarkerKey()).toBeNull();
    expect(component.selectedMarkerKeys().size).toBe(0);
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

    fixture.componentInstance.enterPlacementMode('test-key');

    expect(fixture.componentInstance.placementActive()).toBe(true);
  });

  it('cancelPlacement resets placementActive to false', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.enterPlacementMode('test-key');
    fixture.componentInstance.cancelPlacement();

    expect(fixture.componentInstance.placementActive()).toBe(false);
  });

  it('shows placement banner when placementActive is true', () => {
    const fixture = TestBed.createComponent(MapShellComponent);
    fixture.detectChanges();

    fixture.componentInstance.enterPlacementMode('test-key');
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
    expect(fixture.componentInstance.photoPanelOpen()).toBe(false);
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

    expect(fixture.componentInstance.photoPanelOpen()).toBe(true);
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
