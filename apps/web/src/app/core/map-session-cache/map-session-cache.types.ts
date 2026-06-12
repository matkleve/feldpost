/** RPC row shape for viewport markers (matches map-shell ViewportMarkerRow). */
export interface MapViewportMarkerRow {
  cluster_lat: number;
  cluster_lng: number;
  image_count: number;
  image_id: string | null;
  media_item_id?: string | null;
  location_id?: string | null;
  direction: number | null;
  storage_path: string | null;
  thumbnail_path: string | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  created_at: string | null;
}

export interface MapSessionSnapshot {
  readonly centerLat: number;
  readonly centerLng: number;
  readonly zoom: number;
  readonly fetchSouth: number;
  readonly fetchWest: number;
  readonly fetchNorth: number;
  readonly fetchEast: number;
  readonly roundedZoom: number;
  readonly viewportRows: readonly MapViewportMarkerRow[];
  readonly cachedAt: number;
}
