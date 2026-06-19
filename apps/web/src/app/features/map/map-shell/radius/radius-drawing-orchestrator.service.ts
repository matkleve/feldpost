import { Injectable, inject } from '@angular/core';
import { RadiusSelectionService } from './radius-selection.service';
import { RadiusVisualsService } from './radius-visuals.service';
import { RadiusDraftHighlightService } from './radius-draft-highlight.service';
import { MapPhotoMarkerRenderService } from '../markers/map-photo-marker-render.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { MapShellState } from '../component/map-shell.state';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import type { RadiusCommittedVisual } from './radius-visuals.service';
import type { MapCircle, MapLatLng, MapMarker, MapMouseEvent, MapPolyline } from '../leaflet/map-leaflet.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import { toMarkerKey } from '../markers/marker-media-index.helpers';

export const RADIUS_CLICK_GUARD_MS = 220;
const RADIUS_SELECTION_MIN_METERS = 10;

@Injectable({ providedIn: 'root' })
export class RadiusDrawingOrchestratorService {
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly radiusVisualsService = inject(RadiusVisualsService);
  private readonly radiusDraftHighlightService = inject(RadiusDraftHighlightService);
  private readonly radiusSelectionService = inject(RadiusSelectionService);
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);
  private readonly selectionService = inject(MapMarkerSelectionService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly state = inject(MapShellState);
  private readonly searchService = inject(MapShellSearchService);
  private readonly instance = inject(MapShellInstanceService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);

  private radiusDrawStartLatLng: MapLatLng | null = null;
  private _radiusDrawActive = false;
  private radiusDrawAdditive = false;
  private radiusDraftLine: MapPolyline | null = null;
  private radiusDraftCircle: MapCircle | null = null;
  private radiusDraftLabel: MapMarker | null = null;
  private radiusDrawMoveHandler: ((event: MapMouseEvent) => void) | null = null;
  private radiusDrawMouseUpHandler: ((event: MapMouseEvent) => void) | null = null;
  private radiusDraftHighlightedKeys = new Set<string>();
  private readonly radiusCommittedVisuals: RadiusCommittedVisual[] = [];

  isDrawActive(): boolean {
    return this._radiusDrawActive;
  }

  isDraftHighlighted(key: string): boolean {
    return this.radiusDraftHighlightedKeys.has(key);
  }

  hasCommittedSelection(): boolean {
    return this.radiusSelectionService.hasCommittedSelection(this.radiusCommittedVisuals);
  }

  isInsideAnyCommittedRadius(latlng: MapLatLng): boolean {
    return this.radiusSelectionService.isInsideAnyCommittedRadius(
      this.instance.map,
      this.radiusCommittedVisuals,
      latlng,
    );
  }

  startDraw(startLatLng: MapLatLng, additive: boolean): void {
    if (!this.instance.map || this.state.placementActive() || this.searchService.searchPlacementActive()) {
      return;
    }

    this.cancelDraw();
    this.state.closeAllContextMenus();

    this._radiusDrawActive = true;
    this.radiusDrawAdditive = additive;
    this.radiusDrawStartLatLng = startLatLng;
    this.instance.suppressMapClickUntil = Date.now() + RADIUS_CLICK_GUARD_MS;

    const map = this.instance.map;
    this.radiusDraftLine = this.mapLeafletService.createRadiusDraftLine(map, startLatLng);
    this.radiusDraftCircle = this.mapLeafletService.createRadiusDraftCircle(map, startLatLng);
    this.radiusDraftLabel = this.radiusVisualsService.createLabelMarker(startLatLng, 0, 0).addTo(map);

    this.radiusDrawMoveHandler = (moveEvent: MapMouseEvent) => {
      this.updateDraft(moveEvent.latlng);
    };
    this.radiusDrawMouseUpHandler = (upEvent: MapMouseEvent) => {
      void this.commitDraw(upEvent.latlng);
    };

    map.on('mousemove', this.radiusDrawMoveHandler);
    map.on('mouseup', this.radiusDrawMouseUpHandler);
  }

  updateDraft(currentLatLng: MapLatLng): void {
    const map = this.instance.map;
    if (!map || !this.radiusDrawStartLatLng) return;

    const radiusMeters = map.distance(this.radiusDrawStartLatLng, currentLatLng);
    const labelLatLng = this.radiusVisualsService.getLabelLatLng(
      this.radiusDrawStartLatLng,
      currentLatLng,
    );
    const labelAngleDeg = this.radiusVisualsService.getReadableLineAngleDeg(
      map,
      this.radiusDrawStartLatLng,
      currentLatLng,
    );

    this.radiusDraftLine?.setLatLngs([this.radiusDrawStartLatLng, currentLatLng]);
    this.radiusDraftCircle?.setRadius(radiusMeters);
    this.radiusDraftLabel?.setLatLng(labelLatLng);
    this.radiusVisualsService.updateLabelMarker(this.radiusDraftLabel, radiusMeters, labelAngleDeg);
    this.updateDraftMarkerHighlights(this.radiusDrawStartLatLng, radiusMeters);
  }

  async commitDraw(endLatLng: MapLatLng): Promise<void> {
    const map = this.instance.map;
    if (!map || !this.radiusDrawStartLatLng) {
      this.cancelDraw();
      return;
    }

    const center = this.radiusDrawStartLatLng;
    const radiusMeters = map.distance(center, endLatLng);
    const additive = this.radiusDrawAdditive;

    this.cancelDraw(true);

    if (radiusMeters < RADIUS_SELECTION_MIN_METERS) {
      this.clearDraftMarkerHighlights();
      return;
    }

    if (!additive) {
      this.clearSelectionVisuals();
    }

    this.addSelectionVisual(center, radiusMeters, endLatLng);
    await this.selectImages(center, radiusMeters, additive);
    this.clearDraftMarkerHighlights();
    this.instance.suppressMapClickUntil = Date.now() + RADIUS_CLICK_GUARD_MS;
  }

  cancelDraw(preserveDraftHighlights = false): void {
    const map = this.instance.map;

    if (map && this.radiusDrawMoveHandler) {
      map.off('mousemove', this.radiusDrawMoveHandler);
    }
    if (map && this.radiusDrawMouseUpHandler) {
      map.off('mouseup', this.radiusDrawMouseUpHandler);
    }

    this.radiusDrawMoveHandler = null;
    this.radiusDrawMouseUpHandler = null;
    this._radiusDrawActive = false;
    this.radiusDrawAdditive = false;
    this.radiusDrawStartLatLng = null;

    this.radiusDraftLine?.remove();
    this.radiusDraftLine = null;
    this.radiusDraftCircle?.remove();
    this.radiusDraftCircle = null;
    this.radiusDraftLabel?.remove();
    this.radiusDraftLabel = null;

    if (!preserveDraftHighlights) {
      this.clearDraftMarkerHighlights();
    }
  }

  clearSelectionVisuals(): void {
    this.radiusVisualsService.clearCommittedSelectionVisuals(this.radiusCommittedVisuals);
  }

  addSelectionVisual(center: MapLatLng, radiusMeters: number, edge: MapLatLng): void {
    const map = this.instance.map;
    if (!map) return;
    this.radiusCommittedVisuals.push(
      this.radiusVisualsService.addCommittedSelectionVisual(map, center, radiusMeters, edge),
    );
  }

  async startQuickRadius(center: MapLatLng, radiusMeters: number): Promise<void> {
    const edge = this.radiusVisualsService.offsetLatLngEast(center, radiusMeters);
    this.clearSelectionVisuals();
    this.addSelectionVisual(center, radiusMeters, edge);
    await this.selectImages(center, radiusMeters, false);
  }

  async selectImages(center: MapLatLng, radiusMeters: number, additive: boolean): Promise<void> {
    const map = this.instance.map;
    if (!map) return;

    const result = await this.radiusSelectionService.selectRadiusImages({
      map,
      center,
      radiusMeters,
      additive,
      uploadedPhotoMarkers: this.instance.uploadedPhotoMarkers,
      selectedMarkerKeys: this.state.selectedMarkerKeys(),
      toMarkerKey,
      currentImages: this.workspaceViewService.rawImages(),
      fetchClusterImages: (cells, zoom) => this.workspaceViewService.fetchClusterImages(cells, zoom),
    });

    this.selectionService.setSelectedMarkerKeys(result.selectedMarkerKeys);
    const imageIds = result.images.map((image) => image.id);
    if (additive) {
      const mergedIds = Array.from(
        new Set([...this.workspaceSelectionService.selectedMediaIds(), ...imageIds]),
      );
      this.workspaceSelectionService.selectAllInScope(mergedIds);
    } else {
      this.workspaceSelectionService.selectAllInScope(imageIds);
    }

    if (!this.state.photoPanelOpen()) {
      this.state.setWorkspacePaneWidth(this.state.getWorkspacePaneOpeningWidth());
    }
    this.state.setPhotoPanelOpen(true);
    this.patchDetailMediaId(null);
    this.selectionService.setSelectedMarker(null);
  }

  private patchDetailMediaId(mediaId: string | null): void {
    this.state.setDetailMediaId(mediaId);
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  private updateDraftMarkerHighlights(center: MapLatLng, radiusMeters: number): void {
    const map = this.instance.map;
    if (!map) return;

    const previousKeys = this.radiusDraftHighlightedKeys;
    const nextKeys = this.radiusDraftHighlightService.updateDraftHighlights({
      map,
      uploadedPhotoMarkers: this.instance.uploadedPhotoMarkers,
      currentKeys: previousKeys,
      center,
      radiusMeters,
    });

    if (nextKeys === previousKeys) return;

    this.radiusDraftHighlightedKeys = nextKeys;

    for (const markerKey of previousKeys) {
      if (!nextKeys.has(markerKey)) {
        this.markerRenderService.refreshPhotoMarker(markerKey);
      }
    }
    for (const markerKey of nextKeys) {
      if (!previousKeys.has(markerKey)) {
        this.markerRenderService.refreshPhotoMarker(markerKey);
      }
    }
  }

  private clearDraftMarkerHighlights(): void {
    const previousKeys = this.radiusDraftHighlightedKeys;
    const nextKeys = this.radiusDraftHighlightService.clearDraftHighlights(previousKeys);
    if (nextKeys === previousKeys) return;

    this.radiusDraftHighlightedKeys = nextKeys;
    for (const markerKey of previousKeys) {
      this.markerRenderService.refreshPhotoMarker(markerKey);
    }
  }
}
