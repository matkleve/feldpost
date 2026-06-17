import { Injectable, inject, signal } from '@angular/core';
import { GeocodingService } from '../../../../core/geocoding/geocoding.service';
import { MapLeafletService } from './map-leaflet.service';
import type { MapInstance, MapMarker } from './map-leaflet.service';

@Injectable({ providedIn: 'root' })
export class MapShellSearchService {
  private readonly geocodingService = inject(GeocodingService);
  private readonly mapLeafletService = inject(MapLeafletService);

  private readonly _searchViewportBounds = signal<
    { north: number; east: number; south: number; west: number } | undefined
  >(undefined);
  readonly searchViewportBounds = this._searchViewportBounds.asReadonly();

  private readonly _searchCountryCodes = signal<string[] | undefined>(undefined);
  readonly searchCountryCodes = this._searchCountryCodes.asReadonly();

  private readonly _searchPlacementActive = signal(false);
  readonly searchPlacementActive = this._searchPlacementActive.asReadonly();

  private searchLocationMarker: MapMarker | null = null;
  private uploadPreviewMarker: MapMarker | null = null;
  private searchLocationPreviewMarkers: MapMarker[] = [];

  pendingSearchMapCenter: { lat: number; lng: number; label: string } | null = null;

  setPlacementActive(value: boolean): void {
    this._searchPlacementActive.set(value);
  }

  updateViewportBounds(map: MapInstance | undefined): void {
    const bounds = map?.getBounds();
    if (!bounds) return;
    const quantize = (v: number): number => Math.round(v * 1e5) / 1e5;
    this._searchViewportBounds.set({
      north: quantize(bounds.getNorth()),
      east: quantize(bounds.getEast()),
      south: quantize(bounds.getSouth()),
      west: quantize(bounds.getWest()),
    });
  }

  async refreshCountryCode(lat: number, lng: number): Promise<void> {
    const result = await this.geocodingService.reverse(lat, lng);
    const countryCode = result?.countryCode?.toLowerCase();
    if (!countryCode) return;
    this._searchCountryCodes.set([countryCode]);
  }

  renderOrUpdateLocationMarker(coords: [number, number], map: MapInstance | undefined): void {
    if (!map) return;
    if (!this.searchLocationMarker) {
      this.searchLocationMarker = this.mapLeafletService.createSearchLocationMarker(coords);
      try {
        this.searchLocationMarker.addTo(map);
      } catch {
        this.searchLocationMarker = null;
        return;
      }
      return;
    }
    this.searchLocationMarker.setLatLng(coords);
  }

  clearLocationMarker(): void {
    this.searchLocationMarker?.remove();
    this.searchLocationMarker = null;
  }

  renderPreviewMarkers(
    points: ReadonlyArray<{ lat: number; lng: number }>,
    map: MapInstance | undefined,
  ): void {
    if (!map) return;
    this.clearPreviewMarkers();
    if (points.length === 1) {
      this.uploadPreviewMarker = this.mapLeafletService.createSearchLocationMarker([
        points[0]!.lat,
        points[0]!.lng,
      ]);
      try {
        this.uploadPreviewMarker.addTo(map);
      } catch {
        this.uploadPreviewMarker.remove();
        this.uploadPreviewMarker = null;
      }
      return;
    }
    for (const point of points) {
      const marker = this.mapLeafletService.createSearchLocationMarker([point.lat, point.lng]);
      try {
        marker.addTo(map);
        this.searchLocationPreviewMarkers.push(marker);
      } catch {
        marker.remove();
      }
    }
  }

  clearPreviewMarkers(): void {
    for (const marker of this.searchLocationPreviewMarkers) {
      marker.remove();
    }
    this.searchLocationPreviewMarkers = [];
    this.uploadPreviewMarker?.remove();
    this.uploadPreviewMarker = null;
  }
}
