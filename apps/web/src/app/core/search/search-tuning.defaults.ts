/**
 * Immutable system defaults for search tuning (settings_version = 1).
 * @see docs/specs/service/location-resolver/search-algorithm-addresses-and-places.md §7
 */

import {
  SEARCH_TUNING_SETTINGS_VERSION,
  type SearchTuningConfig,
} from './search-tuning.types';

export const SEARCH_TUNING_SYSTEM_DEFAULTS: SearchTuningConfig = {
  settingsVersion: SEARCH_TUNING_SETTINGS_VERSION,
  orchestrator: {
    debounceMs: 300,
    cacheTtlMs: 5 * 60 * 1000,
    recentMaxItems: 8,
    geocoderDedupMeters: 30,
  },
  resolver: {
    minQueryLength: 3,
    maxGeocoderResults: 3,
    maxDbAddressResults: 3,
    maxDbContentResults: 6,
    constrainedLimitMultiplier: 4,
    shortPrefixLimitFloor: 12,
    contextDistanceMaxMeters: 120_000,
    remoteTopDistanceMeters: 60_000,
    weakTopScoreThreshold: 0.75,
    shortPrefixLenMin: 3,
    shortPrefixLenMax: 6,
    candidateScoreFloor: 0.01,
    lexicalLenLe4: 0.6,
    lexicalLen5to6: 0.7,
    lexicalLen7to9: 0.8,
    lexicalLenGe10: 0.85,
    lexicalSpecificStreet: 0.7,
    multiTokenExactMinScore: 0.35,
    countryBounds: {
      at: { latMin: 46.3, latMax: 49.1, lngMin: 9.4, lngMax: 17.2 },
    },
  },
  scoring: {
    shortPrefixAmbiguousTextScoreLt: 0.95,
    weightsShortPrefix: { text: 0.35, geo: 0.45, quality: 0.1, country: 0.1 },
    weightsNormal: { text: 0.5, geo: 0.3, quality: 0.15, country: 0.05 },
    countryBoostIn: 1.6,
    countryBoostOut: 0.7,
    countryBoostNeutral: 1.0,
    penaltyOutOfViewOutCountry: 0.25,
    penaltyOutOfViewInCountry: 0.15,
    penaltyGeoLt015: 0.3,
    penaltyGeoLt030: 0.2,
    penaltyPrefixNotMatching: 0.45,
  },
  query: {
    specificStreetMinLength: 5,
    prefixBackoffMaxCuts: 3,
    prefixBackoffMinRetainedLength: 5,
    displayNameTruncateLength: 60,
  },
  provider: {
    geocodeSearchDefaultLimit: 10,
    geocodeMaxProxyAttempts: 3,
    geocodeAuthFailureCooldownMs: 120_000,
    geocodeLogDedupWindowMs: 30_000,
    geocodeCacheTtlMs: 300_000,
    nominatimMinIntervalMs: 1100,
  },
};
