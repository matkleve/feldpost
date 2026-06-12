import {
  draftExclusionKey,
  normalizeMetadataKeyName,
  propertyExclusionKey,
  type MetadataComposeValueType,
} from '../../../../core/metadata/metadata-validation.helpers';
import type { MetadataEntry } from '../media-detail-view.types';

export interface MetadataAddDraft {
  valueType: MetadataComposeValueType;
  propertyMode: 'new' | 'existing';
  metadataKeyId: string | null;
  keyName: string;
  value: string;
}

export function createEmptyMetadataAddDraft(): MetadataAddDraft {
  return {
    valueType: 'text',
    propertyMode: 'new',
    metadataKeyId: null,
    keyName: '',
    value: '',
  };
}

export function buildExcludedKeyIds(entries: MetadataEntry[]): Set<string> {
  return new Set(entries.map((entry) => propertyExclusionKey(entry.metadataKeyId)));
}

export function isDuplicateOnImage(draft: MetadataAddDraft, entries: MetadataEntry[]): boolean {
  const excluded = buildExcludedKeyIds(entries);
  if (draft.metadataKeyId && excluded.has(propertyExclusionKey(draft.metadataKeyId))) {
    return true;
  }
  const name = draft.keyName.trim();
  if (!name) return false;
  return entries.some(
    (entry) =>
      draftExclusionKey(draft.valueType, name) ===
      draftExclusionKey(entry.keyType, entry.key),
  );
}
