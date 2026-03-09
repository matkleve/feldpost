/**
 * GeocodingService — reverse-geocodes coordinates to structured address data
 * via the Nominatim (OpenStreetMap) API.
 *
 * Ground rules:
 *  - Rate-limited to 1 request per second (Nominatim usage policy).
 *  - Never throws — returns null on failure.
 *  - Results are cached in-memory (5-minute TTL) to avoid redundant requests.
 *  - Used by UploadService to populate address fields after image insertion.
 */

import { Injectable } from '@angular/core';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Structured address fields extracted from a Nominatim reverse-geocode response. */
export interface ReverseGeocodeResult {
  addressLabel: string;
  city: string | null;
  district: string | null;
  street: string | null;
  country: string | null;
}

/** Raw Nominatim reverse-geocode JSON shape (subset we use). */
interface NominatimReverseResponse {
  display_name?: string;
  address?: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    city_district?: string;
    suburb?: string;
    borough?: string;
    quarter?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MIN_REQUEST_INTERVAL_MS = 1100; // slightly above 1s to respect Nominatim rate limit

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly cache = new Map<string, { data: ReverseGeocodeResult; expires: number }>();
  private lastRequestTime = 0;

  /**
   * Reverse-geocode a lat/lng pair to structured address fields.
   * Returns null when the geocoder cannot resolve the location or on network error.
   */
  async reverse(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Rate-limit: wait if needed so we don't exceed 1 req/sec.
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
    }

    try {
      this.lastRequestTime = Date.now();

      const url = `${NOMINATIM_REVERSE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as NominatimReverseResponse;
      if (!data?.address) return null;

      const result = this.parseResponse(data);

      this.cache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS });
      return result;
    } catch {
      return null;
    }
  }

  private parseResponse(data: NominatimReverseResponse): ReverseGeocodeResult {
    const addr = data.address!;

    const city = this.firstOf(addr.city, addr.town, addr.village, addr.municipality);
    const district = this.firstOf(addr.city_district, addr.suburb, addr.borough, addr.quarter);

    const streetParts = [addr.road, addr.house_number].filter(Boolean);
    const street = streetParts.length > 0 ? streetParts.join(' ') : null;

    const country = addr.country ?? null;
    const addressLabel = data.display_name ?? [street, city, country].filter(Boolean).join(', ');

    return { addressLabel, city, district, street, country };
  }

  /** Returns the first non-nullish value, or null. */
  private firstOf(...values: (string | undefined | null)[]): string | null {
    return values.find((v) => v != null) ?? null;
  }
}
