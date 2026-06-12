export type { MediaRecord } from '../../../core/media-query/media-query.types';

import type { MetadataValueType } from '../../../core/metadata/metadata.types';

export interface MetadataEntry {
  metadataKeyId: string;
  key: string;
  keyType: MetadataValueType;
  value: string;
}

export interface MetadataKeyDefinitionView {
  id: string;
  key_name: string;
  key_type: MetadataValueType;
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
  | 'coordinates'
  | null;

export interface MediaContextRow {
  id: string;
  media_type: string | null;
  mime_type: string | null;
  location_status: string | null;
}
