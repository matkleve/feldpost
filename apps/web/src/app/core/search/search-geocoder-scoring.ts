import { SearchQueryContext } from './search.models';
import { isInViewport } from './search-bar-helpers';
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
): number {
  const isShortAmbiguousPrefix =
    query.length >= 3 && query.length <= 6 && !query.includes(' ') && textScore < 0.95;
  if (!isShortAmbiguousPrefix) return 0;
  if (!inViewport && countryBoost < 1) return 0.2;
  if (!inViewport) return 0.1;
  return 0;
}

export function computeGeocoderWeightedScore(
  textScore: number,
  geoScore: number,
  qualityScore: number,
  countryScore: number,
  noisePenalty: number,
): number {
  return (
    textScore * 0.5 + geoScore * 0.3 + qualityScore * 0.15 + countryScore * 0.05 - noisePenalty
  );
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
