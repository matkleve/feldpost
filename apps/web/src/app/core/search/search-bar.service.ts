import { Injectable, inject } from '@angular/core';
import type { Observable} from 'rxjs';
import { catchError, from, of, tap } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  ForwardGeocodeResult,
  GeocoderSearchResult,
} from '../geocoding/geocoding.service';
import {
  GeocodingService
} from '../geocoding/geocoding.service';
import { MediaClusterService } from '../geocoding/media-cluster.service';
import {
  formatGeocoderPickerLines,
  formatLocationPickerLines,
} from '../media-locations/media-locations.helpers';
import type {
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
  isSpecificStreetQuery,
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
import {
  fetchDbContentCandidates,
  fetchGeocoderCandidates,
  NOMINATIM_FETCH_LIMIT,
  processGeocoderSearchResults,
  searchContextFromClusterViewbox,
} from './search-bar-resolvers';
import { OrgSearchTuningService } from './org-search-tuning.service';
import type { SearchOrchestratorOptions } from './search.models';
import type {
  AddressGroup,
  StoredRecentSearch} from './search-bar-helpers';
import {
  buildCityPart,
  compareRecents,
  computeCountryBoost,
  computeProximityDecay,
  computeRecencyDecay,
  normalizeStreetPart,
  sanitizeRecentLabel,
} from './search-bar-helpers';

export type { DetectedCoordinates } from './coordinate-detection';
export type { GhostTrieEntry } from './ghost-trie';

const RECENT_SEARCHES_STORAGE_KEY = 'feldpost-recent-searches';
const MAX_RECENT_SEARCHES = 20;
const MAX_DB_ADDRESS_ROWS = 24;
const CONTEXT_CITY_CACHE_TTL_MS = 10 * 60 * 1000;

interface DbAddressRow {
  media_item_id: string;
  address_label: string | null;
  street: string | null;
  house_number?: string | null;
  staircase?: string | null;
  door?: string | null;
  postcode?: string | null;
  city: string | null;
  district?: string | null;
  country?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  created_at: string | null;
  locations?: {
    address_label: string | null;
    street: string | null;
    house_number?: string | null;
    staircase?: string | null;
    door?: string | null;
    postcode?: string | null;
    city: string | null;
    district?: string | null;
    country?: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
  } | Array<{
    address_label: string | null;
    street: string | null;
    house_number?: string | null;
    staircase?: string | null;
    door?: string | null;
    postcode?: string | null;
    city: string | null;
    district?: string | null;
    country?: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
  }>;
  media_items?: { created_at: string | null } | Array<{ created_at: string | null }>;
}

interface MediaItemAddressRow {
  address_label: string | null;
  street: string | null;
  house_number?: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  postcode?: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

@Injectable({ providedIn: 'root' })
export class SearchBarService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);
  private readonly mediaClusterService = inject(MediaClusterService);

  orchestratorOptionsFromOrg(): SearchOrchestratorOptions {
    const orchestrator = this.orgSearchTuning.orgSearchConfig().orchestrator;
    return {
      debounceMs: orchestrator.debounceMs,
      cacheTtlMs: orchestrator.cacheTtlMs,
      recentMaxItems: orchestrator.recentMaxItems,
      geocoderDedupMeters: orchestrator.geocoderDedupMeters,
    };
  }

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

  async resolveForwardGeocodeFromAddressCandidate(
    candidate: SearchAddressCandidate,
  ): Promise<ForwardGeocodeResult> {
    if (candidate.family === 'db-address') {
      return this.resolveDbAddressForwardGeocode(candidate);
    }
    return this.resolveGeocoderForwardGeocode(candidate);
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
      .from('media_item_location_links')
      .select(
        'media_item_id, locations!inner(address_label, street, city, latitude, longitude), media_items!inner(created_at, organization_id)',
      )
      .ilike('locations.address_label', `%${trimmedQuery}%`)
      .not('locations.latitude', 'is', null)
      .not('locations.longitude', 'is', null)
      .limit(MAX_DB_ADDRESS_ROWS);

    if (context.organizationId) {
      request = request.eq('media_items.organization_id', context.organizationId);
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

    const grouped = this.groupAddressRows(response.data as unknown as DbAddressRow[], trimmedQuery);
    return this.rankedAddressCandidates(grouped, context);
  }

  private groupAddressRows(
    rows: DbAddressRow[],
    trimmedQuery: string,
  ): Map<string, AddressGroup> {
    const grouped = new Map<string, AddressGroup>();

    for (const row of rows) {
      const locRaw = row.locations;
      const loc = Array.isArray(locRaw) ? locRaw[0] : locRaw;
      const mediaRaw = row.media_items;
      const media = Array.isArray(mediaRaw) ? mediaRaw[0] : mediaRaw;
      const mediaId = row.media_item_id;
      const rawLabel = (loc?.address_label ?? row.address_label)?.trim();
      const lat = toNumber(loc?.latitude ?? row.latitude);
      const lng = toNumber(loc?.longitude ?? row.longitude);
      if (!rawLabel || lat === null || lng === null || !mediaId) continue;

      const label = formatDbAddressLabel(
        rawLabel,
        normalizeStreetPart(loc?.street ?? row.street),
        buildCityPart(null, loc?.city ?? row.city),
      );
      const key = label.toLowerCase();
      const textMatch = computeTextMatchScore(label, trimmedQuery);
      const createdAtMs = media?.created_at ? Date.parse(media.created_at) : row.created_at ? Date.parse(row.created_at) : 0;
      const activeProjectHit = 0;

      const pickerSnapshot = {
        street: loc?.street ?? row.street ?? null,
        house_number: loc?.house_number ?? row.house_number ?? null,
        staircase: loc?.staircase ?? row.staircase ?? null,
        door: loc?.door ?? row.door ?? null,
        postcode: loc?.postcode ?? row.postcode ?? null,
        city: loc?.city ?? row.city ?? null,
        district: loc?.district ?? row.district ?? null,
        country: loc?.country ?? row.country ?? null,
        address_label: rawLabel,
      };

      const existing = grouped.get(key);
      if (existing) {
        existing.ids.push(mediaId);
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
        ids: [mediaId],
        latTotal: lat,
        lngTotal: lng,
        count: 1,
        activeProjectHits: activeProjectHit,
        latestCreatedAtMs: createdAtMs,
        score: textMatch,
        pickerSnapshot,
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
      .slice(0, this.orgSearchTuning.orgSearchConfig().resolver.maxDbAddressResults)
      .map((entry, index) => {
        const pickerLines = formatLocationPickerLines(entry.pickerSnapshot, 'Top');
        return {
          id: entry.ids[0] ?? `db-address-${index}`,
          stableId: entry.ids[0] ?? `db-address-${index}`,
          family: 'db-address' as const,
          label: pickerLines.primary,
          secondaryLabel: pickerLines.secondary || undefined,
          lat: entry.latTotal / entry.count,
          lng: entry.lngTotal / entry.count,
          imageCount: entry.count,
          score: entry.score,
        };
      });
  }

  private async fetchDbContentCandidates(
    query: string,
    context: SearchQueryContext,
  ): Promise<SearchContentCandidate[]> {
    return fetchDbContentCandidates(
      this.supabaseService,
      query,
      context,
      this.orgSearchTuning.orgSearchConfig().resolver.maxDbContentResults,
    );
  }

  private async fetchGeocoderCandidates(
    normalizedQuery: string,
    context: SearchQueryContext,
  ): Promise<SearchAddressCandidate[]> {
    const tuning = this.orgSearchTuning.orgSearchConfig();
    const toCandidate = (
      result: GeocoderSearchResult,
      query: string,
      index: number,
      candidateContext: SearchQueryContext,
    ) => this.toGeocoderCandidate(result, query, index, candidateContext);

    await this.mediaClusterService.ensureLoaded();
    const clusters = this.mediaClusterService.clusters();
    if (clusters.length === 0) {
      return fetchGeocoderCandidates(
        this.geocodingService,
        normalizedQuery,
        context,
        tuning.resolver.maxGeocoderResults,
        toCandidate,
        tuning,
      );
    }

    const baseContext: SearchQueryContext = { ...context, viewportBounds: undefined };

    if (clusters.length === 1) {
      return fetchGeocoderCandidates(
        this.geocodingService,
        normalizedQuery,
        searchContextFromClusterViewbox(baseContext, clusters[0].viewbox),
        tuning.resolver.maxGeocoderResults,
        toCandidate,
        tuning,
      );
    }

    const perCluster = await Promise.all(
      clusters.map((cluster) =>
        fetchGeocoderCandidates(
          this.geocodingService,
          normalizedQuery,
          searchContextFromClusterViewbox(baseContext, cluster.viewbox),
          tuning.resolver.maxGeocoderResults,
          toCandidate,
          tuning,
        ),
      ),
    );

    let merged: SearchAddressCandidate[] = [];
    for (const candidates of perCluster) {
      merged = this.mergeGeocoderCandidateSets(merged, candidates);
    }
    return merged.slice(0, tuning.resolver.maxGeocoderResults);
  }

  private async fetchGeocoderCandidatesWithCityHint(
    normalizedQuery: string,
    context: SearchQueryContext,
  ): Promise<SearchAddressCandidate[]> {
    if (!(await this.geocodingService.ensureGeocodeAvailable())) {
      return [];
    }

    const strictCandidates = await this.fetchGeocoderCandidates(normalizedQuery, context);
    const maxResults = this.orgSearchTuning.orgSearchConfig().resolver.maxGeocoderResults;

    if (strictCandidates.length > 0) {
      const needsRicherLabels = strictCandidates.some((candidate) => !candidate.label.includes(','));
      if (!needsRicherLabels) {
        return strictCandidates;
      }

      const cityHint = await this.resolveContextCityHint(context);
      if (!cityHint) {
        return strictCandidates;
      }

      const refinedCandidates = await this.fetchCityHintedGeocoderCandidates(
        normalizedQuery,
        context,
        cityHint,
        { requireCommaInLabel: true },
      );
      if (refinedCandidates.length > 0) {
        logSearchEvent('geocoder-city-hint-enrich', {
          query: normalizedQuery,
          cityHint,
          count: refinedCandidates.length,
        });
        return this.mergeGeocoderCandidateSets(strictCandidates, refinedCandidates).slice(
          0,
          maxResults,
        );
      }

      return strictCandidates;
    }

    if (normalizedQuery.length < 4 || normalizedQuery.includes(' ')) {
      return strictCandidates;
    }

    const cityHint = await this.resolveContextCityHint(context);
    if (!cityHint) {
      return strictCandidates;
    }

    const refinedCandidates = await this.fetchCityHintedGeocoderCandidates(
      normalizedQuery,
      context,
      cityHint,
      { requireCommaInLabel: false },
    );

    if (refinedCandidates.length === 0) {
      return strictCandidates;
    }

    logSearchEvent('geocoder-city-hint-retry', {
      query: normalizedQuery,
      cityHint,
      count: refinedCandidates.length,
    });

    return refinedCandidates
      .map((candidate, index) => ({
        ...candidate,
        id: `geo-${normalizedQuery}-cityhint-${index}`,
        stableId:
          candidate.stableId ??
          `geo-${candidate.lat.toFixed(6)}-${candidate.lng.toFixed(6)}-cityhint-${index}`,
      }))
      .slice(0, maxResults);
  }

  private async fetchCityHintedGeocoderCandidates(
    normalizedQuery: string,
    context: SearchQueryContext,
    cityHint: string,
    options: { requireCommaInLabel: boolean },
  ): Promise<SearchAddressCandidate[]> {
    const tuning = this.orgSearchTuning.orgSearchConfig();
    const toCandidate = (
      result: GeocoderSearchResult,
      query: string,
      index: number,
      candidateContext: SearchQueryContext,
    ) => this.toGeocoderCandidate(result, query, index, candidateContext);

    if (isSpecificStreetQuery(normalizedQuery, tuning.query.specificStreetMinLength)) {
      const structuredResults = await this.geocodingService.searchStructured(
        normalizedQuery,
        cityHint,
        {
          limit: NOMINATIM_FETCH_LIMIT,
          countrycodes: context.countryCodes,
        },
      );
      if (structuredResults.length > 0) {
        const structuredCandidates = await processGeocoderSearchResults(
          this.geocodingService,
          structuredResults,
          normalizedQuery,
          context,
          tuning.resolver.maxGeocoderResults,
          toCandidate,
          tuning,
        );
        const refinedStructured = structuredCandidates.filter(
          (candidate) =>
            this.matchesOriginalPrefix(candidate.label, normalizedQuery) &&
            (!options.requireCommaInLabel || candidate.label.includes(',')),
        );
        if (refinedStructured.length > 0) {
          logSearchEvent('geocoder-city-hint-structured', {
            query: normalizedQuery,
            cityHint,
            count: refinedStructured.length,
          });
          return refinedStructured;
        }
      }
    }

    const enrichedQuery = normalizeSearchQuery(`${normalizedQuery} ${cityHint}`);
    if (!enrichedQuery) {
      return [];
    }

    const hintedCandidates = await this.fetchGeocoderCandidates(enrichedQuery, context);
    return hintedCandidates.filter(
      (candidate) =>
        this.matchesOriginalPrefix(candidate.label, normalizedQuery) &&
        (!options.requireCommaInLabel || candidate.label.includes(',')),
    );
  }

  private mergeGeocoderCandidateSets(
    primary: SearchAddressCandidate[],
    enriched: SearchAddressCandidate[],
  ): SearchAddressCandidate[] {
    const merged = new Map<string, SearchAddressCandidate>();
    for (const candidate of [...enriched, ...primary]) {
      const key = `${candidate.label.toLowerCase()}::${candidate.lat.toFixed(5)}::${candidate.lng.toFixed(5)}`;
      const existing = merged.get(key);
      const prefer =
        !existing ||
        (candidate.label.includes(',') && !existing.label.includes(',')) ||
        (candidate.score ?? 0) > (existing.score ?? 0);
      if (prefer) {
        merged.set(key, candidate);
      }
    }
    return [...merged.values()];
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
    const pickerLines = formatGeocoderPickerLines(result, 'Top');
    const secondaryLabel = pickerLines.secondary || undefined;
    const textScore = computeGeocoderTextScore(primaryLabel, formatted, query);
    const geoScore = computeProximityDecay(result.lat, result.lng, context);
    const countryBoost = computeCountryBoost(result, context.countryCodes);
    const countryScore = countryBoost > 1 ? 1 : countryBoost < 1 ? 0 : 0.5;
    const qualityScore = clamp01(result.importance || 0);

    const inViewport = isCandidateInViewport(primaryLabel, result.lat, result.lng, context);
    const scoring = this.orgSearchTuning.orgSearchConfig().scoring;
    const noisePenalty = computeShortPrefixNoisePenalty(
      query,
      textScore,
      inViewport,
      countryBoost,
      geoScore,
      primaryLabel,
      scoring,
    );
    const weightedScore = computeGeocoderWeightedScore(
      query,
      textScore,
      geoScore,
      qualityScore,
      countryScore,
      noisePenalty,
      scoring,
    );
    const score = clamp01(weightedScore);

    return {
      id: `geo-${query}-${index}`,
      stableId: `geo-${result.lat.toFixed(6)}-${result.lng.toFixed(6)}-${index}`,
      family: 'geocoder',
      label: primaryLabel,
      secondaryLabel: pickerLines.secondary || secondaryLabel,
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
    const name = result.name?.trim() ?? '';
    const road = result.address?.road?.trim() ?? '';

    if (name.length > 0) {
      const nameScore = computeGeocoderTextScore(name, formatted, query);
      const formattedScore = computeGeocoderTextScore(formatted, formatted, query);
      const roadScore = computeGeocoderTextScore(road, formatted, query);
      if (nameScore > formattedScore + 0.05 && nameScore >= roadScore) {
        return name;
      }
    }

    if (road.length > 0 && formatted.length > 0) {
      return formatted;
    }

    return formatted || road || name;
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

  private fallbackForwardGeocodeFromCandidate(
    candidate: SearchAddressCandidate,
  ): ForwardGeocodeResult {
    return {
      lat: candidate.lat,
      lng: candidate.lng,
      addressLabel: candidate.label,
      city: null,
      district: null,
      street: null,
      streetNumber: null,
      zip: null,
      country: null,
    };
  }

  private async resolveDbAddressForwardGeocode(
    candidate: SearchAddressCandidate,
  ): Promise<ForwardGeocodeResult> {
    const { data, error } = await this.supabaseService.client.rpc('list_locations_for_media', {
      p_media_item_id: candidate.id,
      p_limit: 1,
      p_offset: 0,
    });

    if (error || !Array.isArray(data) || data.length === 0) {
      return this.fallbackForwardGeocodeFromCandidate(candidate);
    }

    const row = data[0] as MediaItemAddressRow;
    return {
      lat: toNumber(row.latitude) ?? candidate.lat,
      lng: toNumber(row.longitude) ?? candidate.lng,
      addressLabel: row.address_label?.trim() || candidate.label,
      street: row.street,
      city: row.city,
      district: row.district,
      country: row.country,
      streetNumber: row.house_number ?? null,
      zip: row.postcode ?? null,
    };
  }

  private async resolveGeocoderForwardGeocode(
    candidate: SearchAddressCandidate,
  ): Promise<ForwardGeocodeResult> {
    const reverse = await this.geocodingService.reverse(candidate.lat, candidate.lng);
    if (!reverse) {
      return this.fallbackForwardGeocodeFromCandidate(candidate);
    }

    return {
      lat: candidate.lat,
      lng: candidate.lng,
      addressLabel: reverse.addressLabel || candidate.label,
      street: reverse.street,
      city: reverse.city,
      district: reverse.district,
      country: reverse.country,
      streetNumber: reverse.streetNumber,
      zip: reverse.zip,
    };
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
