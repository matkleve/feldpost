import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import type { PhotoMarkerState } from './map-marker-reconcile.facade';

@Injectable({ providedIn: 'root' })
export class RadiusDraftHighlightService {
  updateDraftHighlights(params: {
    map: L.Map;
    uploadedPhotoMarkers: Map<string, PhotoMarkerState>;
    currentKeys: Set<string>;
    center: L.LatLng;
    radiusMeters: number;
  }): Set<string> {
    const nextKeys = new Set<string>();
    for (const [markerKey, markerState] of params.uploadedPhotoMarkers.entries()) {
      const sourceCells = markerState.sourceCells ?? [
        { lat: markerState.lat, lng: markerState.lng },
      ];
      const hasCellInsideRadius = sourceCells.some(
        (cell) => params.map.distance(params.center, [cell.lat, cell.lng]) <= params.radiusMeters,
      );
      if (hasCellInsideRadius) {
        nextKeys.add(markerKey);
      }
    }

    if (
      params.currentKeys.size === nextKeys.size &&
      Array.from(params.currentKeys).every((key) => nextKeys.has(key))
    ) {
      return params.currentKeys;
    }

    return nextKeys;
  }

  clearDraftHighlights(currentKeys: Set<string>): Set<string> {
    if (currentKeys.size === 0) {
      return currentKeys;
    }

    return new Set<string>();
  }
}
