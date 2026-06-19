import { Injectable } from '@angular/core';
import type { PhotoMarkerState } from '../markers/map-marker-reconcile.facade';
import type { MarkerRenderSnapshot } from '../markers/map-photo-marker-render.service';
import type { MapInstance, MapLayerGroup, MapLatLng, MapPoint } from '../leaflet/map-leaflet.service';

export type PendingSecondaryPress = {
  startPoint: MapPoint;
  startLatLng: MapLatLng;
  startClientX: number;
  startClientY: number;
  additive: boolean;
} | null;

@Injectable({ providedIn: 'root' })
export class MapShellInstanceService {
  map: MapInstance | undefined;
  mapContainerElement: HTMLDivElement | undefined;
  readonly uploadedPhotoMarkers = new Map<string, PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }>();
  photoMarkerLayer: MapLayerGroup | null = null;
  readonly markersByMediaId = new Map<string, string[]>();
  lastMapMoveAt = 0;
  lastMapIdleAt = 0;
  suppressMapClickUntil = 0;
  nativeContextMenuBypassUntil = 0;
  markerContextMenuSuppressUntil = 0;
  pendingSecondaryPress: PendingSecondaryPress = null;
}
