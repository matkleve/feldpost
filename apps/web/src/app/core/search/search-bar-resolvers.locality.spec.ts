/**
 * search-bar-resolvers — locality: deterministic ordering, remote filtering, POI and AT street hits.
 *
 * Guards/options: search-bar-resolvers.spec.ts
 * Ranking:        search-bar-resolvers.ranking.spec.ts
 * House numbers:  search-bar-resolvers.housenumber.spec.ts
 */
import { describe, expect, it } from 'vitest';
import { fetchGeocoderCandidates } from './search-bar-resolvers';
import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import type { SearchAddressCandidate } from './search.models';

describe('fetchGeocoderCandidates – locality', () => {
  it('keeps deterministic order for equal localness using score then label', async () => {
    const hits: GeocoderSearchResult[] = [
      {
        lat: 48.201,
        lng: 16.33,
        displayName: 'Wilhelminenstrasse A, Wien',
        name: null,
        importance: 0.6,
        address: { road: 'Wilhelminenstrasse A', city: 'Wien', country_code: 'at' },
      },
      {
        lat: 48.2011,
        lng: 16.3301,
        displayName: 'Wilhelminenstrasse B, Wien',
        name: null,
        importance: 0.6,
        address: { road: 'Wilhelminenstrasse B', city: 'Wien', country_code: 'at' },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wilhe',
      { viewportBounds: { north: 48.3, east: 16.4, south: 48.1, west: 16.2 } },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.address?.road ?? result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results.map((r) => r.label)).toEqual(['Wilhelminenstrasse A', 'Wilhelminenstrasse B']);
  });

  it('filters remote results when only viewport context is available', async () => {
    const hits: GeocoderSearchResult[] = [
      {
        lat: 59.9318517,
        lng: 10.5932069,
        displayName: 'Wilh. Wilhelmsens vei, Hosle, Norway',
        name: null,
        importance: 0.5,
        address: {
          road: 'Wilh. Wilhelmsens vei',
          city: 'Hosle',
          country_code: 'no',
          country: 'Norway',
        },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wilh',
      {
        viewportBounds: { north: 48.294, east: 16.508, south: 48.172, west: 16.222 },
        activeProjectCentroid: { lat: 48.233, lng: 16.365 },
        currentLocation: { lat: 48.233, lng: 16.365 },
      },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.address?.road ?? result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results).toEqual([]);
  });

  it('keeps multi-token city-hinted matches when query tokens are covered', async () => {
    const hits: GeocoderSearchResult[] = [
      {
        lat: 48.217,
        lng: 16.314,
        displayName: 'Wilhelmine-Moik-Platz, Leopoldstadt, Vienna, 1020, Austria',
        name: null,
        importance: 0.55,
        address: {
          road: 'Wilhelmine-Moik-Platz',
          city: 'Vienna',
          country_code: 'at',
          country: 'Austria',
        },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wilhe vienna',
      {
        countryCodes: ['at'],
        viewportBounds: { north: 48.294, east: 16.508, south: 48.172, west: 16.222 },
      },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.address?.road ?? result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results.length).toBe(1);
    expect(results[0].label).toBe('Wilhelmine-Moik-Platz');
  });

  it('keeps POI hits when the query is a substring of displayName (e.g. stephansdom)', async () => {
    const hits: GeocoderSearchResult[] = [
      {
        lat: 48.2085,
        lng: 16.3731,
        displayName: 'Stephansdom, Stephansplatz, Innere Stadt, Wien, 1010, Österreich',
        name: 'Stephansdom',
        importance: 0.72,
        address: {
          road: 'Stephansplatz',
          city: 'Wien',
          country_code: 'at',
          country: 'Österreich',
        },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'stephansdom',
      { countryCodes: ['at'] },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.name ?? result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].label).toContain('Stephansdom');
  });

  it('returns Austrian street hits for a specific street query even when the marker is far away', async () => {
    const hits: GeocoderSearchResult[] = [
      {
        lat: 48.185,
        lng: 16.365,
        displayName: 'Denisgasse, Favoriten, Wien, Österreich',
        name: null,
        importance: 0.55,
        address: {
          road: 'Denisgasse',
          city: 'Wien',
          country: 'Österreich',
          country_code: 'at',
        },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'denisgasse',
      {
        countryCodes: ['at'],
        activeMarkerCentroid: { lat: 47.8, lng: 13.04 },
      },
      5,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.address?.road ?? result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].label.toLowerCase()).toContain('denisgasse');
  });
});
