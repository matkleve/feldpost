/**
 * Upload placement precedence: text geocode before EXIF placement; coordinate ownership.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
 */

import {
  uploadTraceDecision,
  uploadTraceEnter,
  uploadTraceExit,
} from './upload-address-resolution.debug';
import type { ExifCoords } from './upload.types';
import type { UploadLocationConfig } from './upload-location-config';
import type {
  UploadAddressCandidate,
  UploadJob,
} from './upload-manager.types';

export const SOURCE_CONFLICT_TEXT_CANDIDATE_ID = 'source-text';
export const SOURCE_CONFLICT_EXIF_CANDIDATE_ID = 'source-exif';
export const SOURCE_CONFLICT_BOTH_CANDIDATE_ID = 'source-both';
export const SOURCE_CONFLICT_NONE_CANDIDATE_ID = 'source-none';

/** Human-readable distance for source-conflict tray copy ({distance} param). */
export function formatSourceConflictDistance(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m < 1000) {
    return `${m} m`;
  }
  const km = m / 1000;
  return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

/** Raw EXIF GPS from parse — never use job.coords for assist/conflict before placement decision. */
export function getExifMetadataCoords(job: UploadJob): ExifCoords | undefined {
  return job.parsedExif?.coords;
}

export function haversineMeters(a: ExifCoords, b: ExifCoords): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * 6371000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function shouldHoldForSourceConflict(
  textCoords: ExifCoords,
  exifCoords: ExifCoords,
  config: UploadLocationConfig,
): boolean {
  const distanceM = Math.round(haversineMeters(textCoords, exifCoords));
  const hold = distanceM > config.sourceAgreementRadiusMeters;
  uploadTraceDecision('source-agree', hold ? 'hold — text vs EXIF beyond agree radius' : 'agree — within radius', {
    distanceM,
    sourceAgreementRadiusMeters: config.sourceAgreementRadiusMeters,
    textCoords,
    exifCoords,
  });
  return hold;
}

export type PlacementSourceKind = 'text' | 'exif';

export type ApplyChosenPlacementPatch = Pick<
  UploadJob,
  'coords' | 'locationSourceUsed' | 'titleAddressCoords' | 'issueKind'
>;

/** Sole writer for job.coords during new-upload routing (Prompt A). */
export function buildChosenPlacementPatch(
  job: UploadJob,
  source: PlacementSourceKind,
  placementCoords: ExifCoords,
): ApplyChosenPlacementPatch {
  if (source === 'exif') {
    return {
      coords: placementCoords,
      locationSourceUsed: 'exif',
      titleAddressCoords: job.titleAddressCoords,
      issueKind: undefined,
    };
  }
  return {
    coords: placementCoords,
    locationSourceUsed: job.titleAddressSource ?? 'folder',
    titleAddressCoords: placementCoords,
    issueKind: undefined,
  };
}

/** After forward geocode — stores text coords only; does not set job.coords. */
export function buildGeocodeCandidatePatch(
  candidate: UploadAddressCandidate,
  folderDisplayPath: string,
): Partial<UploadJob> {
  return {
    titleAddress: candidate.addressLabel,
    titleAddressCoords: { lat: candidate.lat, lng: candidate.lng },
    folderDisplayPath,
    resolutionStatus: 'resolved',
    issueKind: undefined,
    addressCandidates: undefined,
    disambiguationGroupId: undefined,
    statusLabel: undefined,
  };
}

/** Clears tray gate fields after user resolves a disambiguation group. */
export function clearDisambiguationJobFields(): Pick<
  UploadJob,
  'disambiguationGroupId' | 'issueKind' | 'addressCandidates' | 'statusLabel' | 'resolutionStatus'
> {
  return {
    disambiguationGroupId: undefined,
    issueKind: undefined,
    addressCandidates: undefined,
    statusLabel: '',
    resolutionStatus: 'resolved',
  };
}

export function buildSourceConflictQueryKey(groupingKey: string): string {
  return `source|${groupingKey}`;
}

export function buildSourceConflictCandidates(input: {
  folderAddress: string;
  photoAddress: string;
  textCoords: ExifCoords;
  exifCoords: ExifCoords;
}): UploadAddressCandidate[] {
  const { folderAddress, photoAddress, textCoords, exifCoords } = input;
  return [
    {
      id: SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
      addressLabel: folderAddress,
      displayName: folderAddress,
      lat: textCoords.lat,
      lng: textCoords.lng,
    },
    {
      id: SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
      addressLabel: photoAddress,
      displayName: photoAddress,
      lat: exifCoords.lat,
      lng: exifCoords.lng,
    },
    {
      id: SOURCE_CONFLICT_BOTH_CANDIDATE_ID,
      addressLabel: folderAddress,
      displayName: folderAddress,
      lat: exifCoords.lat,
      lng: exifCoords.lng,
    },
    {
      id: SOURCE_CONFLICT_NONE_CANDIDATE_ID,
      addressLabel: '',
      displayName: '',
      // Placeholder coords — tray must not preview (no placement for "set later").
      lat: 0,
      lng: 0,
    },
  ];
}

export type PlacementResolutionOutcome =
  | { kind: 'placed' }
  | { kind: 'held_source_conflict' }
  | { kind: 'missing_data' };

export function resolvePlacementAfterTextGeocode(
  job: UploadJob,
  config: UploadLocationConfig,
): PlacementResolutionOutcome {
  const textCoords = job.titleAddressCoords;
  const exifCoords = getExifMetadataCoords(job);

  uploadTraceEnter('placement', 'resolvePlacementAfterTextGeocode', {
    jobId: job.id,
    fileName: job.file.name,
    titleAddress: job.titleAddress,
    textCoords,
    exifCoords,
  });

  if (!textCoords) {
    uploadTraceDecision('placement', 'missing_data — no titleAddressCoords after geocode');
    uploadTraceExit('placement', 'resolvePlacementAfterTextGeocode', 'missing_data');
    return { kind: 'missing_data' };
  }

  if (!exifCoords) {
    uploadTraceDecision('placement', 'placed — text coords only, no EXIF metadata');
    uploadTraceExit('placement', 'resolvePlacementAfterTextGeocode', 'placed');
    return { kind: 'placed' };
  }

  if (!shouldHoldForSourceConflict(textCoords, exifCoords, config)) {
    uploadTraceExit('placement', 'resolvePlacementAfterTextGeocode', 'placed');
    return { kind: 'placed' };
  }

  uploadTraceDecision('placement', 'held_source_conflict — opening source tray');
  uploadTraceExit('placement', 'resolvePlacementAfterTextGeocode', 'held_source_conflict');
  return { kind: 'held_source_conflict' };
}

export function resolvePlacementWithoutText(
  job: UploadJob,
): 'exif' | 'missing_data' {
  const exif = getExifMetadataCoords(job);
  const outcome = exif ? 'exif' : 'missing_data';
  uploadTraceDecision('placement', `resolvePlacementWithoutText → ${outcome}`, {
    jobId: job.id,
    fileName: job.file.name,
    exifCoords: exif,
  });
  return outcome;
}
