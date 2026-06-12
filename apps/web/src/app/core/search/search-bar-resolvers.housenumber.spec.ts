/**
 * search-bar-resolvers — house-number filling, suffix probing, street expansion.
 *
 * Guards/options: search-bar-resolvers.spec.ts
 * Ranking:        search-bar-resolvers.ranking.spec.ts
 * Locality:       search-bar-resolvers.locality.spec.ts
 */
import { describe, expect, it } from 'vitest';
import { fetchGeocoderCandidates } from './search-bar-resolvers';
import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import type { SearchAddressCandidate } from './search.models';

describe('fetchGeocoderCandidates – house numbers', () => {
  it('fills internet results with same-street house numbers sharing the typed digit prefix', async () => {
    const searchCalls: string[] = [];
    const hitsByQuery: Record<string, GeocoderSearchResult[]> = {
      'denisgasse 4': [
        {
          lat: 48.23,
          lng: 16.37,
          displayName: 'Denisgasse 4, 1200 Wien',
          name: null,
          importance: 0.7,
          address: {
            road: 'Denisgasse',
            house_number: '4',
            city: 'Wien',
            postcode: '1200',
            country: 'Österreich',
            country_code: 'at',
          },
        },
      ],
      denisgasse: [
        {
          lat: 48.23,
          lng: 16.37,
          displayName: 'Denisgasse 4, 1200 Wien',
          name: null,
          importance: 0.7,
          address: {
            road: 'Denisgasse',
            house_number: '4',
            city: 'Wien',
            postcode: '1200',
            country: 'Österreich',
            country_code: 'at',
          },
        },
        {
          lat: 48.231,
          lng: 16.371,
          displayName: 'Denisgasse 40, 1200 Wien',
          name: null,
          importance: 0.65,
          address: {
            road: 'Denisgasse',
            house_number: '40',
            city: 'Wien',
            postcode: '1200',
            country: 'Österreich',
            country_code: 'at',
          },
        },
        {
          lat: 48.232,
          lng: 16.372,
          displayName: 'Denisgasse 41, 1200 Wien',
          name: null,
          importance: 0.64,
          address: {
            road: 'Denisgasse',
            house_number: '41',
            city: 'Wien',
            postcode: '1200',
            country: 'Österreich',
            country_code: 'at',
          },
        },
        {
          lat: 48.233,
          lng: 16.373,
          displayName: 'Denisgasse 42, 1200 Wien',
          name: null,
          importance: 0.63,
          address: {
            road: 'Denisgasse',
            house_number: '42',
            city: 'Wien',
            postcode: '1200',
            country: 'Österreich',
            country_code: 'at',
          },
        },
        {
          lat: 48.234,
          lng: 16.374,
          displayName: 'Denisgasse 2, 1200 Wien',
          name: null,
          importance: 0.6,
          address: {
            road: 'Denisgasse',
            house_number: '2',
            city: 'Wien',
            postcode: '1200',
            country: 'Österreich',
            country_code: 'at',
          },
        },
      ],
    };

    const geocodingService = {
      search: async (query: string) => {
        searchCalls.push(query);
        return hitsByQuery[query] ?? [];
      },
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'denisgasse 4',
      {
        countryCodes: ['at'],
        activeMarkerCentroid: { lat: 48.23, lng: 16.37 },
      },
      4,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label:
          result.address?.house_number != null
            ? `${result.address.road} ${result.address.house_number}, ${result.address.city}`
            : result.displayName,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results.length).toBeGreaterThan(1);
    expect(results.some((r) => r.label.includes('40'))).toBe(true);
    expect(results.some((r) => r.label.includes('41'))).toBe(true);
  });

  it('probes common street suffixes for short AT prefixes like "denis"', async () => {
    const searchCalls: string[] = [];
    const geocodingService = {
      search: async (query: string) => {
        searchCalls.push(query);
        if (query !== 'denis') return [];
        return [
          {
            lat: 48.2,
            lng: 16.37,
            displayName: 'Denis, Wien, Österreich',
            name: 'Denis',
            importance: 0.55,
            address: { city: 'Wien', country: 'Österreich', country_code: 'at' },
          },
          {
            lat: 48.185,
            lng: 16.365,
            displayName: 'Denisgasse, Favoriten, Wien, Österreich',
            name: 'Denis',
            importance: 0.7,
            address: {
              road: 'Denisgasse',
              city_district: 'Favoriten',
              postcode: '1200',
              city: 'Wien',
              country: 'Österreich',
              country_code: 'at',
            },
          },
        ] as GeocoderSearchResult[];
      },
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'denis',
      { countryCodes: ['at'], activeMarkerCentroid: { lat: 48.2, lng: 16.37 } },
      4,
      (result, query, index): SearchAddressCandidate => ({
        id: `geo-${query}-${index}`,
        family: 'geocoder',
        label: `${result.address?.road ?? ''}, ${result.address?.city_district ?? '1200 Wien'}, ${result.address?.country ?? ''}`,
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(searchCalls).toEqual(['denis']);
    expect(results[0]?.label.toLowerCase()).toContain('denisgasse');
  });

  it('expands a full street query into multiple house-level internet rows with locality', async () => {
    const geocodingService = {
      search: async () =>
        [
          {
            lat: 48.23,
            lng: 16.37,
            displayName: 'Denisgasse, Wien, Österreich',
            name: 'Denisgasse',
            importance: 0.5,
            address: { road: 'Denisgasse' },
          },
          {
            lat: 48.231,
            lng: 16.371,
            displayName: 'Denisgasse 4, 1200 Wien, Österreich',
            name: null,
            importance: 0.7,
            address: {
              road: 'Denisgasse',
              house_number: '4',
              postcode: '1200',
              city: 'Wien',
              country: 'Österreich',
              country_code: 'at',
            },
          },
          {
            lat: 48.232,
            lng: 16.372,
            displayName: 'Denisgasse 40, 1200 Wien, Österreich',
            name: null,
            importance: 0.65,
            address: {
              road: 'Denisgasse',
              house_number: '40',
              postcode: '1200',
              city: 'Wien',
              country: 'Österreich',
              country_code: 'at',
            },
          },
        ] as GeocoderSearchResult[],
    };

    const results = await fetchGeocoderCandidates(
      geocodingService as never,
      'denisgasse',
      { countryCodes: ['at'], activeMarkerCentroid: { lat: 48.2, lng: 16.37 } },
      4,
      (result, _query, index): SearchAddressCandidate => ({
        id: `geo-${index}`,
        family: 'geocoder',
        label:
          result.address?.house_number != null
            ? `${result.address.road} ${result.address.house_number}, ${result.address.postcode} ${result.address.city}, ${result.address.country}`
            : (result.displayName ?? ''),
        lat: result.lat,
        lng: result.lng,
        score: result.importance,
      }),
    );

    expect(results.length).toBeGreaterThan(1);
    expect(results[0].label).toContain(',');
    expect(results.some((item) => item.label.includes('40'))).toBe(true);
  });
});
