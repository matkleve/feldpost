import { of, firstValueFrom, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SearchEngine } from './search-engine';
import type { SearchProvider } from './search-provider.interface';
import type { SearchAddressCandidate, SearchContentCandidate } from '../search.models';

function mockProvider(
  partial: Partial<SearchProvider> & Pick<SearchProvider, 'id' | 'family' | 'sectionTitle'>,
): SearchProvider {
  return {
    keywords: [],
    priority: 50,
    search: () => of([]),
    ...partial,
  };
}

describe('SearchEngine', () => {
  it('returns focused-empty state for empty query via recents provider', async () => {
    const recents = mockProvider({
      id: 'recents',
      family: 'recent',
      sectionTitle: 'Recent searches',
      search: () =>
        of([
          {
            id: 'recent-1',
            family: 'recent',
            label: 'Zurich',
            lastUsedAt: new Date().toISOString(),
          },
        ]),
    });

    const engine = SearchEngine.create([recents]);
    const result = await firstValueFrom(engine.searchOnce('  ', {}));

    expect(result?.state).toBe('focused-empty');
    expect(result?.sections[0]?.items.length).toBe(1);
  });

  it('routes #project exclusively to matching provider', async () => {
    const projects = mockProvider({
      id: 'projects',
      family: 'db-content',
      sectionTitle: 'Projects',
      keywords: ['project'],
      operatorHints: {
        '#': 'Search for a specific project',
        '+': 'Add a project to the search',
        '-': 'Remove a project from the search',
      },
      search: (query) =>
        of([
          {
            id: 'project-1',
            family: 'db-content',
            label: `Project ${query}`,
            contentType: 'project',
            contentId: 'project-1',
            score: 0.9,
          } satisfies SearchContentCandidate,
        ]),
    });

    const dbAddress = mockProvider({
      id: 'db-address',
      family: 'db-address',
      sectionTitle: 'Addresses',
      search: () =>
        of([
          {
            id: 'db-1',
            family: 'db-address',
            label: 'Should not appear',
            lat: 1,
            lng: 2,
          } satisfies SearchAddressCandidate,
        ]),
    });

    const engine = SearchEngine.create([dbAddress, projects]);
    const result = await firstValueFrom(engine.searchOnce('#project Alpha', {}));

    expect(result?.sections.some((section) => section.family === 'db-address')).toBe(false);
    expect(result?.sections.find((section) => section.family === 'db-content')?.items[0].label).toBe(
      'Project Alpha',
    );
  });

  it('shows operator suggestions for bare #', async () => {
    const projects = mockProvider({
      id: 'projects',
      family: 'db-content',
      sectionTitle: 'Projects',
      keywords: ['project'],
      operatorHints: {
        '#': 'Search for a specific project',
        '+': 'Add a project to the search',
        '-': 'Remove a project from the search',
      },
    });

    const engine = SearchEngine.create([projects]);
    const result = await firstValueFrom(engine.searchOnce('#', {}));

    expect(result?.sections[0]?.family).toBe('operator-suggestion');
    expect(result?.sections[0]?.items[0]?.family).toBe('operator-suggestion');
  });

  it('deduplicates geocoder results near db addresses', async () => {
    const dbAddress = mockProvider({
      id: 'db-address',
      family: 'db-address',
      sectionTitle: 'Addresses',
      search: () =>
        of([
          {
            id: 'db-1',
            label: 'Burgstrasse 7',
            family: 'db-address',
            lat: 47.3769,
            lng: 8.5417,
            imageCount: 12,
            score: 0.9,
          },
        ]),
    });

    const geocoder = mockProvider({
      id: 'geocoder',
      family: 'geocoder',
      sectionTitle: 'Places',
      search: () =>
        of([
          {
            id: 'geo-near',
            label: 'Burgstrasse 7, Zurich',
            family: 'geocoder',
            lat: 47.3769001,
            lng: 8.5417001,
            score: 0.8,
          },
          {
            id: 'geo-far',
            label: 'Burgstrasse 7, Bern',
            family: 'geocoder',
            lat: 46.9479,
            lng: 7.4446,
            score: 0.6,
          },
        ]),
    });

    const engine = SearchEngine.create([dbAddress, geocoder], { maxGeocoderSectionItems: 5 });
    const result = await firstValueFrom(engine.searchOnce('burg', {}));
    const geocoderSection = result?.sections.find((section) => section.family === 'geocoder');

    expect(geocoderSection?.items.length).toBe(1);
    expect(geocoderSection?.items[0].id).toBe('geo-far');
  });

  it('emits typing, partial, and complete states', async () => {
    const dbAddress = mockProvider({
      id: 'db-address',
      family: 'db-address',
      sectionTitle: 'Addresses',
      search: () =>
        of([
          {
            id: 'db-1',
            label: 'Burgstrasse 7',
            family: 'db-address',
            lat: 47.3769,
            lng: 8.5417,
            score: 0.9,
          },
        ]),
    });

    const geocoder = mockProvider({
      id: 'geocoder',
      family: 'geocoder',
      sectionTitle: 'Places',
      search: () => of([]),
    });

    const engine = SearchEngine.create([dbAddress, geocoder], { debounceMs: 0 });
    const states = await firstValueFrom(
      engine.searchInput(of('burg'), of({})).pipe(toArray()),
    );

    expect(states.map((state) => state.state)).toEqual([
      'typing',
      'results-partial',
      'results-complete',
    ]);
  });

  it('toggles filter chips on #project commit', () => {
    const engine = SearchEngine.create([]);
    const candidate: SearchContentCandidate = {
      id: 'project-1',
      family: 'db-content',
      label: 'Alpha',
      contentType: 'project',
      contentId: 'project-1',
    };

    const addAction = engine.commit(candidate, '#project Alpha', {
      raw: '#project Alpha',
      operator: '#',
      keyword: 'project',
      searchTerm: 'Alpha',
      isBareOperator: false,
      isOperatorSuggestionMode: false,
    });
    expect(addAction.type).toBe('filter-chip-toggle');
    if (addAction.type === 'filter-chip-toggle') {
      expect(addAction.removed).toBe(false);
      expect(engine.getFilterChips().length).toBe(1);
    }

    const removeAction = engine.commit(candidate, '#project Alpha', {
      raw: '#project Alpha',
      operator: '#',
      keyword: 'project',
      searchTerm: 'Alpha',
      isBareOperator: false,
      isOperatorSuggestionMode: false,
    });
    if (removeAction.type === 'filter-chip-toggle') {
      expect(removeAction.removed).toBe(true);
      expect(engine.getFilterChips().length).toBe(0);
    }
  });
});
