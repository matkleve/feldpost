export type { ImageRecord } from '../../../core/media-query/media-query.types';

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
