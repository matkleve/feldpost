import {
  GeocodingService,
  GeocoderSearchOptions,
  GeocoderSearchResult,
} from '../geocoding.service';
import { SupabaseService } from '../supabase.service';
import {
  SearchAddressCandidate,
  SearchContentCandidate,
  SearchQueryContext,
} from './search.models';
import { computeTextMatchScore } from './search-query';
import { distanceToCentroidMeters, isInViewport, toSizeSignal } from './search-bar-helpers';

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
    .ilike('name', `%${trimmedQuery}%`)
    .limit(maxDbContentResults);

  if (context.organizationId) {
    projectsQuery = projectsQuery.eq('organization_id', context.organizationId);
  }

  const [projectsResponse, groupsResponse] = await Promise.all([
    projectsQuery,
    supabase.client
      .from('saved_groups')
      .select('id,name')
      .ilike('name', `%${trimmedQuery}%`)
      .limit(maxDbContentResults),
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
    loadProjectSizeSignals(
      supabase,
      projectRows.map((row) => row.id),
      context.organizationId,
    ),
    loadGroupSizeSignals(
      supabase,
      groupRows.map((row) => row.id),
    ),
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
    .slice(0, maxDbContentResults);
}

export async function fetchGeocoderCandidates(
  geocodingService: GeocodingService,
  normalizedQuery: string,
  context: SearchQueryContext,
  maxGeocoderResults: number,
  buildFallbackQueries: (query: string) => string[],
  toCandidate: (
    result: GeocoderSearchResult,
    query: string,
    index: number,
    context: SearchQueryContext,
  ) => SearchAddressCandidate,
): Promise<SearchAddressCandidate[]> {
  if (normalizedQuery.length < 3) return [];

  const searchOptions: GeocoderSearchOptions = { limit: maxGeocoderResults };
  if (context.countryCodes?.length) {
    searchOptions.countrycodes = context.countryCodes;
  }
  if (context.viewportBounds) {
    const b = context.viewportBounds;
    searchOptions.viewbox = `${b.west},${b.north},${b.east},${b.south}`;
    searchOptions.bounded = true;
  }

  const queries = [normalizedQuery, ...buildFallbackQueries(normalizedQuery)];
  for (const currentQuery of queries) {
    const results = await geocodingService.search(currentQuery, searchOptions);
    if (results.length > 0) {
      return results
        .filter((r) => isStreetLevelResult(r))
        .map((result, index) => toCandidate(result, currentQuery, index, context))
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
        .slice(0, maxGeocoderResults);
    }
  }

  return [];
}

async function loadProjectSizeSignals(
  supabase: SupabaseService,
  projectIds: string[],
  organizationId?: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (projectIds.length === 0) return counts;

  let request = supabase.client.from('images').select('project_id').in('project_id', projectIds);

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

async function loadGroupSizeSignals(
  supabase: SupabaseService,
  groupIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (groupIds.length === 0) return counts;

  const response = await supabase.client
    .from('saved_group_images')
    .select('group_id')
    .in('group_id', groupIds);

  if (response.error || !Array.isArray(response.data)) return counts;

  for (const row of response.data as SavedGroupImageRow[]) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
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
