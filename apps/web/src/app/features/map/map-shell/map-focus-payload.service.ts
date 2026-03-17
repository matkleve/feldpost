import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface MapFocusPayload {
  imageId: string;
  lat: number;
  lng: number;
}

@Injectable({ providedIn: 'root' })
export class MapFocusPayloadService {
  readMapFocusPayload(router: Router): MapFocusPayload | null {
    const candidate = this.readMapFocusCandidate(router);
    if (!candidate) {
      return null;
    }

    const payload = candidate as Partial<MapFocusPayload>;
    if (!this.isMapFocusPayload(payload)) {
      return null;
    }

    return { imageId: payload.imageId, lat: payload.lat, lng: payload.lng };
  }

  private readMapFocusCandidate(router: Router): unknown {
    const fromNavigation = router.getCurrentNavigation()?.extras?.state?.['mapFocus'];
    const fromHistory =
      typeof window !== 'undefined' ? (window.history.state?.['mapFocus'] as unknown) : null;
    const candidate = fromNavigation ?? fromHistory;
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }
    return candidate;
  }

  private isMapFocusPayload(payload: Partial<MapFocusPayload>): payload is MapFocusPayload {
    return (
      typeof payload.imageId === 'string' &&
      typeof payload.lat === 'number' &&
      typeof payload.lng === 'number'
    );
  }
}
