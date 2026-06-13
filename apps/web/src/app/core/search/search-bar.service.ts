import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import type { ForwardGeocodeResult } from '../geocoding/geocoding.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import type {
  SearchAddressCandidate,
  SearchContentCandidate,
  SearchQueryContext,
  SearchRecentCandidate,
} from './search.models';
import { detectCoordinates, type DetectedCoordinates } from './coordinate-detection';
import { GhostTrie, type GhostTrieEntry } from './ghost-trie';
import {
  formatGeocoderAddressLabel,
  normalizeSearchQuery,
  buildFallbackQueries,
  toNumber,
} from './search-query';
import { OrgSearchTuningService } from './org-search-tuning.service';
import { RecentsProvider } from './providers/recents.provider';
import { DbAddressProvider } from './providers/db-address.provider';
import { ProjectsProvider } from './providers/projects.provider';
import { GeocoderProvider } from './providers/geocoder.provider';
import { engineOptionsFromOrgTuning } from './engine/search-engine.factory';
import type { SearchOrchestratorOptions } from './search.models';
import type { StoredRecentSearch } from './search-bar-helpers';
import { compareRecents } from './search-bar-helpers';

export type { DetectedCoordinates } from './coordinate-detection';
export type { GhostTrieEntry } from './ghost-trie';

const RECENT_SEARCHES_STORAGE_KEY = 'feldpost-recent-searches';

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
  private readonly recentsProvider = inject(RecentsProvider);
  private readonly dbAddressProvider = inject(DbAddressProvider);
  private readonly projectsProvider = inject(ProjectsProvider);
  private readonly geocoderProvider = inject(GeocoderProvider);

  orchestratorOptionsFromOrg(): SearchOrchestratorOptions {
    const options = engineOptionsFromOrgTuning(this.orgSearchTuning);
    return {
      debounceMs: options.debounceMs,
      cacheTtlMs: options.cacheTtlMs,
      recentMaxItems: options.recentMaxItems,
      geocoderDedupMeters: options.geocoderDedupMeters,
    };
  }

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
    return this.recentsProvider.loadRecentSearches();
  }

  addRecentSearch(
    label: string,
    projectId?: string,
    existingRecents?: SearchRecentCandidate[],
    secondaryLabel?: string,
    coords?: { lat: number; lng: number },
  ): SearchRecentCandidate[] {
    return this.recentsProvider.addRecentSearch(
      label,
      projectId,
      existingRecents,
      secondaryLabel,
      coords,
    );
  }

  getRecentSearches(
    limit: number,
    activeProjectId?: string,
    recents?: SearchRecentCandidate[],
  ): SearchRecentCandidate[] {
    if (recents) {
      return [...recents]
        .sort((left, right) => compareRecents(left, right, activeProjectId))
        .slice(0, limit);
    }
    return this.recentsProvider.getRecentSearches(limit, activeProjectId);
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
    return this.dbAddressProvider.search(query, context) as Observable<SearchAddressCandidate[]>;
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
    return this.projectsProvider.search(query, context) as Observable<SearchContentCandidate[]>;
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
    return this.geocoderProvider.search(query, context) as Observable<SearchAddressCandidate[]>;
  }

  formatAddressLabel = formatGeocoderAddressLabel;
  normalizeSearchQuery = normalizeSearchQuery;

  buildFallbackQueries = buildFallbackQueries;

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

}
