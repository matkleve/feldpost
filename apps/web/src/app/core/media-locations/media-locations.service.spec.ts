import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseMediaLocationsAdapter } from './adapters/supabase-media-locations.adapter';
import { MediaLocationsService } from './media-locations.service';
import type { MediaItemLocationRow } from './media-locations.types';

const BASE_ROW: MediaItemLocationRow = {
  id: 'loc-1',
  link_id: 'link-1',
  media_item_id: 'media-1',
  organization_id: 'org-1',
  street: 'Main',
  house_number: '1',
  staircase: null,
  door: null,
  floor: null,
  postcode: null,
  extra_information: null,
  city: 'Vienna',
  district: null,
  country: 'AT',
  latitude: 48.2,
  longitude: 16.37,
  address_label: 'Main 1',
  sort_order: 0,
  staircase_sort_key: '~~',
  door_sort_key: '~~',
  created_at: '',
  updated_at: '',
};

describe('MediaLocationsService listCache', () => {
  let service: MediaLocationsService;
  let listSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        MediaLocationsService,
        {
          provide: SupabaseMediaLocationsAdapter,
          useValue: {
            list: listSpy,
            searchLocations: vi.fn(),
            add: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            unlink: vi.fn(),
            link: vi.fn(),
            findOrCreate: vi.fn(),
          },
        },
        { provide: GeocodingService, useValue: { forward: vi.fn(), reverse: vi.fn() } },
      ],
    });
    service = TestBed.inject(MediaLocationsService);
  });

  it('listForMedia returns seeded rows without adapter.list', async () => {
    const rows = [{ ...BASE_ROW }];
    service.seedListCache(new Map([['media-1', rows]]));

    const result = await service.listForMedia('media-1');

    expect(result.ok).toBe(true);
    if (result.ok && 'rows' in result) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]?.id).toBe('loc-1');
      expect(result.rows[0]?.link_id).toBe('link-1');
    }
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('seedListCache isolates cache from caller mutation after seed', async () => {
    const rows = [{ ...BASE_ROW, city: 'Vienna' }];
    service.seedListCache(new Map([['media-1', rows]]));
    rows[0]!.city = 'Mutated';

    const result = await service.listForMedia('media-1');

    expect(result.ok).toBe(true);
    if (result.ok && 'rows' in result) {
      expect(result.rows[0]?.city).toBe('Vienna');
    }
  });
});
