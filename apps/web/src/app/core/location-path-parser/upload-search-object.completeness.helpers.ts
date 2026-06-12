/**
 * Geocode completeness branches for upload Search Objects.
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */

import type { UploadSearchObject } from '../upload/address-resolution/upload-address-resolution.types';

export type GeocodeCompletenessBranch =
  | 'branch_a'
  | 'branch_b'
  | 'branch_c'
  | 'metadata_only'
  | 'incomplete';

export interface ProjectGeocodeCentroid {
  lat: number;
  lng: number;
  /** Best-effort city from linked project location (bias context). */
  city?: string | null;
  zoom?: number;
}

/** Street token present (houseNumber alone does NOT count). */
export function searchObjectHasStreet(so: UploadSearchObject): boolean {
  return !!so.street?.trim();
}

export function searchObjectHasLocality(so: UploadSearchObject): boolean {
  return !!(so.city?.trim() || so.postcode?.trim());
}

/** Admin-level tokens without street. */
export function searchObjectIsBelowStreet(so: UploadSearchObject): boolean {
  if (searchObjectHasStreet(so)) {
    return false;
  }
  return !!(
    so.country?.trim() ||
    so.state?.trim() ||
    so.city?.trim() ||
    so.postcode?.trim()
  );
}

/**
 * Classify which geocode branch applies.
 * houseNumber is never a gate — only improves precision when street exists.
 */
export function classifySearchObjectCompleteness(
  so: UploadSearchObject,
  projectCentroid?: ProjectGeocodeCentroid | null,
): GeocodeCompletenessBranch {
  if (so.postcodeCandidates.length > 1 && !so.city?.trim()) {
    return 'incomplete';
  }

  if (searchObjectHasStreet(so)) {
    if (searchObjectHasLocality(so)) {
      return 'branch_a';
    }
    if (projectCentroid && Number.isFinite(projectCentroid.lat) && Number.isFinite(projectCentroid.lng)) {
      return 'branch_b';
    }
    return 'branch_c';
  }

  if (searchObjectIsBelowStreet(so)) {
    return 'metadata_only';
  }

  return 'incomplete';
}

/** @deprecated Use classifySearchObjectCompleteness — Branch A only. */
export function isSearchObjectComplete(so: UploadSearchObject): boolean {
  return classifySearchObjectCompleteness(so) === 'branch_a';
}
