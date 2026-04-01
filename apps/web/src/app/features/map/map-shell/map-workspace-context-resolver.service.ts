import { Injectable } from '@angular/core';
import type {
  MapActionContext,
  MarkerActionContext,
  MarkerContextPayload,
} from './map-workspace-actions.types';

@Injectable({ providedIn: 'root' })
export class MapWorkspaceContextResolverService {
  resolveMapContext(coords: { lat: number; lng: number } | null): MapActionContext | null {
    if (!coords) {
      return null;
    }

    return {
      contextType: 'map_point',
      count: 1,
      primaryMediaId: null,
      mediaIds: [],
      coords: {
        lat: coords.lat,
        lng: coords.lng,
      },
      sourceCells: [],
    };
  }

  resolveMarkerContext(payload: MarkerContextPayload | null): MarkerActionContext | null {
    if (!payload) {
      return null;
    }

    return {
      contextType: payload.count > 1 ? 'map_cluster' : 'map_marker',
      markerKey: payload.markerKey,
      count: payload.count,
      primaryMediaId: payload.mediaId ?? null,
      mediaIds: payload.mediaId ? [payload.mediaId] : [],
      coords: {
        lat: payload.lat,
        lng: payload.lng,
      },
      isMultiSelection: payload.isMultiSelection ?? false,
      sourceCells: payload.sourceCells,
    };
  }
}
