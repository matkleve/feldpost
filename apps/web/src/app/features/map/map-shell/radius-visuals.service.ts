import { Injectable } from '@angular/core';
import * as L from 'leaflet';

export interface RadiusCommittedVisual {
  circle: L.Circle;
  label: L.Marker;
  centerDot: L.CircleMarker;
}

@Injectable({ providedIn: 'root' })
export class RadiusVisualsService {
  offsetLatLngEast(center: L.LatLng, meters: number): L.LatLng {
    const latRad = (center.lat * Math.PI) / 180;
    const metersPerDegreeLng = 111320 * Math.max(Math.cos(latRad), 0.0001);
    const lngOffset = meters / metersPerDegreeLng;
    return L.latLng(center.lat, center.lng + lngOffset);
  }

  createLabelMarker(position: L.LatLng, radiusMeters: number, angleDeg: number): L.Marker {
    return L.marker(position, {
      interactive: false,
      keyboard: false,
      icon: L.divIcon({
        className: 'map-radius-label',
        html: `<span class="map-radius-label__value" style="--radius-label-rotation:${angleDeg.toFixed(2)}deg">${this.formatRadiusDistance(radiusMeters)}</span>`,
        iconSize: [0, 0],
      }),
    });
  }

  updateLabelMarker(marker: L.Marker | null, radiusMeters: number, angleDeg: number): void {
    const el = marker?.getElement();
    if (!el) return;
    const value = el.querySelector('.map-radius-label__value');
    if (value instanceof HTMLElement) {
      value.textContent = this.formatRadiusDistance(radiusMeters);
      value.style.setProperty('--radius-label-rotation', `${angleDeg.toFixed(2)}deg`);
    }
  }

  getLabelLatLng(start: L.LatLng, end: L.LatLng): L.LatLng {
    return L.latLng((start.lat + end.lat) / 2, (start.lng + end.lng) / 2);
  }

  getReadableLineAngleDeg(map: L.Map | undefined, start: L.LatLng, end: L.LatLng): number {
    if (!map) return 0;

    const startPoint = map.latLngToContainerPoint(start);
    const endPoint = map.latLngToContainerPoint(end);
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    let angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    return angle;
  }

  addCommittedSelectionVisual(
    map: L.Map,
    center: L.LatLng,
    radiusMeters: number,
    edge: L.LatLng,
  ): RadiusCommittedVisual {
    const labelLatLng = this.getLabelLatLng(center, edge);
    const labelAngleDeg = this.getReadableLineAngleDeg(map, center, edge);

    const circle = L.circle(center, {
      radius: radiusMeters,
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      fillColor: 'var(--color-clay)',
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(map);

    const centerDot = L.circleMarker(center, {
      radius: 4,
      color: 'var(--color-clay)',
      fillColor: 'var(--color-clay)',
      fillOpacity: 1,
      weight: 0,
      interactive: false,
    }).addTo(map);

    const label = this.createLabelMarker(labelLatLng, radiusMeters, labelAngleDeg).addTo(map);
    return { circle, label, centerDot };
  }

  clearCommittedSelectionVisuals(visuals: RadiusCommittedVisual[]): void {
    for (const visual of visuals) {
      visual.circle.remove();
      visual.label.remove();
      visual.centerDot.remove();
    }
    visuals.length = 0;
  }

  private formatRadiusDistance(radiusMeters: number): string {
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) return '0 m';
    if (radiusMeters < 1000) return `${Math.round(radiusMeters)} m`;
    if (radiusMeters < 10000) return `${(radiusMeters / 1000).toFixed(1)} km`;
    return `${Math.round(radiusMeters / 1000)} km`;
  }
}
