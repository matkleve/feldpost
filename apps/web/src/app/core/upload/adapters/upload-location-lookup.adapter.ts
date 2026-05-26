/**
 * Read-only Supabase lookup for upload address resolution.
 * @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import type { UploadLocationRowHit, UploadSearchObject } from '../upload-address-resolution.types';
import { searchObjectToRpcParams } from '../upload-location-resolution.helpers';
import { summarizeSearchObject, uploadAddressDebug } from '../upload-address-resolution.debug';

@Injectable({ providedIn: 'root' })
export class UploadLocationLookupAdapter {
  private readonly supabase = inject(SupabaseService);

  async findBySearchObject(so: UploadSearchObject): Promise<UploadLocationRowHit | null> {
    const params = searchObjectToRpcParams(so);
    uploadAddressDebug('db-lookup', 'RPC get_location_by_address_components', {
      params,
      searchObject: summarizeSearchObject(so),
    });
    const { data, error } = await this.supabase.client.rpc('get_location_by_address_components', params);
    if (error) {
      uploadAddressDebug('db-lookup', 'RPC error', { message: error.message, code: error.code });
      return null;
    }
    if (!data) {
      uploadAddressDebug('db-lookup', 'RPC miss (no row)');
      return null;
    }
    const row = data as Record<string, unknown>;
    const lat = Number(row['latitude']);
    const lng = Number(row['longitude']);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      uploadAddressDebug('db-lookup', 'RPC row missing coordinates', { id: row['id'] });
      return null;
    }
    uploadAddressDebug('db-lookup', 'RPC hit', {
      id: row['id'],
      latitude: lat,
      longitude: lng,
      city: row['city'],
      postcode: row['postcode'],
    });
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
