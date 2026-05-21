export type MetadataValueType = 'text' | 'select' | 'number' | 'date' | 'checkbox';

export interface MetadataFieldCapabilities {
  sortable: boolean;
  groupable: boolean;
  filterable: boolean;
  searchable: boolean;
}

export interface MetadataFieldDefinition {
  id: string;
  label: string;
  icon: string;
  valueType: MetadataValueType;
  capabilities: MetadataFieldCapabilities;
  defaultSortDirection: 'asc' | 'desc';
  builtIn: boolean;
}

export interface MetadataKeyRecord {
  id: string;
  key_name: string;
  key_type?: string | null;
}

export interface MetadataKeyDefinition {
  id: string;
  key_name: string;
  key_type: MetadataValueType;
}

export interface MediaLookupRow {
  id: string;
  source_image_id: string | null;
}

export interface MediaMetadataValueRow {
  media_item_id: string;
  metadata_key_id: string;
  value_text: string;
}

export interface MetadataEntryRecord {
  metadataKeyId: string;
  key: string;
  keyType: MetadataValueType;
  value: string;
}
