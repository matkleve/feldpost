/**
 * Pure helpers for query composition and result post-filtering.
 * @see docs/specs/service/address-field-suggest/address-field-suggest.md
 */

import type { AddressFieldKind, AddressFieldContext, AddressFieldSuggestion } from './address-field-suggest.types';
import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import { computeTextMatchScore } from '../search/search-query';

// ── Query composition ─────────────────────────────────────────────────────────

/**
 * Build the composite free-form `q` string for Nominatim given the field and context.
 * Null/empty context segments are omitted; no trailing commas.
 */
export function buildCompositeQuery(
  field: AddressFieldKind,
  query: string,
  context: AddressFieldContext,
): string {
  if (field === 'country') return query;

  const parts: string[] = [query];

  if (field === 'street' || field === 'district') {
    if (context.city) parts.push(context.city);
    if (field === 'street' && context.district) parts.push(context.district);
  }

  if (field === 'city' || field === 'street' || field === 'district') {
    if (context.country) parts.push(context.country);
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * Build a ±0.1 degree viewbox string for GPS-constrained street queries.
 * Format: west,north,east,south
 */
export function buildViewbox(lat: number, lng: number): string {
  const delta = 0.1;
  return `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;
}

// ── Result extraction per field ───────────────────────────────────────────────

/**
 * Extract the relevant address component value from a geocoder hit for a given field.
 * Returns null if the expected component is absent.
 */
export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  if (!addr) return null;

  switch (field) {
    case 'city':
      return addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? null;
    case 'district': {
      // GeocoderSearchResult.address only has the subset defined in geocoding.service.ts.
      // Cast to access extended Nominatim fields present at runtime.
      const extended = addr as Record<string, string | undefined>;
      return (
        extended['city_district'] ??
        extended['suburb'] ??
        extended['borough'] ??
        extended['quarter'] ??
        null
      );
    }
    case 'street':
      return addr.road ?? null;
    case 'country':
      return addr.country ?? null;
    default:
      return null;
  }
}

/**
 * Build a subtitle line for a suggestion (e.g. "Vienna, Austria" for a street result).
 */
export function buildSubtitle(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | undefined {
  const addr = result.address;
  if (!addr) return undefined;

  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality;

  switch (field) {
    case 'street':
    case 'district':
      return city && addr.country
        ? `${city}, ${addr.country}`
        : city ?? addr.country ?? undefined;
    case 'city':
      return addr.country ?? undefined;
    default:
      return undefined;
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Score a geocoder hit for a given field and query.
 * Combines lexical match against the extracted value with Nominatim importance.
 */
export function scoreGeocoderHit(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
  query: string,
): number {
  const value = extractFieldValue(result, field);
  if (!value) return 0;
  const lexical = computeTextMatchScore(value, query);
  const importance = result.importance ?? 0.5;
  return lexical * importance;
}

// ── Filtering ─────────────────────────────────────────────────────────────────

/** Minimum score for a geocoder hit to be included. */
export const MIN_GEOCODER_SCORE = 0.25;

/**
 * Filter and map geocoder results to AddressFieldSuggestion[] for the given field.
 * Drops hits that lack the relevant address component or score below threshold.
 */
export function filterAndMapGeocoderHits(
  results: GeocoderSearchResult[],
  field: AddressFieldKind,
  query: string,
  context: AddressFieldContext,
): AddressFieldSuggestion[] {
  const suggestions: AddressFieldSuggestion[] = [];

  for (const result of results) {
    const value = extractFieldValue(result, field);
    if (!value) continue;

    // Country constraint: drop results that don't match context country code
    if (context.countryCode) {
      const resultCode = result.address?.country_code?.toLowerCase();
      if (resultCode && resultCode !== context.countryCode.toLowerCase()) continue;
    }

    const score = scoreGeocoderHit(result, field, query);
    if (score < MIN_GEOCODER_SCORE) continue;

    suggestions.push({
      value,
      subtitle: buildSubtitle(result, field),
      source: 'geocoder',
      score,
    });
  }

  return suggestions;
}

// ── Deduplication ─────────────────────────────────────────────────────────────

/** Normalize a value for dedup comparison. */
export function normalizeForDedup(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Remove duplicate suggestions by normalized value.
 * Keeps the first occurrence (DB results come first, so they win).
 */
export function deduplicateSuggestions(
  suggestions: AddressFieldSuggestion[],
): AddressFieldSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    const key = normalizeForDedup(s.value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
