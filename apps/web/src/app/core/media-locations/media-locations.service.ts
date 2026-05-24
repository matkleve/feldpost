/**
 * Facade for org-scoped `locations` linked to media via `media_item_location_links`.
 *
 * **What it does:** List / add / update / delete linked locations for one `media_item_id`.
 * Detail display fields are hydrated from the first row by `sort_order` (see `displayLocationFromRows`).
 *
 * **UI wiring:**
 * - `MediaDetailViewComponent` — list load, add, save row, delete, copy
 * - `MapShellComponent` — `updateFromCoordinates(locationRowId)` after map pick on a row
 *
 * **Upload / item-level resolve:** `MediaLocationUpdateService` (`resolve_media_location` + link).
 *
 * @see apps/web/src/app/core/media-locations/README.md
 * @see docs/specs/service/media-locations/media-locations-service.md
 */
import { Injectable, inject } from '@angular/core';
import { GeocodingService, type ForwardGeocodeResult } from '../geocoding/geocoding.service';
import { SupabaseMediaLocationsAdapter } from './adapters/supabase-media-locations.adapter';
import { describeMediaLocationRpcError } from './media-locations.helpers';
import type {
  MediaItemLocationRow,
  MediaLocationAddInput,
  MediaLocationDeleteResult,
  MediaLocationResult,
  MediaLocationUpdateInput,
} from './media-locations.types';

export type {
  MediaItemLocationRow,
  MediaLocationAddInput,
  MediaLocationUpdateInput,
} from './media-locations.types';

@Injectable({ providedIn: 'root' })
export class MediaLocationsService {
  private readonly adapter = inject(SupabaseMediaLocationsAdapter);
  private readonly geocodingService = inject(GeocodingService);
  private readonly listCache = new Map<string, MediaItemLocationRow[]>();

  /** Drop cached list rows after mutations or external reload. */
  invalidateListCache(mediaItemId?: string): void {
    if (mediaItemId) {
      this.listCache.delete(mediaItemId);
      return;
    }
    this.listCache.clear();
  }

  async listForMedia(mediaItemId: string): Promise<MediaLocationResult> {
    const cached = this.listCache.get(mediaItemId);
    if (cached) {
      return { ok: true, rows: cached };
    }

    try {
      const rows = await this.adapter.list(mediaItemId);
      this.listCache.set(mediaItemId, rows);
      return { ok: true, rows };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  async addLocation(input: MediaLocationAddInput): Promise<MediaLocationResult> {
    this.invalidateListCache(input.mediaItemId);
    try {
      const row = await this.adapter.add(input);
      return { ok: true, row };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  async addFromGeocodeSuggestion(
    mediaItemId: string,
    suggestion: ForwardGeocodeResult,
    extra?: { extra_information?: string | null },
  ): Promise<MediaLocationResult> {
    return this.addLocation({
      mediaItemId,
      street: suggestion.street,
      house_number: suggestion.streetNumber,
      postcode: suggestion.zip,
      city: suggestion.city,
      district: suggestion.district,
      country: suggestion.country,
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      address_label: suggestion.addressLabel,
      ...extra,
    });
  }

  async addFromFreeText(mediaItemId: string, label: string): Promise<MediaLocationResult> {
    const trimmed = label.trim();
    if (!trimmed) {
      return { ok: false, error: 'Address label is required.', code: 'validation_error' };
    }
    const forward = await this.geocodingService.forward(trimmed);
    if (forward) {
      return this.addFromGeocodeSuggestion(mediaItemId, forward);
    }
    return this.addLocation({
      mediaItemId,
      address_label: trimmed,
    });
  }

  async updateLocation(input: MediaLocationUpdateInput): Promise<MediaLocationResult> {
    this.invalidateListCache();
    try {
      const row = await this.adapter.update(input);
      return { ok: true, row };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  async updateFromCoordinates(
    locationId: string,
    coords: { lat: number; lng: number },
  ): Promise<MediaLocationResult> {
    this.invalidateListCache();
    const reverse = await this.geocodingService.reverse(coords.lat, coords.lng);
    return this.updateLocation({
      locationId,
      latitude: coords.lat,
      longitude: coords.lng,
      address_label: reverse?.addressLabel ?? null,
      street: reverse?.street ?? null,
      house_number: reverse?.streetNumber ?? null,
      postcode: reverse?.zip ?? null,
      city: reverse?.city ?? null,
      district: reverse?.district ?? null,
      country: reverse?.country ?? null,
    });
  }

  /** Delete link/location only — caller owns a single `listForMedia` reload + display patch. */
  async deleteLocation(locationId: string): Promise<MediaLocationDeleteResult> {
    this.invalidateListCache();
    try {
      await this.adapter.delete(locationId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }
}
