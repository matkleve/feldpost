/**
 * Nominatim adapter for per-field address suggestions.
 * Translates AddressFieldKind + context into GeocodingService.search() calls
 * and post-filters results to the expected address component.
 * @see docs/specs/service/address-field-suggest/adapters/nominatim-field-suggest.adapter.md
 */

import type { AddressFieldKind, AddressFieldContext, AddressFieldSuggestion } from '../address-field-suggest.types';
import type { GeocodingService, GeocoderSearchOptions } from '../../geocoding/geocoding.service';
import {
  buildCompositeQuery,
  buildViewbox,
  filterAndMapGeocoderHits,
} from '../address-field-suggest.helpers';

/** Maximum results to request from Nominatim per field query. */
const NOMINATIM_LIMIT = 10;

/**
 * Fetch Nominatim suggestions for a single address field.
 * Returns [] for country queries (handled by static ISO list).
 * Returns [] on any network failure.
 */
export async function fetchNominatimFieldSuggestions(
  field: AddressFieldKind,
  query: string,
  context: AddressFieldContext,
  geocodingService: GeocodingService,
): Promise<AddressFieldSuggestion[]> {
  // Country is handled by static ISO list — no network call.
  if (field === 'country') return [];

  const compositeQuery = buildCompositeQuery(field, query, context);
  if (!compositeQuery.trim()) return [];

  const options: GeocoderSearchOptions = { limit: NOMINATIM_LIMIT };

  if (context.countryCode) {
    options.countrycodes = [context.countryCode];
  }

  // GPS viewbox only for street queries to get locally relevant results
  if (field === 'street' && context.latitude != null && context.longitude != null) {
    options.viewbox = buildViewbox(context.latitude, context.longitude);
    options.bounded = false; // bounded=true sometimes misses results on city boundary
  }

  try {
    const results = await geocodingService.search(compositeQuery, options);
    return filterAndMapGeocoderHits(results, field, query, context)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  } catch {
    return [];
  }
}
