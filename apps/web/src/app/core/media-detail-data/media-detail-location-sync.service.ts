import { Injectable, signal } from '@angular/core';
import type { MediaLocationAddressPatch } from '../media-location-update/media-location-update.types';

export interface MediaDetailLocationSyncEvent {
  mediaId: string;
  lat: number;
  lng: number;
  seq: number;
  address?: MediaLocationAddressPatch;
}

export interface MediaDetailLocationPendingPatch {
  mediaId: string;
  lat: number;
  lng: number;
  address?: MediaLocationAddressPatch;
}

/**
 * Notifies the open media detail view when coordinates were saved outside the detail form
 * (e.g. map pick) so it can patch GPS immediately and resolve address fields with loading UI.
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
  ): void {
    this.pendingByMediaId.set(mediaId, { mediaId, lat, lng, address });
    this.seq += 1;
    this.lastEvent.set({ mediaId, lat, lng, seq: this.seq, address });
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
