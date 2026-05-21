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
      await this.supabaseService.client.rpc('resolve_media_location', payload),
      { lat: suggestion.lat, lng: suggestion.lng },
      {
        address_label: suggestion.addressLabel,
        street: suggestion.street,
        city: suggestion.city,
        district: suggestion.district,
        country: suggestion.country,
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
      await this.supabaseService.client.rpc('resolve_media_location', payload),
      { lat: coords.lat, lng: coords.lng },
      reverse
        ? {
            address_label: reverse.addressLabel,
            street: reverse.street,
            city: reverse.city,
            district: reverse.district,
            country: reverse.country,
          }
        : undefined,
    );
  }

  private finishResolveMediaLocationRpc(
    response: { data: boolean | null; error: { message?: string } | null },
    coords: { lat: number; lng: number },
    address?: MediaLocationAddressPatch,
  ): MediaLocationUpdateResult {
    if (response.error) {
      return { ok: false, error: describeLocationUpdateRpcError(response.error) };
    }

    if (response.data !== true) {
      return { ok: false, error: LOCATION_UPDATE_NOT_FOUND_ERROR };
    }

    return { ok: true, lat: coords.lat, lng: coords.lng, address };
  }
}
