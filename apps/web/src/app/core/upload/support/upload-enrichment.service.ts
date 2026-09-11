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
import { buildForwardGeocodeRetryQueries } from '../../geocoding/geocode-forward-retry.helpers';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { MediaLocationsService } from '../../media-locations/media-locations.service';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  capFieldsToPrecisionTier,
  deriveAddressPrecisionFromForwardResult,
  geocodeResultToPrecisionFields,
} from '../address-resolution/upload-address-precision.helpers';
import type { UploadAddressPersistContext } from '../address-resolution/upload-address-persist-context.helpers';
import type { ExifCoords } from '../upload.service';

export interface ForwardGeocodeResult {
  coords: ExifCoords;
}

@Injectable({ providedIn: 'root' })
export class UploadEnrichmentService {
  private readonly geocoding = inject(GeocodingService);
  private readonly supabase = inject(SupabaseService);
  private readonly mediaLocations = inject(MediaLocationsService);

  /**
   * Path A: reverse-geocode GPS → address.
   * UploadService.uploadFile already calls resolveAddress() internally,
   * so this is currently a no-op placeholder for state tracking.
   */
  async enrichWithReverseGeocode(mediaId: string): Promise<void> {
    void mediaId;
    // UploadService.uploadFile already fires reverse-geocode as fire-and-forget.
    // This method exists for future standalone usage.
  }

  /**
   * Path B: forward-geocode title address → GPS coordinates.
   * Updates the DB row with resolved coordinates and address fields.
   * Returns the resolved coords, or undefined on failure.
   */
  async enrichWithForwardGeocode(
    mediaId: string,
    titleAddress: string,
    addressContext?: UploadAddressPersistContext | null,
  ): Promise<ForwardGeocodeResult | undefined> {
    void titleAddress;
    try {
      const result = await this.forwardWithRetries(titleAddress);
      if (!result) {
        await this.markLocationUnresolvable(mediaId);
        return undefined;
      }

      const inputPrecision = addressContext?.precision ?? null;
      const geocodeFields = geocodeResultToPrecisionFields(result);
      const mergedFields = addressContext?.hasEstablishedTextAddress
        ? {
            country: addressContext.fields.country ?? geocodeFields.country,
            state: addressContext.fields.state ?? geocodeFields.state,
            postcode: addressContext.fields.postcode ?? geocodeFields.postcode,
            city: addressContext.fields.city ?? geocodeFields.city,
            street: addressContext.fields.street ?? geocodeFields.street,
            houseNumber: addressContext.fields.houseNumber ?? geocodeFields.houseNumber,
          }
        : geocodeFields;
      const fields =
        inputPrecision != null
          ? capFieldsToPrecisionTier(mergedFields, inputPrecision)
          : mergedFields;
      const precision =
        inputPrecision ?? deriveAddressPrecisionFromForwardResult(result);
      const addressLabel = addressContext?.addressLabel ?? result.addressLabel;

      const { error } = await this.supabase.client.rpc('resolve_media_location', {
        p_media_item_id: mediaId,
        p_latitude: result.lat,
        p_longitude: result.lng,
        p_address_label: addressLabel,
        p_city: fields.city,
        p_district: result.district,
        p_street: fields.street,
        p_house_number: fields.houseNumber,
        p_postcode: fields.postcode,
        p_country: fields.country,
        p_address_precision: precision,
      });

      if (error) {
        await this.markLocationUnresolvable(mediaId);
        return undefined;
      }

      await this.mediaLocations.syncListCacheAfterPlacement(mediaId);
      return { coords: { lat: result.lat, lng: result.lng } };
    } catch {
      await this.markLocationUnresolvable(mediaId);
      return undefined;
    }
  }

  /**
   * Forward-geocode only (no persistence). Used for EXIF-vs-title reconciliation.
   */
  async forwardGeocodeAddress(titleAddress: string): Promise<ExifCoords | undefined> {
    try {
      const result = await this.forwardWithRetries(titleAddress);
      if (!result) return undefined;
      return { lat: result.lat, lng: result.lng };
    } catch {
      return undefined;
    }
  }

  private async forwardWithRetries(titleAddress: string) {
    for (const query of buildForwardGeocodeRetryQueries(titleAddress)) {
      const result = await this.geocoding.forward(query);
      if (result) {
        return result;
      }
    }
    return null;
  }

  private async markLocationUnresolvable(mediaId: string): Promise<void> {
    await this.supabase.client.rpc('resolve_media_location', {
      p_media_item_id: mediaId,
      p_location_status: 'unresolvable',
    });
  }
}
