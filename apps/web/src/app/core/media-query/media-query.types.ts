/**
 * Canonical media row / list-query DTO for gallery-style surfaces.
 * @see docs/specs/service/media-query/media-query-service.md
 */
export interface ImageRecord {
  id: string;
  user_id: string;
  organization_id: string | null;
  project_id: string | null;
  project_ids?: string[];
  storage_path: string | null;
  thumbnail_path: string | null;
  latitude: number | null;
  longitude: number | null;
  exif_latitude: number | null;
  exif_longitude: number | null;
  captured_at: string | null;
  has_time: boolean;
  created_at: string;
  address_label: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  direction: number | null;
  location_unresolved: boolean | null;
}
