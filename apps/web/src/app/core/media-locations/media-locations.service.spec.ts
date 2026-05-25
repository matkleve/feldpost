import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseMediaLocationsAdapter } from './adapters/supabase-media-locations.adapter';
import { MediaLocationsService } from './media-locations.service';
import type { MediaItemLocationRow } from './media-locations.types';

function makeRow(overrides: Partial<MediaItemLocationRow> = {}): MediaItemLocationRow {
  return {
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
    ...overrides,
  };
}

describe('MediaLocationsService listCache (N:N)', () => {
  let service: MediaLocationsService;
  let listSpy: ReturnType<typeof vi.fn>;
  let updateSpy: ReturnType<typeof vi.fn>;
  let deleteSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listSpy = vi.fn();
    updateSpy = vi.fn();
    deleteSpy = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        MediaLocationsService,
        {
          provide: SupabaseMediaLocationsAdapter,
          useValue: {
            list: listSpy,
            update: updateSpy,
            searchLocations: vi.fn(),
            add: vi.fn(),
            delete: deleteSpy,
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

  it('listForMedia returns seeded rows sorted by sort_order without adapter.list', async () => {
    service.seedListCache(
      new Map([
        [
          'media-1',
          [
            makeRow({ id: 'loc-b', sort_order: 2, city: 'B' }),
            makeRow({ id: 'loc-a', sort_order: 1, city: 'A', link_id: 'link-a' }),
          ],
        ],
      ]),
    );

    const result = await service.listForMedia('media-1');

    expect(result.ok).toBe(true);
    if (result.ok && 'rows' in result) {
      expect(result.rows.map((r) => r.sort_order)).toEqual([1, 2]);
      expect(result.rows[0]?.city).toBe('A');
    }
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('seedListCache isolates assembled rows from caller mutation after seed', async () => {
    const rows = [makeRow({ city: 'Vienna' })];
    service.seedListCache(new Map([['media-1', rows]]));
    rows[0]!.city = 'Mutated';

    const result = await service.listForMedia('media-1');

    expect(result.ok).toBe(true);
    if (result.ok && 'rows' in result) {
      expect(result.rows[0]?.city).toBe('Vienna');
    }
  });

  it('two media items sharing one locationId store one canonical core row', async () => {
    const shared = makeRow({ id: 'loc-shared', city: 'Shared City' });
    service.seedListCache(
      new Map([
        ['media-a', [shared]],
        ['media-b', [{ ...shared, media_item_id: 'media-b', link_id: 'link-b', sort_order: 3 }]],
      ]),
    );

    const a = await service.listForMedia('media-a');
    const b = await service.listForMedia('media-b');

    expect(listSpy).not.toHaveBeenCalled();
    if (a.ok && 'rows' in a && b.ok && 'rows' in b) {
      expect(a.rows[0]?.city).toBe('Shared City');
      expect(b.rows[0]?.city).toBe('Shared City');
      expect(b.rows[0]?.sort_order).toBe(3);
    }

    const locationToRow = (service as unknown as { locationToRow: Map<string, unknown> })
      .locationToRow;
    expect(locationToRow.size).toBe(1);
  });

  it('updateLocation patches canonical row so other media sees change without list RPC', async () => {
    const shared = makeRow({ id: 'loc-shared', city: 'Before' });
    service.seedListCache(
      new Map([
        ['media-a', [shared]],
        ['media-b', [{ ...shared, media_item_id: 'media-b', link_id: 'link-b' }]],
      ]),
    );
    listSpy.mockClear();

    updateSpy.mockResolvedValue(makeRow({ id: 'loc-shared', city: 'After' }));

    const updateResult = await service.updateLocation({ locationId: 'loc-shared', city: 'After' });
    expect(updateResult.ok).toBe(true);

    const b = await service.listForMedia('media-b');
    expect(listSpy).not.toHaveBeenCalled();
    if (b.ok && 'rows' in b) {
      expect(b.rows[0]?.city).toBe('After');
    }
  });

  it('invalidateListCache(mediaId) misses only that media', async () => {
    service.seedListCache(
      new Map([
        ['media-1', [makeRow({ id: 'loc-1' })]],
        ['media-2', [makeRow({ id: 'loc-2', media_item_id: 'media-2' })]],
      ]),
    );
    service.invalidateListCache('media-1');
    listSpy.mockResolvedValue([makeRow({ id: 'loc-1', city: 'FromRpc' })]);

    await service.listForMedia('media-1');
    await service.listForMedia('media-2');

    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(listSpy).toHaveBeenCalledWith('media-1');
  });

  it('invalidateListCache() clears both maps (nuclear reset)', async () => {
    service.seedListCache(new Map([['media-1', [makeRow()]]]));
    service.invalidateListCache();
    listSpy.mockResolvedValue([makeRow()]);

    await service.listForMedia('media-1');

    expect(listSpy).toHaveBeenCalledTimes(1);
  });

  it('partial corrupt cache triggers RPC instead of shortened list', async () => {
    service.seedListCache(
      new Map([
        [
          'media-1',
          [
            makeRow({ id: 'loc-a', sort_order: 0 }),
            makeRow({ id: 'loc-b', sort_order: 1, link_id: 'link-b' }),
          ],
        ],
      ]),
    );

    const locationToRow = (service as unknown as { locationToRow: Map<string, unknown> })
      .locationToRow;
    locationToRow.delete('loc-b');

    listSpy.mockResolvedValue([
      makeRow({ id: 'loc-a', sort_order: 0 }),
      makeRow({ id: 'loc-b', sort_order: 1 }),
    ]);

    const result = await service.listForMedia('media-1');

    expect(listSpy).toHaveBeenCalledWith('media-1');
    expect(result.ok).toBe(true);
    if (result.ok && 'rows' in result) {
      expect(result.rows).toHaveLength(2);
    }
  });

  it('deleteLocation removes location from canonical map and link refs', async () => {
    service.seedListCache(
      new Map([
        ['media-1', [makeRow({ id: 'loc-a' }), makeRow({ id: 'loc-b', sort_order: 1, link_id: 'link-b' })]],
        ['media-2', [makeRow({ id: 'loc-a', media_item_id: 'media-2', link_id: 'link-2' })]],
      ]),
    );
    listSpy.mockClear();

    await service.deleteLocation('loc-a');

    const locationToRow = (service as unknown as { locationToRow: Map<string, unknown> })
      .locationToRow;
    expect(locationToRow.has('loc-a')).toBe(false);

    const media1 = await service.listForMedia('media-1');
    expect(listSpy).not.toHaveBeenCalled();
    if (media1.ok && 'rows' in media1) {
      expect(media1.rows).toHaveLength(1);
      expect(media1.rows[0]?.id).toBe('loc-b');
    }

    listSpy.mockResolvedValue([makeRow({ id: 'loc-x', media_item_id: 'media-2' })]);
    await service.listForMedia('media-2');
    expect(listSpy).toHaveBeenCalledWith('media-2');
  });
});
