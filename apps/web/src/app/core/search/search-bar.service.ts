import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, of } from 'rxjs';
import { SupabaseService } from '../supabase.service';
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
  AddressGroup,
  StoredRecentSearch,
  buildCityPart,
  compareRecents,
  computeCountryBoost,
  computeProximityDecay,
  computeRecencyDecay,
  distanceToCentroidMeters,
  isInViewport,
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

interface DbAddressRow {
  id: string;
  address_label: string | null;
  street: string | null;
  postcode: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  project_id: string | null;
  created_at: string | null;
}

interface DbContentRow {
  id: string;
  name: string | null;
}

interface SavedGroupImageRow {
  group_id: string;
}

interface ImageProjectRow {
  project_id: string | null;
}

@Injectable({ providedIn: 'root' })
export class SearchBarService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly geocodingService = inject(GeocodingService);

  private readonly ghostTrie = new GhostTrie();

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

    return from(this.fetchGeocoderCandidates(normalizedQuery, context)).pipe(
      catchError(() => of([])),
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
      .from('images')
      .select('id,address_label,street,postcode,city,latitude,longitude,project_id,created_at')
      .ilike('address_label', `%${trimmedQuery}%`)
      .not('address_label', 'is', null)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(MAX_DB_ADDRESS_ROWS);

    if (context.organizationId) {
      request = request.eq('organization_id', context.organizationId);
    }

    const response = await request;

    if (response.error || !Array.isArray(response.data)) return [];

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
        buildCityPart(row.postcode, row.city),
      );
      const key = label.toLowerCase();
      const textMatch = computeTextMatchScore(label, trimmedQuery);
      const createdAtMs = row.created_at ? Date.parse(row.created_at) : 0;
      const activeProjectHit =
        context.activeProjectId && row.project_id === context.activeProjectId ? 1 : 0;

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
        return right.count - left.count;
      })
      .slice(0, MAX_DB_ADDRESS_RESULTS)
      .map((entry, index) => ({
        id: entry.ids[0] ?? `db-address-${index}`,
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
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    let projectsQuery = this.supabaseService.client
      .from('projects')
      .select('id,name')
      .ilike('name', `%${trimmedQuery}%`)
      .limit(MAX_DB_CONTENT_RESULTS);

    if (context.organizationId) {
      projectsQuery = projectsQuery.eq('organization_id', context.organizationId);
    }

    const [projectsResponse, groupsResponse] = await Promise.all([
      projectsQuery,
      this.supabaseService.client
        .from('saved_groups')
        .select('id,name')
        .ilike('name', `%${trimmedQuery}%`)
        .limit(MAX_DB_CONTENT_RESULTS),
    ]);

    const projectRows =
      projectsResponse.error || !Array.isArray(projectsResponse.data)
        ? []
        : (projectsResponse.data as DbContentRow[]).filter((row) => !!row.name);
    const groupRows =
      groupsResponse.error || !Array.isArray(groupsResponse.data)
        ? []
        : (groupsResponse.data as DbContentRow[]).filter((row) => !!row.name);

    const [projectSizes, groupSizes] = await Promise.all([
      this.loadProjectSizeSignals(
        projectRows.map((row) => row.id),
        context.organizationId,
      ),
      this.loadGroupSizeSignals(groupRows.map((row) => row.id)),
    ]);

    const projectCandidates = projectRows
      .map((row) => {
        const label = row.name?.trim() ?? '';
        const textMatch = computeTextMatchScore(row.name ?? '', trimmedQuery);
        const projectBoost = context.activeProjectId === row.id ? 2 : 1;
        const sizeSignal = toSizeSignal(projectSizes.get(row.id) ?? 0);

        return {
          id: `project-${row.id}`,
          family: 'db-content' as const,
          label,
          contentType: 'project' as const,
          contentId: row.id,
          subtitle: 'Project',
          score: textMatch * projectBoost * sizeSignal,
        };
      })
      .filter((candidate) => candidate.label.length > 0);

    const groupCandidates = groupRows
      .map((row) => {
        const label = row.name?.trim() ?? '';
        const textMatch = computeTextMatchScore(row.name ?? '', trimmedQuery);
        const projectBoost = context.selectedGroupId === row.id ? 1.6 : 1;
        const sizeSignal = toSizeSignal(groupSizes.get(row.id) ?? 0);

        return {
          id: `group-${row.id}`,
          family: 'db-content' as const,
          label,
          contentType: 'group' as const,
          contentId: row.id,
          subtitle: 'Saved group',
          score: textMatch * projectBoost * sizeSignal,
        };
      })
      .filter((candidate) => candidate.label.length > 0);

    return [...projectCandidates, ...groupCandidates]
      .sort((left, right) => {
        const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
        if (scoreDelta !== 0) return scoreDelta;
        return left.label.localeCompare(right.label);
      })
      .slice(0, MAX_DB_CONTENT_RESULTS);
  }

  private async fetchGeocoderCandidates(
    normalizedQuery: string,
    context: SearchQueryContext,
  ): Promise<SearchAddressCandidate[]> {
    if (normalizedQuery.length < 3) return [];

    const searchOptions: GeocoderSearchOptions = { limit: MAX_GEOCODER_RESULTS };
    if (context.countryCodes?.length) {
      searchOptions.countrycodes = context.countryCodes;
    }
    if (context.viewportBounds) {
      const b = context.viewportBounds;
      searchOptions.viewbox = `${b.west},${b.north},${b.east},${b.south}`;
      searchOptions.bounded = true;
    }

    const queries = [normalizedQuery, ...this.buildFallbackQueries(normalizedQuery)];
    for (const currentQuery of queries) {
      const results = await this.geocodingService.search(currentQuery, searchOptions);
      if (results.length > 0) {
        return results
          .filter((r) => isStreetLevelResult(r))
          .map((result, index) => this.toGeocoderCandidate(result, currentQuery, index, context))
          .sort((left, right) => {
            const leftLocal = isInViewport(left, context.viewportBounds);
            const rightLocal = isInViewport(right, context.viewportBounds);
            if (leftLocal !== rightLocal) return leftLocal ? -1 : 1;

            const leftNearData = distanceToCentroidMeters(left, context.dataCentroid);
            const rightNearData = distanceToCentroidMeters(right, context.dataCentroid);
            if (leftNearData !== rightNearData) return leftNearData - rightNearData;

            const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
            if (scoreDelta !== 0) return scoreDelta;
            return left.label.localeCompare(right.label);
          })
          .slice(0, MAX_GEOCODER_RESULTS);
      }
    }

    return [];
  }

  private toGeocoderCandidate(
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ): SearchAddressCandidate {
    const formatted = this.formatAddressLabel(result);
    const isPoi =
      result.name != null && result.address?.road != null && result.name !== result.address.road;
    const proximityDecay = computeProximityDecay(result.lat, result.lng, context);
    const countryBoost = computeCountryBoost(result, context.countryCodes);
    const score = (result.importance || 0) * proximityDecay * countryBoost;

    return {
      id: `geo-${query}-${index}`,
      family: 'geocoder',
      label: isPoi ? result.name! : formatted,
      secondaryLabel: isPoi ? formatted : undefined,
      lat: result.lat,
      lng: result.lng,
      score,
    };
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

  private async loadProjectSizeSignals(
    projectIds: string[],
    organizationId?: string,
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (projectIds.length === 0) return counts;

    let request = this.supabaseService.client
      .from('images')
      .select('project_id')
      .in('project_id', projectIds);

    if (organizationId) {
      request = request.eq('organization_id', organizationId);
    }

    const response = await request;
    if (response.error || !Array.isArray(response.data)) return counts;

    for (const row of response.data as ImageProjectRow[]) {
      if (!row.project_id) continue;
      counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
    }

    return counts;
  }

  private async loadGroupSizeSignals(groupIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (groupIds.length === 0) return counts;

    const response = await this.supabaseService.client
      .from('saved_group_images')
      .select('group_id')
      .in('group_id', groupIds);

    if (response.error || !Array.isArray(response.data)) return counts;

    for (const row of response.data as SavedGroupImageRow[]) {
      counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
    }

    return counts;
  }
}

function isStreetLevelResult(result: GeocoderSearchResult): boolean {
  const addr = result.address;
  if (!addr) return true;
  const hasCity = !!(addr.city || addr.town || addr.village || addr.municipality);
  const hasRoad = !!addr.road;
  return hasCity || hasRoad;
}
