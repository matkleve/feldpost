import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface PendingZoomHighlightLike {
  mediaId: string;
  lat: number;
  lng: number;
  requestedAt: number;
}

@Injectable({ providedIn: 'root' })
export class DetailZoomHighlightService {
  getPendingForImage(
    pendingZoomHighlight: PendingZoomHighlightLike | null,
    mediaId: string,
  ): PendingZoomHighlightLike | null {
    return pendingZoomHighlight?.mediaId === mediaId ? pendingZoomHighlight : null;
  }

  shouldAllowClusterFallback(
    pendingForImage: { requestedAt: number } | null,
    waitForSingleMs: number,
    now = Date.now(),
  ): boolean {
    return !pendingForImage || now - pendingForImage.requestedAt > waitForSingleMs;
  }

  shouldWaitForMapIdle(
    pendingForImage: { requestedAt: number } | null,
    lastMapIdleAt: number,
    idleFallbackMs: number,
    now = Date.now(),
  ): boolean {
    return !!(
      pendingForImage &&
      lastMapIdleAt < pendingForImage.requestedAt &&
      now - pendingForImage.requestedAt < idleFallbackMs
    );
  }

  scheduleRetry(attempt: number, maxRetries: number, retryMs: number, retryFn: () => void): void {
    if (attempt >= maxRetries) {
      return;
    }
    setTimeout(retryFn, retryMs);
  }

  resolveMarkerWrapper(markerElement: HTMLElement | null): HTMLElement | null {
    if (!markerElement) {
      return null;
    }

    if (markerElement.classList.contains('map-photo-marker-wrapper')) {
      return markerElement;
    }

    return (markerElement.querySelector('.map-photo-marker-wrapper') as HTMLElement | null) ?? null;
  }

  isRenderReady(
    markerElement: HTMLElement,
    lastMapMoveAt: number,
    renderSettleMs: number,
  ): boolean {
    if (Date.now() - lastMapMoveAt < renderSettleMs) {
      return false;
    }

    if (!markerElement.isConnected) {
      return false;
    }

    const rect = markerElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    return markerElement.classList.contains('map-photo-marker-wrapper');
  }

  startSpotlight(markerElement: HTMLElement, pulseMs: number): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!markerElement.isConnected) {
          return;
        }
        markerElement.classList.remove('map-photo-marker-wrapper--spotlight');
        void markerElement.offsetWidth;
        markerElement.classList.add('map-photo-marker-wrapper--spotlight');
        setTimeout(
          () => markerElement.classList.remove('map-photo-marker-wrapper--spotlight'),
          pulseMs,
        );
      });
    });
  }

  waitForIdleOrTimeout(map: L.Map | undefined, idleFallbackMs: number, onFlush: () => void): void {
    if (!map) return;

    let flushed = false;
    const flushOnce = () => {
      if (flushed) return;
      flushed = true;
      onFlush();
    };

    const mapWithOnce = map as L.Map & { once?: (event: string, fn: () => void) => void };
    if (typeof mapWithOnce.once === 'function') {
      mapWithOnce.once('idle', flushOnce);
    }

    setTimeout(flushOnce, idleFallbackMs);
  }
}
