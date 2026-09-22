/**
 * Adapter between the bulk-resolution engine and the real services (Phase 5.3).
 *
 * The engine takes its effects as injected functions so its rules can be tested without a database.
 * This is the one place those functions are supplied for real — and the only place bulk resolution
 * touches `GeocodingService` or `MediaLocationUpdateService`.
 *
 * Two properties it exists to guarantee:
 *
 * 1. **The whole geocode result passes through.** `updateFromAddressSuggestion` derives address
 *    precision from `city` / `street` / `streetNumber` / `zip` / `country`, so anything narrower
 *    writes coordinates with no address.
 * 2. **Nothing thrown escapes.** A geocoder outage or one rejected row must become a reported
 *    outcome, because the engine's contract is that a failure never aborts the run.
 *
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 * @see docs/specs/system/deferred-location-resolution.batch.supplement.md
 */

import type { ForwardGeocodeResult, GeocodingService } from '../geocoding/geocoding.service';
import type { MediaLocationUpdateService } from '../media-location-update/media-location-update.service';
import type { BulkResolutionRunnerDeps } from './bulk-resolution.runner';

export interface BulkResolutionServices {
  geocoding: Pick<GeocodingService, 'forward' | 'reverse'>;
  locationUpdate: Pick<MediaLocationUpdateService, 'updateFromAddressSuggestion'>;
}

/**
 * Build the engine's effects from the live services.
 *
 * `onProgress`, `signal` and the chunking knobs stay the caller's to supply — they belong to the
 * run, not to the wiring.
 */
export function createBulkResolutionDeps(
  services: BulkResolutionServices,
): Pick<BulkResolutionRunnerDeps<ForwardGeocodeResult>, 'geocode' | 'applyToItem'> {
  return {
    async geocode(addressLabel, coords) {
      try {
        // A point reverse-geocodes; a text address forward-geocodes. Which one is decided by the
        // plan's source, not guessed here.
        if (coords) {
          const hit = await services.geocoding.reverse(coords.lat, coords.lng);
          if (!hit) {
            return null;
          }
          // `ReverseGeocodeResult` carries no lat/lng — it answers "what is at this point", and the
          // point is the one we passed in. Carry those coordinates forward rather than re-deriving
          // them: the photo's own GPS is the position, and the reverse lookup only names it.
          return { ...hit, lat: coords.lat, lng: coords.lng };
        }
        return (await services.geocoding.forward(addressLabel)) ?? null;
      } catch {
        // A miss and an outage are the same thing to the engine: this group is not placeable, so
        // its items are reported and the run continues.
        return null;
      }
    },

    async applyToItem(mediaId, suggestion) {
      try {
        const result = await services.locationUpdate.updateFromAddressSuggestion(
          mediaId,
          suggestion,
        );
        return { ok: result.ok, error: result.error };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}
