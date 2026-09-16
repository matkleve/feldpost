/**
 * Planning half of bulk location resolution.
 *
 * Pure: it decides *what* a run would do — which items are eligible, how many geocodes it costs,
 * and what the confirmation summary states — without writing anything. The executing half applies
 * the plan through the ordinary per-item resolution service, so bulk is never a second write path.
 *
 * Addresses are derived with the **same** functions the upload pipeline uses
 * (`buildSearchObjectFromRelativePath`), which is what keeps a folder answered in bulk identical to
 * the same folder answered one file at a time.
 *
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 * @see docs/specs/system/deferred-location-resolution.batch.supplement.md
 */

import {
  buildSearchObjectFromRelativePath,
  formatSearchObjectLabel,
  isSearchObjectMeaningless,
} from '../location-path-parser/upload-search-object.builder';
import type { BuildSearchObjectGeo } from '../location-path-parser/upload-search-object.builder';

/** Which stored evidence the run reads. Chosen per run, never inferred (B2). */
export type BulkResolutionSource = 'folder' | 'filename' | 'exif';

export type BulkSkipReason = 'already_resolved' | 'no_address_in_source';

export interface BulkResolutionCandidate {
  mediaId: string;
  /** Folder path the file arrived with; immutable raw evidence. */
  relativePath: string | null;
  originalFilename: string | null;
  /** True when the item already carries a location — ineligible unless overwriting (B3). */
  hasLocation: boolean;
  exifCoords: { lat: number; lng: number } | null;
}

export interface BulkResolutionGroup {
  /** Items sharing this key need exactly one geocode between them (R5). */
  addressKey: string;
  /** What the confirmation shows for this group (R7). */
  addressLabel: string;
  mediaIds: string[];
  /** Present for `folder`/`filename` runs; absent for `exif`, which reverse-geocodes a point. */
  coords: { lat: number; lng: number } | null;
}

export interface BulkResolutionPlan {
  groups: BulkResolutionGroup[];
  skipped: Array<{ mediaId: string; reason: BulkSkipReason }>;
  eligibleCount: number;
  /** Equals `groups.length`. Stated separately so R5 is visible in the summary, not just implied. */
  geocodeCount: number;
}

export interface BulkResolutionPlanOptions {
  source: BulkResolutionSource;
  geo: BuildSearchObjectGeo;
  /** B3: overwriting items that already have a location is a separate, explicit mode. */
  overwriteExisting?: boolean;
}

/** Coordinates equal to ~1 m share a reverse geocode; a photo burst is one lookup, not fifty. */
const EXIF_KEY_PRECISION = 5;

function exifKey(coords: { lat: number; lng: number }): string {
  return `${coords.lat.toFixed(EXIF_KEY_PRECISION)},${coords.lng.toFixed(EXIF_KEY_PRECISION)}`;
}

/**
 * Derive the grouping key and label for one item, or `null` when the chosen source carries no
 * address. A source that says nothing is skipped and reported — never filled in from another
 * source, because silently falling back is what hides which evidence won (B2).
 */
function deriveTarget(
  candidate: BulkResolutionCandidate,
  options: BulkResolutionPlanOptions,
): { key: string; label: string; coords: { lat: number; lng: number } | null } | null {
  if (options.source === 'exif') {
    if (!candidate.exifCoords) {
      return null;
    }
    const key = exifKey(candidate.exifCoords);
    return { key, label: key, coords: candidate.exifCoords };
  }

  const fileName = candidate.originalFilename ?? '';
  const relativePath =
    options.source === 'folder' ? (candidate.relativePath ?? fileName) : fileName;
  if (!relativePath) {
    return null;
  }

  const searchObject = buildSearchObjectFromRelativePath(relativePath, fileName, options.geo);
  if (isSearchObjectMeaningless(searchObject)) {
    return null;
  }
  const label = formatSearchObjectLabel(searchObject);
  if (!label) {
    return null;
  }
  return { key: `${options.source}|${searchObject.groupingKey}`, label, coords: null };
}

/**
 * Build the plan for a selection. The selection is an explicit list of items, never a live query
 * (R1) — what the caller confirmed is what gets written, even if an upload lands mid-run.
 */
export function planBulkResolution(
  candidates: readonly BulkResolutionCandidate[],
  options: BulkResolutionPlanOptions,
): BulkResolutionPlan {
  const groupsByKey = new Map<string, BulkResolutionGroup>();
  const skipped: Array<{ mediaId: string; reason: BulkSkipReason }> = [];

  for (const candidate of candidates) {
    if (candidate.hasLocation && !options.overwriteExisting) {
      skipped.push({ mediaId: candidate.mediaId, reason: 'already_resolved' });
      continue;
    }

    const target = deriveTarget(candidate, options);
    if (!target) {
      skipped.push({ mediaId: candidate.mediaId, reason: 'no_address_in_source' });
      continue;
    }

    const existing = groupsByKey.get(target.key);
    if (existing) {
      existing.mediaIds.push(candidate.mediaId);
      continue;
    }
    groupsByKey.set(target.key, {
      addressKey: target.key,
      addressLabel: target.label,
      mediaIds: [candidate.mediaId],
      coords: target.coords,
    });
  }

  const groups = [...groupsByKey.values()];
  return {
    groups,
    skipped,
    eligibleCount: groups.reduce((total, group) => total + group.mediaIds.length, 0),
    geocodeCount: groups.length,
  };
}
