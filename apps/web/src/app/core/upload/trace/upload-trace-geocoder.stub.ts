/**
 * Stub geocoder for the upload pipeline trace harness — stands in for Photon / Nominatim.
 *
 * What it reproduces faithfully is the *shape* of a geocoder answer: zero, one, or n hits,
 * each with an `importance` that becomes the candidate `score` verbatim in
 * `mapGeocoderHitsToCandidates`. That shape is what every pipeline branch reads.
 *
 * What it does NOT reproduce: fuzzy street matching, ranking, language handling, rate limits,
 * or the real-world coordinates of anything. A path that auto-resolves here can still land in
 * a tray against real Photon, and the reverse.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Real vs mock
 */

import type { GeocoderSearchResult, ReverseGeocodeResult } from '../../geocoding/geocoding.service';

interface StubGazetteerRow {
  street: string;
  houseNumber: string;
  postcode: string;
  city: string;
  lat: number;
  lng: number;
  /** Becomes the candidate score. Thresholds: auto ≥ 0.95, review ≥ 0.70, meaningful ≥ 0.55. */
  importance: number;
}

/**
 * `Hauptstraße` exists in four cities on purpose: that is what makes a street-only path
 * ambiguous (multi-hit, none above the auto-assign threshold) instead of auto-resolving.
 */
const STUB_GAZETTEER: readonly StubGazetteerRow[] = [
  { street: 'Währinger Straße', houseNumber: '12', postcode: '1090', city: 'Wien', lat: 48.2226, lng: 16.3564, importance: 0.97 },
  { street: 'Kärntner Straße', houseNumber: '4', postcode: '1010', city: 'Wien', lat: 48.2058, lng: 16.3714, importance: 0.96 },
  { street: 'Annenstraße', houseNumber: '10', postcode: '8010', city: 'Graz', lat: 47.0707, lng: 15.4395, importance: 0.97 },
  { street: 'Annenstraße', houseNumber: '12', postcode: '8010', city: 'Graz', lat: 47.0709, lng: 15.4388, importance: 0.96 },
  { street: 'Herrengasse', houseNumber: '16', postcode: '8010', city: 'Graz', lat: 47.0703, lng: 15.4383, importance: 0.95 },
  { street: 'Landstraße', houseNumber: '7', postcode: '4020', city: 'Linz', lat: 48.3045, lng: 14.2869, importance: 0.96 },
  { street: 'Getreidegasse', houseNumber: '9', postcode: '5020', city: 'Salzburg', lat: 47.7998, lng: 13.0434, importance: 0.97 },
  { street: 'Maria-Theresien-Straße', houseNumber: '18', postcode: '6020', city: 'Innsbruck', lat: 47.2668, lng: 11.3933, importance: 0.96 },
  { street: 'Hauptstraße', houseNumber: '5', postcode: '4020', city: 'Linz', lat: 48.3059, lng: 14.2862, importance: 0.75 },
  { street: 'Hauptstraße', houseNumber: '5', postcode: '5020', city: 'Salzburg', lat: 47.7981, lng: 13.0457, importance: 0.74 },
  { street: 'Hauptstraße', houseNumber: '5', postcode: '9020', city: 'Klagenfurt', lat: 46.6247, lng: 14.3053, importance: 0.72 },
  { street: 'Hauptstraße', houseNumber: '5', postcode: '6020', city: 'Innsbruck', lat: 47.2692, lng: 11.4041, importance: 0.71 },
];

export const STUB_CITY_COORDS: Readonly<Record<string, { lat: number; lng: number }>> = {
  Wien: { lat: 48.2082, lng: 16.3738 },
  Graz: { lat: 47.0707, lng: 15.4395 },
  Linz: { lat: 48.3069, lng: 14.2858 },
  Salzburg: { lat: 47.8095, lng: 13.055 },
  Innsbruck: { lat: 47.2692, lng: 11.4041 },
  Klagenfurt: { lat: 46.6247, lng: 14.3053 },
};

export function stubCityCoords(city: string): { lat: number; lng: number } | undefined {
  return STUB_CITY_COORDS[city];
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

function normalize(value: string | undefined | null): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/\s+/g, ' ');
}

function rowToHit(row: StubGazetteerRow): GeocoderSearchResult {
  return {
    lat: row.lat,
    lng: row.lng,
    displayName: `${row.street} ${row.houseNumber}, ${row.postcode} ${row.city}, Österreich`,
    name: `${row.street} ${row.houseNumber}`,
    importance: row.importance,
    address: {
      road: row.street,
      house_number: row.houseNumber,
      postcode: row.postcode,
      city: row.city,
      country: 'Österreich',
      country_code: 'at',
    },
  };
}

function matchesStreet(rowStreet: string, wanted: string): boolean {
  return rowStreet.startsWith(wanted) || wanted.startsWith(rowStreet);
}

/** Stands in for `GeocodingService.searchStructuredForward`. */
export function stubStructuredForward(params: {
  street: string;
  city?: string;
  postcode?: string;
  countryCode?: string;
}): GeocoderSearchResult[] {
  const street = normalize(params.street);
  if (!street) {
    return [];
  }
  const city = normalize(params.city);
  const postcode = (params.postcode ?? '').trim();

  return STUB_GAZETTEER.filter((row) => {
    if (!matchesStreet(normalize(row.street), street)) {
      return false;
    }
    if (city && normalize(row.city) !== city) {
      return false;
    }
    if (postcode && row.postcode !== postcode) {
      return false;
    }
    return true;
  })
    .map(rowToHit)
    .sort((a, b) => b.importance - a.importance);
}

/** Stands in for `GeocodingService.reverse` — nearest stub city, never a real lookup. */
export function stubReverse(lat: number, lng: number): ReverseGeocodeResult {
  let bestCity: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [city, coords] of Object.entries(STUB_CITY_COORDS)) {
    const distance = (coords.lat - lat) ** 2 + (coords.lng - lng) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestCity = city;
    }
  }
  return {
    addressLabel: `${bestCity ?? 'Unbekannt'} (stub reverse)`,
    city: bestCity,
    district: null,
    street: null,
    streetNumber: null,
    zip: null,
    country: 'Österreich',
    countryCode: 'at',
  };
}
