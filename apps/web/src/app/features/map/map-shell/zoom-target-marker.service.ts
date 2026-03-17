import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import type { PhotoMarkerState } from './map-marker-reconcile.facade';

@Injectable({ providedIn: 'root' })
export class ZoomTargetMarkerService {
  findMarkerKeyForZoomTarget(params: {
    imageId: string;
    lat: number;
    lng: number;
    allowClusterFallback: boolean;
    map: L.Map | undefined;
    markersByImageId: Map<string, string>;
    uploadedPhotoMarkers: Map<string, PhotoMarkerState>;
    toMarkerKey: (lat: number, lng: number) => string;
    clusterFallbackMaxMeters: number;
  }): string | null {
    const byImageId = params.markersByImageId.get(params.imageId);
    if (byImageId) {
      const state = params.uploadedPhotoMarkers.get(byImageId);
      if (state && state.count === 1) {
        return byImageId;
      }
    }

    const exactKey = params.toMarkerKey(params.lat, params.lng);
    const exactState = params.uploadedPhotoMarkers.get(exactKey);
    if (exactState?.count === 1) {
      return exactKey;
    }

    if (!params.allowClusterFallback) {
      return null;
    }

    let nearestCluster: { key: string; distanceMeters: number } | null = null;
    let nearestAny: { key: string; distanceMeters: number } | null = null;

    for (const [key, state] of params.uploadedPhotoMarkers) {
      const distanceMeters = this.distanceMeters(
        params.map,
        params.lat,
        params.lng,
        state.lat,
        state.lng,
      );

      if (!nearestAny || distanceMeters < nearestAny.distanceMeters) {
        nearestAny = { key, distanceMeters };
      }

      if (state.count > 1 && (!nearestCluster || distanceMeters < nearestCluster.distanceMeters)) {
        nearestCluster = { key, distanceMeters };
      }
    }

    if (nearestCluster && nearestCluster.distanceMeters <= params.clusterFallbackMaxMeters) {
      return nearestCluster.key;
    }

    if (nearestAny && nearestAny.distanceMeters <= params.clusterFallbackMaxMeters) {
      return nearestAny.key;
    }

    return null;
  }

  private distanceMeters(
    map: L.Map | undefined,
    latA: number,
    lngA: number,
    latB: number,
    lngB: number,
  ): number {
    if (map) {
      return map.distance([latA, lngA], [latB, lngB]);
    }

    const dx = latA - latB;
    const dy = lngA - lngB;
    return Math.sqrt(dx * dx + dy * dy) * 111_320;
  }
}
