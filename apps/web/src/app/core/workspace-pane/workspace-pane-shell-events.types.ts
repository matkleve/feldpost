/**
 * Payload types for workspace pane shell ↔ map / upload integration.
 * Kept in core so layout and orchestration do not depend on feature paths.
 */

/** Emitted when a new image is uploaded from the workspace upload tab (map marker refresh). */
export interface ImageUploadedEvent {
  id: string;
  lat: number;
  lng: number;
  direction?: number;
  thumbnailUrl?: string;
}

export interface UploadLocationPreviewEvent {
  lat: number;
  lng: number;
}

/** Map placement request from detail row overflow or header action. Consumed by MapShell. */
export interface UploadLocationMapPickRequest {
  mediaId: string;
  fileName: string;
  /**
   * When set (from `app-media-location-row` → Change GPS on map), persistence targets
   * `media_item_locations` via `MediaLocationsService`, not only `media_items`.
   * @see docs/specs/ui/media-detail/media-detail-location-section.md
   */
  locationRowId?: string;
}
