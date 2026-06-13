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
import {
  countZoomableLinks,
  describeMediaLocationRpcError,
  splitStreetAndHouseNumber,
} from './media-locations.helpers';
import type {
  MediaItemLocationRow,
  MediaLocationAddInput,
  MediaLocationAddressPatch,
  MediaLocationCoreRow,
  MediaLocationDeleteResult,
  MediaLocationErrorResult,
  MediaLocationLinkRef,
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

  /** Per media: ordered link refs (junction `sort_order`, `link_id`). */
  private readonly mediaToLinks = new Map<string, MediaLocationLinkRef[]>();

  /** Canonical row per `locations.id` (shared across media). */
  private readonly locationToRow = new Map<string, MediaLocationCoreRow>();

  /** How many cached media items currently link to this location (session cache only). */
  countMediaLinkedToLocation(locationId: string): number {
    let count = 0;
    for (const refs of this.mediaToLinks.values()) {
      if (refs.some((ref) => ref.locationId === locationId)) {
        count++;
      }
    }
    return count;
  }

  /** True when more than one media item in cache shares this `locations.id`. */
  isLocationSharedAcrossMedia(locationId: string): boolean {
    return this.countMediaLinkedToLocation(locationId) > 1;
  }

  /** Drop cached link lists; optional nuclear reset clears canonical locations too. */
  invalidateListCache(mediaItemId?: string): void {
    if (mediaItemId) {
      this.mediaToLinks.delete(mediaItemId);
      return;
    }
    this.mediaToLinks.clear();
    this.locationToRow.clear();
  }

  /**
   * Writes list rows from a batch hydrate; does not RPC.
   * Clones each core row and link ref at write.
   */
  seedListCache(rowsByMediaId: ReadonlyMap<string, readonly MediaItemLocationRow[]>): void {
    for (const [mediaItemId, rows] of rowsByMediaId) {
      this.applyRowsToCache(mediaItemId, rows);
    }
  }

  /**
   * Batch summary load + list cache seed (gallery, workspace, projects).
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
      this.applyRowsToCache(mediaItemId, rows);
      return { ok: true, row };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  async listForMedia(mediaItemId: string): Promise<MediaLocationResult> {
    const cached = this.readCachedRowsForMedia(mediaItemId);
    if (cached) {
      return { ok: true, rows: cached };
    }

    try {
      const rows = await this.adapter.list(mediaItemId);
      this.applyRowsToCache(mediaItemId, rows);
      const hydrated = this.readCachedRowsForMedia(mediaItemId);
      return { ok: true, rows: hydrated ?? rows };
    } catch (error) {
      return { ok: false, error: describeMediaLocationRpcError(error as { message?: string }) };
    }
  }

  /**
   * After upload placement / forward geocode: drop stale link list, reload from RPC, return zoomable count.
   * @see docs/specs/service/media-locations/media-locations.zoomable-map-contract.supplement.md §7
   */
  async syncListCacheAfterPlacement(mediaItemId: string): Promise<number> {
    this.invalidateListCache(mediaItemId);
    const result = await this.listForMedia(mediaItemId);
    if (!result.ok || !('rows' in result)) {
      return 0;
    }
    return countZoomableLinks(result.rows);
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
    const { street, house_number } = splitStreetAndHouseNumber(
      suggestion.street,
      suggestion.streetNumber,
    );
    return this.addLocation({
      mediaItemId,
      street,
      house_number,
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

  /**
   * Reverse-geocode EXIF GPS and add a linked location row (detail EXIF row action).
   * @see docs/specs/ui/media-detail/media-detail-inline-section.md
   */
  async addFromExifCoordinates(
    mediaItemId: string,
    coords: { lat: number; lng: number },
  ): Promise<MediaLocationResult & { reverseGeocodeFailed?: boolean }> {
    const reverse = await this.geocodingService.reverse(coords.lat, coords.lng);
    if (reverse) {
      const result = await this.addFromGeocodeSuggestion(mediaItemId, {
        ...reverse,
        lat: coords.lat,
        lng: coords.lng,
      });
      return { ...result, reverseGeocodeFailed: false };
    }
    const result = await this.addLocation({
      mediaItemId,
      latitude: coords.lat,
      longitude: coords.lng,
      address_label: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
    });
    return { ...result, reverseGeocodeFailed: true };
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
      this.updateCachedLocation(row.id, row);
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
    const { street, house_number } = splitStreetAndHouseNumber(
      reverse?.street,
      reverse?.streetNumber,
    );
    return this.updateLocation({
      locationId,
      latitude: coords.lat,
      longitude: coords.lng,
      address_label: reverse?.addressLabel ?? null,
      street,
      house_number,
      postcode: reverse?.zip ?? null,
      city: reverse?.city ?? null,
      district: reverse?.district ?? null,
      country: reverse?.country ?? null,
    });
  }

  /** Delete link/location only — caller owns a single `listForMedia` reload + display patch. */
  async deleteLocation(locationId: string): Promise<MediaLocationDeleteResult> {
    try {
      await this.adapter.delete(locationId);
      this.invalidateByLocationId(locationId);
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
      this.applyRowsToCache(input.mediaItemId, rows);
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

  /** Org-scoped find_or_create for project location picker (no media link). */
  async findOrCreateFromAddressLabel(label: string): Promise<string | null> {
    const trimmed = label.trim();
    if (!trimmed) {
      return null;
    }
    const forward = await this.geocodingService.forward(trimmed);
    const patch = forward ? forwardPatchFromGeocode(forward) : { address_label: trimmed };
    const created = await this.adapter.findOrCreate(patch);
    return created.id;
  }

  private applyRowsToCache(mediaItemId: string, rows: readonly MediaItemLocationRow[]): void {
    const refs: MediaLocationLinkRef[] = [];
    for (const row of rows) {
      this.locationToRow.set(row.id, this.cloneCoreRow(rowToCoreRow(row)));
      refs.push({
        locationId: row.id,
        link_id: row.link_id,
        sort_order: row.sort_order,
      });
    }
    this.mediaToLinks.set(
      mediaItemId,
      refs.map((ref) => ({ ...ref })),
    );
  }

  /**
   * Cache read: assemble rows for one media item.
   * Returns null on miss or partial integrity failure (never a shortened list).
   */
  private readCachedRowsForMedia(mediaItemId: string): MediaItemLocationRow[] | null {
    const refs = this.mediaToLinks.get(mediaItemId);
    if (!refs) {
      return null;
    }

    const resolvedCores: MediaLocationCoreRow[] = [];
    for (const ref of refs) {
      const core = this.locationToRow.get(ref.locationId);
      if (core) {
        resolvedCores.push(core);
      }
    }

    if (refs.length !== resolvedCores.length) {
      return null;
    }

    const rows = refs.map((ref) => {
      const core = this.locationToRow.get(ref.locationId)!;
      return this.assembleMediaRow(mediaItemId, ref, core);
    });
    return [...rows].sort((a, b) => a.sort_order - b.sort_order);
  }

  private updateCachedLocation(locationId: string, row: MediaItemLocationRow): void {
    const existing = this.locationToRow.get(locationId);
    if (!existing) {
      return;
    }
    const patch = rowToCoreRow(row);
    this.locationToRow.set(locationId, { ...existing, ...patch, id: locationId });
  }

  private invalidateByLocationId(locationId: string): void {
    this.locationToRow.delete(locationId);
    for (const [mediaId, refs] of this.mediaToLinks) {
      const next = refs.filter((ref) => ref.locationId !== locationId);
      if (next.length === 0) {
        this.mediaToLinks.delete(mediaId);
      } else {
        this.mediaToLinks.set(mediaId, next);
      }
    }
  }

  private cloneCoreRow(row: MediaLocationCoreRow): MediaLocationCoreRow {
    return { ...row };
  }

  private assembleMediaRow(
    mediaItemId: string,
    ref: MediaLocationLinkRef,
    core: MediaLocationCoreRow,
  ): MediaItemLocationRow {
    return {
      ...core,
      id: core.id,
      link_id: ref.link_id,
      media_item_id: mediaItemId,
      sort_order: ref.sort_order,
    };
  }
}

function rowToCoreRow(row: MediaItemLocationRow): MediaLocationCoreRow {
  const { media_item_id: _mediaItemId, sort_order: _sortOrder, link_id: _linkId, ...core } = row;
  return { ...core };
}

function forwardPatchFromGeocode(suggestion: ForwardGeocodeResult): MediaLocationAddressPatch {
  const { street, house_number } = splitStreetAndHouseNumber(
    suggestion.street,
    suggestion.streetNumber,
  );
  return {
    street,
    house_number,
    postcode: suggestion.zip,
    city: suggestion.city,
    district: suggestion.district,
    country: suggestion.country,
    latitude: suggestion.lat,
    longitude: suggestion.lng,
    address_label: suggestion.addressLabel,
  };
}
