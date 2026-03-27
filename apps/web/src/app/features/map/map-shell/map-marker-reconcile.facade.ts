import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface ReconcileIncomingRow {
  cluster_lat: number;
  cluster_lng: number;
  image_count: number;
  image_id: string | null;
  media_item_id?: string | null;
  direction: number | null;
  thumbnail_path: string | null;
  storage_path: string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  sourceCells: Array<{ lat: number; lng: number }>;
}

export interface PhotoMarkerState {
  marker: L.Marker;
  count: number;
  lat: number;
  lng: number;
  thumbnailUrl?: string;
  thumbnailSourcePath?: string;
  fallbackLabel?: string;
  direction?: number;
  corrected?: boolean;
  uploading?: boolean;
  sourceCells?: Array<{ lat: number; lng: number }>;
  imageId?: string;
  optimistic?: boolean;
  thumbnailLoading?: boolean;
  signedAt?: number;
}

export interface MarkerIconOverride {
  count: number;
  direction?: number;
  corrected?: boolean;
}

export interface ReconcileDependencies {
  photoMarkerLayer: L.LayerGroup;
  uploadedPhotoMarkers: Map<string, PhotoMarkerState>;
  markersByImageId: Map<string, string>;
  selectedMarkerKey: () => string | null;
  setSelectedMarkerKey: (markerKey: string | null) => void;
  findReusableMarkerKey: (row: ReconcileIncomingRow, recyclableKeys: Set<string>) => string | null;
  findSpawnOriginForIncomingRow: (
    row: ReconcileIncomingRow,
    recyclableKeys: Set<string>,
  ) => { lat: number; lng: number } | null;
  buildFallbackLabelFromPath: (path: string | undefined) => string | undefined;
  buildPhotoMarkerIcon: (markerKey: string, override: MarkerIconOverride) => L.DivIcon;
  attachMarkerInteractions: (markerKey: string, marker: L.Marker, fadeIn: boolean) => void;
  bindMarkerClickInteraction: (markerKey: string, marker: L.Marker) => void;
  bindMarkerContextInteraction: (markerKey: string, marker: L.Marker) => void;
  bindMarkerHoverInteraction: (markerKey: string, marker: L.Marker) => void;
  animateMarkerPosition: (marker: L.Marker, lat: number, lng: number) => void;
  refreshPhotoMarker: (markerKey: string) => void;
  cancelMarkerMoveAnimation: (marker: L.Marker) => void;
}

@Injectable({ providedIn: 'root' })
export class MapMarkerReconcileFacade {
  reconcileIncomingViewportMarkers(
    incoming: Map<string, ReconcileIncomingRow>,
    recyclableKeys: Set<string>,
    deps: ReconcileDependencies,
  ): void {
    for (const [key, row] of incoming) {
      const existing = deps.uploadedPhotoMarkers.get(key);
      const count = Number(row.image_count);
      const direction = row.direction ?? undefined;
      const corrected =
        count === 1 &&
        row.exif_latitude != null &&
        row.exif_longitude != null &&
        (row.cluster_lat !== row.exif_latitude || row.cluster_lng !== row.exif_longitude);
      const thumbnailSourcePath =
        count === 1 ? (row.thumbnail_path ?? row.storage_path ?? undefined) : undefined;
      const fallbackLabel = deps.buildFallbackLabelFromPath(thumbnailSourcePath);

      if (existing) {
        this.reconcileExistingIncomingMarker(
          key,
          row,
          count,
          direction,
          corrected,
          thumbnailSourcePath,
          fallbackLabel,
          existing,
          deps,
        );
        continue;
      }

      const reused = this.tryReuseIncomingMarker(
        key,
        row,
        count,
        direction,
        corrected,
        thumbnailSourcePath,
        fallbackLabel,
        recyclableKeys,
        deps,
      );
      if (reused) {
        continue;
      }

      this.createIncomingMarker(
        key,
        row,
        count,
        direction,
        corrected,
        thumbnailSourcePath,
        fallbackLabel,
        recyclableKeys,
        deps,
      );
    }
  }

  removeRecyclableMarkers(recyclableKeys: Set<string>, deps: ReconcileDependencies): void {
    for (const oldKey of recyclableKeys) {
      const oldState = deps.uploadedPhotoMarkers.get(oldKey);
      if (!oldState) continue;

      deps.cancelMarkerMoveAnimation(oldState.marker);
      deps.photoMarkerLayer.removeLayer(oldState.marker);
      if (oldState.imageId) {
        deps.markersByImageId.delete(oldState.imageId);
      }
      if (deps.selectedMarkerKey() === oldKey) {
        deps.setSelectedMarkerKey(null);
      }
      deps.uploadedPhotoMarkers.delete(oldKey);
    }
  }

