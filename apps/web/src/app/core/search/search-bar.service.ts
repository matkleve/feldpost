import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, of, tap } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import {
  GeocodingService,
  GeocoderSearchOptions,
  GeocoderSearchResult,
} from '../geocoding.service';
import {
  SearchAddressCandidate,
  SearchContentCandidate,
  SearchQueryContext,
  SearchRecentCandidate,
} from './search.models';
import { detectCoordinates, type DetectedCoordinates } from './coordinate-detection';
import { GhostTrie, type GhostTrieEntry } from './ghost-trie';
import {
  computeTextMatchScore,
  formatGeocoderAddressLabel,
  formatDbAddressLabel,
  normalizeSearchQuery,
  buildFallbackQueries,
  toNumber,
} from './search-query';
import {
  clamp01,
  computeGeocoderTextScore,
  computeGeocoderWeightedScore,
  computeShortPrefixNoisePenalty,
  isCandidateInViewport,
} from './search-geocoder-scoring';
import { logGeocoderDiagnostics, logSearchEvent } from './search-debug';
import { fetchDbContentCandidates, fetchGeocoderCandidates } from './search-bar-resolvers';
import {
  AddressGroup,
  StoredRecentSearch,
  buildCityPart,
  compareRecents,
  computeCountryBoost,
  computeProximityDecay,
  computeRecencyDecay,
  normalizeStreetPart,
  sanitizeRecentLabel,
  toSizeSignal,
} from './search-bar-helpers';

export type { DetectedCoordinates } from './coordinate-detection';
export type { GhostTrieEntry } from './ghost-trie';

const RECENT_SEARCHES_STORAGE_KEY = 'feldpost-recent-searches';
const MAX_RECENT_SEARCHES = 20;
const MAX_DB_ADDRESS_ROWS = 24;
const MAX_DB_ADDRESS_RESULTS = 5;
const MAX_DB_CONTENT_RESULTS = 6;
const MAX_GEOCODER_RESULTS = 3;
const CONTEXT_CITY_CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_CITY_HINT_STEM_LENGTH = 3;
const MAX_CITY_HINT_STEMS = 4;

interface DbAddressRow {
  id: string;
  address_label: string | null;
  street: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: string | null;
}

interface DbContentRow {
  id: string;
  name: string | null;
}

