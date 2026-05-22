import { Injectable, signal } from '@angular/core';
import type { MediaLocationAddressPatch } from '../media-location-update/media-location-update.types';

export interface MediaDetailLocationSyncEvent {
  mediaId: string;
  lat: number;
  lng: number;
  seq: number;
  locationRowId?: string;
  address?: MediaLocationAddressPatch;
}

export interface MediaDetailLocationPendingPatch {
  mediaId: string;
  lat: number;
  lng: number;
  locationRowId?: string;
  address?: MediaLocationAddressPatch;
}

/**
 * Cross-surface bus: map (or other features) → open **media detail** after GPS save.
 *
 * **What it does:** When the user picks a point on the map, `MapShellComponent` persists coords
 * then emits here so `MediaDetailViewComponent` can refresh without a full reload.
 *
 * **Multi-location:** When `locationRowId` is set, the map pick updated one
 * `media_item_locations` row; detail reloads the row list and patches `media()` from the
 * primary row projection.
 *
 * **UI:** Workspace pane → Media detail (Location section). Not used by upload panel directly.
 *
 * @see docs/specs/ui/media-detail/media-detail-location-section.md (map pick contract)
 */
@Injectable({ providedIn: 'root' })
export class MediaDetailLocationSyncService {
  private seq = 0;
  private readonly pendingByMediaId = new Map<string, MediaDetailLocationPendingPatch>();
  readonly lastEvent = signal<MediaDetailLocationSyncEvent | null>(null);

  notifyCoordinatesUpdated(
    mediaId: string,
    lat: number,
    lng: number,
    address?: MediaLocationAddressPatch,
    locationRowId?: string,
  ): void {
    this.pendingByMediaId.set(mediaId, { mediaId, lat, lng, address, locationRowId });
    this.seq += 1;
    this.lastEvent.set({ mediaId, lat, lng, seq: this.seq, address, locationRowId });
  }

  /** Patch waiting for detail media to load (e.g. map pick finished before `media()` was ready). */
  consumePending(mediaId: string): MediaDetailLocationPendingPatch | undefined {
    const pending = this.pendingByMediaId.get(mediaId);
    if (!pending) {
      return undefined;
    }
    this.pendingByMediaId.delete(mediaId);
    return pending;
  }

  clearPending(mediaId: string): void {
    this.pendingByMediaId.delete(mediaId);
  }
}