  private reconcileExistingIncomingMarker(
    key: string,
    row: ReconcileIncomingRow,
    count: number,
    direction: number | undefined,
    corrected: boolean,
    thumbnailSourcePath: string | undefined,
    fallbackLabel: string | undefined,
    existing: PhotoMarkerState,
    deps: ReconcileDependencies,
  ): void {
    if (existing.thumbnailUrl && existing.thumbnailUrl.startsWith('blob:') && thumbnailSourcePath) {
      URL.revokeObjectURL(existing.thumbnailUrl);
      existing.thumbnailUrl = undefined;
      existing.signedAt = undefined;
    }

    const newImageId = count === 1 ? this.resolveMarkerMediaItemId(row) : undefined;
    if (existing.imageId !== newImageId) {
      if (existing.imageId) deps.markersByImageId.delete(existing.imageId);
      if (newImageId) deps.markersByImageId.set(newImageId, key);
      existing.imageId = newImageId;
    }
    existing.fallbackLabel = fallbackLabel;

    if (
      existing.count !== count ||
      existing.direction !== direction ||
      existing.corrected !== corrected
    ) {
      existing.count = count;
      existing.direction = direction;
      existing.corrected = corrected;
      existing.thumbnailSourcePath = thumbnailSourcePath;
      existing.fallbackLabel = fallbackLabel;
      existing.sourceCells = row.sourceCells;
      existing.optimistic = false;
      deps.refreshPhotoMarker(key);
    } else {
      existing.sourceCells = row.sourceCells;
    }

    existing.lat = row.cluster_lat;
    existing.lng = row.cluster_lng;
  }

  private tryReuseIncomingMarker(
    key: string,
    row: ReconcileIncomingRow,
    count: number,
    direction: number | undefined,
    corrected: boolean,
    thumbnailSourcePath: string | undefined,
    fallbackLabel: string | undefined,
    recyclableKeys: Set<string>,
    deps: ReconcileDependencies,
  ): boolean {
    const reusableKey = deps.findReusableMarkerKey(row, recyclableKeys);
    if (!reusableKey) {
      return false;
    }

    const reusableState = deps.uploadedPhotoMarkers.get(reusableKey);
    if (!reusableState) {
      return false;
    }

    recyclableKeys.delete(reusableKey);

    if (
      reusableState.thumbnailUrl &&
      reusableState.thumbnailUrl.startsWith('blob:') &&
      thumbnailSourcePath
    ) {
      URL.revokeObjectURL(reusableState.thumbnailUrl);
      reusableState.thumbnailUrl = undefined;
      reusableState.signedAt = undefined;
    }

    const previousImageId = reusableState.imageId;
    const nextImageId = count === 1 ? this.resolveMarkerMediaItemId(row) : undefined;
    if (previousImageId !== nextImageId) {
      if (previousImageId) deps.markersByImageId.delete(previousImageId);
      if (nextImageId) deps.markersByImageId.set(nextImageId, key);
    } else if (nextImageId) {
      deps.markersByImageId.set(nextImageId, key);
    }

    if (deps.selectedMarkerKey() === reusableKey) {
      deps.setSelectedMarkerKey(key);
    }

    const needsVisualRefresh =
      reusableState.count !== count ||
      reusableState.direction !== direction ||
      reusableState.corrected !== corrected ||
      reusableState.uploading !== undefined ||
      reusableState.thumbnailSourcePath !== thumbnailSourcePath;

    reusableState.count = count;
    reusableState.lat = row.cluster_lat;
    reusableState.lng = row.cluster_lng;
    reusableState.sourceCells = row.sourceCells;
    reusableState.direction = direction;
    reusableState.corrected = corrected;
    reusableState.thumbnailSourcePath = thumbnailSourcePath;
    reusableState.fallbackLabel = fallbackLabel;
    reusableState.imageId = nextImageId;
    reusableState.optimistic = false;

    deps.uploadedPhotoMarkers.delete(reusableKey);
    deps.uploadedPhotoMarkers.set(key, reusableState);

    deps.bindMarkerClickInteraction(key, reusableState.marker);
    deps.bindMarkerContextInteraction(key, reusableState.marker);
    deps.bindMarkerHoverInteraction(key, reusableState.marker);
    deps.animateMarkerPosition(reusableState.marker, row.cluster_lat, row.cluster_lng);

    if (needsVisualRefresh) {
      deps.refreshPhotoMarker(key);
    }

    return true;
  }

  private createIncomingMarker(
    key: string,
    row: ReconcileIncomingRow,
    count: number,
    direction: number | undefined,
    corrected: boolean,
    thumbnailSourcePath: string | undefined,
    fallbackLabel: string | undefined,
    recyclableKeys: Set<string>,
    deps: ReconcileDependencies,
  ): void {
    const spawnOrigin = deps.findSpawnOriginForIncomingRow(row, recyclableKeys);

    const marker = L.marker(
      spawnOrigin ? [spawnOrigin.lat, spawnOrigin.lng] : [row.cluster_lat, row.cluster_lng],
      {
        icon: deps.buildPhotoMarkerIcon(key, { count, direction, corrected }),
      },
    );

    deps.photoMarkerLayer.addLayer(marker);
    deps.attachMarkerInteractions(key, marker, !spawnOrigin);

    if (spawnOrigin) {
      deps.animateMarkerPosition(marker, row.cluster_lat, row.cluster_lng);
    }

    deps.uploadedPhotoMarkers.set(key, {
      marker,
      count,
      lat: row.cluster_lat,
      lng: row.cluster_lng,
      sourceCells: row.sourceCells,
      direction,
      corrected,
      thumbnailSourcePath,
      fallbackLabel,
      imageId: count === 1 ? this.resolveMarkerMediaItemId(row) : undefined,
    });

    const markerMediaItemId = this.resolveMarkerMediaItemId(row);
    if (count === 1 && markerMediaItemId) {
      deps.markersByImageId.set(markerMediaItemId, key);
    }
  }

  private resolveMarkerMediaItemId(row: ReconcileIncomingRow): string | undefined {
    return row.media_item_id ?? row.image_id ?? undefined;
  }
}
