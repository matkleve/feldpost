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

export interface UploadLocationMapPickRequest {
  mediaId: string;
  fileName: string;
}
