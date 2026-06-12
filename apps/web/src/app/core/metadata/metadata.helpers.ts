import type {
  MediaLookupRow,
  MediaMetadataValueRow,
  MetadataFieldDefinition,
  MetadataKeyRecord,
} from './metadata.types';
import type { WorkspaceMediaCustomMetadata } from '../workspace-view/workspace-view.types';

export function mapMetadataKeysToFieldDefinitions(
  keys: MetadataKeyRecord[],
  iconByType: Record<string, string>,
): MetadataFieldDefinition[] {
  return keys.map((key) => {
    const normalizedType = (key.key_type ?? 'text') as MetadataFieldDefinition['valueType'];

    return {
      id: key.id,
      label: key.key_name,
      icon: iconByType[normalizedType] ?? 'tag',
      valueType: normalizedType,
      capabilities: { sortable: true, groupable: true, filterable: true, searchable: true },
      defaultSortDirection: 'asc',
      builtIn: false,
    };
  });
}

export function buildLookupIdsByMediaItemId(
  mediaRows: MediaLookupRow[],
  allowedLookupIds: Set<string>,
): Map<string, string[]> {
  const lookupIdsByMediaItemId = new Map<string, string[]>();

  for (const row of mediaRows) {
    const lookupIds = [row.id, row.source_image_id].filter(
      (id): id is string => typeof id === 'string' && id.length > 0 && allowedLookupIds.has(id),
    );

    if (lookupIds.length === 0) continue;

    lookupIdsByMediaItemId.set(row.id, lookupIds);
  }

  return lookupIdsByMediaItemId;
}

export function buildMetadataMapByLookupId(
  rows: MediaMetadataValueRow[],
  lookupIdsByMediaItemId: Map<string, string[]>,
): Map<string, WorkspaceMediaCustomMetadata> {
  const metadataMap = new Map<string, WorkspaceMediaCustomMetadata>();

  for (const row of rows) {
    const lookupIds = lookupIdsByMediaItemId.get(row.media_item_id);
    if (!lookupIds || lookupIds.length === 0) continue;

    for (const lookupId of lookupIds) {
      let entry = metadataMap.get(lookupId);
      if (!entry) {
        entry = {};
        metadataMap.set(lookupId, entry);
      }
      entry[row.metadata_key_id] = row.value_text;
    }
  }

  return metadataMap;
}
