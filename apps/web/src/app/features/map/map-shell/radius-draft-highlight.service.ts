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
    refreshPhotoMarker: (markerKey: string) => void;
  }): Set<string> {
    const nextKeys = new Set<string>();
    for (const [markerKey, markerState] of params.uploadedPhotoMarkers.entries()) {
      const markerDistance = params.map.distance(params.center, [markerState.lat, markerState.lng]);
      if (markerDistance <= params.radiusMeters) {
        nextKeys.add(markerKey);
      }
    }

    if (
      params.currentKeys.size === nextKeys.size &&
      Array.from(params.currentKeys).every((key) => nextKeys.has(key))
    ) {
      return params.currentKeys;
    }

    for (const key of params.currentKeys) {
      if (!nextKeys.has(key)) {
        params.refreshPhotoMarker(key);
      }
    }

    for (const key of nextKeys) {
      if (!params.currentKeys.has(key)) {
        params.refreshPhotoMarker(key);
      }
    }

    return nextKeys;
  }

  clearDraftHighlights(
    currentKeys: Set<string>,
    refreshPhotoMarker: (markerKey: string) => void,
  ): Set<string> {
    if (currentKeys.size === 0) {
      return currentKeys;
    }

    for (const markerKey of currentKeys) {
      refreshPhotoMarker(markerKey);
    }

    return new Set<string>();
  }
}
