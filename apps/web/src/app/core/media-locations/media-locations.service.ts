/**
 * Facade for **multi-location** persistence (`media_item_locations`).
 *
 * **What it does:** CRUD + set-primary for address rows tied to one `media_item_id`.
 * The primary row is projected to legacy `media_items.street/city/...` by DB triggers.
 *
 * **UI wiring:**
 * - `MediaDetailViewComponent` — list load, add, save row, delete, set primary, copy (clipboard only in view)
 * - `MapShellComponent` — `updateFromCoordinates(locationRowId)` after map pick on a row
 *
 * **Do not use** for upload-row GPS (see `MediaLocationUpdateService` on `media_items`).
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

  async listForMedia(mediaItemId: string): Promise<MediaLocationResult> {
    try {
      const rows = await this.adapter.list(mediaItemId);
      return { ok: true, rows };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  async addLocation(input: MediaLocationAddInput): Promise<MediaLocationResult> {
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
    const reverse = await this.geocodingService.reverse(coords.lat, coords.lng);
    return this.updateLocation({
      locationId,
      latitude: coords.lat,
      longitude: coords.lng,
      address_label: reverse?.addressLabel ?? null,
      street: reverse?.street ?? null,
      city: reverse?.city ?? null,
      district: reverse?.district ?? null,
      country: reverse?.country ?? null,
    });
  }

  async deleteAndReload(
    locationId: string,
    mediaItemId: string,
  ): Promise<{ delete: MediaLocationResult; list: MediaLocationResult }> {
    try {
      await this.adapter.delete(locationId);
      const rows = await this.adapter.list(mediaItemId);
      return { delete: { ok: true }, list: { ok: true, rows } };
    } catch (error) {
      const err = describeMediaLocationRpcError(error as { message?: string });
      return {
        delete: { ok: false, error: err },
        list: { ok: false, error: err },
      };
    }
  }

  async setPrimary(locationId: string): Promise<MediaLocationResult> {
    try {
      const row = await this.adapter.setPrimary(locationId);
      return { ok: true, row };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

}
