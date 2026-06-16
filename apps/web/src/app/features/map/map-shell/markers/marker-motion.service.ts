import { Injectable, signal } from '@angular/core';
import * as L from 'leaflet';

export type MarkerMotionPreference = 'off' | 'smooth';

const STORAGE_KEY = 'sitesnap.settings.map.markerMotion';
const EVENT_NAME = 'sitesnap:map-marker-motion-changed';

@Injectable({ providedIn: 'root' })
export class MarkerMotionService {
  private readonly markerMoveAnimationRaf = new WeakMap<L.Marker, number>();

  private readonly _preference = signal<MarkerMotionPreference>('smooth');
  readonly preference = this._preference.asReadonly();

  private readonly prefEventHandler = (event: Event): void => {
    const detail = (event as CustomEvent<{ markerMotion?: MarkerMotionPreference }>).detail;
    const candidate = detail?.markerMotion;
    if (candidate === 'off' || candidate === 'smooth') {
      this._preference.set(candidate);
      return;
    }
    this._preference.set(this.readMarkerMotionPreference(STORAGE_KEY));
  };

  initPreference(): void {
    this._preference.set(this.readMarkerMotionPreference(STORAGE_KEY));
    if (typeof window !== 'undefined') {
      window.addEventListener(EVENT_NAME, this.prefEventHandler);
    }
  }

  detachPreferenceListener(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(EVENT_NAME, this.prefEventHandler);
    }
  }

  readMarkerMotionPreference(storageKey: string): MarkerMotionPreference {
    if (typeof window === 'undefined') return 'smooth';
    const stored = window.localStorage.getItem(storageKey);
    return stored === 'off' ? 'off' : 'smooth';
  }

  animateMarkerPosition(
    marker: L.Marker,
    lat: number,
    lng: number,
    preference: MarkerMotionPreference,
    durationMs: number,
  ): void {
    if (preference === 'off') {
      this.cancelMarkerMoveAnimation(marker);
      marker.setLatLng([lat, lng]);
      return;
    }

    const from = marker.getLatLng();
    const to = L.latLng(lat, lng);

    if (!Number.isFinite(from.lat) || !Number.isFinite(from.lng)) {
      marker.setLatLng(to);
      return;
    }

    const latDelta = to.lat - from.lat;
    const lngDelta = to.lng - from.lng;
    if (Math.abs(latDelta) < 1e-9 && Math.abs(lngDelta) < 1e-9) {
      marker.setLatLng(to);
      return;
    }

    this.cancelMarkerMoveAnimation(marker);

    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

    const step = (now: number): void => {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = easeOutCubic(t);

      marker.setLatLng([from.lat + latDelta * eased, from.lng + lngDelta * eased]);

      if (t < 1) {
        const rafId = window.requestAnimationFrame(step);
        this.markerMoveAnimationRaf.set(marker, rafId);
        return;
      }

      this.markerMoveAnimationRaf.delete(marker);
      marker.setLatLng(to);
    };

    const rafId = window.requestAnimationFrame(step);
    this.markerMoveAnimationRaf.set(marker, rafId);
  }

  cancelMarkerMoveAnimation(marker: L.Marker): void {
    const rafId = this.markerMoveAnimationRaf.get(marker);
    if (rafId == null) return;
    window.cancelAnimationFrame(rafId);
    this.markerMoveAnimationRaf.delete(marker);
  }
}
