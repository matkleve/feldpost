/**
 * UploadEnrichmentService — post-upload geocoding enrichment.
 *
 * Handles Path A (reverse-geocode GPS → address) and
 * Path B (forward-geocode filename address → GPS coordinates).
 */

import { Injectable, inject } from '@angular/core';
import { GeocodingService } from '../geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { ExifCoords } from './upload.service';

export interface ForwardGeocodeResult {
  coords: ExifCoords;
}

@Injectable({ providedIn: 'root' })
export class UploadEnrichmentService {
  private readonly geocoding = inject(GeocodingService);
  private readonly supabase = inject(SupabaseService);

  /**
   * Path A: reverse-geocode GPS → address.
   * UploadService.uploadFile already calls resolveAddress() internally,
   * so this is currently a no-op placeholder for state tracking.
   */
  async enrichWithReverseGeocode(imageId: string): Promise<void> {
    void imageId;
    // UploadService.uploadFile already fires reverse-geocode as fire-and-forget.
    // This method exists for future standalone usage.
  }

  /**
   * Path B: forward-geocode title address → GPS coordinates.
   * Updates the DB row with resolved coordinates and address fields.
   * Returns the resolved coords, or undefined on failure.
   */
  async enrichWithForwardGeocode(
    imageId: string,
    titleAddress: string,
  ): Promise<ForwardGeocodeResult | undefined> {
    try {
      const result = await this.geocoding.forward(titleAddress);
      if (!result) return undefined;

      // Update the DB row with the resolved coordinates.
      const { error } = await this.supabase.client
        .from('media_items')
        .update({
          latitude: result.lat,
          longitude: result.lng,
          location_status: 'gps',
        })
        .or(`id.eq.${imageId},source_image_id.eq.${imageId}`);

      if (error) return undefined;

      // Update the DB row with address fields from forward geocoding.
      await this.supabase.client
        .from('media_items')
        .update({
          address_label: result.addressLabel,
          city: result.city,
          district: result.district,
          street: result.street,
          country: result.country,
        })
        .or(`id.eq.${imageId},source_image_id.eq.${imageId}`);

      return { coords: { lat: result.lat, lng: result.lng } };
    } catch {
      // Enrichment failure is silent — coords remain null.
      return undefined;
    }
  }
}
