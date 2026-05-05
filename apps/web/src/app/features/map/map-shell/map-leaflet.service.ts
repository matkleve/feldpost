import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import {
  PHOTO_MARKER_ICON_ANCHOR,
  PHOTO_MARKER_ICON_SIZE,
  PHOTO_MARKER_POPUP_ANCHOR,
} from '../../../core/map/marker-factory';

export type MapInstance = L.Map;
export type MapMarker = L.Marker;
export type MapLayerGroup = L.LayerGroup;
export type MapTileLayer = L.TileLayer;
export type MapLatLng = L.LatLng;
export type MapLatLngBounds = L.LatLngBounds;
export type MapPoint = L.Point;
export type MapPolyline = L.Polyline;
export type MapCircle = L.Circle;
export type MapDivIcon = L.DivIcon;
export type MapMouseEvent = L.LeafletMouseEvent;

@Injectable({ providedIn: 'root' })
export class MapLeafletService {
  createMap(container: HTMLElement): MapInstance {
    return L.map(container, {
      center: [48.2082, 16.3738], // Vienna, Austria (fallback)
      zoom: 13,
      maxZoom: 22,
      zoomControl: false,
    });
  }

  createPhotoMarkerLayer(map: MapInstance): MapLayerGroup {
    return L.layerGroup().addTo(map);
  }

  createLatLng(lat: number, lng: number): MapLatLng {
    return L.latLng(lat, lng);
  }

  createBounds(southWest: [number, number], northEast: [number, number]): MapLatLngBounds {
    return L.latLngBounds(southWest, northEast);
  }

  createRadiusDraftLine(map: MapInstance, startLatLng: MapLatLng): MapPolyline {
    return L.polyline([startLatLng, startLatLng], {
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      dashArray: '6 4',
      interactive: false,
    }).addTo(map);
  }

  createRadiusDraftCircle(map: MapInstance, startLatLng: MapLatLng): MapCircle {
    return L.circle(startLatLng, {
      radius: 1,
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      fillColor: 'var(--color-clay)',
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(map);
  }

  createUserLocationMarker(coords: [number, number]): MapMarker {
    return L.marker(coords, {
      icon: L.divIcon({
        className: 'map-user-location-marker',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: false,
      keyboard: false,
      zIndexOffset: 2000,
    });
  }

  createSearchLocationMarker(coords: [number, number]): MapMarker {
    return L.marker(coords, {
      icon: L.divIcon({
        className: 'map-search-location-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      }),
      interactive: false,
      keyboard: false,
    });
  }

  createPhotoMarker(coords: [number, number], icon: MapDivIcon): MapMarker {
    return L.marker(coords, { icon });
  }

  createStaticPhotoMarker(coords: [number, number], icon: MapDivIcon): MapMarker {
    return L.marker(coords, {
      icon,
      interactive: false,
      keyboard: false,
    });
  }

  createPhotoMarkerIcon(html: string): MapDivIcon {
    return L.divIcon({
      className: 'map-photo-marker-wrapper',
      html,
      iconSize: PHOTO_MARKER_ICON_SIZE,
      iconAnchor: PHOTO_MARKER_ICON_ANCHOR,
      popupAnchor: PHOTO_MARKER_POPUP_ANCHOR,
    });
  }
}
