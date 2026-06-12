/**
 * search-bar-resolvers — guards and basic request options.
 *
 * Ranking:      search-bar-resolvers.ranking.spec.ts
 * Locality:     search-bar-resolvers.locality.spec.ts
 * House numbers: search-bar-resolvers.housenumber.spec.ts
 */
import { describe, expect, it } from 'vitest';
import { fetchGeocoderCandidates, searchContextFromClusterViewbox } from './search-bar-resolvers';
import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import type { SearchAddressCandidate } from './search.models';

describe('searchContextFromClusterViewbox', () => {
  it('maps Nominatim viewbox string to viewportBounds', () => {
    const context = searchContextFromClusterViewbox({}, '16.2,48.3,16.5,48.1');
    expect(context.viewportBounds).toEqual({
      west: 16.2,
      north: 48.3,
      east: 16.5,
      south: 48.1,
    });
  });
});

describe('fetchGeocoderCandidates – guards', () => {
  it('returns empty for queries shorter than 3 chars', async () => {
    const geocodingService = {
      search: async () => [] as GeocoderSearchResult[],
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wi',
      {},
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results).toEqual([]);
  });

  it('passes constrained country/viewbox options on the first call', async () => {
    const calls: Array<Record<string, unknown> | undefined> = [];
    const geocodingService = {
      search: async (_query: string, options?: Record<string, unknown>) => {
        calls.push(options);
        return [] as GeocoderSearchResult[];
      },
    };

    await fetchGeocoderCandidates(
      geocodingService as never,
      'wilhe',
      {
        countryCodes: ['at'],
        viewportBounds: { north: 48.25, east: 16.45, south: 48.12, west: 16.2 },
      },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toEqual(
      expect.objectContaining({
        countrycodes: ['at'],
        viewbox: '16.2,48.25,16.45,48.12',
        limit: 15,
        bounded: false,
        addressLayer: false,
      }),
    );
  });

  it('keeps addressLayer for non-ambiguous street queries', async () => {
    const calls: Array<Record<string, unknown> | undefined> = [];
    const geocodingService = {
      search: async (_query: string, options?: Record<string, unknown>) => {
        calls.push(options);
        return [] as GeocoderSearchResult[];
      },
    };

    await fetchGeocoderCandidates(
      geocodingService as never,
      'denisgasse',
      { countryCodes: ['at'] },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(calls[0]?.['addressLayer']).toBe(true);
  });
});
