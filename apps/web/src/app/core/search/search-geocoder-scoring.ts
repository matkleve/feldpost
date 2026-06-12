import type { SearchQueryContext } from './search.models';
import { isInViewport } from './search-bar-helpers';
import { SEARCH_TUNING_SYSTEM_DEFAULTS } from './search-tuning.defaults';
import type { SearchTuningScoringConfig } from './search-tuning.types';
import { computeTextMatchScore } from './search-query';

export function computeGeocoderTextScore(
  primaryLabel: string,
  formatted: string,
  query: string,
): number {
  return Math.max(
    computeTextMatchScore(primaryLabel, query),
    computeTextMatchScore(formatted, query),
  );
}

export function isCandidateInViewport(
  label: string,
  lat: number,
  lng: number,
  context: SearchQueryContext,
): boolean {
  return isInViewport(
    {
      id: 'geo-view-check',
      family: 'geocoder',
      label,
      lat,
      lng,
    },
    context.viewportBounds,
  );
}

export function computeShortPrefixNoisePenalty(
  query: string,
  textScore: number,
  inViewport: boolean,
  countryBoost: number,
  geoScore: number,
  primaryLabel: string,
  scoring: SearchTuningScoringConfig = SEARCH_TUNING_SYSTEM_DEFAULTS.scoring,
): number {
  if (!isShortAmbiguousPrefixQuery(query, textScore, scoring)) return 0;

  return (
    locationPenalty(inViewport, countryBoost, scoring) +
    geoPenalty(geoScore, scoring) +
    prefixPenalty(primaryLabel, query, scoring)
  );
}

export function computeGeocoderWeightedScore(
  query: string,
  textScore: number,
  geoScore: number,
  qualityScore: number,
  countryScore: number,
  noisePenalty: number,
  scoring: SearchTuningScoringConfig = SEARCH_TUNING_SYSTEM_DEFAULTS.scoring,
): number {
  const isShortPrefix = query.length >= 3 && query.length <= 6 && !query.includes(' ');
  const weights = isShortPrefix ? scoring.weightsShortPrefix : scoring.weightsNormal;

  return (
    textScore * weights.text +
    geoScore * weights.geo +
    qualityScore * weights.quality +
    countryScore * weights.country -
    noisePenalty
  );
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function startsWithQueryPrefix(label: string, query: string): boolean {
  const normalizedLabel = normalize(label);
  const normalizedQuery = normalize(query);
  if (!normalizedLabel || !normalizedQuery) return false;

  const firstToken = normalizedLabel.split(/\s+/).find(Boolean) ?? '';
  return firstToken.startsWith(normalizedQuery);
}

function normalize(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isShortAmbiguousPrefixQuery(
  query: string,
  textScore: number,
  scoring: SearchTuningScoringConfig,
): boolean {
  return (
    query.length >= 3 &&
    query.length <= 6 &&
    !query.includes(' ') &&
    textScore < scoring.shortPrefixAmbiguousTextScoreLt
  );
}

function locationPenalty(
  inViewport: boolean,
  countryBoost: number,
  scoring: SearchTuningScoringConfig,
): number {
  if (inViewport) return 0;
  return countryBoost < 1
    ? scoring.penaltyOutOfViewOutCountry
    : scoring.penaltyOutOfViewInCountry;
}

function geoPenalty(geoScore: number, scoring: SearchTuningScoringConfig): number {
  if (geoScore < 0.15) return scoring.penaltyGeoLt015;
  if (geoScore < 0.3) return scoring.penaltyGeoLt030;
  return 0;
}

function prefixPenalty(
  primaryLabel: string,
  query: string,
  scoring: SearchTuningScoringConfig,
): number {
  return startsWithQueryPrefix(primaryLabel, query) ? 0 : scoring.penaltyPrefixNotMatching;
}
