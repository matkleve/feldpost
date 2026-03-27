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

export interface MetadataEntry {
  metadataKeyId: string;
  key: string;
  value: string;
}

export interface SelectOption {
  id: string;
  label: string;
}

export type DetailEditingField =
  | 'address_label'
  | 'captured_at'
  | 'project_ids'
  | 'street'
  | 'city'
  | 'district'
  | 'country'
  | 'address_search'
  | null;

export interface MediaContextRow {
  id: string;
  media_type: string | null;
  mime_type: string | null;
  location_status: string | null;
}
