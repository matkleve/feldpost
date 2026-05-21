import { Injectable, signal } from '@angular/core';
import type { MediaLocationAddressPatch } from '../media-location-update/media-location-update.types';

export interface MediaDetailLocationSyncEvent {
  mediaId: string;
  lat: number;
  lng: number;
  seq: number;
  address?: MediaLocationAddressPatch;
}

/**
 * Notifies the open media detail view when coordinates were saved outside the detail form
 * (e.g. map pick) so it can patch GPS immediately and resolve address fields with loading UI.
 */
@Injectable({ providedIn: 'root' })
export class MediaDetailLocationSyncService {
  private seq = 0;
  readonly lastEvent = signal<MediaDetailLocationSyncEvent | null>(null);

  notifyCoordinatesUpdated(
    mediaId: string,
    lat: number,
    lng: number,
    address?: MediaLocationAddressPatch,
  ): void {
    this.seq += 1;
    this.lastEvent.set({ mediaId, lat, lng, seq: this.seq, address });
  }
}
