import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import type { PhotoMarkerState, ReconcileIncomingRow } from './map-marker-reconcile.facade';

@Injectable({ providedIn: 'root' })
export class MapMarkerReuseStrategyService {
  findReusableMarkerKey(
    map: L.Map | undefined,
    markersByImageId: Map<string, string>,
    uploadedPhotoMarkers: Map<string, PhotoMarkerState>,
    row: Pick<
      ReconcileIncomingRow,
      'cluster_lat' | 'cluster_lng' | 'image_count' | 'image_id' | 'media_item_id'
    >,
    recyclableKeys: Set<string>,
  ): string | null {
    const count = Number(row.image_count);
    const incomingIsSingle = count === 1;
    const incomingMediaItemId = row.media_item_id ?? row.image_id;

    if (incomingIsSingle && incomingMediaItemId) {
      const byImageId = markersByImageId.get(incomingMediaItemId);
      if (byImageId && recyclableKeys.has(byImageId)) {
        return byImageId;
      }
    }

    if (!map) return null;

    const incomingPoint = map.latLngToContainerPoint([row.cluster_lat, row.cluster_lng]);
    const maxDistancePx = incomingIsSingle ? 120 : 170;
    const maxDistanceSq = maxDistancePx * maxDistancePx;
    let bestSameKindKey: string | null = null;
    let bestSameKindDistanceSq = Number.POSITIVE_INFINITY;

    for (const candidateKey of recyclableKeys) {
      const candidate = uploadedPhotoMarkers.get(candidateKey);
      if (!candidate) continue;

      const candidateIsSingle = candidate.count === 1;
      if (candidateIsSingle !== incomingIsSingle) continue;

      const candidatePoint = map.latLngToContainerPoint([candidate.lat, candidate.lng]);
      const dx = incomingPoint.x - candidatePoint.x;
      const dy = incomingPoint.y - candidatePoint.y;
      const distSq = dx * dx + dy * dy;

      if (distSq <= maxDistanceSq && distSq < bestSameKindDistanceSq) {
        bestSameKindDistanceSq = distSq;
        bestSameKindKey = candidateKey;
      }
    }

    return bestSameKindKey;
  }

  findSpawnOriginForIncomingRow(
    map: L.Map | undefined,
    uploadedPhotoMarkers: Map<string, PhotoMarkerState>,
    row: Pick<ReconcileIncomingRow, 'cluster_lat' | 'cluster_lng' | 'image_count'>,
    recyclableKeys: Set<string>,
  ): { lat: number; lng: number } | null {
    if (!map) return null;

    const incomingIsSingle = Number(row.image_count) === 1;
    const incomingPoint = map.latLngToContainerPoint([row.cluster_lat, row.cluster_lng]);
    const maxDistancePx = 240;
    const maxDistanceSq = maxDistancePx * maxDistancePx;

    let best: { lat: number; lng: number } | null = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    for (const candidateKey of recyclableKeys) {
      const candidate = uploadedPhotoMarkers.get(candidateKey);
      if (!candidate) continue;

      if (incomingIsSingle) {
        if (candidate.count <= 1) continue;
      } else if (candidate.count !== 1) {
        continue;
      }

      const candidatePoint = map.latLngToContainerPoint([candidate.lat, candidate.lng]);
      const dx = incomingPoint.x - candidatePoint.x;
      const dy = incomingPoint.y - candidatePoint.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > maxDistanceSq || distSq >= bestDistanceSq) continue;

      bestDistanceSq = distSq;
      best = { lat: candidate.lat, lng: candidate.lng };
    }

    return best;
  }
}
