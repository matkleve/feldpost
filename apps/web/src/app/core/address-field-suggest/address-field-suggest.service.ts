/**
 * AddressFieldSuggestService — per-field, hierarchically-constrained address suggestions.
 *
 * - Country: instant client-side ISO filter, no network.
 * - City/district/street: DB-first (org media_items) + Nominatim via GeocodingService.
 * - Results are cached per (field, query, context key) for 2 minutes.
 * - Never throws; returns [] on failure.
 *
 * @see docs/specs/service/address-field-suggest/address-field-suggest.md
 */

import { Injectable, inject } from '@angular/core';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  AddressFieldKind,
  AddressFieldContext,
  AddressFieldSuggestion,
  CountrySuggestion,
} from './address-field-suggest.types';
import { deduplicateSuggestions } from './address-field-suggest.helpers';
import { fetchNominatimFieldSuggestions } from './adapters/nominatim-field-suggest.adapter';
import { fetchOrgFieldSuggestions } from './adapters/org-address-field-suggest.adapter';
import { ISO_COUNTRIES, isoCodeFromCountryName } from './data/iso-countries';

/** Cache TTL: 2 minutes. */
const CACHE_TTL_MS = 2 * 60 * 1000;
/** Max combined results returned. */
const MAX_RESULTS = 8;
/** Min query chars before Nominatim call for city/district/street. */
const MIN_CHARS_FOR_NETWORK = 2;

interface CacheEntry {
  data: AddressFieldSuggestion[];
  expires: number;
}

@Injectable({ providedIn: 'root' })
export class AddressFieldSuggestService {
  private readonly geocodingService = inject(GeocodingService);
  private readonly supabase = inject(SupabaseService);

  private readonly cache = new Map<string, CacheEntry>();

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Suggest values for a single address field.
   * DB-org results appear first (up to 5), then geocoder results, deduped by normalized value.
   * Returns [] on empty query or network failure — never throws.
   */
  async suggest(
    field: AddressFieldKind,
    query: string,
    context: AddressFieldContext,
  ): Promise<AddressFieldSuggestion[]> {
    const trimmed = query.trim();

    // Country is purely synchronous
    if (field === 'country') {
      return this.filterCountries(trimmed).map((c) => ({
        value: c.name,
        source: 'geocoder' as const,
        score: 1,
        countryCode: c.code,
      }));
    }

    if (!trimmed || trimmed.length < MIN_CHARS_FOR_NETWORK) return [];

    const cacheKey = this.buildCacheKey(field, trimmed, context);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const [orgResults, geocoderResults] = await Promise.all([
      fetchOrgFieldSuggestions(field, trimmed, context, this.supabase.client),
      fetchNominatimFieldSuggestions(field, trimmed, context, this.geocodingService),
    ]);

    // DB-first: org results precede geocoder results; dedup drops geocoder duplicates
    const merged = deduplicateSuggestions([...orgResults, ...geocoderResults]).slice(0, MAX_RESULTS);

    this.cache.set(cacheKey, { data: merged, expires: Date.now() + CACHE_TTL_MS });
    return merged;
  }

  /**
   * Synchronous country filter — no network call.
   * Returns ISO entries matching the query by name prefix/substring or ISO code.
   */
  filterCountries(query: string): CountrySuggestion[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [...ISO_COUNTRIES];

    return ISO_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().startsWith(trimmed) ||
        c.name.toLowerCase().includes(trimmed) ||
        c.code === trimmed,
    ).slice(0, 20);
  }

  /**
   * Derive ISO alpha-2 code from a stored country name string.
   * Returns null if not found.
   */
  countryCodeFromName(countryName: string | null | undefined): string | null {
    if (!countryName) return null;
    return isoCodeFromCountryName(countryName);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private buildCacheKey(
    field: AddressFieldKind,
    query: string,
    context: AddressFieldContext,
  ): string {
    return [
      field,
      query.toLowerCase(),
      context.countryCode?.toLowerCase() ?? '',
      context.city?.toLowerCase() ?? '',
      context.district?.toLowerCase() ?? '',
    ].join(':');
  }
}

// Re-export types so consumers only need one import
export type {
  AddressFieldKind,
  AddressFieldContext,
  AddressFieldSuggestion,
  CountrySuggestion,
} from './address-field-suggest.types';
export { isoCodeFromCountryName } from './data/iso-countries';
