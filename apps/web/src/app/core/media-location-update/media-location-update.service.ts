import { Injectable, inject } from '@angular/core';
import {
  GeocodingService,
  type ForwardGeocodeResult,
  type ReverseGeocodeResult,
} from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';

export interface MediaLocationUpdateResult {
  ok: boolean;
  error?: string;
  lat?: number;
  lng?: number;
}

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

    const { error } = await this.supabaseService.client.rpc('resolve_media_location', payload);
    if (error) {
      return {
        ok: false,
        error:
          typeof error.message === 'string' && error.message.trim().length > 0
            ? error.message
            : 'Location update failed.',
      };
    }

    return { ok: true, lat: suggestion.lat, lng: suggestion.lng };
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

    const { error } = await this.supabaseService.client.rpc('resolve_media_location', payload);
    if (error) {
      return {
        ok: false,
        error:
          typeof error.message === 'string' && error.message.trim().length > 0
            ? error.message
            : 'Location update failed.',
      };
    }

    return { ok: true, lat: coords.lat, lng: coords.lng };
  }
}
