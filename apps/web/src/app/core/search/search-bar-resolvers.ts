import {
  GeocodingService,
  GeocoderSearchOptions,
  GeocoderSearchResult,
} from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  SearchAddressCandidate,
  SearchContentCandidate,
  SearchQueryContext,
} from './search.models';
import { computeTextMatchScore } from './search-query';
import { distanceToSearchContextMeters, isInViewport, toSizeSignal } from './search-bar-helpers';
import { logGeocoderResolverStage } from './search-debug';

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
): Promise<SearchAddressCandidate[]> {
  if (normalizedQuery.length < 3) return [];

  const constrainedOptions = buildConstrainedSearchOptions(
    context,
    maxGeocoderResults,
    normalizedQuery,
  );
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
    maxGeocoderResults,
  );

  const shouldRetry = shouldRunUnconstrainedRetry(normalizedQuery, context, constrainedCandidates);
  logGeocoderResolverStage('retry-decision', {
    query: normalizedQuery,
    shouldRetry,
    constrainedTop: constrainedCandidates.slice(0, 3).map((candidate) => ({
      label: candidate.label,
      score: candidate.score,
      distanceMeters: distanceToSearchContextMeters(candidate, context),
    })),
  });

  if (!shouldRetry) {
    return constrainedCandidates;
  }

  logGeocoderResolverStage('unconstrained-request', {
    query: normalizedQuery,
    options: { limit: maxGeocoderResults * 3 },
  });
  const unconstrainedResults = await geocodingService.search(normalizedQuery, {
    limit: maxGeocoderResults * 3,
  });
  logGeocoderResolverStage('unconstrained-response', {
    query: normalizedQuery,
    count: unconstrainedResults.length,
    labels: unconstrainedResults.slice(0, 20).map((result) => result.displayName),
  });

  const unconstrainedCandidates = rankGeocoderCandidates(
    unconstrainedResults,
    normalizedQuery,
    context,
    toCandidate,
    maxGeocoderResults * 3,
  );

  const merged = mergeAndRankCandidates(
    constrainedCandidates,
    unconstrainedCandidates,
    context,
    normalizedQuery,
  ).slice(0, maxGeocoderResults);

  logGeocoderResolverStage('final-ranked', {
    query: normalizedQuery,
    top: merged.slice(0, 3).map((candidate) => ({
      label: candidate.label,
      score: candidate.score,
      distanceMeters: distanceToSearchContextMeters(candidate, context),
    })),
  });

  return merged;
}

function buildConstrainedSearchOptions(
  context: SearchQueryContext,
  maxGeocoderResults: number,
  query: string,
): GeocoderSearchOptions {
  const useShortPrefixHeadroom = !!context.viewportBounds && isShortAmbiguousPrefixQuery(query);
  const searchOptions: GeocoderSearchOptions = {
    limit: useShortPrefixHeadroom ? Math.max(maxGeocoderResults * 4, 12) : maxGeocoderResults,
  };
  if (context.countryCodes?.length) {
    searchOptions.countrycodes = context.countryCodes;
  }
  if (context.viewportBounds) {
    const b = context.viewportBounds;
    searchOptions.viewbox = `${b.west},${b.north},${b.east},${b.south}`;
    searchOptions.bounded = true;
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
): SearchAddressCandidate[] {
  const streetLevelResults = rawResults.filter((r) => isStreetLevelResult(r));
  if (streetLevelResults.length === 0) return [];

  const localizedResults = streetLevelResults.filter((result) =>
    matchesCountryConstraint(result, context),
  );

  const lexicalResults = localizedResults.filter((result) =>
    meetsLexicalMatchThreshold(result, normalizedQuery),
  );

  logGeocoderResolverStage('candidate-filter', {
    query: normalizedQuery,
    raw: rawResults.length,
    streetLevel: streetLevelResults.length,
    localized: localizedResults.length,
    lexical: lexicalResults.length,
  });

  if (lexicalResults.length === 0) return [];

  return lexicalResults
    .map((result, index) => toCandidate(result, normalizedQuery, index, context))
    .filter((candidate) => (candidate.score ?? 0) > 0.01)
    .sort((left, right) => compareCandidateRank(left, right, context, normalizedQuery))
    .slice(0, limit);
}

function matchesCountryConstraint(
  result: GeocoderSearchResult,
  context: SearchQueryContext,
): boolean {
  const allowedCountryCodes = context.countryCodes?.map((code) => code.toLowerCase()) ?? [];
  if (allowedCountryCodes.length === 0) {
    if (isCoordinateInViewport(result.lat, result.lng, context.viewportBounds)) {
      return true;
    }

    const contextDistance = distanceFromContextMeters(result.lat, result.lng, context);
    return contextDistance <= 120000;
  }

  const resultCountryCode = result.address?.country_code?.toLowerCase();
  if (resultCountryCode && allowedCountryCodes.includes(resultCountryCode)) {
    return true;
  }

  return isCoordinateInViewport(result.lat, result.lng, context.viewportBounds);
}

function meetsLexicalMatchThreshold(
  result: GeocoderSearchResult,
  normalizedQuery: string,
): boolean {
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

    if (matchedTokens === queryTokens.length && bestScore >= 0.35) {
      return true;
    }
  }

  return bestScore >= minimumLexicalScore(normalizedQuery);
}

function normalizeForLexicalMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

function minimumLexicalScore(query: string): number {
  if (query.length <= 4) return 0.6;
  if (query.length <= 6) return 0.7;
  if (query.length <= 9) return 0.8;
  return 0.9;
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
): boolean {
  if (!context.countryCodes?.length && !context.viewportBounds) {
    return false;
  }

  if (!isShortAmbiguousPrefixQuery(normalizedQuery)) {
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

  const clearlyRemote = topDistance > 60000;
  const weakTopScore = (top.score ?? 0) < 0.75;
  return clearlyRemote || weakTopScore;
}

function isShortAmbiguousPrefixQuery(query: string): boolean {
  return query.length >= 3 && query.length <= 6 && !query.includes(' ');
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
