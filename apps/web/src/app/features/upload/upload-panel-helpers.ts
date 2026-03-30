/**
 * UploadPanel Pure Helper Functions
 *
 * Contains utilities for job status checks, zone filtering, and search result mapping.
 * All functions here are side-effect-free and can be tested independently.
 */

import type { ForwardGeocodeResult, GeocoderSearchResult } from '../../core/geocoding.service';
import type { UploadJob, UploadPhase } from '../../core/upload/upload-manager.service';
import { UPLOAD_LANES } from './upload-panel.constants';
import type { UploadLane } from './upload-phase.helpers';

/**
 * Checks if a job can be retried (failed, missing data, or skipped).
 */
export function isRetryableJob(job: UploadJob): boolean {
  return job.phase === 'error' || job.phase === 'missing_data' || job.phase === 'skipped';
}

/**
 * Checks if a phase is a terminal state (won't change without user action).
 */
export function isTerminalJob(phase: UploadPhase): boolean {
  return (
    phase === 'complete' || phase === 'error' || phase === 'missing_data' || phase === 'skipped'
  );
}

/**
 * Type guard: checks if a string is a valid UploadLane.
 */
export function isUploadLane(value: string): value is UploadLane {
  return (UPLOAD_LANES as readonly string[]).includes(value);
}

/**
 * Converts geocoder search results to structured ForwardGeocodeResult format.
 * Filters out invalid entries (missing lat/lng).
 */
export function mapSearchResultsToForwardSuggestions(
  results: readonly GeocoderSearchResult[],
): ForwardGeocodeResult[] {
  return results
    .map((result) => {
      if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
        return null;
      }

      const address = result.address;
      return {
        lat: result.lat,
        lng: result.lng,
        addressLabel: result.displayName,
        city: address?.city ?? address?.town ?? address?.village ?? address?.municipality ?? null,
        district: null,
        street: address?.road ?? null,
        streetNumber: address?.house_number ?? null,
        zip: address?.postcode ?? null,
        country: address?.country ?? null,
      } as ForwardGeocodeResult;
    })
    .filter((entry): entry is ForwardGeocodeResult => entry !== null);
}
