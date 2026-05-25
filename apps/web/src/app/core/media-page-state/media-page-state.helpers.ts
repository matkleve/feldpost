import type { FilterRule } from '../filter/filter.types';
import type { SortConfig } from '../workspace-view/workspace-view.types';
import type { MediaGalleryQueryInputs } from './media-page-state.types';

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function sortedProjectIds(projectIds: ReadonlySet<string>): string[] {
  return Array.from(projectIds).sort();
}

function normalizeFilterRules(rules: readonly FilterRule[]): Array<{
  id: string;
  conjunction: string;
  property: string;
  operator: string;
  value: string;
}> {
  return rules.map((rule) => ({
    id: rule.id,
    conjunction: rule.conjunction,
    property: rule.property,
    operator: rule.operator,
    value: rule.value,
  }));
}

/**
 * Cache namespace for /media gallery loads (filters, sorts, groupings, project scope).
 * @see docs/specs/service/media-page-state/media-page-state-service.md
 */
export function buildMediaGalleryQuerySignature(inputs: MediaGalleryQueryInputs): string {
  const payload = {
    userId: inputs.userId,
    projectIds: sortedProjectIds(inputs.projectIds),
    sorts: inputs.sorts.map((sort) => ({ key: sort.key, direction: sort.direction })),
    groupingIds: [...inputs.groupingIds].sort(),
    filterRules: normalizeFilterRules(inputs.filterRules),
  };

  return stableStringify(payload);
}
