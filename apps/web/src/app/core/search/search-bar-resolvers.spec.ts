import { describe, expect, it } from 'vitest';
import { fetchGeocoderCandidates } from './search-bar-resolvers';
import type { GeocoderSearchResult } from '../geocoding.service';
import type { GeocoderSearchOptions } from '../geocoding.service';
import type { SearchAddressCandidate, SearchQueryContext } from './search.models';

describe('fetchGeocoderCandidates', () => {
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
        limit: 12,
        bounded: true,
      }),
    );
  });

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

    expect(calls).toEqual(['at', 'none']);
    expect(results[0].label).toBe('Wilhelminenstrasse');
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

    expect(calls).toEqual(['at', 'none']);
    expect(results[0].label).toBe('Wilhelminenstrasse');
    expect(results.slice(0, 3).map((item) => item.label)).toContain('Wilhelminenstrasse');
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
});
