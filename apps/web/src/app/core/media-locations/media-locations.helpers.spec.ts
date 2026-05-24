import { describe, expect, it } from 'vitest';
import {
  legacyMediaHasGps,
  locationDisplaySnapshotFromRows,
  mergeLocationDisplayIntoImageRecord,
  mediaHasZoomableLocation,
  displayLocationFromRows,
} from './media-locations.helpers';
import type { MediaItemLocationRow } from './media-locations.types';

const BASE_ROW: MediaItemLocationRow = {
  id: 'loc-1',
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

describe('media-locations.helpers', () => {
  it('mediaHasZoomableLocation uses zoomable_location_count when set', () => {
    expect(mediaHasZoomableLocation({ zoomable_location_count: 2, latitude: null, longitude: null })).toBe(
      true,
    );
    expect(mediaHasZoomableLocation({ zoomable_location_count: 0, latitude: 48, longitude: 16 })).toBe(
      false,
    );
  });

  it('legacyMediaHasGps rejects 0,0 placeholder', () => {
    expect(legacyMediaHasGps(0, 0)).toBe(false);
    expect(legacyMediaHasGps(48.2, 16.37)).toBe(true);
  });

  it('displayLocationFromRows picks lowest sort_order', () => {
    const second: MediaItemLocationRow = { ...BASE_ROW, id: 'loc-2', sort_order: 1, street: 'Other' };
    const first = displayLocationFromRows([second, BASE_ROW]);
    expect(first?.id).toBe('loc-1');
  });

  it('locationDisplaySnapshotFromRows builds display patch', () => {
    const snapshot = locationDisplaySnapshotFromRows([BASE_ROW]);
    expect(snapshot?.displayLocationId).toBe('loc-1');
    expect(snapshot?.fields.address_label).toBe('Main 1');
    expect(snapshot?.fields.location_unresolved).toBe(false);
  });

  it('mergeLocationDisplayIntoImageRecord clears fields when no locations', () => {
    const merged = mergeLocationDisplayIntoImageRecord(
      {
        id: 'm1',
        user_id: 'u',
        organization_id: 'o',
        project_id: null,
        storage_path: null,
        thumbnail_path: null,
        latitude: 1,
        longitude: 2,
        exif_latitude: null,
        exif_longitude: null,
        captured_at: null,
        has_time: false,
        created_at: '',
        address_label: 'old',
        street: 'old',
        city: null,
        district: null,
        country: null,
        direction: null,
        location_unresolved: false,
      },
      null,
    );
    expect(merged.latitude).toBeNull();
    expect(merged.address_label).toBeNull();
    expect(merged.location_unresolved).toBe(true);
  });
});
