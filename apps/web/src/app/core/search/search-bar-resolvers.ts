import type {
  GeocodingService,
  GeocoderSearchOptions,
  GeocoderSearchResult,
} from '../geocoding/geocoding.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type {
  SearchAddressCandidate,
  SearchContentCandidate,
  SearchQueryContext,
} from './search.models';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';
import type { SearchTuningConfig } from './search-tuning.types';
import {
  computeTextMatchScore,
  houseNumberSharesQueryPrefix,
  isSpecificStreetQuery,
  parseStreetAndHouseNumber,
  type StreetHouseQuery,
} from './search-query';
import {
  deduplicateGeocoderCandidatesByLabel,
  distanceToSearchContextMeters,
  isInViewport,
  toSizeSignal,
} from './search-bar-helpers';
import { logGeocoderResolverStage } from './search-debug';

/** Internal Nominatim fetch budget; display count stays `maxGeocoderResults`. */
export const NOMINATIM_FETCH_LIMIT = 15;

interface DbContentRow {
  id: string;
  name: string | null;
}

export async function fetchDbContentCandidates(
  supabase: SupabaseService,
  query: string,
  context: SearchQueryContext,
  maxDbContentResults: number,
): Promise<SearchContentCandidate[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  let projectsQuery = supabase.client
    .from('projects')
    .select('id,name')
    .ilike('name', `*${trimmedQuery}*`)
    .limit(maxDbContentResults);

  if (context.organizationId) {
    projectsQuery = projectsQuery.eq('organization_id', context.organizationId);
  }

  const projectsResponse = await projectsQuery;

  const projectRows =
    projectsResponse.error || !Array.isArray(projectsResponse.data)
      ? []
      : (projectsResponse.data as DbContentRow[]).filter((row) => !!row.name);
  const projectSizes = await loadProjectSizeSignals(
    supabase,
    projectRows.map((row) => row.id),
    context.organizationId,
  );

  const projectCandidates = buildProjectContentCandidates(
    projectRows,
    trimmedQuery,
    context,
    projectSizes,
  );

  return projectCandidates
    .sort((left, right) => {
      const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
      if (scoreDelta !== 0) return scoreDelta;
      return left.label.localeCompare(right.label);
    })
    .slice(0, maxDbContentResults);
}

