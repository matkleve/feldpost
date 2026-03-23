/**
 * GeocodingService — reverse-geocodes coordinates to structured address data
 * via the `geocode` Supabase Edge Function (which proxies Nominatim).
 *
 * Ground rules:
 *  - Requests are routed through a server-side proxy to eliminate browser CORS
 *    issues and enforce rate limiting centrally.
 *  - Never throws — returns null on failure.
 *  - Results are cached in-memory (5-minute TTL) to avoid redundant requests.
 *  - A serial queue ensures only one in-flight request at a time, preventing
 *    concurrent calls from bypassing the rate limit.
 *  - Used by LocationResolverService, UploadService, and PlacementMode.
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Structured address fields extracted from a Nominatim reverse-geocode response. */
export interface ReverseGeocodeResult {
  addressLabel: string;
  city: string | null;
  district: string | null;
  street: string | null;
  streetNumber: string | null;
  zip: string | null;
  country: string | null;
  countryCode: string | null;
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
    country_code?: string;
    postcode?: string;
  };
}

/** Structured result from forward geocoding (address string → coordinates). */
export interface ForwardGeocodeResult {
  lat: number;
  lng: number;
  addressLabel: string;
  city: string | null;
  district: string | null;
  street: string | null;
  streetNumber: string | null;
  zip: string | null;
  country: string | null;
}

/** Options for multi-result search queries (used by search bar). */
export interface GeocoderSearchOptions {
  limit?: number;
  countrycodes?: string[];
  viewbox?: string;
  bounded?: boolean;
}

/** A single result from a multi-result geocoder search. */
export interface GeocoderSearchResult {
  lat: number;
  lng: number;
  displayName: string;
  name: string | null;
  importance: number;
  address: {
    road?: string;
    house_number?: string;
    postcode?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  } | null;
}

/** Raw Nominatim forward-search JSON shape (subset we use). */
interface NominatimSearchResponse {
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  importance?: number;
  address?: NominatimReverseResponse['address'];
  country_code?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PROXY_ATTEMPTS = 3;
const LOG_DEDUP_WINDOW_MS = 30 * 1000;
const AUTH_FAILURE_COOLDOWN_MS = 2 * 60 * 1000;

interface GeocodeFailureDetails {
  status: number | null;
  code: string | null;
  name: string | null;
  message: string;
  bodySnippet: string | null;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly supabase = inject(SupabaseService);

  private readonly reverseCache = new Map<
    string,
    { data: ReverseGeocodeResult; expires: number }
  >();
  private readonly forwardCache = new Map<
    string,
    { data: ForwardGeocodeResult; expires: number }
  >();
  private readonly recentFailureLogs = new Map<string, number>();
  private authFailureUntilMs = 0;

  /**
   * Serial queue: chains every request so only one is in-flight at a time.
   * This prevents concurrent callers from racing past the server-side rate limit.
   */
  private queue: Promise<void> = Promise.resolve();

