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
