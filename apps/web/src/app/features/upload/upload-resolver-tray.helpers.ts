import type { UploadDisambiguationGroup } from '../../core/upload/upload-manager.types';

/** Street line without trailing postcode/city (for city-level questions). */
export function extractStreetFromTitleAddress(titleAddress: string): string {
  const trimmed = titleAddress.trim();
  if (!trimmed) {
    return trimmed;
  }
  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return parts[0];
  }
  return trimmed;
}

export type ResolverQuestionKey =
  | 'upload.resolver.question.source'
  | 'upload.resolver.question.contextDistance'
  | 'upload.resolver.question.city'
  | 'upload.resolver.question.door'
  | 'upload.resolver.question.address';

export function resolverQuestionKeyForGroup(
  group: UploadDisambiguationGroup,
): ResolverQuestionKey {
  if (group.disambiguationKind === 'source') {
    return 'upload.resolver.question.source';
  }
  if (group.disambiguationKind === 'context_distance') {
    return 'upload.resolver.question.contextDistance';
  }
  if (group.collapseStage === 'city') {
    return 'upload.resolver.question.city';
  }
  if (group.collapseStage === 'per_file') {
    return 'upload.resolver.question.door';
  }
  return 'upload.resolver.question.address';
}

export function optionDisplayLabel(
  group: UploadDisambiguationGroup,
  rowLabel: string,
  candidate: { addressLabel: string; city?: string | null },
): string {
  if (group.collapseStage === 'city') {
    return (candidate.city ?? rowLabel).trim() || candidate.addressLabel;
  }
  return candidate.addressLabel;
}
