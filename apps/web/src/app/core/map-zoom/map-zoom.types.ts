/** Zoom proximity variants for detail actions. */
export type MapZoomMode = 'house' | 'street';

/** Normalized payload delivered to the map shell. */
export interface MapZoomPayload {
  readonly mediaId: string;
  readonly lat: number;
  readonly lng: number;
  readonly zoomMode?: MapZoomMode;
  readonly locationId?: string;
}

/**
 * Any UI surface that requests a map fly-to (tile, detail row, upload, context menu).
 * `source` is logged for debugging (e.g. `media-item-tile`, `media-detail-show-on-map`).
 */
export interface MapZoomRequest {
  readonly source: string;
  readonly mediaId: string;
  readonly lat: number | string | null | undefined;
  readonly lng: number | string | null | undefined;
  readonly zoomMode?: MapZoomMode;
  readonly locationId?: string;
}