function buildProjectContentCandidates(
  projectRows: DbContentRow[],
  query: string,
  context: SearchQueryContext,
  projectSizes: Map<string, number>,
): SearchContentCandidate[] {
  return projectRows
    .map((row) => {
      const label = row.name?.trim() ?? '';
      const textMatch = computeTextMatchScore(row.name ?? '', query);
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
}

export async function fetchGeocoderCandidates(
  geocodingService: GeocodingService,
  normalizedQuery: string,
  context: SearchQueryContext,
  maxGeocoderResults: number,
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
  tuning: SearchTuningConfig = SEARCH_TUNING_SYSTEM_DEFAULTS,
): Promise<SearchAddressCandidate[]> {
  if (!tuning.resolver.enableInternetSearch) return [];
  if (normalizedQuery.length < tuning.resolver.minQueryLength) return [];

  const constrainedOptions = buildConstrainedSearchOptions(context, normalizedQuery, tuning);
  logGeocoderResolverStage('constrained-request', {
    query: normalizedQuery,
    options: constrainedOptions,
  });
  const constrainedResults = await geocodingService.search(normalizedQuery, constrainedOptions);
  logGeocoderResolverStage('constrained-response', {
    query: normalizedQuery,
    count: constrainedResults.length,
    labels: constrainedResults.slice(0, 10).map((result) => result.displayName),
  });

  const constrainedCandidates = rankGeocoderCandidates(
    constrainedResults,
    normalizedQuery,
    context,
    toCandidate,
    NOMINATIM_FETCH_LIMIT,
    tuning,
  );

  // Unconstrained retry disabled: NOMINATIM_FETCH_LIMIT covers short-prefix cases in one call.
  return finalizeGeocoderCandidates(
    geocodingService,
    constrainedCandidates,
    normalizedQuery,
    context,
    maxGeocoderResults,
    toCandidate,
    tuning,
  );
}

/** Rank and finalize raw Nominatim hits (structured search or other non-`q` paths). */
export async function processGeocoderSearchResults(
  geocodingService: GeocodingService,
  rawResults: GeocoderSearchResult[],
  normalizedQuery: string,
  context: SearchQueryContext,
  maxGeocoderResults: number,
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
  tuning: SearchTuningConfig = SEARCH_TUNING_SYSTEM_DEFAULTS,
): Promise<SearchAddressCandidate[]> {
  const ranked = rankGeocoderCandidates(
    rawResults,
    normalizedQuery,
    context,
    toCandidate,
    NOMINATIM_FETCH_LIMIT,
    tuning,
  );
  return finalizeGeocoderCandidates(
    geocodingService,
    ranked,
    normalizedQuery,
    context,
    maxGeocoderResults,
    toCandidate,
    tuning,
  );
}

const STREET_SUFFIX_PROBE_SUFFIXES = ['gasse', 'strasse', 'weg', 'platz', 'allee'] as const;

async function finalizeGeocoderCandidates(
  geocodingService: GeocodingService,
  primary: SearchAddressCandidate[],
  normalizedQuery: string,
  context: SearchQueryContext,
  maxGeocoderResults: number,
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
  tuning: SearchTuningConfig,
): Promise<SearchAddressCandidate[]> {
  const withHouseNumbers = await expandHouseNumberSiblingCandidates(
    geocodingService,
    primary,
    normalizedQuery,
    context,
    maxGeocoderResults,
    toCandidate,
    tuning,
  );
  // Expansions disabled: higher fetch limit covers these cases.
  // Re-enable if NOMINATIM_FETCH_LIMIT drops below 8.
  // const withStreetHouses = await expandStreetLevelHouseCandidates(...);
  // const results = await expandStreetSuffixProbeCandidates(...);
  const results = withHouseNumbers;

  logGeocoderResolverStage('final-ranked', {
    query: normalizedQuery,
    top: results.slice(0, 3).map((candidate) => ({
      label: candidate.label,
      score: candidate.score,
      distanceMeters: distanceToSearchContextMeters(candidate, context),
    })),
  });

  return results.slice(0, maxGeocoderResults);
}

async function expandHouseNumberSiblingCandidates(
  geocodingService: GeocodingService,
  primary: SearchAddressCandidate[],
  normalizedQuery: string,
  context: SearchQueryContext,
  maxGeocoderResults: number,
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
  tuning: SearchTuningConfig,
): Promise<SearchAddressCandidate[]> {
  const parsed = parseStreetAndHouseNumber(normalizedQuery);
  if (!parsed) {
    return primary;
  }

  const streetOptions = buildConstrainedSearchOptions(context, parsed.street, tuning);

  logGeocoderResolverStage('house-prefix-expansion-request', {
    query: normalizedQuery,
    street: parsed.street,
    housePrefix: parsed.houseNumber,
    options: streetOptions,
  });

  const streetResults = await geocodingService.search(parsed.street, streetOptions);
  const prefixMatches = streetResults.filter((result) =>
    geocoderResultMatchesHousePrefix(result, parsed),
  );

  logGeocoderResolverStage('house-prefix-expansion-response', {
    query: normalizedQuery,
    raw: streetResults.length,
    prefixMatches: prefixMatches.length,
    labels: prefixMatches.slice(0, 12).map((result) => result.displayName),
  });

  const expansionCandidates = rankGeocoderCandidates(
    prefixMatches,
    normalizedQuery,
    context,
    toCandidate,
    NOMINATIM_FETCH_LIMIT,
    tuning,
  );

  const merged = deduplicateGeocoderCandidatesByLabel(
    sortHouseNumberPrefixCandidates(
      mergeAndRankCandidates(primary, expansionCandidates, context, normalizedQuery),
      parsed,
    ),
  );

  return merged.slice(0, maxGeocoderResults);
}

function shouldExpandStreetLevelHouses(normalizedQuery: string, tuning: SearchTuningConfig): boolean {
  if (!isSpecificStreetQuery(normalizedQuery, tuning.query.specificStreetMinLength)) {
    return false;
  }
  if (parseStreetAndHouseNumber(normalizedQuery)) {
    return false;
  }
  const streetSuffixes = [...STREET_SUFFIX_PROBE_SUFFIXES, 'strasse', 'zeile', 'ring'] as const;
  return streetSuffixes.some((suffix) => normalizedQuery.endsWith(suffix));
}

async function expandStreetLevelHouseCandidates(
  geocodingService: GeocodingService,
  primary: SearchAddressCandidate[],
  normalizedQuery: string,
  context: SearchQueryContext,
  maxGeocoderResults: number,
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
  tuning: SearchTuningConfig,
): Promise<SearchAddressCandidate[]> {
  if (!shouldExpandStreetLevelHouses(normalizedQuery, tuning)) {
    return primary;
  }
  if (primary.length === 0) {
    return primary;
  }

  const streetOptions = buildConstrainedSearchOptions(context, normalizedQuery, tuning);

  logGeocoderResolverStage('street-house-expansion-request', {
    query: normalizedQuery,
    options: streetOptions,
  });

  const streetResults = await geocodingService.search(normalizedQuery, streetOptions);
  const sameStreet = streetResults.filter((result) =>
    geocoderRoadMatchesStreetQuery(result, normalizedQuery),
  );
  const withHouseNumbers = sameStreet.filter((result) => result.address?.house_number?.trim());
  const pool = withHouseNumbers.length >= 2 ? withHouseNumbers : sameStreet;

  logGeocoderResolverStage('street-house-expansion-response', {
    query: normalizedQuery,
    raw: streetResults.length,
    sameStreet: sameStreet.length,
    withHouseNumbers: withHouseNumbers.length,
  });

  if (pool.length === 0) {
    return primary.slice(0, maxGeocoderResults);
  }

  const expansionCandidates = rankGeocoderCandidates(
    pool,
    normalizedQuery,
    context,
    toCandidate,
    NOMINATIM_FETCH_LIMIT,
    tuning,
  );

  return deduplicateGeocoderCandidatesByLabel(
    mergeAndRankCandidates(primary, expansionCandidates, context, normalizedQuery),
  ).slice(0, maxGeocoderResults);
}

function geocoderRoadMatchesStreetQuery(
  result: GeocoderSearchResult,
  streetQuery: string,
): boolean {
  const road = result.address?.road?.trim();
  if (!road) return false;

  const roadNorm = normalizeForLexicalMatch(road);
  const streetNorm = normalizeForLexicalMatch(streetQuery);
  return (
    roadNorm === streetNorm ||
    roadNorm.startsWith(streetNorm) ||
    streetNorm.startsWith(roadNorm)
  );
}

async function expandStreetSuffixProbeCandidates(
  geocodingService: GeocodingService,
  primary: SearchAddressCandidate[],
  normalizedQuery: string,
  context: SearchQueryContext,
  maxGeocoderResults: number,
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
  tuning: SearchTuningConfig,
): Promise<SearchAddressCandidate[]> {
  if (!isShortAmbiguousPrefixQuery(normalizedQuery, tuning)) {
    return primary.slice(0, maxGeocoderResults);
  }

  const countryCodes = context.countryCodes?.map((code) => code.toLowerCase()) ?? [];
  if (!countryCodes.includes('at')) {
    return primary.slice(0, maxGeocoderResults);
  }

  if (primary.length === 0) {
    return primary.slice(0, maxGeocoderResults);
  }

  const queryNorm = normalizeForLexicalMatch(normalizedQuery);
  if (STREET_SUFFIX_PROBE_SUFFIXES.some((suffix) => normalizedQuery.endsWith(suffix))) {
    return primary.slice(0, maxGeocoderResults);
  }

  if (primary.some((candidate) => candidateHasStrongStreetPrefixMatch(candidate.label, queryNorm))) {
    return primary.slice(0, maxGeocoderResults);
  }

  const probeQueries = STREET_SUFFIX_PROBE_SUFFIXES.filter(
    (suffix) => !normalizedQuery.endsWith(suffix),
  ).map((suffix) => `${normalizedQuery}${suffix}`);

  const probeCandidates: SearchAddressCandidate[] = [];
  for (const probeQuery of probeQueries) {
    const options = buildConstrainedSearchOptions(context, probeQuery, tuning);
    logGeocoderResolverStage('street-suffix-probe-request', {
      query: normalizedQuery,
      probeQuery,
      options,
    });
    const probeResults = await geocodingService.search(probeQuery, options);
    const roadMatches = probeResults.filter((result) =>
      geocoderRoadStartsWithQuery(result, queryNorm),
    );
    logGeocoderResolverStage('street-suffix-probe-response', {
      query: normalizedQuery,
      probeQuery,
      raw: probeResults.length,
      roadMatches: roadMatches.length,
    });
    probeCandidates.push(
      ...rankGeocoderCandidates(
        roadMatches,
        normalizedQuery,
        context,
        toCandidate,
        NOMINATIM_FETCH_LIMIT,
        tuning,
      ),
    );
    if (probeCandidates.some((candidate) => candidateHasStrongStreetPrefixMatch(candidate.label, queryNorm))) {
      break;
    }
  }

  if (probeCandidates.length === 0) {
    return primary.slice(0, maxGeocoderResults);
  }

  return deduplicateGeocoderCandidatesByLabel(
    mergeAndRankCandidates(primary, probeCandidates, context, normalizedQuery),
  ).slice(0, maxGeocoderResults);
}

function geocoderRoadStartsWithQuery(result: GeocoderSearchResult, queryNorm: string): boolean {
  const road = result.address?.road?.trim();
  if (!road) return false;
  return normalizeForLexicalMatch(road).startsWith(queryNorm);
}

function candidateStreetTokenStartsWithQuery(label: string, queryNorm: string): boolean {
  const streetSegment = label.split(',')[0]?.trim() ?? '';
  const firstToken = streetSegment.split(/\s+/).find(Boolean) ?? '';
  return normalizeForLexicalMatch(firstToken).startsWith(queryNorm);
}

function candidateHasStrongStreetPrefixMatch(label: string, queryNorm: string): boolean {
  const firstToken = (label.split(',')[0]?.trim() ?? '').split(/\s+/).find(Boolean) ?? '';
  const tokenNorm = normalizeForLexicalMatch(firstToken);
  if (!tokenNorm.startsWith(queryNorm)) {
    return false;
  }
  if (label.includes(',')) {
    return true;
  }
  return (
    tokenNorm.endsWith('gasse') ||
    tokenNorm.endsWith('strasse') ||
    tokenNorm.endsWith('weg') ||
    tokenNorm.endsWith('platz') ||
    tokenNorm.endsWith('allee')
  );
}

function geocoderResultMatchesHousePrefix(
  result: GeocoderSearchResult,
  parsed: StreetHouseQuery,
): boolean {
  const road = result.address?.road?.trim();
  if (!road) return false;

  const roadNorm = normalizeForLexicalMatch(road);
  const streetNorm = normalizeForLexicalMatch(parsed.street);
  if (roadNorm !== streetNorm && !roadNorm.includes(streetNorm) && !streetNorm.includes(roadNorm)) {
    return false;
  }

  const houseNumber = result.address?.house_number?.trim() ?? '';
  if (!houseNumber) return false;

  return houseNumberSharesQueryPrefix(houseNumber, parsed.houseNumber);
}

function sortHouseNumberPrefixCandidates(
  candidates: SearchAddressCandidate[],
  parsed: StreetHouseQuery,
): SearchAddressCandidate[] {
  return [...candidates].sort((left, right) => {
    const tierDelta = houseNumberMatchTier(left, parsed) - houseNumberMatchTier(right, parsed);
    if (tierDelta !== 0) return tierDelta;
    return left.label.localeCompare(right.label);
  });
}

function houseNumberMatchTier(candidate: SearchAddressCandidate, parsed: StreetHouseQuery): number {
  const houseNumber = extractHouseNumberFromCandidateLabel(candidate.label, parsed.street);
  if (!houseNumber) return 2;
  if (houseNumber === parsed.houseNumber) return 0;
  if (houseNumberSharesQueryPrefix(houseNumber, parsed.houseNumber)) return 1;
  return 2;
}

function extractHouseNumberFromCandidateLabel(label: string, street: string): string | null {
  const streetNorm = street.trim().toLowerCase();
  const labelNorm = label.trim().toLowerCase();
  const streetIndex = labelNorm.indexOf(streetNorm);
  if (streetIndex < 0) return null;

  const afterStreet = label.slice(streetIndex + street.length);
  const match = afterStreet.match(/^\s*[,\s]*(\d+[a-z]?)/i);
  return match ? match[1].toLowerCase() : null;
}

/** Clone context with cluster viewbox as viewportBounds (Nominatim west,north,east,south). */
export function searchContextFromClusterViewbox(
  context: SearchQueryContext,
  viewbox: string,
): SearchQueryContext {
  const parts = viewbox.split(',').map((segment) => Number.parseFloat(segment.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return context;
  }
  const [west, north, east, south] = parts;
  return {
    ...context,
    viewportBounds: { north, east, south, west },
  };
}

function buildConstrainedSearchOptions(
  context: SearchQueryContext,
  normalizedQuery: string,
  tuning: SearchTuningConfig,
): GeocoderSearchOptions {
  const searchOptions: GeocoderSearchOptions = {
    limit: NOMINATIM_FETCH_LIMIT,
    addressLayer: !isShortAmbiguousPrefixQuery(normalizedQuery, tuning),
  };
  if (context.countryCodes?.length) {
    searchOptions.countrycodes = context.countryCodes;
  }
  if (context.viewportBounds) {
    const b = context.viewportBounds;
    searchOptions.viewbox = `${b.west},${b.north},${b.east},${b.south}`;
    // Viewbox biases ranking only; bounded=1 often returns [] for valid streets just outside
    // the cluster (e.g. Denisgasse in Wien when project GPS is in NÖ). Country + distance
    // gates in rankGeocoderCandidates still localize results.
    // @see docs/specs/service/address-field-suggest/adapters/nominatim-field-suggest.adapter.md
    searchOptions.bounded = false;
  }
  return searchOptions;
}

function rankGeocoderCandidates(
  rawResults: GeocoderSearchResult[],
  normalizedQuery: string,
  context: SearchQueryContext,
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
  limit: number,
  tuning: SearchTuningConfig,
): SearchAddressCandidate[] {
  const streetLevelResults = rawResults.filter((r) => isStreetLevelResult(r));
  if (streetLevelResults.length === 0) return [];

  const localizedResults = streetLevelResults.filter((result) =>
    matchesCountryConstraint(result, context, normalizedQuery, tuning),
  );

  const lexicalResults = localizedResults.filter((result) =>
    meetsLexicalMatchThreshold(result, normalizedQuery, tuning),
  );

  logGeocoderResolverStage('candidate-filter', {
    query: normalizedQuery,
    raw: rawResults.length,
    streetLevel: streetLevelResults.length,
    localized: localizedResults.length,
    lexical: lexicalResults.length,
  });

  if (lexicalResults.length === 0) return [];

  const orderedLexical = isShortAmbiguousPrefixQuery(normalizedQuery, tuning)
    ? orderGeocoderResultsByRoadPrefix(lexicalResults, normalizedQuery)
    : lexicalResults;

  const ranked = orderedLexical
    .map((result, index) => toCandidate(result, normalizedQuery, index, context))
    .filter((candidate) => (candidate.score ?? 0) > tuning.resolver.candidateScoreFloor)
    .sort((left, right) => compareCandidateRank(left, right, context, normalizedQuery));

  return deduplicateGeocoderCandidatesByLabel(ranked).slice(0, limit);
}

function hasGeographicSearchAnchor(context: SearchQueryContext): boolean {
  return !!(
    context.viewportBounds ||
    context.activeMarkerCentroid ||
    context.activeProjectCentroid ||
    context.currentLocation ||
    context.dataCentroid ||
    (context.countryCodes?.length ?? 0) > 0
  );
}

function matchesCountryConstraint(
  result: GeocoderSearchResult,
  context: SearchQueryContext,
  normalizedQuery: string,
  tuning: SearchTuningConfig,
): boolean {
  const allowedCountryCodes = context.countryCodes?.map((code) => code.toLowerCase()) ?? [];
  if (allowedCountryCodes.length === 0) {
    if (!hasGeographicSearchAnchor(context)) {
      return true;
    }

    if (isCoordinateInViewport(result.lat, result.lng, context.viewportBounds)) {
      return true;
    }

    if (isSpecificStreetQuery(normalizedQuery, tuning.query.specificStreetMinLength)) {
      return true;
    }

    const contextDistance = distanceFromContextMeters(result.lat, result.lng, context);
    return contextDistance <= tuning.resolver.contextDistanceMaxMeters;
  }

  const resultCountryCode = result.address?.country_code?.toLowerCase();
  if (resultCountryCode && allowedCountryCodes.includes(resultCountryCode)) {
    return true;
  }

  if (
    !resultCountryCode &&
    isCoordinateInAllowedCountries(result.lat, result.lng, allowedCountryCodes, tuning)
  ) {
    return true;
  }

  if (isCoordinateInViewport(result.lat, result.lng, context.viewportBounds)) {
    return true;
  }

  return isSpecificStreetQuery(normalizedQuery, tuning.query.specificStreetMinLength);
}

function isCoordinateInAllowedCountries(
  lat: number,
  lng: number,
  countryCodes: string[],
  tuning: SearchTuningConfig,
): boolean {
  for (const code of countryCodes) {
    const bounds = tuning.resolver.countryBounds[code.toLowerCase()];
    if (!bounds) continue;
    if (
      lat >= bounds.latMin &&
      lat <= bounds.latMax &&
      lng >= bounds.lngMin &&
      lng <= bounds.lngMax
    ) {
      return true;
    }
  }
  return false;
}

function meetsLexicalMatchThreshold(
  result: GeocoderSearchResult,
  normalizedQuery: string,
  tuning: SearchTuningConfig,
): boolean {
  const queryNorm = normalizeForLexicalMatch(normalizedQuery);
  if (queryNorm.length >= 3) {
    const normalizedFields = [
      result.displayName ?? '',
      result.name ?? '',
      result.address?.road ?? '',
      result.address?.city ?? '',
      result.address?.town ?? '',
      result.address?.village ?? '',
      result.address?.municipality ?? '',
    ].map((value) => normalizeForLexicalMatch(value));
    if (normalizedFields.some((field) => field.includes(queryNorm))) {
      return true;
    }
  }

  const displayNameScore = computeTextMatchScore(result.displayName ?? '', normalizedQuery);
  const roadScore = computeTextMatchScore(result.address?.road ?? '', normalizedQuery);
  const nameScore = computeTextMatchScore(result.name ?? '', normalizedQuery);
  const cityScore = computeTextMatchScore(result.address?.city ?? '', normalizedQuery);
  const bestScore = Math.max(displayNameScore, roadScore, nameScore, cityScore);

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const normalizedFields = [
      result.displayName ?? '',
      result.address?.road ?? '',
      result.name ?? '',
      result.address?.city ?? '',
      result.address?.town ?? '',
      result.address?.village ?? '',
      result.address?.municipality ?? '',
    ]
      .map((value) => normalizeForLexicalMatch(value))
      .filter(Boolean);

    const matchedTokens = queryTokens.filter((token) =>
      normalizedFields.some((field) => field.includes(token)),
    ).length;

    const leadingToken = queryTokens[0] ?? '';
    const hasLeadingPrefix = normalizedFields.some((field) =>
      field
        .split(/\s+/)
        .filter(Boolean)
        .some((part) => part.startsWith(leadingToken)),
    );

    if (matchedTokens >= Math.min(2, queryTokens.length) && hasLeadingPrefix) {
      return true;
    }

    if (matchedTokens === queryTokens.length && bestScore >= tuning.resolver.multiTokenExactMinScore) {
      return true;
    }
  }

  return bestScore >= minimumLexicalScore(normalizedQuery, tuning);
}

function normalizeForLexicalMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

function minimumLexicalScore(query: string, tuning: SearchTuningConfig): number {
  if (isSpecificStreetQuery(query, tuning.query.specificStreetMinLength)) {
    return tuning.resolver.lexicalSpecificStreet;
  }
  if (query.length <= 4) return tuning.resolver.lexicalLenLe4;
  if (query.length <= 6) return tuning.resolver.lexicalLen5to6;
  if (query.length <= 9) return tuning.resolver.lexicalLen7to9;
  return tuning.resolver.lexicalLenGe10;
}

function isCoordinateInViewport(
  lat: number,
  lng: number,
  viewport?: { north: number; east: number; south: number; west: number },
): boolean {
  if (!viewport) return false;
  return (
    lat <= viewport.north && lat >= viewport.south && lng >= viewport.west && lng <= viewport.east
  );
}

function distanceFromContextMeters(lat: number, lng: number, context: SearchQueryContext): number {
  return distanceToSearchContextMeters(
    {
      id: 'context-distance',
      family: 'geocoder',
      label: '',
      lat,
      lng,
    },
    context,
  );
}

function compareCandidateRank(
  left: SearchAddressCandidate,
  right: SearchAddressCandidate,
  context: SearchQueryContext,
  query: string,
): number {
  const leftLocal = isInViewport(left, context.viewportBounds);
  const rightLocal = isInViewport(right, context.viewportBounds);
  if (leftLocal !== rightLocal) return leftLocal ? -1 : 1;

  const queryNorm = normalizeForLexicalMatch(query);
  const leftRoadPrefix = candidateStreetTokenStartsWithQuery(left.label, queryNorm);
  const rightRoadPrefix = candidateStreetTokenStartsWithQuery(right.label, queryNorm);
  if (leftRoadPrefix !== rightRoadPrefix) return leftRoadPrefix ? -1 : 1;

  const leftPrefixLeading = startsWithQueryPrefix(left.label, query);
  const rightPrefixLeading = startsWithQueryPrefix(right.label, query);
  if (leftPrefixLeading !== rightPrefixLeading) return leftPrefixLeading ? -1 : 1;

  const leftNearContext = distanceToSearchContextMeters(left, context);
  const rightNearContext = distanceToSearchContextMeters(right, context);
  if (leftNearContext !== rightNearContext) return leftNearContext - rightNearContext;

  const scoreDelta = (right.score ?? 0) - (left.score ?? 0);
  if (scoreDelta !== 0) return scoreDelta;
  return left.label.localeCompare(right.label);
}

function shouldRunUnconstrainedRetry(
  normalizedQuery: string,
  context: SearchQueryContext,
  constrainedCandidates: SearchAddressCandidate[],
  tuning: SearchTuningConfig,
): boolean {
  if (!context.countryCodes?.length && !context.viewportBounds) {
    return false;
  }

  if (!isShortAmbiguousPrefixQuery(normalizedQuery, tuning)) {
    return false;
  }

  if (constrainedCandidates.length === 0) {
    return true;
  }

  const top = constrainedCandidates[0];
  const topDistance = distanceToSearchContextMeters(top, context);
  if (!startsWithQueryPrefix(top.label, normalizedQuery)) {
    return true;
  }

  if (!Number.isFinite(topDistance)) {
    return true;
  }

  const clearlyRemote = topDistance > tuning.resolver.remoteTopDistanceMeters;
  const weakTopScore = (top.score ?? 0) < tuning.resolver.weakTopScoreThreshold;
  return clearlyRemote || weakTopScore;
}

function isShortAmbiguousPrefixQuery(query: string, tuning: SearchTuningConfig): boolean {
  return (
    query.length >= tuning.resolver.shortPrefixLenMin &&
    query.length <= tuning.resolver.shortPrefixLenMax &&
    !query.includes(' ')
  );
}

function orderGeocoderResultsByRoadPrefix(
  results: GeocoderSearchResult[],
  query: string,
): GeocoderSearchResult[] {
  const queryNorm = normalizeForLexicalMatch(query);
  const roadMatches: GeocoderSearchResult[] = [];
  const other: GeocoderSearchResult[] = [];

  for (const result of results) {
    if (geocoderRoadStartsWithQuery(result, queryNorm)) {
      roadMatches.push(result);
    } else {
      other.push(result);
    }
  }

  return roadMatches.length > 0 ? [...roadMatches, ...other] : results;
}

function mergeAndRankCandidates(
  constrainedCandidates: SearchAddressCandidate[],
  unconstrainedCandidates: SearchAddressCandidate[],
  context: SearchQueryContext,
  query: string,
): SearchAddressCandidate[] {
  const merged = new Map<string, SearchAddressCandidate>();

  for (const candidate of [...constrainedCandidates, ...unconstrainedCandidates]) {
    const key = `${candidate.label.toLowerCase()}::${candidate.lat.toFixed(5)}::${candidate.lng.toFixed(5)}`;
    const existing = merged.get(key);
    if (!existing || (candidate.score ?? 0) > (existing.score ?? 0)) {
      merged.set(key, candidate);
    }
  }

  return [...merged.values()].sort((left, right) =>
    compareCandidateRank(left, right, context, query),
  );
}

function startsWithQueryPrefix(label: string, query: string): boolean {
  const normalizedLabel = label
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!normalizedLabel || !normalizedQuery) return false;

  const firstToken = normalizedLabel.split(/\s+/).find(Boolean) ?? '';
  return firstToken.startsWith(normalizedQuery);
}

async function loadProjectSizeSignals(
  supabase: SupabaseService,
  projectIds: string[],
  organizationId?: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (projectIds.length === 0) return counts;

  let request = supabase.client
    .from('media_projects')
    .select('project_id')
    .in('project_id', projectIds);

  if (organizationId) {
    request = request.eq('organization_id', organizationId);
  }

  const response = await request;
  if (response.error || !Array.isArray(response.data)) return counts;

  for (const row of response.data as Array<{ project_id: string | null }>) {
    if (!row.project_id) continue;
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }

  return counts;
}

function isStreetLevelResult(result: GeocoderSearchResult): boolean {
  const addr = result.address;
  if (!addr) return true;
  const hasCity = !!(addr.city || addr.town || addr.village || addr.municipality);
  const hasRoad = !!addr.road;
  return hasCity || hasRoad;
}
