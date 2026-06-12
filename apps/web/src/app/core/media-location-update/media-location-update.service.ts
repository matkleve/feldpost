import { Injectable, inject } from '@angular/core';
import {
  GeocodingService,
  type ForwardGeocodeResult,
  type ReverseGeocodeResult,
} from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  describeLocationUpdateRpcError,
  LOCATION_UPDATE_NOT_FOUND_ERROR,
} from './media-location-update.helpers';
import type { MediaLocationAddressPatch, MediaLocationUpdateResult } from './media-location-update.types';

export type { MediaLocationAddressPatch, MediaLocationUpdateResult } from './media-location-update.types';

@Injectable({ providedIn: 'root' })
export class MediaLocationUpdateService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly geocodingService = inject(GeocodingService);

  async updateFromAddressSuggestion(
    mediaId: string,
    suggestion: ForwardGeocodeResult,
  ): Promise<MediaLocationUpdateResult> {
    const payload = {
      p_media_item_id: mediaId,
      p_latitude: suggestion.lat,
      p_longitude: suggestion.lng,
      p_address_label: suggestion.addressLabel,
      p_city: suggestion.city,
      p_district: suggestion.district,
      p_street: suggestion.street,
      p_country: suggestion.country,
    };

    return this.finishResolveMediaLocationRpc(
      mediaId,
      await this.supabaseService.client.rpc('resolve_media_location', payload),
      { lat: suggestion.lat, lng: suggestion.lng },
      {
        address_label: suggestion.addressLabel,
        street: suggestion.street,
        house_number: suggestion.streetNumber,
        postcode: suggestion.zip,
        city: suggestion.city,
        district: suggestion.district,
        country: suggestion.country,
        latitude: suggestion.lat,
        longitude: suggestion.lng,
      },
    );
  }

  async updateFromCoordinates(
    mediaId: string,
    coords: { lat: number; lng: number },
  ): Promise<MediaLocationUpdateResult> {
    const reverse = await this.geocodingService.reverse(coords.lat, coords.lng);
    return this.updateFromCoordinatesAndAddress(mediaId, coords, reverse);
  }

  private async updateFromCoordinatesAndAddress(
    mediaId: string,
    coords: { lat: number; lng: number },
    reverse: ReverseGeocodeResult | null,
  ): Promise<MediaLocationUpdateResult> {
    const payload = {
      p_media_item_id: mediaId,
      p_latitude: coords.lat,
      p_longitude: coords.lng,
      p_address_label: reverse?.addressLabel ?? null,
      p_city: reverse?.city ?? null,
      p_district: reverse?.district ?? null,
      p_street: reverse?.street ?? null,
      p_country: reverse?.country ?? null,
    };

    return this.finishResolveMediaLocationRpc(
      mediaId,
      await this.supabaseService.client.rpc('resolve_media_location', payload),
      { lat: coords.lat, lng: coords.lng },
      reverse
        ? {
            address_label: reverse.addressLabel,
            street: reverse.street,
            house_number: reverse.streetNumber,
            postcode: reverse.zip,
            city: reverse.city,
            district: reverse.district,
            country: reverse.country,
            latitude: coords.lat,
            longitude: coords.lng,
          }
        : {
            latitude: coords.lat,
            longitude: coords.lng,
          },
    );
  }

  private async finishResolveMediaLocationRpc(
    mediaId: string,
    response: { data: boolean | null; error: { message?: string } | null },
    coords: { lat: number; lng: number },
    address?: MediaLocationAddressPatch,
  ): Promise<MediaLocationUpdateResult> {
    if (response.error) {
      return { ok: false, error: describeLocationUpdateRpcError(response.error) };
    }

    if (response.data !== true) {
      return { ok: false, error: LOCATION_UPDATE_NOT_FOUND_ERROR };
    }

    await this.ensureLocationLink(mediaId, {
      ...address,
      latitude: address?.latitude ?? coords.lat,
      longitude: address?.longitude ?? coords.lng,
    });

    return { ok: true, lat: coords.lat, lng: coords.lng, address };
  }

  /** Upload / legacy resolve: also write junction so map v2 sees the item. */
  private async ensureLocationLink(
    mediaId: string,
    patch: MediaLocationAddressPatch,
  ): Promise<void> {
    const { data: loc, error: findError } = await this.supabaseService.client.rpc(
      'find_or_create_location',
      {
        p_street: patch.street ?? null,
        p_house_number: patch.house_number ?? null,
        p_staircase: patch.staircase ?? null,
        p_door: patch.door ?? null,
        p_floor: patch.floor ?? null,
        p_postcode: patch.postcode ?? null,
        p_extra_information: patch.extra_information ?? null,
        p_city: patch.city ?? null,
        p_district: patch.district ?? null,
        p_country: patch.country ?? null,
        p_latitude: patch.latitude ?? null,
        p_longitude: patch.longitude ?? null,
        p_address_label: patch.address_label ?? null,
      },
    );

    if (findError || !loc || typeof loc !== 'object' || !('id' in loc)) {
      return;
    }

    const locationId = (loc as { id: string }).id;
    await this.supabaseService.client.rpc('link_media_to_location', {
      p_media_item_id: mediaId,
      p_location_id: locationId,
    });
  }
}
