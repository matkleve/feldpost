/**
 * Load project linked locations for upload Branch B bias + Step 2 trays.
 * @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md
 */

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import type { UploadProjectCentroid } from '../upload-address-resolution.types';

export interface ProjectLocationRow {
  linkId: string;
  sortOrder: number;
  locationId: string;
  street: string | null;
  houseNumber: string | null;
  postcode: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  addressLabel: string | null;
}

@Injectable({ providedIn: 'root' })
export class UploadProjectLocationsAdapter {
  private readonly supabase = inject(SupabaseService);

  async listProjectLocations(projectId: string): Promise<ProjectLocationRow[]> {
    const { data, error } = await this.supabase.client.rpc('list_project_locations', {
      p_project_id: projectId,
    });
    if (error || !data) {
      return [];
    }
    return (data as Record<string, unknown>[]).map((row) => ({
      linkId: String(row['link_id']),
      sortOrder: Number(row['sort_order'] ?? 0),
      locationId: String(row['location_id']),
      street: (row['street'] as string | null) ?? null,
      houseNumber: (row['house_number'] as string | null) ?? null,
      postcode: (row['postcode'] as string | null) ?? null,
      city: (row['city'] as string | null) ?? null,
      district: (row['district'] as string | null) ?? null,
      country: (row['country'] as string | null) ?? null,
      latitude: row['latitude'] != null ? Number(row['latitude']) : null,
      longitude: row['longitude'] != null ? Number(row['longitude']) : null,
      addressLabel: (row['address_label'] as string | null) ?? null,
    }));
  }

  /** Lowest sort_order row with valid coords — Branch B bias. */
  pickCentroid(rows: readonly ProjectLocationRow[]): UploadProjectCentroid | null {
    const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const row of sorted) {
      const lat = row.latitude;
      const lng = row.longitude;
      if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          lat,
          lng,
          city: row.city ?? row.district ?? null,
          zoom: 14,
        };
      }
    }
    return null;
  }
}
