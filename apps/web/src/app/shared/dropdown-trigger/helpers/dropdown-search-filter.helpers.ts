/**
 * Shared label filter for toolbar `app-standard-dropdown` search rows (sort, grouping, projects).
 * @see docs/specs/component/filters/dropdown-system.md
 */

/** Normalizes search text from the standard dropdown search field. */
export function normalizeToolbarDropdownSearchTerm(term: string): string {
  return term.trim().toLowerCase();
}

/** True when `term` is empty or `label` contains the normalized term. */
export function matchesToolbarDropdownSearchLabel(label: string, term: string): boolean {
  const normalized = normalizeToolbarDropdownSearchTerm(term);
  if (!normalized) {
    return true;
  }
  return label.toLowerCase().includes(normalized);
}

/** Filters `items` by `readLabel(item)` using the same rules as sort/grouping/projects search. */
export function filterByToolbarDropdownSearch<T>(
  items: readonly T[],
  term: string,
  readLabel: (item: T) => string,
): T[] {
  const normalized = normalizeToolbarDropdownSearchTerm(term);
  if (!normalized) {
    return [...items];
  }
  return items.filter((item) => readLabel(item).toLowerCase().includes(normalized));
}
