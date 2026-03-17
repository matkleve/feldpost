import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface ClusterMergeRow {
  cluster_lat: number;
  cluster_lng: number;
  image_count: number;
  image_id: string | null;
  direction: number | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  created_at: string | null;
}

export type ClusterMergedRow<T extends ClusterMergeRow> = T & {
  sourceCells: Array<{ lat: number; lng: number }>;
};

@Injectable({ providedIn: 'root' })
export class MapMarkerClusterMergeService {
  mergeOverlappingClusters<T extends ClusterMergeRow>(
    map: L.Map | undefined,
    rows: T[],
    markerIconWidthPx: number,
  ): Array<ClusterMergedRow<T>> {
    if (!map || rows.length === 0) {
      return rows.map((r) => ({
        ...r,
        sourceCells: [{ lat: r.cluster_lat, lng: r.cluster_lng }],
      }));
    }

    const minDist = markerIconWidthPx * 1.2;
    const minDistSq = minDist * minDist;

    // Pre-compute pixel positions once.
    const points = rows.map((row) =>
      map.latLngToContainerPoint([row.cluster_lat, row.cluster_lng]),
    );

    // Bucket points in screen-space cells to avoid O(n^2) scans on dense viewports.
    const cellSize = minDist;
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < points.length; i++) {
      const cellX = Math.floor(points[i].x / cellSize);
      const cellY = Math.floor(points[i].y / cellSize);
      const bucketKey = `${cellX}:${cellY}`;
      const list = buckets.get(bucketKey);
      if (list) {
        list.push(i);
      } else {
        buckets.set(bucketKey, [i]);
      }
    }

    const consumed = new Set<number>();
    const result: Array<ClusterMergedRow<T>> = [];

    for (let i = 0; i < rows.length; i++) {
      if (consumed.has(i)) continue;

      const point = points[i];
      const baseCellX = Math.floor(point.x / cellSize);
      const baseCellY = Math.floor(point.y / cellSize);

      let totalCount = Number(rows[i].image_count);
      let wLat = rows[i].cluster_lat * totalCount;
      let wLng = rows[i].cluster_lng * totalCount;

      const sourceCells: Array<{ lat: number; lng: number }> = [
        { lat: rows[i].cluster_lat, lng: rows[i].cluster_lng },
      ];

      for (let dxCell = -1; dxCell <= 1; dxCell++) {
        for (let dyCell = -1; dyCell <= 1; dyCell++) {
          const neighborKey = `${baseCellX + dxCell}:${baseCellY + dyCell}`;
          const candidates = buckets.get(neighborKey);
          if (!candidates) continue;

          for (const j of candidates) {
            if (j <= i || consumed.has(j)) continue;
            const dx = point.x - points[j].x;
            const dy = point.y - points[j].y;
            if (dx * dx + dy * dy < minDistSq) {
              consumed.add(j);
              const jCount = Number(rows[j].image_count);
              wLat += rows[j].cluster_lat * jCount;
              wLng += rows[j].cluster_lng * jCount;
              totalCount += jCount;
              sourceCells.push({ lat: rows[j].cluster_lat, lng: rows[j].cluster_lng });
            }
          }
        }
      }

      const isSingle = totalCount === 1;
      result.push({
        ...rows[i],
        cluster_lat: wLat / totalCount,
        cluster_lng: wLng / totalCount,
        image_count: totalCount,
        image_id: isSingle ? rows[i].image_id : null,
        direction: isSingle ? rows[i].direction : null,
        storage_path: isSingle ? rows[i].storage_path : null,
        thumbnail_path: isSingle ? rows[i].thumbnail_path : null,
        exif_latitude: isSingle ? rows[i].exif_latitude : null,
        exif_longitude: isSingle ? rows[i].exif_longitude : null,
        created_at: isSingle ? rows[i].created_at : null,
        sourceCells,
      } as ClusterMergedRow<T>);
    }

    return result;
  }
}
