import { describe, expect, it } from 'vitest';
import { fetchGeocoderCandidates } from './search-bar-resolvers';
import type { GeocoderSearchResult } from '../geocoding.service';
import type { SearchAddressCandidate, SearchQueryContext } from './search.models';

describe('fetchGeocoderCandidates', () => {
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

    expect(results.length).toBe(3);
    expect(results.slice(0, 3).map((item) => item.label)).toContain('Wilhelminenstrasse 85');
    expect(results[0].label).toBe('Wilhelminenstrasse 85');
  });
});
