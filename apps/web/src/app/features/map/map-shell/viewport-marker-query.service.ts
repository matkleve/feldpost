import { Injectable } from '@angular/core';
import type * as L from 'leaflet';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ViewportMarkerQueryResult<T> {
  data: T[] | null;
  error: unknown;
  aborted: boolean;
  fetchSouth: number;
  fetchWest: number;
  fetchNorth: number;
  fetchEast: number;
  roundedZoom: number;
}

@Injectable({ providedIn: 'root' })
export class ViewportMarkerQueryService {
  async fetchViewportMarkers<T>(
    client: SupabaseClient,
    map: L.Map,
    signal: AbortSignal,
  ): Promise<ViewportMarkerQueryResult<T>> {
    const bounds = map.getBounds();
    const zoom = map.getZoom();

    // 10 % buffer on each edge for pre-fetch.
    const latPad = (bounds.getNorth() - bounds.getSouth()) * 0.1;
    const lngPad = (bounds.getEast() - bounds.getWest()) * 0.1;

    const fetchSouth = bounds.getSouth() - latPad;
    const fetchWest = bounds.getWest() - lngPad;
    const fetchNorth = bounds.getNorth() + latPad;
    const fetchEast = bounds.getEast() + lngPad;
    const roundedZoom = Math.round(zoom);

    const { data, error } = await client
      .rpc('viewport_markers', {
        min_lat: fetchSouth,
        min_lng: fetchWest,
        max_lat: fetchNorth,
        max_lng: fetchEast,
        zoom: roundedZoom,
      })
      .abortSignal(signal);

    return {
      data: (data as T[] | null) ?? null,
      error,
      aborted: signal.aborted,
      fetchSouth,
      fetchWest,
      fetchNorth,
      fetchEast,
      roundedZoom,
    };
  }
}
