/**
 * Supabase RPC adapter for `locations` + `media_item_location_links`.
 *
 * Components must not call this directly — use `MediaLocationsService`.
 *
 * @see supabase/migrations/20260524120000_locations_nn_junction.sql
 */
import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import type {
  MediaItemLocationRow,
  MediaLocationAddInput,
  MediaLocationAddressPatch,
  MediaLocationUpdateInput,
} from '../media-locations.types';

@Injectable({ providedIn: 'root' })
export class SupabaseMediaLocationsAdapter {
  private readonly supabase = inject(SupabaseService);

  async list(mediaItemId: string, limit = 50, offset = 0): Promise<MediaItemLocationRow[]> {
    const { data, error } = await this.supabase.client.rpc('list_locations_for_media', {
      p_media_item_id: mediaItemId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      throw error;
    }
    return (data ?? []) as MediaItemLocationRow[];
  }

  async add(input: MediaLocationAddInput): Promise<MediaItemLocationRow> {
    const { data, error } = await this.supabase.client.rpc('add_media_item_location', {
      p_media_item_id: input.mediaItemId,
      ...patchToRpcParams(input),
    });
    if (error) {
      throw error;
    }
    return data as MediaItemLocationRow;
  }

  async update(input: MediaLocationUpdateInput): Promise<MediaItemLocationRow> {
    const { data, error } = await this.supabase.client.rpc('update_media_item_location', {
      p_location_id: input.locationId,
      ...patchToRpcParams(input),
    });
    if (error) {
      throw error;
    }
    return data as MediaItemLocationRow;
  }

  async delete(locationId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('delete_media_item_location', {
      p_location_id: locationId,
    });
    if (error) {
      throw error;
    }
  }

  async setPrimary(locationId: string): Promise<MediaItemLocationRow> {
    const { data, error } = await this.supabase.client.rpc('set_primary_media_item_location', {
      p_location_id: locationId,
    });
    if (error) {
      throw error;
    }
    return data as MediaItemLocationRow;
  }
}

function patchToRpcParams(patch: MediaLocationAddressPatch): Record<string, string | number | null> {
  return {
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
  };
}
