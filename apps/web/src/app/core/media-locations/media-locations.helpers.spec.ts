import { describe, expect, it } from 'vitest';
import {
  formatLocationDisplayLine,
  formatLocationFullAddressCopy,
  formatLocationPickerLines,
  legacyMediaHasGps,
  locationDisplaySnapshotFromRows,
  mergeLocationDisplayIntoMediaRecord,
  type LocationDisplayFields,
  type LocationDisplayLineInput,
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

  it('LocationDisplayFields is not assignable to LocationDisplayLineInput', () => {
    const fields: LocationDisplayFields = {
      address_label: 'Site',
      street: 'Main',
      city: 'Vienna',
      district: null,
      country: 'AT',
      latitude: 48.2,
      longitude: 16.37,
      location_unresolved: false,
    };
    type AssertNotLineInput = LocationDisplayFields extends LocationDisplayLineInput ? true : false;
    const notAssignable: AssertNotLineInput = false;
    expect(notAssignable).toBe(false);
    expect(fields.street).toBe('Main');
  });

  it('mergeLocationDisplayIntoMediaRecord clears fields when no locations', () => {
    const merged = mergeLocationDisplayIntoMediaRecord(
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

  it('formatLocationFullAddressCopy joins populated address segments', () => {
    expect(formatLocationFullAddressCopy(BASE_ROW, 'Top')).toBe('Main 1, Vienna, AT');
  });

  it('formatLocationDisplayLine uses Stiege/Top suffixes and locality comma', () => {
    const full = {
      ...BASE_ROW,
      street: 'Liechtensteinstraße',
      house_number: '135',
      staircase: '5',
      door: '4B',
      postcode: '1090',
      city: 'Wien',
      address_label: null,
    };
    expect(formatLocationDisplayLine(full, 'Top')).toBe(
      'Liechtensteinstraße 135/Stiege 5/Top 4B, 1090 Wien',
    );
    expect(formatLocationDisplayLine({ ...full, staircase: null }, 'Top')).toBe(
      'Liechtensteinstraße 135/Top 4B, 1090 Wien',
    );
    expect(formatLocationDisplayLine({ ...full, door: null }, 'Top')).toBe(
      'Liechtensteinstraße 135/Stiege 5, 1090 Wien',
    );
    expect(
      formatLocationDisplayLine(
        { ...full, staircase: null, door: null, postcode: '1090', city: 'Wien' },
        'Top',
      ),
    ).toBe('Liechtensteinstraße 135, 1090 Wien');
    expect(
      formatLocationDisplayLine(
        { street: null, house_number: null, staircase: null, door: null, postcode: null, city: null, address_label: 'Site gate' },
        'Top',
      ),
    ).toBe('Site gate');
  });

  it('formatLocationPickerLines splits primary and locality', () => {
    const lines = formatLocationPickerLines(
      {
        ...BASE_ROW,
        street: 'Liechtensteinstraße',
        house_number: '135',
        staircase: '5',
        door: '4B',
        postcode: '1090',
        city: 'Wien',
        district: 'Alsergrund',
        country: 'AT',
      },
      'Top',
    );
    expect(lines.primary).toBe('Liechtensteinstraße 135/Stiege 5/Top 4B');
    expect(lines.secondary).toBe('1090 Wien · Alsergrund · AT');
  });
});
