import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import type { WorkspaceImage } from '../../../core/workspace-view.types';

interface RadiusMarkerState {
  lat: number;
  lng: number;
  sourceCells?: Array<{ lat: number; lng: number }>;
}

interface RadiusCommittedVisualLike {
  circle: L.Circle;
}

@Injectable({ providedIn: 'root' })
export class RadiusSelectionService {
  hasCommittedSelection(visuals: RadiusCommittedVisualLike[]): boolean {
    return visuals.length > 0;
  }

  isInsideAnyCommittedRadius(
    map: L.Map | undefined,
    visuals: RadiusCommittedVisualLike[],
    position: L.LatLng,
  ): boolean {
    if (!map) {
      return false;
    }

    return visuals.some((visual) => {
      const center = visual.circle.getLatLng();
      const radiusMeters = visual.circle.getRadius();
      return map.distance(center, position) <= radiusMeters;
    });
  }

  async selectRadiusImages(params: {
    map: L.Map;
    center: L.LatLng;
    radiusMeters: number;
    additive: boolean;
    uploadedPhotoMarkers: Map<string, RadiusMarkerState>;
    selectedMarkerKeys: Set<string>;
    toMarkerKey: (lat: number, lng: number) => string;
    currentImages: WorkspaceImage[];
    fetchClusterImages: (
      cells: Array<{ lat: number; lng: number }>,
      zoom: number,
    ) => Promise<WorkspaceImage[]>;
  }): Promise<{ selectedMarkerKeys: Set<string>; images: WorkspaceImage[] }> {
    const cellMap = new Map<string, { lat: number; lng: number }>();
    const nextSelectedKeys = params.additive
      ? new Set(params.selectedMarkerKeys)
      : new Set<string>();

    for (const [markerKey, markerState] of params.uploadedPhotoMarkers.entries()) {
      const cells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
      const insideCells = cells.filter(
        (cell) => params.map.distance(params.center, [cell.lat, cell.lng]) <= params.radiusMeters,
      );
      if (insideCells.length === 0) {
        continue;
      }

      nextSelectedKeys.add(markerKey);

      for (const cell of insideCells) {
        cellMap.set(params.toMarkerKey(cell.lat, cell.lng), cell);
      }
    }

    const zoom = Math.round(params.map.getZoom() ?? 13);
    const cells = Array.from(cellMap.values());
    const incoming = await params.fetchClusterImages(cells, zoom);

    const images = params.additive
      ? this.mergeWorkspaceImages(params.currentImages, incoming)
      : incoming;

    return {
      selectedMarkerKeys: nextSelectedKeys,
      images,
    };
  }

  mergeWorkspaceImages(current: WorkspaceImage[], incoming: WorkspaceImage[]): WorkspaceImage[] {
    const byId = new Map<string, WorkspaceImage>();
    for (const image of current) byId.set(image.id, image);
    for (const image of incoming) byId.set(image.id, image);
    return Array.from(byId.values());
  }
}
