import { Injectable } from '@angular/core';
import type { PhotoMarkerState } from '../markers/map-marker-reconcile.facade';
import type { MarkerRenderSnapshot } from '../markers/map-photo-marker-render.service';
import type { MapInstance, MapLayerGroup } from '../leaflet/map-leaflet.service';

@Injectable({ providedIn: 'root' })
export class MapShellInstanceService {
  map: MapInstance | undefined;
  readonly uploadedPhotoMarkers = new Map<string, PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }>();
  photoMarkerLayer: MapLayerGroup | null = null;
  readonly markersByMediaId = new Map<string, string[]>();
  lastMapMoveAt = 0;
  lastMapIdleAt = 0;
}
