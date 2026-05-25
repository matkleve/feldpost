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
import type { SupabaseClient } from '@supabase/supabase-js';
import { GeocodingService, type ForwardGeocodeResult } from '../geocoding/geocoding.service';
import { SupabaseMediaLocationsAdapter } from './adapters/supabase-media-locations.adapter';
import {
  loadLocationSummaryByMediaIds,
  type MediaLocationSummaryMaps,
} from './media-locations-batch.helpers';
import { describeMediaLocationRpcError } from './media-locations.helpers';
import type {
  MediaItemLocationRow,
  MediaLocationAddInput,
  MediaLocationAddressPatch,
  MediaLocationDeleteResult,
  MediaLocationErrorResult,
  MediaLocationReplaceLinkInput,
  MediaLocationResult,
  MediaLocationUpdateInput,
  OrgLocationSearchRow,
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

  /**
   * Writes list rows from a batch hydrate; does not RPC.
   * Clones each row at write — independent of batch-return clone (different mutation vectors).
   */
  seedListCache(rowsByMediaId: ReadonlyMap<string, readonly MediaItemLocationRow[]>): void {
    for (const [mediaItemId, rows] of rowsByMediaId) {
      this.listCache.set(
        mediaItemId,
        rows.map((row) => ({ ...row })),
      );
    }
  }

  /**
   * Batch summary load + `listCache` seed (gallery, workspace, projects).
   * @see docs/specs/service/media-locations/media-locations-service.md
   */
  async hydrateSummariesAndSeedCache(
    client: SupabaseClient,
    mediaItemIds: string[],
    chunkSize?: number,
  ): Promise<MediaLocationSummaryMaps> {
    const maps = await loadLocationSummaryByMediaIds(client, mediaItemIds, chunkSize);
    this.seedListCache(maps.rowsByMediaId);
    return maps;
  }

  async searchLocations(
    query: string | null,
    limit: number,
    mediaItemId?: string,
  ): Promise<{ ok: true; rows: OrgLocationSearchRow[] } | MediaLocationErrorResult> {
    try {
      const rows = await this.adapter.searchLocations(query, limit, mediaItemId);
      return { ok: true, rows };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  /** Link an existing org location without find_or_create (picker pre-resolve path). */
  async replaceWithExistingLocation(
    mediaItemId: string,
    previousLocationId: string,
    locationId: string,
  ): Promise<MediaLocationResult> {
    this.invalidateListCache(mediaItemId);
    try {
      await this.adapter.unlink(mediaItemId, previousLocationId);
      return await this.linkExistingLocation(mediaItemId, locationId);
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  async linkExistingLocation(
    mediaItemId: string,
    locationId: string,
  ): Promise<MediaLocationResult> {
    this.invalidateListCache(mediaItemId);
    try {
      await this.adapter.link(mediaItemId, locationId);
      const rows = await this.adapter.list(mediaItemId);
      const row = rows.find((item) => item.id === locationId) ?? rows[rows.length - 1];
      if (!row) {
        return { ok: false, error: 'Location link not found after link.', code: 'unknown' };
      }
      this.listCache.set(mediaItemId, rows);
      return { ok: true, row };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
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

  /**
   * Move one media item to a different shared location: unlink → find_or_create → link.
   * Does not patch the previous `locations` row.
   */
  async replaceMediaItemLocationLink(
    input: MediaLocationReplaceLinkInput,
  ): Promise<MediaLocationResult> {
    this.invalidateListCache(input.mediaItemId);
    try {
      await this.adapter.unlink(input.mediaItemId, input.previousLocationId);
      const created = await this.adapter.findOrCreate(input.patch);
      await this.adapter.link(input.mediaItemId, created.id);
      const rows = await this.adapter.list(input.mediaItemId);
      const row = rows.find((item) => item.id === created.id) ?? rows[rows.length - 1];
      if (!row) {
        return { ok: false, error: 'Location link not found after replace.', code: 'unknown' };
      }
      this.listCache.set(input.mediaItemId, rows);
      return { ok: true, row };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  async replaceLocationLinkFromFreeText(
    mediaItemId: string,
    previousLocationId: string,
    label: string,
  ): Promise<MediaLocationResult> {
    const trimmed = label.trim();
    if (!trimmed) {
      return { ok: false, error: 'Address label is required.', code: 'validation_error' };
    }
    const forward = await this.geocodingService.forward(trimmed);
    if (forward) {
      return this.replaceMediaItemLocationLink({
        mediaItemId,
        previousLocationId,
        patch: forwardPatchFromGeocode(forward),
      });
    }
    return this.replaceMediaItemLocationLink({
      mediaItemId,
      previousLocationId,
      patch: { address_label: trimmed },
    });
  }

  async replaceLocationLinkFromGeocode(
    mediaItemId: string,
    previousLocationId: string,
    suggestion: ForwardGeocodeResult,
  ): Promise<MediaLocationResult> {
    return this.replaceMediaItemLocationLink({
      mediaItemId,
      previousLocationId,
      patch: forwardPatchFromGeocode(suggestion),
    });
  }
}

function forwardPatchFromGeocode(suggestion: ForwardGeocodeResult): MediaLocationAddressPatch {
  return {
    street: suggestion.street,
    house_number: suggestion.streetNumber,
    postcode: suggestion.zip,
    city: suggestion.city,
    district: suggestion.district,
    country: suggestion.country,
    latitude: suggestion.lat,
    longitude: suggestion.lng,
    address_label: suggestion.addressLabel,
  };
}
