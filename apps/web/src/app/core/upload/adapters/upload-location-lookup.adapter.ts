/**
 * Read-only Supabase lookup for upload address resolution.
 * @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import type { UploadLocationRowHit, UploadSearchObject } from '../upload-address-resolution.types';
import { searchObjectToRpcParams } from '../upload-location-resolution.helpers';

@Injectable({ providedIn: 'root' })
export class UploadLocationLookupAdapter {
  private readonly supabase = inject(SupabaseService);

  async findBySearchObject(so: UploadSearchObject): Promise<UploadLocationRowHit | null> {
    const params = searchObjectToRpcParams(so);
    const { data, error } = await this.supabase.client.rpc('get_location_by_address_components', params);
    if (error || !data) {
      return null;
    }
    const row = data as Record<string, unknown>;
    const lat = Number(row['latitude']);
    const lng = Number(row['longitude']);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return {
      id: String(row['id']),
      latitude: lat,
      longitude: lng,
      street: (row['street'] as string) ?? null,
      house_number: (row['house_number'] as string) ?? null,
      postcode: (row['postcode'] as string) ?? null,
      city: (row['city'] as string) ?? null,
      district: (row['district'] as string) ?? null,
      country: (row['country'] as string) ?? null,
      address_label: (row['address_label'] as string) ?? null,
    };
  }
}
