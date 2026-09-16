/**
 * Resolution path for upload Search Objects — which evidence family resolves the group and how.
 * `street_*` all require a street and differ only in what locality context is available to geocode
 * with; `area_only` has no street but resolves via area text/precision instead (D-10); `incomplete`
 * has neither.
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */

import type { UploadSearchObject } from '../upload/address-resolution/upload-address-resolution.types';

export type UploadResolutionPath =
  | 'street_locality'
  | 'street_project_bias'
  | 'street_only'
  | 'area_only'
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
 * Classify which resolution path applies.
 * houseNumber is never a gate — only improves precision when street exists.
 */
export function classifySearchObjectCompleteness(
  so: UploadSearchObject,
  projectCentroid?: ProjectGeocodeCentroid | null,
): UploadResolutionPath {
  if (so.postcodeCandidates.length > 1 && !so.city?.trim()) {
    return 'incomplete';
  }

  if (searchObjectHasStreet(so)) {
    if (searchObjectHasLocality(so)) {
      return 'street_locality';
    }
    if (projectCentroid && Number.isFinite(projectCentroid.lat) && Number.isFinite(projectCentroid.lng)) {
      return 'street_project_bias';
    }
    return 'street_only';
  }

  if (searchObjectIsBelowStreet(so)) {
    return 'area_only';
  }

  return 'incomplete';
}

/** @deprecated Use classifySearchObjectCompleteness — `street_locality` only. */
export function isSearchObjectComplete(so: UploadSearchObject): boolean {
  return classifySearchObjectCompleteness(so) === 'street_locality';
}
