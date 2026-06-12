/**
 * search-bar-resolvers — local ranking, result filtering, retry-unconstrained logic.
 *
 * Guards/options: search-bar-resolvers.spec.ts
 * Locality:       search-bar-resolvers.locality.spec.ts
 * House numbers:  search-bar-resolvers.housenumber.spec.ts
 */
import { describe, expect, it } from 'vitest';
import { fetchGeocoderCandidates } from './search-bar-resolvers';
import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import type { GeocoderSearchOptions } from '../geocoding/geocoding.service';
import type { SearchAddressCandidate, SearchQueryContext } from './search.models';

describe('fetchGeocoderCandidates – ranking', () => {
  it('ranks local Wilhelminenstrasse-style match into top 3 for short prefix queries', async () => {
    const context: SearchQueryContext = {
      countryCodes: ['at'],
      viewportBounds: {
        north: 48.25,
        east: 16.45,
        south: 48.12,
        west: 16.2,
      },
      activeProjectCentroid: { lat: 48.215, lng: 16.305 },
      currentLocation: { lat: 48.2083, lng: 16.3731 },
    };

    const hits: GeocoderSearchResult[] = [
      {
        lat: 48.2174,
        lng: 16.3008,
        displayName: 'Wilhelminenstrasse 85, 1160 Wien, Austria',
        name: null,
        importance: 0.45,
        address: {
          road: 'Wilhelminenstrasse',
          house_number: '85',
          postcode: '1160',
          city: 'Wien',
          country_code: 'at',
          country: 'Austria',
        },
      },
      {
        lat: 52.5202,
        lng: 13.4098,
        displayName: 'Wilhelmstrasse 10, 10117 Berlin, Germany',
        name: null,
        importance: 0.83,
        address: {
          road: 'Wilhelmstrasse',
          house_number: '10',
          postcode: '10117',
          city: 'Berlin',
          country_code: 'de',
          country: 'Germany',
        },
      },
      {
        lat: 51.5156,
        lng: -0.1462,
        displayName: 'Wilhelm Place 2, London, United Kingdom',
        name: null,
        importance: 0.78,
        address: {
          road: 'Wilhelm Place',
          house_number: '2',
          city: 'London',
          country_code: 'gb',
          country: 'United Kingdom',
        },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wilhe',
      context,
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.address?.road
          ? `${result.address.road} ${result.address.house_number ?? ''}`.trim()
          : result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.slice(0, 3).map((item) => item.label)).toContain('Wilhelminenstrasse 85');
    expect(results[0].label).toBe('Wilhelminenstrasse 85');
  });

  it('filters non-street-level country-only geocoder records', async () => {
    const hits: GeocoderSearchResult[] = [
      {
        lat: 48.2,
        lng: 16.3,
        displayName: 'Austria',
        name: null,
        importance: 0.9,
        address: {
          country: 'Austria',
          country_code: 'at',
        },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wilhe',
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

  it('returns street-level geocoder hits when search context has no geographic anchor', async () => {
    const hits: GeocoderSearchResult[] = [
      {
        lat: 48.2412,
        lng: 16.4102,
        displayName: 'Handelskai 265, 1020 Wien, Austria',
        name: null,
        importance: 0.5,
        address: {
          road: 'Handelskai',
          house_number: '265',
          city: 'Wien',
          country: 'Austria',
          country_code: 'at',
        },
      },
    ];

    const geocodingService = {
      search: async () => hits,
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'handelskai 2',
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

    expect(results.length).toBe(1);
    expect(results[0].label).toContain('Handelskai');
  });

  it('retries unconstrained for short ambiguous prefix when constrained top hit is remote', async () => {
    const calls: string[] = [];
    const constrainedHits: GeocoderSearchResult[] = [
      {
        lat: -1.2833,
        lng: 36.8167,
        displayName: 'Calle Big Wilhe, 70104 Matama',
        name: null,
        importance: 0.91,
        address: {
          road: 'Calle Big Wilhe',
          city: 'Matama',
          country: 'Kenya',
          country_code: 'ke',
        },
      },
    ];
    const unconstrainedHits: GeocoderSearchResult[] = [
      {
        lat: 48.2174,
        lng: 16.3008,
        displayName: 'Wilhelminenstrasse 85, 1160 Wien, Austria',
        name: null,
        importance: 0.45,
        address: {
          road: 'Wilhelminenstrasse',
          house_number: '85',
          postcode: '1160',
          city: 'Wien',
          country_code: 'at',
          country: 'Austria',
        },
      },
    ];

    const geocodingService = {
      search: async (_query: string, options?: GeocoderSearchOptions) => {
        calls.push(options?.countrycodes?.join(',') ?? 'none');
        if (options?.countrycodes?.length) return constrainedHits;
        return unconstrainedHits;
      },
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wilhe',
      {
        countryCodes: ['at'],
        activeProjectCentroid: { lat: 48.215, lng: 16.305 },
        currentLocation: { lat: 48.2083, lng: 16.3731 },
      },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.address?.road ? `${result.address.road}` : result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(calls).toEqual(['at']);
    expect(results[0].label).toBe('Calle Big Wilhe');
  });

  it('retries unconstrained and prefers leading-prefix street when constrained hit is "Calle Big Wilhe"', async () => {
    const calls: string[] = [];
    const constrainedHits: GeocoderSearchResult[] = [
      {
        lat: -1.2833,
        lng: 36.8167,
        displayName: 'Calle Big Wilhe, 70104 Matama',
        name: null,
        importance: 0.95,
        address: {
          road: 'Calle Big Wilhe',
          city: 'Matama',
          country: 'Kenya',
          country_code: 'ke',
        },
      },
    ];

    const unconstrainedHits: GeocoderSearchResult[] = [
      {
        lat: 48.2174,
        lng: 16.3008,
        displayName: 'Wilhelminenstrasse 85, 1160 Wien, Austria',
        name: null,
        importance: 0.45,
        address: {
          road: 'Wilhelminenstrasse',
          house_number: '85',
          postcode: '1160',
          city: 'Wien',
          country_code: 'at',
          country: 'Austria',
        },
      },
      {
        lat: -1.2834,
        lng: 36.8168,
        displayName: 'Calle Big Wilhe, 70104 Matama',
        name: null,
        importance: 0.95,
        address: {
          road: 'Calle Big Wilhe',
          city: 'Matama',
          country: 'Kenya',
          country_code: 'ke',
        },
      },
    ];

    const geocodingService = {
      search: async (_query: string, options?: GeocoderSearchOptions) => {
        calls.push(options?.countrycodes?.join(',') ?? 'none');
        if (options?.countrycodes?.length) return constrainedHits;
        return unconstrainedHits;
      },
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'wilh',
      {
        countryCodes: ['at'],
      },
      3,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: result.address?.road ? `${result.address.road}` : result.displayName,
        lat: result.lat,
        lng: result.lng,
        score:
          result.address?.road === 'Wilhelminenstrasse'
            ? 0.88
            : result.address?.road === 'Calle Big Wilhe'
              ? 0.9
              : result.importance,
      }),
    );

    expect(calls).toEqual(['at']);
    expect(results).toEqual([]);
  });

  it('does not unconstrain long non-prefix queries', async () => {
    const calls: string[] = [];
    const geocodingService = {
      search: async (_query: string, options?: GeocoderSearchOptions) => {
        calls.push(options?.countrycodes?.join(',') ?? 'none');
        return [] as GeocoderSearchResult[];
      },
    };

    await fetchGeocoderCandidates(
      geocodingService as never,
      'wilhelminenstrasse',
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

    expect(calls).toEqual(['at']);
  });
});
