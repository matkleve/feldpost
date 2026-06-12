import type { Observable } from 'rxjs';
import {
  catchError,
  combineLatest,
  concat,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  from,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs';
import type {
  SearchAddressCandidate,
  SearchCandidate,
  SearchCommandCandidate,
  SearchCommitAction,
  SearchContentCandidate,
  SearchEngineOptions,
  SearchFilterChip,
  SearchOperatorPrefix,
  SearchOperatorSuggestionCandidate,
  SearchQueryContext,
  SearchRecentCandidate,
  SearchResultSet,
  SearchSection,
} from '../search.models';
import { DEFAULT_SEARCH_ENGINE_OPTIONS } from '../search.models';
import { buildFallbackQueries, normalizeSearchQuery } from '../search-query';
import { isInViewport } from '../search-bar-helpers';
import { parseSearchQuery, providerMatchesKeyword } from './search-operator';
import type { SearchProvider } from './search-provider.interface';

interface CachedResult {
  expiresAt: number;
  result: SearchResultSet;
}

const FALLBACK_CONFIDENCE_THRESHOLD = 0.7;
const FALLBACK_SCORE_IMPROVEMENT_MIN = 0.05;

const SLOW_PROVIDER_FAMILIES = new Set<SearchSection['family']>(['geocoder']);

export class SearchEngine {
  private readonly options: SearchEngineOptions;
  private readonly cache = new Map<string, CachedResult>();
  private readonly filterChips: SearchFilterChip[] = [];

  private constructor(
    private readonly providers: SearchProvider[],
    options?: Partial<SearchEngineOptions>,
  ) {
    this.options = { ...DEFAULT_SEARCH_ENGINE_OPTIONS, ...options };
  }

  static create(providers: SearchProvider[], options?: Partial<SearchEngineOptions>): SearchEngine {
    const sorted = [...providers].sort(
      (left, right) => (left.priority ?? 100) - (right.priority ?? 100),
    );
    return new SearchEngine(sorted, options);
  }

  getFilterChips(): SearchFilterChip[] {
    return [...this.filterChips];
  }

  searchInput(
    query$: Observable<string>,
    context$: Observable<SearchQueryContext>,
  ): Observable<SearchResultSet> {
    return combineLatest([query$, context$]).pipe(
      debounceTime(this.options.debounceMs),
      distinctUntilChanged(
        ([prevQuery, prevContext], [nextQuery, nextContext]) =>
          prevQuery === nextQuery && JSON.stringify(prevContext) === JSON.stringify(nextContext),
      ),
      switchMap(([query, context]) => this.searchSequence(query, context)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  searchOnce(query: string, context: SearchQueryContext): Observable<SearchResultSet> {
    return from(this.resolveSearchOnce(query, context));
  }

  commit(
    candidate: SearchCandidate,
    query: string,
    parsedQuery = parseSearchQuery(query),
  ): SearchCommitAction {
    if (candidate.family === 'operator-suggestion') {
      const suggestion = candidate as SearchOperatorSuggestionCandidate;
      return {
        type: 'recent-selected',
        query: `${suggestion.operator}${suggestion.keyword} `,
        label: `${suggestion.operator}${suggestion.keyword} `,
      };
    }

    if (candidate.family === 'db-address' || candidate.family === 'geocoder') {
      return {
        type: 'map-center',
        query,
        lat: candidate.lat,
        lng: candidate.lng,
      };
    }

    if (candidate.family === 'db-content') {
      const content = candidate as SearchContentCandidate;
      if (
        this.shouldCreateFilterChip(parsedQuery, content) &&
        content.contentType === 'project'
      ) {
        const chip = this.toggleFilterChip({
          providerId: 'projects',
          family: 'db-content',
          label: content.label,
          value: content.contentId,
        });
        return {
          type: 'filter-chip-toggle',
          query: '',
          chip,
          removed: !chip.active,
        };
      }

      return {
        type: 'open-content',
        query,
        contentType: content.contentType,
        contentId: content.contentId,
      };
    }

    if (candidate.family === 'command') {
      return {
        type: 'run-command',
        query,
        command: (candidate as SearchCommandCandidate).command,
        payload: (candidate as SearchCommandCandidate).payload,
      };
    }

    return {
      type: 'recent-selected',
      query,
      label: candidate.label,
    };
  }

  applySubtractiveOperator(
    parsedQuery: ParsedSearchQuery,
    context: SearchQueryContext,
  ): SearchFilterChip[] {
    if (parsedQuery.operator !== '-' || !parsedQuery.keyword) {
      return this.getFilterChips();
    }

    const providers = this.providers.filter((provider) =>
      providerMatchesKeyword(provider.keywords, parsedQuery.keyword!),
    );
    if (providers.length === 0) {
      return this.getFilterChips();
    }

    const term = parsedQuery.searchTerm.toLowerCase();
    for (const provider of providers) {
      if (!provider.chipCapable) continue;
      const index = this.filterChips.findIndex(
        (chip) =>
          chip.providerId === provider.id &&
          chip.active &&
          (term.length === 0 || chip.label.toLowerCase().includes(term)),
      );
      if (index >= 0) {
        this.filterChips.splice(index, 1);
      }
    }

    return this.getFilterChips();
  }

  private shouldCreateFilterChip(
    parsedQuery: ParsedSearchQuery,
    candidate: SearchContentCandidate,
  ): boolean {
    if (candidate.contentType !== 'project') return false;
    if (parsedQuery.operator === '#') return true;
    if (parsedQuery.operator === '+') return true;
    return false;
  }

  private toggleFilterChip(input: Omit<SearchFilterChip, 'id' | 'active'> & { active?: boolean }): SearchFilterChip {
    const existingIndex = this.filterChips.findIndex(
      (chip) => chip.providerId === input.providerId && chip.value === input.value,
    );

    if (existingIndex >= 0) {
      this.filterChips.splice(existingIndex, 1);
      return {
        id: `${input.providerId}-${input.value}`,
        providerId: input.providerId,
        family: input.family,
        label: input.label,
        value: input.value,
        active: false,
      };
    }

    const chip: SearchFilterChip = {
      id: `${input.providerId}-${input.value}`,
      providerId: input.providerId,
      family: input.family,
      label: input.label,
      value: input.value,
      active: true,
    };
    this.filterChips.push(chip);
    return chip;
  }

  private async resolveSearchOnce(query: string, context: SearchQueryContext): Promise<SearchResultSet> {
    const parsed = parseSearchQuery(query);
    const trimmedQuery = query.trim();

    if (parsed.operator === '-' && parsed.keyword) {
      this.applySubtractiveOperator(parsed, context);
      return {
        query,
        state: 'results-complete',
        sections: [],
        empty: true,
      };
    }

    if (parsed.isOperatorSuggestionMode && parsed.operator) {
      return this.buildOperatorSuggestionResult(query, parsed.operator, context);
    }

    if (!trimmedQuery) {
      return this.buildFocusedEmptyResultAsync(query, context);
    }

    const cacheKey = this.buildCacheKey(trimmedQuery, context, parsed);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const activeProviders = this.resolveActiveProviders(parsed);
    const searchTerm = parsed.searchTerm || trimmedQuery;
    const sections = this.deduplicateGeocoderNearDb(
      await this.fetchAllSections(searchTerm, context, activeProviders),
    );
    const result: SearchResultSet = {
      query,
      state: 'results-complete',
      sections,
      empty: sections.every((section) => section.items.length === 0),
    };

    this.cache.set(cacheKey, {
      result,
      expiresAt: Date.now() + this.options.cacheTtlMs,
    });

    return result;
  }

  private searchSequence(query: string, context: SearchQueryContext): Observable<SearchResultSet> {
    const parsed = parseSearchQuery(query);
    const trimmedQuery = query.trim();

    if (parsed.operator === '-' && parsed.keyword) {
      return of({
        query,
        state: 'results-complete' as const,
        sections: [],
        empty: true,
      }).pipe(tap(() => this.applySubtractiveOperator(parsed, context)));
    }

    if (parsed.isOperatorSuggestionMode && parsed.operator) {
      return of(this.buildOperatorSuggestionResult(query, parsed.operator, context));
    }

    if (!trimmedQuery) {
      return from(this.buildFocusedEmptyResultAsync(query, context));
    }

    const cacheKey = this.buildCacheKey(trimmedQuery, context, parsed);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.result);
    }

    const activeProviders = this.resolveActiveProviders(parsed);
    const searchTerm = parsed.searchTerm || trimmedQuery;
    const fastProviders = activeProviders.filter((provider) => !SLOW_PROVIDER_FAMILIES.has(provider.family));
    const slowProviders = activeProviders.filter((provider) => SLOW_PROVIDER_FAMILIES.has(provider.family));

    const typingResult: SearchResultSet = {
      query,
      state: 'typing',
      sections: this.buildSkeletonSections(activeProviders, searchTerm, context, {
        geocoderLoading: slowProviders.length > 0,
      }),
      empty: false,
    };

    const fast$ = this.fetchProviderSections(searchTerm, context, fastProviders).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    const slow$ = this.fetchProviderSections(searchTerm, context, slowProviders).pipe(
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    const partial$ = fast$.pipe(
      take(1),
      map((fastSections) => ({
        query,
        state: 'results-partial' as const,
        sections: this.mergeSectionSets(
          fastSections,
          this.buildSkeletonSections(slowProviders, searchTerm, context, { geocoderLoading: true }),
        ),
        empty: false,
      })),
    );

    const complete$ = combineLatest([fast$, slow$]).pipe(
      take(1),
      map(([fastSections, slowSections]) => {
        const merged = this.mergeSectionSets(fastSections, slowSections);
        const deduped = this.deduplicateGeocoderNearDb(merged);
        return {
          query,
          state: 'results-complete' as const,
          sections: deduped,
          empty: deduped.every((section) => section.items.length === 0),
        };
      }),
      switchMap((strictResult) => {
        if (!this.shouldRunFallback(searchTerm, strictResult)) {
          return of(strictResult);
        }

        return from(this.resolveBestFallbackResult(searchTerm, context, strictResult, parsed)).pipe(
          catchError(() => of(strictResult)),
        );
      }),
      tap((result) => {
        this.cache.set(cacheKey, {
          result,
          expiresAt: Date.now() + this.options.cacheTtlMs,
        });
      }),
    );

    return concat(of(typingResult), partial$, complete$);
  }

  private resolveActiveProviders(parsed: ParsedSearchQuery): SearchProvider[] {
    if (parsed.operator === '#' && parsed.keyword) {
      const exclusive = this.providers.filter((provider) =>
        providerMatchesKeyword(provider.keywords, parsed.keyword!),
      );
      if (exclusive.length > 0) {
        return exclusive;
      }
    }

    if ((parsed.operator === '+' || parsed.operator === '-') && parsed.keyword) {
      const targeted = this.providers.filter((provider) =>
        providerMatchesKeyword(provider.keywords, parsed.keyword!),
      );
      if (targeted.length > 0) {
        return targeted;
      }
    }

    return this.providers.filter((provider) => provider.family !== 'operator-suggestion');
  }

  private buildOperatorSuggestionResult(
    query: string,
    operator: SearchOperatorPrefix,
    context: SearchQueryContext,
  ): SearchResultSet {
    const items: SearchOperatorSuggestionCandidate[] = this.providers
      .filter((provider) => provider.keywords?.length && provider.operatorHints?.[operator])
      .map((provider) => {
        const keyword = provider.keywords![0];
        const hints = provider.operatorHints!;
        return {
          id: `operator-${operator}-${provider.id}`,
          family: 'operator-suggestion' as const,
          label: provider.sectionTitle,
          secondaryLabel: hints[operator],
          operator,
          keyword,
          providerId: provider.id,
          score: 1,
        };
      });

    return {
      query,
      state: 'results-partial',
      sections: [
        {
          family: 'operator-suggestion',
          title: operator === '#' ? 'Search by' : operator === '+' ? 'Add filter' : 'Remove filter',
          items,
        },
      ],
      empty: items.length === 0,
    };
  }

  private async buildFocusedEmptyResultAsync(
    query: string,
    context: SearchQueryContext,
  ): Promise<SearchResultSet> {
    const recentsProvider = this.providers.find((provider) => provider.family === 'recent');
    if (!recentsProvider) {
      return this.buildFocusedEmptyResult(query, context);
    }

    const items = await firstValueFrom(
      recentsProvider.search('', context).pipe(catchError(() => of([]))),
    );

    return {
      query,
      state: 'focused-empty',
      sections: [
        {
          family: 'recent',
          title: recentsProvider.sectionTitle,
          items,
        },
      ],
      empty: items.length === 0,
    };
  }

  private fetchProviderSections(
    query: string,
    context: SearchQueryContext,
    providers: SearchProvider[],
  ): Observable<SearchSection[]> {
    if (providers.length === 0) {
      return of([]);
    }

    const streams = providers.map((provider) =>
      provider.search(query, context).pipe(
        catchError(() => of([])),
        map((items) => this.buildProviderSection(provider, items, query, context)),
      ),
    );

    return combineLatest(streams);
  }

  private async fetchAllSections(
    query: string,
    context: SearchQueryContext,
    providers: SearchProvider[],
  ): Promise<SearchSection[]> {
    return firstValueFrom(this.fetchProviderSections(query, context, providers));
  }

  private buildProviderSection(
    provider: SearchProvider,
    items: SearchCandidate[],
    query: string,
    context: SearchQueryContext,
  ): SearchSection {
    const ranked = this.rankSectionItems(items, provider.family, context);
    const capped =
      provider.family === 'geocoder'
        ? ranked.slice(0, this.options.maxGeocoderSectionItems)
        : ranked;

    return {
      family: provider.family,
      title: provider.sectionTitle,
      items: capped,
    };
  }

  private buildSkeletonSections(
    providers: SearchProvider[],
    query: string,
    context: SearchQueryContext,
    options?: { geocoderLoading?: boolean },
  ): SearchSection[] {
    return providers.map((provider) => ({
      family: provider.family,
      title: provider.sectionTitle,
      items: [],
      loading: provider.family === 'geocoder' ? options?.geocoderLoading : false,
    }));
  }

  private mergeSectionSets(...sectionSets: SearchSection[][]): SearchSection[] {
    const merged = new Map<SearchSection['family'], SearchSection>();

    for (const sections of sectionSets) {
      for (const section of sections) {
        const existing = merged.get(section.family);
        if (!existing) {
          merged.set(section.family, { ...section, items: [...section.items] });
          continue;
        }

        merged.set(section.family, {
          ...section,
          items: section.items.length > 0 ? section.items : existing.items,
          loading: section.loading ?? existing.loading,
        });
      }
    }

    return [...merged.values()];
  }

  private rankSectionItems(
    items: SearchCandidate[],
    family: SearchSection['family'],
    context: SearchQueryContext,
  ): SearchCandidate[] {
    const ranked = [...items].sort((left, right) => {
      const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
      if (scoreDelta !== 0) return scoreDelta;

      if (family === 'db-address') {
        const countDelta =
          ((right as SearchAddressCandidate).imageCount ?? 0) -
          ((left as SearchAddressCandidate).imageCount ?? 0);
        if (countDelta !== 0) return countDelta;
      }

      const labelDelta = left.label.localeCompare(right.label);
      if (labelDelta !== 0) return labelDelta;
      return (left.stableId ?? left.id).localeCompare(right.stableId ?? right.id);
    });

    this.annotateCandidates(ranked, context, family);
    return ranked;
  }

  private annotateCandidates(
    candidates: SearchCandidate[],
    context: SearchQueryContext,
    family: SearchSection['family'],
  ): void {
    if (candidates.length === 0) return;

    const topScore = candidates[0]?.score ?? 0;
    const secondScore = candidates[1]?.score ?? 0;
    const topMargin = Math.max(0, topScore - secondScore);

    candidates.forEach((candidate, index) => {
      const candidateScore = candidate.score ?? 0;
      const confidenceLabel = this.toConfidenceLabel(candidateScore, index === 0 ? topMargin : 0);
      const explanationTags: string[] = [];

      if (
        (family === 'db-address' || family === 'geocoder') &&
        'lat' in candidate &&
        'lng' in candidate &&
        isInViewport(candidate as SearchAddressCandidate, context.viewportBounds)
      ) {
        explanationTags.push('In viewport');
      }

      if (family === 'db-address' && context.activeProjectId) {
        explanationTags.push('Near active project');
      }

      if (family === 'geocoder' && !context.viewportBounds && !context.countryCodes?.length) {
        explanationTags.push('Global fallback result');
      }

      candidate.totalScore = candidateScore;
      candidate.confidenceLabel = confidenceLabel;
      candidate.explanationTags = explanationTags;
      candidate.stableId = candidate.stableId ?? candidate.id;
    });
  }

  private deduplicateGeocoderNearDb(sections: SearchSection[]): SearchSection[] {
    const dbSection = sections.find((section) => section.family === 'db-address');
    const geocoderSection = sections.find((section) => section.family === 'geocoder');
    if (!dbSection || !geocoderSection) {
      return sections;
    }

    const dbAddresses = dbSection.items as SearchAddressCandidate[];
    const dedupedGeocoder = (geocoderSection.items as SearchAddressCandidate[]).filter(
      (geoCandidate) =>
        !dbAddresses.some((dbCandidate) => {
          const meters = this.haversineMeters(
            dbCandidate.lat,
            dbCandidate.lng,
            geoCandidate.lat,
            geoCandidate.lng,
          );
          return meters <= this.options.geocoderDedupMeters;
        }),
    );

    return sections.map((section) =>
      section.family === 'geocoder' ? { ...section, items: dedupedGeocoder } : section,
    );
  }

  private haversineMeters(
    leftLat: number,
    leftLng: number,
    rightLat: number,
    rightLng: number,
  ): number {
    const toRad = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6371000;

    const deltaLat = toRad(rightLat - leftLat);
    const deltaLng = toRad(rightLng - leftLng);
    const lat1 = toRad(leftLat);
    const lat2 = toRad(rightLat);

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  private buildCacheKey(
    query: string,
    context: SearchQueryContext,
    parsed: ParsedSearchQuery,
  ): string {
    return `${query}::${JSON.stringify({ context, parsed })}`;
  }

  private toConfidenceLabel(score: number, topMargin: number): 'high' | 'medium' | 'low' {
    if (score >= 0.78 && topMargin >= 0.08) return 'high';
    if (score >= 0.62 || topMargin >= 0.04) return 'medium';
    return 'low';
  }

  private topScore(result: SearchResultSet): number {
    const scores = result.sections
      .flatMap((section) => section.items)
      .map((item) => item.score ?? 0);
    if (scores.length === 0) return 0;
    return Math.max(...scores);
  }

  private shouldRunFallback(query: string, result: SearchResultSet): boolean {
    const trimmed = query.trim();
    if (trimmed.length < 3) return false;
    if (result.empty) return true;
    return this.topScore(result) < FALLBACK_CONFIDENCE_THRESHOLD;
  }

  private async resolveBestFallbackResult(
    query: string,
    context: SearchQueryContext,
    strictResult: SearchResultSet,
    parsed: ParsedSearchQuery,
  ): Promise<SearchResultSet> {
    const normalized = normalizeSearchQuery(query);
    const fallbackQueries = buildFallbackQueries(normalized);
    if (fallbackQueries.length === 0) return strictResult;

    let bestResult = strictResult;
    let bestScore = this.topScore(strictResult);

    for (const fallbackQuery of fallbackQueries) {
      const fallbackResult = await this.resolveSearchOnce(fallbackQuery, context);
      const fallbackScore = this.topScore(fallbackResult);
      if (fallbackScore > bestScore + FALLBACK_SCORE_IMPROVEMENT_MIN) {
        bestScore = fallbackScore;
        bestResult = {
          ...fallbackResult,
          query,
          sections: fallbackResult.sections.map((section) => ({
            ...section,
            items: section.items.map((item) => ({
              ...item,
              explanationTags: [
                ...(item.explanationTags ?? []),
                ...(item.explanationTags?.includes('Global fallback result')
                  ? []
                  : ['Global fallback result']),
              ],
            })),
          })),
        };
      }
    }

    return bestResult;
  }
}
