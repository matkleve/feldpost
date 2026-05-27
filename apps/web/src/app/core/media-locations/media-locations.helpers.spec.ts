import { describe, expect, it } from 'vitest';
import {
  formatLocationDisplayLine,
  formatLocationFullAddressCopy,
  filterAndDedupeOrgSuggestions,
  formatGeocoderPickerLines,
  formatLocationPickerLines,
  coerceLocationCoordinate,
  legacyMediaHasGps,
  locationPinEligible,
  countZoomableLinks,
  locationDisplaySnapshotFromRows,
  mergeLocationDisplayIntoMediaRecord,
  splitStreetAndHouseNumber,
  type LocationDisplayFields,
  type LocationDisplayLineInput,
  mediaHasZoomableLocation,
  displayLocationFromRows,
  galleryCoordsFromDisplayLocation,
  zoomableCountMatchesListParity,
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
  it('galleryCoordsFromDisplayLocation projects zoomable display-hydrate coords', () => {
    const display = {
      ...BASE_ROW,
      latitude: 48.21,
      longitude: 16.37,
    };
    expect(galleryCoordsFromDisplayLocation(display, 1)).toEqual({
      latitude: 48.21,
      longitude: 16.37,
    });
    expect(galleryCoordsFromDisplayLocation(display, 0)).toEqual({ latitude: 0, longitude: 0 });
  });

  it('coerceLocationCoordinate accepts numeric strings from RPC', () => {
    expect(coerceLocationCoordinate('48.230133')).toBeCloseTo(48.230133);
    expect(legacyMediaHasGps('48.230133', '16.355936')).toBe(true);
  });

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

  it('locationPinEligible requires street even when coords exist', () => {
    expect(
      locationPinEligible({ street: 'Main', latitude: 48.2, longitude: 16.37 }),
    ).toBe(true);
    expect(
      locationPinEligible({ street: null, latitude: 48.2, longitude: 16.37 }),
    ).toBe(false);
    expect(countZoomableLinks([{ ...BASE_ROW, street: null }])).toBe(0);
  });

  it('displayLocationFromRows picks lowest sort_order when all rows lack GPS', () => {
    const second: MediaItemLocationRow = {
      ...BASE_ROW,
      id: 'loc-2',
      sort_order: 1,
      street: 'Other',
      latitude: null,
      longitude: null,
    };
    const noGps: MediaItemLocationRow = { ...BASE_ROW, latitude: null, longitude: null };
    const first = displayLocationFromRows([second, noGps]);
    expect(first?.id).toBe('loc-1');
  });

  it('displayLocationFromRows prefers first zoomable row by sort_order', () => {
    const addressOnly: MediaItemLocationRow = {
      ...BASE_ROW,
      id: 'loc-addr',
      sort_order: 0,
      latitude: null,
      longitude: null,
      street: 'Text only',
    };
    const withGps: MediaItemLocationRow = {
      ...BASE_ROW,
      id: 'loc-gps',
      sort_order: 1,
      latitude: 49.84,
      longitude: 24.03,
      street: 'Theatergasse',
    };
    expect(displayLocationFromRows([addressOnly, withGps])?.id).toBe('loc-gps');
  });

  it('locationDisplaySnapshotFromRows builds display patch', () => {
    const snapshot = locationDisplaySnapshotFromRows([BASE_ROW]);
    expect(snapshot?.displayLocationId).toBe('loc-1');
    expect(snapshot?.fields.address_label).toBe('Main 1');
    expect(snapshot?.fields.location_unresolved).toBe(false);
  });

  it('address-only links: display-hydrate + snapshot oracle (zero zoomable)', () => {
    const sort0: MediaItemLocationRow = {
      ...BASE_ROW,
      id: 'loc-addr-0',
      sort_order: 0,
      latitude: null,
      longitude: null,
      street: 'Theatergasse',
      address_label: 'Theatergasse 13',
    };
    const sort1: MediaItemLocationRow = {
      ...BASE_ROW,
      id: 'loc-addr-1',
      sort_order: 1,
      latitude: null,
      longitude: null,
      street: 'Other',
    };
    const rows = [sort1, sort0];
    expect(displayLocationFromRows(rows)?.id).toBe('loc-addr-0');
    expect(countZoomableLinks(rows)).toBe(0);
    const snapshot = locationDisplaySnapshotFromRows(rows);
    expect(snapshot?.fields.latitude).toBeNull();
    expect(snapshot?.fields.longitude).toBeNull();
    expect(snapshot?.fields.location_unresolved).toBe(true);
    expect(
      mediaHasZoomableLocation({
        zoomable_location_count: countZoomableLinks(rows),
        latitude: snapshot?.fields.latitude ?? null,
        longitude: snapshot?.fields.longitude ?? null,
      }),
    ).toBe(false);
  });

  it('zoomableCountMatchesListParity holds when batch count matches list', () => {
    const rows = [BASE_ROW];
    expect(zoomableCountMatchesListParity(1, rows)).toBe(true);
    expect(zoomableCountMatchesListParity(0, rows)).toBe(false);
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

  it('splitStreetAndHouseNumber strips duplicate house number from combined geocoder street', () => {
    expect(
      splitStreetAndHouseNumber('Liechtensteinstraße 135', '135'),
    ).toEqual({ street: 'Liechtensteinstraße', house_number: '135' });
    expect(splitStreetAndHouseNumber('Bahnhofstrasse', '12')).toEqual({
      street: 'Bahnhofstrasse',
      house_number: '12',
    });
    expect(splitStreetAndHouseNumber('Liechtensteinstraße 135', null)).toEqual({
      street: 'Liechtensteinstraße 135',
      house_number: null,
    });
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
    expect(
      formatLocationDisplayLine(
        { ...full, street: 'Liechtensteinstraße 135', house_number: '135' },
        'Top',
      ),
    ).toBe('Liechtensteinstraße 135/Stiege 5/Top 4B, 1090 Wien');
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

  it('formatLocationDisplayLine appends district/country when postcode+city missing', () => {
    expect(
      formatLocationDisplayLine(
        {
          ...BASE_ROW,
          street: 'Skodagasse',
          house_number: null,
          postcode: null,
          city: null,
          district: 'Josefstadt',
          country: 'AT',
          address_label: null,
        },
        'Top',
      ),
    ).toBe('Skodagasse, Josefstadt, AT');
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

  it('formatGeocoderPickerLines uses structured Nominatim address fields', () => {
    const lines = formatGeocoderPickerLines(
      {
        displayName: 'Skodagasse, 1080 Wien, Austria',
        name: 'Skodagasse',
        address: {
          road: 'Skodagasse',
          house_number: '12',
          postcode: '1080',
          city: 'Wien',
          city_district: 'Josefstadt',
          country: 'Austria',
        },
      },
      'Top',
    );
    expect(lines.primary).toBe('Skodagasse 12');
    expect(lines.secondary).toBe('1080 Wien · Josefstadt · Austria');
  });

  it('filterAndDedupeOrgSuggestions drops linked rows and duplicate ids', () => {
    const a = { ...BASE_ROW, id: 'a', is_linked_to_media: true };
    const b = { ...BASE_ROW, id: 'b', is_linked_to_media: false };
    const bDup = { ...BASE_ROW, id: 'b', is_linked_to_media: false };
    expect(filterAndDedupeOrgSuggestions([a, b, bDup])).toEqual([b]);
  });
});
