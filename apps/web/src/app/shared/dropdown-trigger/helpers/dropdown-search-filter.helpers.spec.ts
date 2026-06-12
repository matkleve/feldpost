import { describe, expect, it } from 'vitest';
import {
  filterByToolbarDropdownSearch,
  matchesToolbarDropdownSearchLabel,
  normalizeToolbarDropdownSearchTerm,
} from './dropdown-search-filter.helpers';

describe('dropdown-search-filter.helpers', () => {
  it('normalizes trim and case', () => {
    expect(normalizeToolbarDropdownSearchTerm('  DiStr ')).toBe('distr');
  });

  it('matches empty term as show-all', () => {
    expect(matchesToolbarDropdownSearchLabel('District', '')).toBe(true);
    expect(matchesToolbarDropdownSearchLabel('District', '   ')).toBe(true);
  });

  it('filters by substring', () => {
    expect(matchesToolbarDropdownSearchLabel('District', 'distr')).toBe(true);
    expect(matchesToolbarDropdownSearchLabel('City', 'distr')).toBe(false);
  });

  it('filterByToolbarDropdownSearch returns all when term empty', () => {
    const items = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }];
    expect(filterByToolbarDropdownSearch(items, '', (i) => i.label)).toEqual(items);
  });

  it('filterByToolbarDropdownSearch narrows list', () => {
    const items = [{ id: 'a', label: 'District' }, { id: 'b', label: 'City' }];
    expect(filterByToolbarDropdownSearch(items, 'distr', (i) => i.label)).toEqual([
      { id: 'a', label: 'District' },
    ]);
  });
});
