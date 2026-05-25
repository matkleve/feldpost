import { describe, expect, it } from 'vitest';
import {
  cloneLocationRowsForCache,
  loadLocationSummaryByMediaIds,
} from './media-locations-batch.helpers';
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

describe('cloneLocationRowsForCache', () => {
  it('returns independent row objects', () => {
    const rows = [{ ...BASE_ROW }];
    const cloned = cloneLocationRowsForCache(rows);
    rows[0]!.city = 'Mutated';
    expect(cloned[0]?.city).toBe('Vienna');
  });
});

describe('loadLocationSummaryByMediaIds', () => {
  it('returns empty rowsByMediaId when mediaItemIds is empty', async () => {
    const result = await loadLocationSummaryByMediaIds({} as never, []);
    expect(result.rowsByMediaId.size).toBe(0);
    expect(result.zoomableCountByMediaId.size).toBe(0);
    expect(result.displayLocationByMediaId.size).toBe(0);
  });
});
