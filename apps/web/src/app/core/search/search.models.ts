export type SearchState =
  | 'idle'
  | 'focused-empty'
  | 'typing'
  | 'results-partial'
  | 'results-complete'
  | 'committed';

export type SearchResultFamily =
  | 'db-address'
  | 'db-content'
  | 'geocoder'
  | 'command'
  | 'recent'
  | 'operator-suggestion';

export type SearchOperatorPrefix = '#' | '+' | '-';

export type SearchContentType = 'photo' | 'project' | 'metadata';

export interface SearchQueryContext {
  organizationId?: string;
  activeProjectId?: string;
  activeMarkerCentroid?: { lat: number; lng: number };
  activeProjectCentroid?: { lat: number; lng: number };
  currentLocation?: { lat: number; lng: number };
  viewportBounds?: {
    north: number;
    east: number;
    south: number;
    west: number;
  };
  dataCentroid?: { lat: number; lng: number };
  countryCodes?: string[];
  userLocationPriors?: Array<{ key: string; lat: number; lng: number; weight: number }>;
  projectLocationPriors?: Array<{ key: string; lat: number; lng: number; weight: number }>;
  recencySignals?: {
    last24hWeight?: number;
    last30dWeight?: number;
    last180dWeight?: number;
  };
  activeFilterCount?: number;
  commandMode?: boolean;
}

export interface SearchBaseCandidate {
  id: string;
  stableId?: string;
  label: string;
  secondaryLabel?: string;
  family: SearchResultFamily;
  score?: number;
  textScore?: number;
  geoScore?: number;
  projectScore?: number;
  recencyScore?: number;
  sourceUtilityScore?: number;
  qualityScore?: number;
  noisePenalty?: number;
  totalScore?: number;
  confidenceLabel?: 'high' | 'medium' | 'low';
  explanationTags?: string[];
}

export interface SearchAddressCandidate extends SearchBaseCandidate {
  family: 'db-address' | 'geocoder';
  lat: number;
  lng: number;
  confidence?: 'exact' | 'closest' | 'approximate';
  imageCount?: number;
}

export interface SearchContentCandidate extends SearchBaseCandidate {
  family: 'db-content';
  contentType: SearchContentType;
  contentId: string;
  subtitle?: string;
}

export interface SearchCommandCandidate extends SearchBaseCandidate {
  family: 'command';
  command: 'upload' | 'clear-filters' | 'go-to-location' | 'create-qr-invite';
  payload?: string;
}

export interface SearchRecentCandidate extends SearchBaseCandidate {
  family: 'recent';
  lastUsedAt: string;
  projectId?: string;
  usageCount?: number;
}

export interface SearchOperatorSuggestionCandidate extends SearchBaseCandidate {
  family: 'operator-suggestion';
  operator: SearchOperatorPrefix;
  keyword: string;
  providerId: string;
}

export type SearchCandidate =
  | SearchAddressCandidate
  | SearchContentCandidate
  | SearchCommandCandidate
  | SearchRecentCandidate
  | SearchOperatorSuggestionCandidate;

export interface SearchFilterChip {
  id: string;
  providerId: string;
  family: SearchResultFamily;
  label: string;
  value: string;
  active: boolean;
}

export interface SearchSection {
  family: SearchResultFamily;
  title: string;
  items: SearchCandidate[];
  loading?: boolean;
}

export interface SearchResultSet {
  query: string;
  state: SearchState;
  sections: SearchSection[];
  empty: boolean;
}

export type SearchCommitAction =
  | {
      type: 'map-center';
      query: string;
      lat: number;
      lng: number;
    }
  | {
      type: 'open-content';
      query: string;
      contentType: SearchContentType;
      contentId: string;
    }
  | {
      type: 'run-command';
      query: string;
      command: SearchCommandCandidate['command'];
      payload?: string;
    }
  | {
      type: 'recent-selected';
      query: string;
      label: string;
    }
  | {
      type: 'filter-chip-toggle';
      query: string;
      chip: SearchFilterChip;
      removed: boolean;
    };

export interface SearchEngineOptions {
  debounceMs: number;
  cacheTtlMs: number;
  recentMaxItems: number;
  geocoderDedupMeters: number;
  maxGeocoderSectionItems: number;
}

export const DEFAULT_SEARCH_ENGINE_OPTIONS: SearchEngineOptions = {
  debounceMs: 300,
  cacheTtlMs: 5 * 60 * 1000,
  recentMaxItems: 8,
  geocoderDedupMeters: 30,
  maxGeocoderSectionItems: 3,
};

/** @deprecated Replaced by SearchEngineOptions; kept for SearchBarService.orchestratorOptionsFromOrg(). */
export interface SearchOrchestratorOptions {
  debounceMs: number;
  cacheTtlMs: number;
  recentMaxItems: number;
  geocoderDedupMeters: number;
}

/** @deprecated Replaced by DEFAULT_SEARCH_ENGINE_OPTIONS; kept for orchestratorOptionsFromOrg(). */
export const DEFAULT_SEARCH_ORCHESTRATOR_OPTIONS: SearchOrchestratorOptions = {
  debounceMs: DEFAULT_SEARCH_ENGINE_OPTIONS.debounceMs,
  cacheTtlMs: DEFAULT_SEARCH_ENGINE_OPTIONS.cacheTtlMs,
  recentMaxItems: DEFAULT_SEARCH_ENGINE_OPTIONS.recentMaxItems,
  geocoderDedupMeters: DEFAULT_SEARCH_ENGINE_OPTIONS.geocoderDedupMeters,
};
