import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import type { WorkspaceImage } from '../../../core/workspace-view.types';

interface RadiusMarkerState {
  lat: number;
  lng: number;
  sourceCells?: Array<{ lat: number; lng: number }>;
}

@Injectable({ providedIn: 'root' })
export class RadiusSelectionService {
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
      const markerDistance = params.map.distance(params.center, [markerState.lat, markerState.lng]);
      if (markerDistance > params.radiusMeters) continue;

      nextSelectedKeys.add(markerKey);

      const cells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
      for (const cell of cells) {
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
