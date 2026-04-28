import type { ImageRecord } from '../../core/media-query/media-query.types';
import type { WorkspaceMedia } from '../../core/workspace-view/workspace-view.types';

/** Maps workspace viewport media rows to canonical ImageRecord for MediaItem / MediaDownloadService. */
export function workspaceMediaToImageRecord(w: WorkspaceMedia): ImageRecord {
  const captured = w.capturedAt;
  return {
    id: w.id,
    user_id: '',
    organization_id: null,
    project_id: w.projectId,
    project_ids: w.projectIds,
    storage_path: w.storagePath,
    thumbnail_path: w.thumbnailPath,
    latitude: Number.isFinite(w.latitude) ? w.latitude : null,
    longitude: Number.isFinite(w.longitude) ? w.longitude : null,
    exif_latitude: w.exifLatitude,
    exif_longitude: w.exifLongitude,
    captured_at: captured,
    has_time: captured != null && captured.length > 0,
    created_at: w.createdAt,
    address_label: w.addressLabel,
    street: w.street,
    city: w.city,
    district: w.district,
    country: w.country,
    direction: w.direction,
    location_unresolved: null,
  };
}
