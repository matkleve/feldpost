import { Injectable } from '@angular/core';

interface PositionHandlers {
  onSuccess: (coords: [number, number]) => void;
  onError?: () => void;
}

interface TrackingParams extends PositionHandlers {
  intervalMs: number;
  isTrackingActive: () => boolean;
  onTickStart?: () => void;
}

@Injectable({ providedIn: 'root' })
export class MapGeolocationService {
  requestCurrentPosition(handlers: PositionHandlers): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      handlers.onError?.();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlers.onSuccess([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        handlers.onError?.();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 },
    );
  }

  startTracking(params: TrackingParams): ReturnType<typeof setInterval> {
    return setInterval(() => {
      if (!params.isTrackingActive()) {
        return;
      }

      params.onTickStart?.();

      this.requestCurrentPosition({
        onSuccess: params.onSuccess,
        onError: params.onError,
      });
    }, params.intervalMs);
  }

  clearTrackingTimer(
    timer: ReturnType<typeof setInterval> | null,
  ): ReturnType<typeof setInterval> | null {
    if (timer) {
      clearInterval(timer);
    }
    return null;
  }
}
