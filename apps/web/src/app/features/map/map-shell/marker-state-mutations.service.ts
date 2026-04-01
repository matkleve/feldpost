import { Injectable } from '@angular/core';
import * as L from 'leaflet';

interface MarkerStateLike {
  marker: L.Marker;
}

@Injectable({ providedIn: 'root' })
export class MarkerStateMutationsService {
  cleanupMarkerLayersAndCaches(params: {
    uploadedPhotoMarkers: Map<string, MarkerStateLike>;
    photoMarkerLayer: L.LayerGroup | null;
    markersByMediaId: Map<string, string>;
    cancelMarkerMoveAnimation: (marker: L.Marker) => void;
  }): void {
    for (const state of params.uploadedPhotoMarkers.values()) {
      params.cancelMarkerMoveAnimation(state.marker);
    }

    params.photoMarkerLayer?.clearLayers();
    params.uploadedPhotoMarkers.clear();
    params.markersByMediaId.clear();
  }

  removeDeletedPhotoFromMapUi(params: {
    markerKey: string;
    mediaId: string;
    uploadedPhotoMarkers: Map<string, MarkerStateLike>;
    photoMarkerLayer: L.LayerGroup | null;
    markersByMediaId: Map<string, string>;
    selectedMarkerKey: string | null;
    selectedMarkerKeys: Set<string>;
    detailMediaId: string | null;
    cancelMarkerMoveAnimation: (marker: L.Marker) => void;
    setSelectedMarker: (markerKey: string | null) => void;
    setSelectedMarkerKeys: (markerKeys: Set<string>) => void;
    setDetailImageId: (mediaId: string | null) => void;
  }): void {
    const markerState = params.uploadedPhotoMarkers.get(params.markerKey);
    if (markerState && params.photoMarkerLayer) {
      params.cancelMarkerMoveAnimation(markerState.marker);
      params.photoMarkerLayer.removeLayer(markerState.marker);
      params.uploadedPhotoMarkers.delete(params.markerKey);
    }

    params.markersByMediaId.delete(params.mediaId);

    if (params.selectedMarkerKey === params.markerKey) {
      params.setSelectedMarker(null);
    }

    if (params.selectedMarkerKeys.has(params.markerKey)) {
      const next = new Set(params.selectedMarkerKeys);
      next.delete(params.markerKey);
      params.setSelectedMarkerKeys(next);
    }

    if (params.detailMediaId === params.mediaId) {
      params.setDetailImageId(null);
    }
  }
}
