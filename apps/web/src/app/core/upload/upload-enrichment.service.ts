/**
 * UploadEnrichmentService — post-upload geocoding enrichment.
 *
 * Handles Path A (reverse-geocode GPS → address) and
 * Path B (forward-geocode filename address → GPS coordinates).
 *
 * Ground rules (Spec: upload-manager-pipeline.md § Enrichment):
 * - Path A: EXIF coords exist → reverse-geocode to resolved_address via GeocodingService
 * - Path B: Address from filename/folder; forward-geocode to coords via GeocodingService
 * - RLS boundary: Address resolution respects org_id + user location context
 * - Fallback: If geocoding fails, proceed with available data (partial enrichment ok)
 *
 * Public API:
 *  - reverseGeocodeCoords(coords): Promise<string> → address
 *  - forwardGeocodeAddress(address): Promise<ExifCoords | null> → coords
 *
 * Note: UploadService.uploadFile() calls resolveAddress() internally during storage upload,
 * so UploadEnrichmentService is currently used for validation and re-geocoding on demand.
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

      const { error } = await this.supabase.client.rpc('resolve_media_location', {
        p_media_item_id: imageId,
        p_latitude: result.lat,
        p_longitude: result.lng,
        p_address_label: result.addressLabel,
        p_city: result.city,
        p_district: result.district,
        p_street: result.street,
        p_country: result.country,
      });

      if (error) return undefined;

      return { coords: { lat: result.lat, lng: result.lng } };
    } catch {
      // Enrichment failure is silent — coords remain null.
      return undefined;
    }
  }

  /**
   * Forward-geocode only (no persistence). Used for EXIF-vs-title reconciliation.
   */
  async forwardGeocodeAddress(titleAddress: string): Promise<ExifCoords | undefined> {
    try {
      const result = await this.geocoding.forward(titleAddress);
      if (!result) return undefined;
      return { lat: result.lat, lng: result.lng };
    } catch {
      return undefined;
    }
  }
}
