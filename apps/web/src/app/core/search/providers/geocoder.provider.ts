import { Injectable, inject } from '@angular/core';
import { catchError, from, of, tap, type Observable } from 'rxjs';
import type { GeocoderSearchResult } from '../../geocoding/geocoding.service';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { MediaClusterService } from '../../geocoding/media-cluster.service';
import { formatGeocoderPickerLines } from '../../media-locations/media-locations.helpers';
import type { SearchAddressCandidate, SearchCandidate, SearchQueryContext } from '../search.models';
import type { SearchProvider } from '../engine/search-provider.interface';
import {
  formatGeocoderAddressLabel,
  isSpecificStreetQuery,
  normalizeSearchQuery,
} from '../search-query';
import {
  clamp01,
  computeGeocoderTextScore,
  computeGeocoderWeightedScore,
  computeShortPrefixNoisePenalty,
  isCandidateInViewport,
} from '../search-geocoder-scoring';
import { logGeocoderDiagnostics, logSearchEvent } from '../search-debug';
import {
  fetchGeocoderCandidates,
  NOMINATIM_FETCH_LIMIT,
  processGeocoderSearchResults,
  searchContextFromClusterViewbox,
} from '../search-bar-resolvers';
import { OrgSearchTuningService } from '../org-search-tuning.service';
import { computeCountryBoost, computeProximityDecay } from '../search-bar-helpers';

const CONTEXT_CITY_CACHE_TTL_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class GeocoderProvider implements SearchProvider {
  private readonly geocodingService = inject(GeocodingService);
  private readonly orgSearchTuning = inject(OrgSearchTuningService);
  private readonly mediaClusterService = inject(MediaClusterService);

  readonly id = 'geocoder';
  readonly sectionTitle = 'From internet';
  readonly family = 'geocoder' as const;
  readonly keywords = ['address', 'place'];
  readonly priority = 50;

  private maxSectionItems = 3;

  private readonly contextCityCache = new Map<
    string,
    { value: string | null; expiresAt: number }
  >();

  configure(options: Record<string, unknown>): void {
    if (typeof options['maxGeocoderSectionItems'] === 'number') {
      this.maxSectionItems = options['maxGeocoderSectionItems'];
    } else {
      this.maxSectionItems =
        this.orgSearchTuning.orgSearchConfig().resolver.maxGeocoderResults;
    }
  }

  search(query: string, context: SearchQueryContext): Observable<SearchCandidate[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    if (!normalizedQuery) return of([]);

    if (this.geocodingService.isGeocodeBlocked()) {
      logSearchEvent('geocoder-skipped-cooldown', {
        query,
        normalizedQuery,
      });
      return of([]);
    }

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
    const strictCandidates = await this.fetchGeocoderCandidates(normalizedQuery, context);
    const maxResults = this.orgSearchTuning.orgSearchConfig().resolver.maxGeocoderResults;

    if (strictCandidates.length > 0) {
      const needsRicherLabels = strictCandidates.some(
        (candidate) => !this.geocoderCandidateHasLocality(candidate),
      );
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
        { requireCompleteLocality: true },
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
      { requireCompleteLocality: false },
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
    options: { requireCompleteLocality: boolean },
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
            (!options.requireCompleteLocality || this.geocoderCandidateHasLocality(candidate)),
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
        (!options.requireCompleteLocality || this.geocoderCandidateHasLocality(candidate)),
    );
  }

  private geocoderCandidateHasLocality(candidate: SearchAddressCandidate): boolean {
    const secondary = candidate.secondaryLabel?.trim() ?? '';
    if (!secondary) return false;
    return /\b\d{4,5}\b/.test(secondary) || secondary.includes(' · ');
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
        (this.geocoderCandidateHasLocality(candidate) &&
          !this.geocoderCandidateHasLocality(existing)) ||
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
    const formatted = formatGeocoderAddressLabel(result);
    const pickerLines = formatGeocoderPickerLines(result, 'Top');
    const primaryLabel = pickerLines.primary;
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
}
