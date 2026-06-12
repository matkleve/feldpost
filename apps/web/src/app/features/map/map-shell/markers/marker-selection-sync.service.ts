import { Injectable } from '@angular/core';

interface MarkerStateLike {
  count: number;
  mediaId?: string;
  lat: number;
  lng: number;
  sourceCells?: Array<{ lat: number; lng: number }>;
}

interface WorkspaceImageLike {
  id: string;
  latitude: number;
  longitude: number;
}

@Injectable({ providedIn: 'root' })
export class MarkerSelectionSyncService {
  areSameKeySet(previous: Set<string>, next: Set<string>): boolean {
    return previous.size === next.size && Array.from(previous).every((key) => next.has(key));
  }

  refreshChangedKeySet(
    previous: Set<string>,
    next: Set<string>,
    refreshPhotoMarker: (markerKey: string) => void,
  ): void {
    for (const markerKey of previous) {
      if (!next.has(markerKey)) {
        refreshPhotoMarker(markerKey);
      }
    }

    for (const markerKey of next) {
      if (!previous.has(markerKey)) {
        refreshPhotoMarker(markerKey);
      }
    }
  }

  applySingleMarkerChange(
    previous: string | null,
    next: string | null,
    refreshPhotoMarker: (markerKey: string) => void,
  ): boolean {
    if (previous === next) {
      return false;
    }

    if (previous) refreshPhotoMarker(previous);
    if (next) refreshPhotoMarker(next);
    return true;
  }

  buildLinkedWorkspaceImageIds(
    markerState: MarkerStateLike | undefined,
    rawImages: WorkspaceImageLike[],
    toMarkerKey: (lat: number, lng: number) => string,
  ): Set<string> {
    if (!markerState) {
      return new Set();
    }

    if (markerState.count === 1 && markerState.mediaId) {
      return new Set([markerState.mediaId]);
    }

    const sourceCells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
    const sourceKeys = new Set(sourceCells.map((cell) => toMarkerKey(cell.lat, cell.lng)));
    const matchedIds = new Set<string>();

    for (const image of rawImages) {
      if (!Number.isFinite(image.latitude) || !Number.isFinite(image.longitude)) continue;
      const imageKey = toMarkerKey(image.latitude, image.longitude);
      if (sourceKeys.has(imageKey)) {
        matchedIds.add(image.id);
      }
    }

    return matchedIds;
  }
}
