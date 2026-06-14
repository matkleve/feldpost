import type { MediaRecord } from '../media-query/media-query.types';
import type { ProjectMediaListItem } from './projects.types';

/** Maps project detail media rows to MediaRecord for app-media-item / app-media-display. */
export function projectMediaListItemToMediaRecord(item: ProjectMediaListItem): MediaRecord {
  return {
    id: item.id,
    user_id: '',
    organization_id: null,
    project_id: null,
    storage_path: item.storagePath,
    thumbnail_path: item.thumbnailPath,
    latitude: null,
    longitude: null,
    exif_latitude: null,
    exif_longitude: null,
    captured_at: item.capturedAt,
    has_time: !!item.capturedAt,
    created_at: item.createdAt,
    address_label: null,
    street: null,
    city: null,
    district: null,
    country: null,
    direction: null,
    location_unresolved: null,
  };
}
