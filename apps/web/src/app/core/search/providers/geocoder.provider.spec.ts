import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, beforeEach } from 'vitest';
import { GeocoderProvider } from './geocoder.provider';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { MediaClusterService } from '../../geocoding/media-cluster.service';
import { provideOrgSearchTuningTestDouble } from '../search-test.providers';

describe('GeocoderProvider', () => {
  let provider: GeocoderProvider;
  let geocodingMock: {
    isGeocodeBlocked: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
    searchStructured: ReturnType<typeof vi.fn>;
    reverse: ReturnType<typeof vi.fn>;
  };
  let clusterMock: {
    ensureLoaded: ReturnType<typeof vi.fn>;
    clusters: ReturnType<typeof signal<unknown[]>>['asReadonly'];
  };

  const schleiergasseResult = {
    lat: 48.1746,
    lng: 16.3823,
    displayName: 'Schleiergasse 18, Wien, Austria',
    name: null,
    importance: 0.6,
    address: {
      road: 'Schleiergasse',
      house_number: '18',
      postcode: '1100',
      city: 'Wien',
      country: 'Austria',
    },
  };

  beforeEach(() => {
    geocodingMock = {
      isGeocodeBlocked: vi.fn().mockReturnValue(false),
      search: vi.fn().mockResolvedValue([schleiergasseResult]),
      searchStructured: vi.fn().mockResolvedValue([]),
      reverse: vi.fn().mockResolvedValue(null),
    };

    const emptyClusters = signal([]).asReadonly();
    clusterMock = {
      ensureLoaded: vi.fn().mockResolvedValue(undefined),
      clusters: emptyClusters,
    };

    TestBed.configureTestingModule({
      providers: [
        GeocoderProvider,
        provideOrgSearchTuningTestDouble(),
        { provide: GeocodingService, useValue: geocodingMock },
        { provide: MediaClusterService, useValue: clusterMock },
      ],
    });

    provider = TestBed.inject(GeocoderProvider);
  });

  it('returns empty list for empty query', async () => {
    const results = await firstValueFrom(provider.search('', {}));
    expect(results).toEqual([]);
    expect(geocodingMock.search).not.toHaveBeenCalled();
  });

  it('skips forward geocode when service cooldown is active', async () => {
    geocodingMock.isGeocodeBlocked.mockReturnValue(true);

    const results = await firstValueFrom(provider.search('schleiergasse', {}));

    expect(geocodingMock.search).not.toHaveBeenCalled();
    expect(results).toEqual([]);
  });

  it('returns geocoder candidates from forward geocode', async () => {
    const results = await firstValueFrom(provider.search('schleiergasse', {}));

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].family).toBe('geocoder');
    expect(results[0].label).toBe('Schleiergasse 18');
    expect(results[0].secondaryLabel).toBe('1100 Wien · Austria');
    expect(geocodingMock.search).toHaveBeenCalledWith('schleiergasse', expect.any(Object));
  });

  it('enriches results with city hint when labels lack commas', async () => {
    geocodingMock.search
      .mockResolvedValueOnce([
        {
          lat: 48.17,
          lng: 16.38,
          displayName: 'Schleiergasse',
          name: null,
          importance: 0.5,
          address: { road: 'Schleiergasse', country_code: 'at' },
        },
      ])
      .mockResolvedValueOnce([
        {
          lat: 48.1746,
          lng: 16.3823,
          displayName: 'Schleiergasse 18, Wien, Austria',
          name: null,
          importance: 0.6,
          address: {
            road: 'Schleiergasse',
            house_number: '18',
            postcode: '1100',
            city: 'Wien',
            country_code: 'at',
          },
        },
      ]);
    geocodingMock.reverse.mockResolvedValue({ city: 'Wien' });

    const results = await firstValueFrom(
      provider.search('schleiergasse', {
        currentLocation: { lat: 48.2083, lng: 16.3731 },
      }),
    );

    expect(geocodingMock.reverse).toHaveBeenCalled();
    expect(geocodingMock.search).toHaveBeenCalledTimes(2);
    expect(results.some((item) => item.label === 'Schleiergasse 18' || item.secondaryLabel?.includes('1100 Wien'))).toBe(
      true,
    );
  });

  it('fetches per cluster viewbox in parallel when multiple clusters exist', async () => {
    const clusters = signal([
      { clusterId: 1, viewbox: '16.2,48.25,16.3,48.2', mediaCount: 10 },
      { clusterId: 2, viewbox: '16.3,48.25,16.4,48.2', mediaCount: 8 },
    ]).asReadonly();
    clusterMock.clusters = clusters;

    await firstValueFrom(provider.search('schleiergasse', {}));

    expect(clusterMock.ensureLoaded).toHaveBeenCalled();
    expect(geocodingMock.search).toHaveBeenCalledTimes(2);
    expect(geocodingMock.search.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ viewbox: '16.2,48.25,16.3,48.2' }),
    );
    expect(geocodingMock.search.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ viewbox: '16.3,48.25,16.4,48.2' }),
    );
  });

  it('returns empty array on geocoder failure', async () => {
    geocodingMock.search.mockRejectedValue(new Error('network'));

    const results = await firstValueFrom(provider.search('schleiergasse', {}));

    expect(results).toEqual([]);
  });
});
