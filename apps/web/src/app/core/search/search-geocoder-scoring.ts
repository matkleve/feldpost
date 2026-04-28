import type { SearchQueryContext } from './search.models';
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
  geoScore: number,
  primaryLabel: string,
): number {
  if (!isShortAmbiguousPrefixQuery(query, textScore)) return 0;

  return (
    locationPenalty(inViewport, countryBoost) +
    geoPenalty(geoScore) +
    prefixPenalty(primaryLabel, query)
  );
}

export function computeGeocoderWeightedScore(
  query: string,
  textScore: number,
  geoScore: number,
  qualityScore: number,
  countryScore: number,
  noisePenalty: number,
): number {
  const isShortPrefix = query.length >= 3 && query.length <= 6 && !query.includes(' ');
  const textWeight = isShortPrefix ? 0.35 : 0.5;
  const geoWeight = isShortPrefix ? 0.45 : 0.3;
  const qualityWeight = isShortPrefix ? 0.1 : 0.15;
  const countryWeight = isShortPrefix ? 0.1 : 0.05;

  return (
    textScore * textWeight +
    geoScore * geoWeight +
    qualityScore * qualityWeight +
    countryScore * countryWeight -
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

function isShortAmbiguousPrefixQuery(query: string, textScore: number): boolean {
  return query.length >= 3 && query.length <= 6 && !query.includes(' ') && textScore < 0.95;
}

function locationPenalty(inViewport: boolean, countryBoost: number): number {
  if (inViewport) return 0;
  return countryBoost < 1 ? 0.25 : 0.15;
}

function geoPenalty(geoScore: number): number {
  if (geoScore < 0.15) return 0.3;
  if (geoScore < 0.3) return 0.2;
  return 0;
}

function prefixPenalty(primaryLabel: string, query: string): number {
  return startsWithQueryPrefix(primaryLabel, query) ? 0 : 0.45;
}
