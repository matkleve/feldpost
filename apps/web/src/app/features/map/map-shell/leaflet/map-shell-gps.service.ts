import { Injectable, inject, signal } from '@angular/core';
import { MapGeolocationService } from './map-geolocation.service';
import type { MapInstance } from './map-leaflet.service';

const TRACKING_INTERVAL_MS = 60000;
const RECENTER_MIN_ZOOM = 16;

@Injectable({ providedIn: 'root' })
export class MapShellGpsService {
  private readonly mapGeolocationService = inject(MapGeolocationService);

  private readonly _userPosition = signal<[number, number] | null>(null);
  readonly userPosition = this._userPosition.asReadonly();

  private readonly _gpsLocating = signal(false);
  readonly gpsLocating = this._gpsLocating.asReadonly();

  private readonly _gpsTrackingActive = signal(false);
  readonly gpsTrackingActive = this._gpsTrackingActive.asReadonly();

  private gpsTrackingTimer: ReturnType<typeof setInterval> | null = null;

  /** Passive initial position on startup — no centering, no tracking. */
  initBackground(onPositionResolved: (coords: [number, number]) => void): void {
    this.mapGeolocationService.requestCurrentPosition({
      onSuccess: (coords) => {
        this._userPosition.set(coords);
        onPositionResolved(coords);
      },
      onError: () => { /* denied/unavailable — map keeps default view */ },
    });
  }

  /**
   * User-triggered GPS toggle. Centers the map on the first fix and starts
   * interval tracking. If already tracking, stops instead.
   */
  goTo(
    map: MapInstance | undefined,
    onPositionResolved: (coords: [number, number]) => void,
    onStopped: () => void,
  ): void {
    if (this._gpsTrackingActive()) {
      this.stopTracking(onStopped);
      return;
    }

    this._gpsTrackingActive.set(true);
    this._gpsLocating.set(true);

    this.mapGeolocationService.requestCurrentPosition(
      {
        onSuccess: (coords) => {
          if (!this._gpsTrackingActive()) {
            this._gpsLocating.set(false);
            return;
          }
          this._userPosition.set(coords);
          const zoom = Math.max(map?.getZoom() ?? 0, RECENTER_MIN_ZOOM);
          map?.setView(coords, zoom);
          onPositionResolved(coords);
          this.startTracking(onPositionResolved, onStopped);
          this._gpsLocating.set(false);
        },
        onError: () => {
          this.stopTracking(onStopped);
          this._gpsLocating.set(false);
        },
      },
      { maximumAge: 0 },
    );
  }

  stopTracking(onStopped?: () => void): void {
    this._gpsTrackingActive.set(false);
    this._gpsLocating.set(false);
    this.gpsTrackingTimer = this.mapGeolocationService.clearTrackingTimer(this.gpsTrackingTimer);
    onStopped?.();
  }

  private startTracking(
    onPositionResolved: (coords: [number, number]) => void,
    onStopped: () => void,
  ): void {
    this.gpsTrackingTimer = this.mapGeolocationService.clearTrackingTimer(this.gpsTrackingTimer);
    this.gpsTrackingTimer = this.mapGeolocationService.startTracking({
      intervalMs: TRACKING_INTERVAL_MS,
      isTrackingActive: () => this._gpsTrackingActive(),
      onTickStart: () => this._gpsLocating.set(true),
      onSuccess: (coords) => {
        this._userPosition.set(coords);
        onPositionResolved(coords);
        this._gpsLocating.set(false);
      },
      onError: () => {
        this.stopTracking(onStopped);
        this._gpsLocating.set(false);
      },
    });
  }
}