  /**
   * Reverse-geocode a lat/lng pair to structured address fields.
   * Returns null when the geocoder cannot resolve the location or on network error.
   */
  async reverse(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = this.reverseCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    return this.enqueue(async () => {
      // Re-check cache after waiting in queue (another request may have resolved it).
      const freshCached = this.reverseCache.get(cacheKey);
      if (freshCached && freshCached.expires > Date.now()) {
        return freshCached.data;
      }

      try {
        const data = await this.callProxy<NominatimReverseResponse>(
          {
            action: 'reverse',
            lat,
            lng,
          },
          'reverse',
        );
        if (!data?.address) return null;

        const result = this.parseReverseResponse(data);
        this.reverseCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS });
        return result;
      } catch {
        return null;
      }
    });
  }

  /**
   * Forward-geocode an address string to coordinates + structured address fields.
   * Returns null when the geocoder cannot resolve the address or on network error.
   */
  async forward(address: string): Promise<ForwardGeocodeResult | null> {
    const trimmed = address.trim();
    if (!trimmed) return null;

    const cacheKey = trimmed.toLowerCase();
    const cached = this.forwardCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    return this.enqueue(async () => {
      const freshCached = this.forwardCache.get(cacheKey);
      if (freshCached && freshCached.expires > Date.now()) {
        return freshCached.data;
      }

      try {
        const results = await this.callProxy<NominatimSearchResponse[]>(
          {
            action: 'forward',
            q: trimmed,
          },
          'forward',
        );
        if (!results?.length || !results[0].lat || !results[0].lon) return null;

        const result = this.parseForwardResponse(results[0]);
        if (!result) return null;

        this.forwardCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL_MS });
        return result;
      } catch {
        return null;
      }
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /**
   * Search for multiple geocoding results. Used by the search bar.
   * Returns an empty array on failure — never throws.
   */
  async search(query: string, options?: GeocoderSearchOptions): Promise<GeocoderSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return this.enqueue(async () => {
      try {
        const body: Record<string, unknown> = {
          action: 'forward',
          q: trimmed,
        };
        if (options?.limit) body['limit'] = options.limit;
        if (options?.countrycodes?.length) {
          body['countrycodes'] = options.countrycodes.join(',');
        }
        if (options?.viewbox) body['viewbox'] = options.viewbox;
        if (options?.bounded) body['bounded'] = 1;

        const results = await this.callProxy<NominatimSearchResponse[]>(body, 'search');
        if (!results?.length) return [];

        return results
          .map((hit) => this.parseSearchHit(hit))
          .filter((r): r is GeocoderSearchResult => r !== null);
      } catch {
        return [];
      }
    });
  }

  /**
   * Enqueue a request so only one runs at a time.
   * Each call chains onto `this.queue`, preventing concurrent Nominatim hits.
   */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn, fn);
    // Keep the queue moving regardless of success/failure
    this.queue = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  /** Call the `geocode` Supabase Edge Function with bounded retry/backoff. */
  private async callProxy<T>(
    body: Record<string, unknown>,
    operation: 'reverse' | 'forward' | 'search',
  ): Promise<T> {
    if (Date.now() < this.authFailureUntilMs) {
      throw new Error('Geocoding temporarily unavailable due to authentication failure');
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_PROXY_ATTEMPTS; attempt += 1) {
      try {
        const headers = await this.getFunctionAuthHeaders();
        const { data, error } = await this.supabase.client.functions.invoke('geocode', {
          body,
          headers,
        });
        if (error) throw error;
        this.authFailureUntilMs = 0;
        return data as T;
      } catch (error) {
        lastError = error;
        const details = await this.extractFailureDetails(error);
        const retryable = this.isRetryableFailure(details);
        const finalAttempt = attempt >= MAX_PROXY_ATTEMPTS || !retryable;

        if (details.status === 401) {
          this.authFailureUntilMs = Date.now() + AUTH_FAILURE_COOLDOWN_MS;
        }

        if (finalAttempt) {
          this.logProxyFailure(operation, attempt, details, retryable);
          throw error;
        }

        await this.delay(this.backoffMs(attempt));
      }
    }

    throw lastError;
  }

  private async getFunctionAuthHeaders(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await this.supabase.client.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error('Missing Supabase access token for geocode function');
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  }

  private async extractFailureDetails(error: unknown): Promise<GeocodeFailureDetails> {
    const candidate =
      typeof error === 'object' && error !== null
        ? (error as {
            status?: unknown;
            code?: unknown;
            name?: unknown;
            message?: unknown;
            context?: unknown;
          })
        : null;

    const response = this.toResponse(candidate?.context);
    const statusFromError = typeof candidate?.status === 'number' ? candidate.status : null;
    const status = statusFromError ?? response?.status ?? null;

    return {
      status,
      code: typeof candidate?.code === 'string' ? candidate.code : null,
      name: typeof candidate?.name === 'string' ? candidate.name : null,
      message:
        typeof candidate?.message === 'string'
          ? this.sanitizeSnippet(candidate.message)
          : this.sanitizeSnippet(String(error)),
      bodySnippet: response ? await this.readResponseSnippet(response) : null,
    };
  }

  private isRetryableFailure(details: GeocodeFailureDetails): boolean {
    const { status, name, message } = details;

    if (status != null) {
      if (status === 408 || status === 429) return true;
      if (status >= 500) return true;
      return false;
    }

    const normalizedName = (name ?? '').toLowerCase();
    const normalizedMessage = message.toLowerCase();
    if (normalizedName.includes('fetch') || normalizedName.includes('relay')) return true;
    if (normalizedMessage.includes('networkerror')) return true;
    if (normalizedMessage.includes('failed to fetch')) return true;
    if (normalizedMessage.includes('network')) return true;
    return false;
  }

  private logProxyFailure(
    operation: 'reverse' | 'forward' | 'search',
    attempt: number,
    details: GeocodeFailureDetails,
    retryable: boolean,
  ): void {
    const key = [
      operation,
      details.status ?? 'none',
      details.code ?? 'none',
      details.name ?? 'none',
      details.message,
      details.bodySnippet ?? 'none',
    ].join('|');

    const now = Date.now();
    const lastLoggedAt = this.recentFailureLogs.get(key) ?? 0;
    if (now - lastLoggedAt < LOG_DEDUP_WINDOW_MS) {
      return;
    }
    this.recentFailureLogs.set(key, now);

    console.warn('[Geocoding] geocode request failed', {
      operation,
      attempt,
      maxAttempts: MAX_PROXY_ATTEMPTS,
      retryable,
      status: details.status,
      code: details.code,
      name: details.name,
      message: details.message,
      bodySnippet: details.bodySnippet,
    });
  }

  private backoffMs(attempt: number): number {
    if (attempt <= 1) return 250;
    return 600;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toResponse(value: unknown): Response | null {
    if (typeof Response === 'undefined') return null;
    return value instanceof Response ? value : null;
  }

  private async readResponseSnippet(response: Response): Promise<string | null> {
    try {
      const raw = await response.clone().text();
      if (!raw) return null;
      return this.sanitizeSnippet(raw);
    } catch {
      return null;
    }
  }

  private sanitizeSnippet(input: string): string {
    return input.replace(/\s+/g, ' ').trim().slice(0, 300);
  }

  private parseReverseResponse(data: NominatimReverseResponse): ReverseGeocodeResult {
    const { city, district, streetName, streetNumber, zip, country, countryCode } =
      this.extractAddressFields(data.address!);
    const street = this.combineStreet(streetName, streetNumber);
    const addressLabel = this.buildAddressLabel(street, city, zip, data.display_name);
    return { addressLabel, city, district, street, streetNumber, zip, country, countryCode };
  }

  private parseForwardResponse(hit: NominatimSearchResponse): ForwardGeocodeResult | null {
    const lat = parseFloat(hit.lat!);
    const lng = parseFloat(hit.lon!);
    if (isNaN(lat) || isNaN(lng)) return null;

    const { city, district, streetName, streetNumber, zip, country } = this.extractAddressFields(
      hit.address,
    );
    const street = this.combineStreet(streetName, streetNumber);
    const addressLabel = this.buildAddressLabel(street, city, zip, hit.display_name);
    return { lat, lng, addressLabel, city, district, street, streetNumber, zip, country };
  }

  /**
   * Build a clean address label as "Street Number, Postcode City".
   * Falls back to display_name only when structured fields are missing.
   */
  private buildAddressLabel(
    street: string | null,
    city: string | null,
    zip: string | null,
    displayName?: string,
  ): string {
    const cityPart = zip && city ? `${zip} ${city}` : city || null;

    if (street && cityPart) return `${street}, ${cityPart}`;
    if (street) return street;
    if (cityPart) return cityPart;
    return displayName ?? '';
  }

  /** Parse a single Nominatim search hit into a GeocoderSearchResult. */
  private parseSearchHit(hit: NominatimSearchResponse): GeocoderSearchResult | null {
    const lat = parseFloat(hit.lat ?? '');
    const lng = parseFloat(hit.lon ?? '');
    if (isNaN(lat) || isNaN(lng)) return null;

    return {
      lat,
      lng,
      displayName: hit.display_name ?? '',
      name: hit.name ?? null,
      importance: hit.importance ?? 0,
      address: hit.address
        ? {
            road: hit.address.road,
            house_number: hit.address.house_number,
            postcode: hit.address.postcode,
            country_code: hit.country_code ?? hit.address.country_code,
            city: hit.address.city,
            town: hit.address.town,
            village: hit.address.village,
            municipality: hit.address.municipality,
            country: hit.address.country,
          }
        : null,
    };
  }

  /** Extract structured address fields from a Nominatim address object. */
  private extractAddressFields(addr?: NominatimReverseResponse['address']): {
    city: string | null;
    district: string | null;
    streetName: string | null;
    streetNumber: string | null;
    zip: string | null;
    country: string | null;
    countryCode: string | null;
  } {
    if (!addr)
      return {
        city: null,
        district: null,
        streetName: null,
        streetNumber: null,
        zip: null,
        country: null,
        countryCode: null,
      };

    const city = this.firstOf(addr.city, addr.town, addr.village, addr.municipality);
    const district = this.firstOf(addr.city_district, addr.suburb, addr.borough, addr.quarter);

    return {
      city,
      district,
      streetName: addr.road ?? null,
      streetNumber: addr.house_number ?? null,
      zip: addr.postcode ?? null,
      country: addr.country ?? null,
      countryCode: addr.country_code?.toLowerCase() ?? null,
    };
  }

  private combineStreet(streetName: string | null, streetNumber: string | null): string | null {
    if (streetName && streetNumber) return `${streetName} ${streetNumber}`;
    return streetName ?? streetNumber;
  }

  /** Returns the first non-nullish value, or null. */
  private firstOf(...values: (string | undefined | null)[]): string | null {
    return values.find((v) => v != null) ?? null;
  }
}
