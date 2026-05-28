/**
 * Org-level search tuning config (merged system defaults + org overrides).
 * @see docs/specs/ui/search-bar/search-tuning-settings.md
 */

export const SEARCH_TUNING_SETTINGS_VERSION = 1;

export interface CountryBounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export interface SearchTuningOrchestratorConfig {
  debounceMs: number;
  cacheTtlMs: number;
  recentMaxItems: number;
  geocoderDedupMeters: number;
}

export interface SearchTuningResolverConfig {
  enableInternetSearch: boolean;
  minQueryLength: number;
  maxGeocoderResults: number;
  maxDbAddressResults: number;
  maxDbContentResults: number;
  constrainedLimitMultiplier: number;
  shortPrefixLimitFloor: number;
  /**
   * Max distance from geographic search anchor (meters). UI: Settings → Search Tuning →
   * "Max distance for internet results (km)" — slider shows km, persistence is always meters.
   * Drops unrealistic Internet/search hits without country when beyond cap; normative for
   * upload forward-geocode far-hit rejection (same org merged config).
   * NOT `exifAssistRadiusMeters` (upload-local meters, fine-pick among candidates).
   * @see docs/specs/service/search/search-tuning.distance-radii-contract.md
   */
  contextDistanceMaxMeters: number;
  remoteTopDistanceMeters: number;
  weakTopScoreThreshold: number;
  shortPrefixLenMin: number;
  shortPrefixLenMax: number;
  candidateScoreFloor: number;
  lexicalLenLe4: number;
  lexicalLen5to6: number;
  lexicalLen7to9: number;
  lexicalLenGe10: number;
  lexicalSpecificStreet: number;
  multiTokenExactMinScore: number;
  countryBounds: Record<string, CountryBounds>;
}

export interface SearchTuningScoringWeights {
  text: number;
  geo: number;
  quality: number;
  country: number;
}

export interface SearchTuningScoringConfig {
  shortPrefixAmbiguousTextScoreLt: number;
  weightsShortPrefix: SearchTuningScoringWeights;
  weightsNormal: SearchTuningScoringWeights;
  countryBoostIn: number;
  countryBoostOut: number;
  countryBoostNeutral: number;
  penaltyOutOfViewOutCountry: number;
  penaltyOutOfViewInCountry: number;
  penaltyGeoLt015: number;
  penaltyGeoLt030: number;
  penaltyPrefixNotMatching: number;
}

export interface SearchTuningQueryConfig {
  specificStreetMinLength: number;
  prefixBackoffMaxCuts: number;
  prefixBackoffMinRetainedLength: number;
  displayNameTruncateLength: number;
}

export interface SearchTuningProviderConfig {
  geocodeSearchDefaultLimit: number;
  geocodeMaxProxyAttempts: number;
  geocodeAuthFailureCooldownMs: number;
  geocodeLogDedupWindowMs: number;
  geocodeCacheTtlMs: number;
  nominatimMinIntervalMs: number;
}

export interface SearchTuningConfig {
  settingsVersion: number;
  orchestrator: SearchTuningOrchestratorConfig;
  resolver: SearchTuningResolverConfig;
  scoring: SearchTuningScoringConfig;
  query: SearchTuningQueryConfig;
  provider: SearchTuningProviderConfig;
}

/** Partial overrides stored in org_search_tuning_profiles.values_json */
export type SearchTuningValuesJson = {
  orchestrator?: Partial<SearchTuningOrchestratorConfig>;
  resolver?: Partial<SearchTuningResolverConfig>;
  scoring?: Partial<SearchTuningScoringConfig>;
  query?: Partial<SearchTuningQueryConfig>;
  provider?: Partial<SearchTuningProviderConfig>;
};

export interface OrgSearchTuningRow {
  organization_id: string;
  settings_version: number;
  values_json: SearchTuningValuesJson | null;
  updated_at: string;
  updated_by: string | null;
}