@Injectable({ providedIn: 'root' })
export class SearchBarService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly geocodingService = inject(GeocodingService);

  private readonly ghostTrie = new GhostTrie();
  private readonly contextCityCache = new Map<
    string,
    { value: string | null; expiresAt: number }
  >();

  detectCoordinates(input: string): DetectedCoordinates | null {
    return detectCoordinates(input);
  }

  buildGhostTrie(entries: GhostTrieEntry[]): void {
    this.ghostTrie.build(entries);
  }

  queryGhostCompletion(input: string): string | null {
    return this.ghostTrie.query(input);
  }

  loadRecentSearches(): SearchRecentCandidate[] {
    const storage = this.getStorage();
    if (!storage) return [];

    try {
      const raw = storage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];

      const recents = parsed
        .filter(
          (item): item is StoredRecentSearch =>
            typeof item === 'object' &&
            item !== null &&
            'label' in item &&
            typeof item.label === 'string',
        )
        .map((item) => ({
          id: `recent-${item.label.trim().toLowerCase()}`,
          family: 'recent' as const,
          label: sanitizeRecentLabel(item.label),
          lastUsedAt:
            typeof item.lastUsedAt === 'string' ? item.lastUsedAt : new Date(0).toISOString(),
          projectId: typeof item.projectId === 'string' ? item.projectId : undefined,
          usageCount: Math.max(1, Number(item.usageCount) || 1),
        }))
        .filter((item) => item.label.length > 0)
        .slice(0, MAX_RECENT_SEARCHES);

      return recents;
    } catch {
      return [];
    }
  }

  addRecentSearch(
    label: string,
    projectId?: string,
    existingRecents?: SearchRecentCandidate[],
  ): SearchRecentCandidate[] {
    const normalizedLabel = label.trim();
    if (!normalizedLabel) return existingRecents ?? [];

    const now = new Date().toISOString();
    const recents = existingRecents ?? this.loadRecentSearches();
    const existing = recents.find(
      (entry) => entry.label.toLowerCase() === normalizedLabel.toLowerCase(),
    );

    const item: SearchRecentCandidate = {
      id: `recent-${normalizedLabel.toLowerCase()}`,
      family: 'recent',
      label: normalizedLabel,
      lastUsedAt: now,
      projectId,
      usageCount: Math.max(1, existing?.usageCount ?? 0) + (existing ? 1 : 0),
    };

    const next = [
      item,
      ...recents.filter((entry) => entry.label.toLowerCase() !== normalizedLabel.toLowerCase()),
    ]
      .sort((left, right) => compareRecents(left, right, projectId))
      .slice(0, MAX_RECENT_SEARCHES);

    this.persistRecentSearches(next);
    return next;
  }

  getRecentSearches(
    limit: number,
    activeProjectId?: string,
    recents?: SearchRecentCandidate[],
  ): SearchRecentCandidate[] {
    const all = recents ?? this.loadRecentSearches();
    return [...all]
      .sort((left, right) => compareRecents(left, right, activeProjectId))
      .slice(0, limit);
  }

  resolveDbAddresses(
    query: string,
    context: SearchQueryContext,
  ): Observable<SearchAddressCandidate[]> {
    return this.resolveDbAddressCandidates(query, context);
  }

  resolveDbAddressCandidates(
    query: string,
    context: SearchQueryContext,
  ): Observable<SearchAddressCandidate[]> {
    return from(this.fetchDbAddressCandidates(query, context)).pipe(catchError(() => of([])));
  }

  resolveDbContent(
    query: string,
    context: SearchQueryContext,
  ): Observable<SearchContentCandidate[]> {
    return this.resolveDbContentCandidates(query, context);
  }

  resolveDbContentCandidates(
    query: string,
    context: SearchQueryContext,
  ): Observable<SearchContentCandidate[]> {
    return from(this.fetchDbContentCandidates(query, context)).pipe(catchError(() => of([])));
  }

  resolveGeocoder(
    query: string,
    context: SearchQueryContext,
  ): Observable<SearchAddressCandidate[]> {
    return this.resolveGeocoderCandidates(query, context);
  }

  resolveGeocoderCandidates(
    query: string,
    context: SearchQueryContext,
  ): Observable<SearchAddressCandidate[]> {
    const normalizedQuery = this.normalizeSearchQuery(query);
    if (!normalizedQuery) return of([]);

    logSearchEvent('geocoder-query', {
      query,
      normalizedQuery,
      context: {
        countryCodes: context.countryCodes,
        viewportBounds: context.viewportBounds,
        activeProjectCentroid: context.activeProjectCentroid,
        activeMarkerCentroid: context.activeMarkerCentroid,
        currentLocation: context.currentLocation,
      },
    });

    return from(this.fetchGeocoderCandidatesWithCityHint(normalizedQuery, context)).pipe(
      catchError((error) => {
        logSearchEvent('geocoder-error', {
          query,
          normalizedQuery,
          message: error instanceof Error ? error.message : String(error),
        });
        return of([]);
      }),
      tap((results) => logGeocoderDiagnostics(query, normalizedQuery, context, results)),
    );
  }

  formatAddressLabel = formatGeocoderAddressLabel;
  normalizeSearchQuery = normalizeSearchQuery;

  buildFallbackQueries = buildFallbackQueries;

  private async fetchDbAddressCandidates(
    query: string,
    context: SearchQueryContext,
  ): Promise<SearchAddressCandidate[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    let request = this.supabaseService.client
      .from('media_items')
      .select(
        'id,address_label,street,city,latitude,longitude,created_at',
      )
      .ilike('address_label', `*${trimmedQuery}*`)
      .not('address_label', 'is', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(MAX_DB_ADDRESS_ROWS);

    if (context.organizationId) {
      request = request.eq('organization_id', context.organizationId);
    }

    const response = await request;

    if (response.error) {
      logSearchEvent('db-address-error', {
        query: trimmedQuery,
        context: {
          organizationId: context.organizationId,
          activeProjectId: context.activeProjectId,
        },
        error: this.describeDbAddressError(response.error),
      });
      return [];
    }

    if (!Array.isArray(response.data)) return [];

    const grouped = this.groupAddressRows(response.data as DbAddressRow[], trimmedQuery, context);
    return this.rankedAddressCandidates(grouped, context);
  }

  private groupAddressRows(
    rows: DbAddressRow[],
    trimmedQuery: string,
    context: SearchQueryContext,
  ): Map<string, AddressGroup> {
    const grouped = new Map<string, AddressGroup>();

    for (const row of rows) {
      const rawLabel = row.address_label?.trim();
      const lat = toNumber(row.latitude);
      const lng = toNumber(row.longitude);
      if (!rawLabel || lat === null || lng === null) continue;

      const label = formatDbAddressLabel(
        rawLabel,
        normalizeStreetPart(row.street),
        buildCityPart(null, row.city),
      );
      const key = label.toLowerCase();
      const textMatch = computeTextMatchScore(label, trimmedQuery);
      const createdAtMs = row.created_at ? Date.parse(row.created_at) : 0;
      const activeProjectHit = 0;

      const existing = grouped.get(key);
      if (existing) {
        existing.ids.push(row.id);
        existing.latTotal += lat;
        existing.lngTotal += lng;
        existing.count += 1;
        existing.activeProjectHits += activeProjectHit;
        existing.latestCreatedAtMs = Math.max(existing.latestCreatedAtMs, createdAtMs);
        existing.score = Math.max(existing.score, textMatch);
        continue;
      }

      grouped.set(key, {
        label,
        ids: [row.id],
        latTotal: lat,
        lngTotal: lng,
        count: 1,
        activeProjectHits: activeProjectHit,
        latestCreatedAtMs: createdAtMs,
        score: textMatch,
      });
    }

    return grouped;
  }

  private rankedAddressCandidates(
    grouped: Map<string, AddressGroup>,
    context: SearchQueryContext,
  ): SearchAddressCandidate[] {
    for (const entry of grouped.values()) {
      const projectBoost =
        context.activeProjectId && entry.activeProjectHits > 0
          ? 1 + entry.activeProjectHits / Math.max(1, entry.count)
          : 1;
      const dataGravity = Math.log2(entry.count + 1);
      const recencyDecay = computeRecencyDecay(entry.latestCreatedAtMs);
      entry.score = entry.score * projectBoost * dataGravity * recencyDecay;
    }

    return [...grouped.values()]
      .sort((left, right) => {
        const scoreDelta = right.score - left.score;
        if (scoreDelta !== 0) return scoreDelta;
        const countDelta = right.count - left.count;
        if (countDelta !== 0) return countDelta;
        const labelDelta = left.label.localeCompare(right.label);
        if (labelDelta !== 0) return labelDelta;
        return (left.ids[0] ?? '').localeCompare(right.ids[0] ?? '');
      })
      .slice(0, MAX_DB_ADDRESS_RESULTS)
      .map((entry, index) => ({
        id: entry.ids[0] ?? `db-address-${index}`,
        stableId: entry.ids[0] ?? `db-address-${index}`,
        family: 'db-address' as const,
        label: entry.label,
        lat: entry.latTotal / entry.count,
        lng: entry.lngTotal / entry.count,
        imageCount: entry.count,
        score: entry.score,
      }));
  }

  private async fetchDbContentCandidates(
    query: string,
    context: SearchQueryContext,
  ): Promise<SearchContentCandidate[]> {
    return fetchDbContentCandidates(this.supabaseService, query, context, MAX_DB_CONTENT_RESULTS);
  }

  private async fetchGeocoderCandidates(
    normalizedQuery: string,
    context: SearchQueryContext,
  ): Promise<SearchAddressCandidate[]> {
    return fetchGeocoderCandidates(
      this.geocodingService,
      normalizedQuery,
      context,
      MAX_GEOCODER_RESULTS,
      (result, query, index, candidateContext) =>
        this.toGeocoderCandidate(result, query, index, candidateContext),
    );
  }

  private async fetchGeocoderCandidatesWithCityHint(
    normalizedQuery: string,
    context: SearchQueryContext,
  ): Promise<SearchAddressCandidate[]> {
    const strictCandidates = await this.fetchGeocoderCandidates(normalizedQuery, context);

    if (strictCandidates.length > 0) {
      return strictCandidates;
    }

    if (normalizedQuery.length < 4 || normalizedQuery.includes(' ')) {
      return strictCandidates;
    }

    const cityHint = await this.resolveContextCityHint(context);
    if (!cityHint) {
      return strictCandidates;
    }

    const hintedQueries = this.buildCityHintQueries(normalizedQuery, cityHint);

    for (const hintedQuery of hintedQueries) {
      const hintedCandidates = await this.fetchGeocoderCandidates(hintedQuery, context);
      const refinedCandidates = hintedCandidates.filter((candidate) =>
        this.matchesOriginalPrefix(candidate.label, normalizedQuery),
      );

      if (refinedCandidates.length === 0) {
        continue;
      }

      logSearchEvent('geocoder-city-hint-retry', {
        query: normalizedQuery,
        cityHint,
        hintedQuery,
        count: refinedCandidates.length,
      });

      return refinedCandidates.map((candidate, index) => ({
        ...candidate,
        id: `geo-${normalizedQuery}-cityhint-${index}`,
        stableId:
          candidate.stableId ??
          `geo-${candidate.lat.toFixed(6)}-${candidate.lng.toFixed(6)}-cityhint-${index}`,
      }));
    }

    return strictCandidates;
  }

  private buildCityHintQueries(normalizedQuery: string, cityHint: string): string[] {
    const normalizedCityHint = normalizeSearchQuery(cityHint);
    if (!normalizedCityHint) {
      return [];
    }

    const aliases = this.cityHintAliases(normalizedCityHint);
    const stems = this.buildCityHintStems(normalizedQuery);
    const queries = new Set<string>();

    for (const stem of stems) {
      for (const hint of aliases) {
        const hintedQuery = normalizeSearchQuery(`${stem} ${hint}`);
        if (hintedQuery && hintedQuery !== normalizedQuery) {
          queries.add(hintedQuery);
        }
      }
    }

    return [...queries];
  }

  private buildCityHintStems(normalizedQuery: string): string[] {
    const stems = new Set<string>();
    if (!normalizedQuery || normalizedQuery.includes(' ')) {
      stems.add(normalizedQuery);
      return [...stems];
    }

    stems.add(normalizedQuery);

    let current = normalizedQuery;
    while (current.length > MIN_CITY_HINT_STEM_LENGTH && stems.size < MAX_CITY_HINT_STEMS) {
      current = current.slice(0, -1);
      if (current.length >= MIN_CITY_HINT_STEM_LENGTH) {
        stems.add(current);
      }
    }

    return [...stems];
  }

  private matchesOriginalPrefix(label: string, normalizedQuery: string): boolean {
    const normalizedLabel = normalizeSearchQuery(label);
    if (!normalizedLabel || !normalizedQuery) {
      return false;
    }

    if (normalizedLabel.includes(normalizedQuery)) {
      return true;
    }

    const parts = normalizedLabel.split(/\s+/).filter(Boolean);
    return parts.some((part) => part.startsWith(normalizedQuery));
  }

  private cityHintAliases(cityHint: string): string[] {
    const aliases = new Set<string>([cityHint]);

    if (cityHint === 'vienna') aliases.add('wien');
    if (cityHint === 'wien') aliases.add('vienna');

    return [...aliases];
  }

  private async resolveContextCityHint(context: SearchQueryContext): Promise<string | null> {
    const coordinateSource =
      context.currentLocation ?? context.activeProjectCentroid ?? context.activeMarkerCentroid;
    if (!coordinateSource) {
      return null;
    }

    const cacheKey = `${coordinateSource.lat.toFixed(2)},${coordinateSource.lng.toFixed(2)}`;
    const cached = this.contextCityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const reverse = await this.geocodingService.reverse(coordinateSource.lat, coordinateSource.lng);
    const cityHint = reverse?.city?.trim() || null;

    this.contextCityCache.set(cacheKey, {
      value: cityHint,
      expiresAt: Date.now() + CONTEXT_CITY_CACHE_TTL_MS,
    });

    return cityHint;
  }

  private toGeocoderCandidate(
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ): SearchAddressCandidate {
    const formatted = this.formatAddressLabel(result);
    const primaryLabel = this.selectGeocoderPrimaryLabel(result, formatted, query);
    const secondaryLabel = primaryLabel !== formatted ? formatted : undefined;
    const textScore = computeGeocoderTextScore(primaryLabel, formatted, query);
    const geoScore = computeProximityDecay(result.lat, result.lng, context);
    const countryBoost = computeCountryBoost(result, context.countryCodes);
    const countryScore = countryBoost > 1 ? 1 : countryBoost < 1 ? 0 : 0.5;
    const qualityScore = clamp01(result.importance || 0);

    const inViewport = isCandidateInViewport(primaryLabel, result.lat, result.lng, context);
    const noisePenalty = computeShortPrefixNoisePenalty(
      query,
      textScore,
      inViewport,
      countryBoost,
      geoScore,
      primaryLabel,
    );
    const weightedScore = computeGeocoderWeightedScore(
      query,
      textScore,
      geoScore,
      qualityScore,
      countryScore,
      noisePenalty,
    );
    const score = clamp01(weightedScore);

    return {
      id: `geo-${query}-${index}`,
      stableId: `geo-${result.lat.toFixed(6)}-${result.lng.toFixed(6)}-${index}`,
      family: 'geocoder',
      label: primaryLabel,
      secondaryLabel,
      lat: result.lat,
      lng: result.lng,
      textScore,
      geoScore,
      qualityScore,
      noisePenalty,
      score,
    };
  }

  private selectGeocoderPrimaryLabel(
    result: GeocoderSearchResult,
    formatted: string,
    query: string,
  ): string {
    const candidates = [result.address?.road, result.name, formatted]
      .map((value) => value?.trim() ?? '')
      .filter((value, idx, all) => value.length > 0 && all.indexOf(value) === idx);

    if (candidates.length === 0) return formatted;

    const best = candidates
      .map((label) => ({
        label,
        score: computeGeocoderTextScore(label, formatted, query),
      }))
      .sort((left, right) => right.score - left.score || left.label.length - right.label.length)[0];

    return best?.label ?? formatted;
  }

  private persistRecentSearches(recents: SearchRecentCandidate[]): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      const serializable: StoredRecentSearch[] = recents.map((entry) => ({
        label: entry.label,
        lastUsedAt: entry.lastUsedAt,
        projectId: entry.projectId,
        usageCount: Math.max(1, entry.usageCount ?? 1),
      }));
      storage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore storage failures — keep in-memory recents.
    }
  }

  private getStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }

  private describeDbAddressError(error: unknown): {
    code: string | null;
    message: string;
    details: string | null;
    hint: string | null;
    status: number | null;
  } {
    const candidate =
      typeof error === 'object' && error !== null
        ? (error as {
            code?: unknown;
            message?: unknown;
            details?: unknown;
            hint?: unknown;
            status?: unknown;
          })
        : null;

    return {
      code: typeof candidate?.code === 'string' ? candidate.code : null,
      message:
        typeof candidate?.message === 'string' ? candidate.message.slice(0, 300) : String(error),
      details: typeof candidate?.details === 'string' ? candidate.details.slice(0, 300) : null,
      hint: typeof candidate?.hint === 'string' ? candidate.hint.slice(0, 300) : null,
      status: typeof candidate?.status === 'number' ? candidate.status : null,
    };
  }
}
