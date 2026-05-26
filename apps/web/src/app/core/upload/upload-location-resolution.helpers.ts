/**
 * Pure helpers for upload pre-upload location disambiguation.
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import type { UploadLocationConfig } from './upload-location-config';
import type {
  UploadAddressCandidate,
  UploadDisambiguationCollapseStage,
} from './upload-manager.types';
import {
  formatSearchObjectLabel,
  isSearchObjectComplete,
} from '../location-path-parser/upload-search-object.builder';
import type { UploadLocationRowHit, UploadSearchObject } from './upload-address-resolution.types';
import type { ExifCoords } from './upload.service';

export type ClassifySearchOutcome =
  | { kind: 'auto'; candidate: UploadAddressCandidate }
  | { kind: 'ambiguous'; candidates: UploadAddressCandidate[] }
  | { kind: 'failed' }
  | { kind: 'none' };

/** Parent folder path from a file relative path (excludes filename). */
export function deriveFolderDisplayPath(relativePath: string | undefined): string {
  if (!relativePath?.trim()) {
    return '';
  }
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return '';
  }
  return parts.slice(0, -1).join('/');
}

/** Normalize address text for stable group keys (OD-1). */
export function normalizeAddressForGrouping(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Stable tray group key. Prefer Search Object `groupingKey`; legacy fallback uses title + folder.
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */
export function buildDisambiguationQueryKey(
  groupingKeyOrTitle: string,
  folderDisplayPath?: string,
): string {
  const key = groupingKeyOrTitle.trim().toLowerCase();
  if (!folderDisplayPath?.trim()) {
    return key;
  }
  return `${normalizeAddressForGrouping(groupingKeyOrTitle)}|${folderDisplayPath.toLowerCase()}`;
}

export function searchObjectToRpcParams(so: UploadSearchObject): Record<string, string | null> {
  return {
    p_street: so.street,
    p_house_number: so.houseNumber,
    p_staircase: so.staircase,
    p_door: null,
    p_postcode: so.postcode,
    p_city: so.city,
    p_district: null,
    p_country: so.country,
  };
}

export function locationRowToCandidate(row: UploadLocationRowHit): UploadAddressCandidate {
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  const street = [row.street, row.house_number].filter(Boolean).join(' ');
  const city =
    row.postcode && row.city ? `${row.postcode} ${row.city}` : (row.city ?? row.postcode ?? '');
  const addressLabel = row.address_label?.trim() || (street && city ? `${street}, ${city}` : street || city || 'Address');
  return {
    id: `db-${row.id}`,
    addressLabel,
    lat,
    lng,
    city: row.city,
    postcode: row.postcode,
    score: 1,
  };
}

export function buildGroupPresentation(so: UploadSearchObject): {
  folderDisplayPath: string;
  titleAddressLabel: string;
} {
  return {
    folderDisplayPath: deriveFolderDisplayPath(so.relativePath),
    titleAddressLabel: formatSearchObjectLabel(so),
  };
}

export function evaluateLocalResolution(
  so: UploadSearchObject,
): 'complete' | 'incomplete' | 'postcode_blocked' {
  if (so.postcodeCandidates.length > 1 && !so.city) {
    return 'postcode_blocked';
  }
  if (!isSearchObjectComplete(so)) {
    return 'incomplete';
  }
  return 'complete';
}

/**
 * Optional locality hint from folder path only (OD-5 — no default city append).
 */
export function deriveLocalityHint(relativePath: string | undefined): string | undefined {
  const folder = deriveFolderDisplayPath(relativePath);
  if (!folder) {
    return undefined;
  }
  const last = folder.split('/').pop()?.trim();
  if (!last || last.length < 3 || /^\d+$/.test(last)) {
    return undefined;
  }
  return last;
}

/** Build search query; appends folder hint only when present. */
export function buildSearchQuery(titleAddress: string, localityHint?: string): string {
  const base = titleAddress.trim();
  if (!localityHint?.trim()) {
    return base;
  }
  const hint = localityHint.trim();
  if (base.toLowerCase().includes(hint.toLowerCase())) {
    return base;
  }
  return `${base}, ${hint}`;
}

export function mapGeocoderHitsToCandidates(hits: GeocoderSearchResult[]): UploadAddressCandidate[] {
  return hits.map((hit, index) => {
    const city =
      hit.address?.city ??
      hit.address?.town ??
      hit.address?.village ??
      hit.address?.municipality ??
      null;
    return {
      id: `cand-${index}-${hit.lat.toFixed(5)}-${hit.lng.toFixed(5)}`,
      addressLabel: hit.name?.trim() || hit.displayName,
      displayName: hit.displayName,
      lat: hit.lat,
      lng: hit.lng,
      city,
      postcode: hit.address?.postcode ?? null,
      score: Math.min(1, Math.max(0, hit.importance)),
    };
  });
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

function pickExifAssistCandidate(
  candidates: UploadAddressCandidate[],
  exifCoords: ExifCoords,
  radiusMeters: number,
): UploadAddressCandidate | undefined {
  let best: UploadAddressCandidate | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = haversineMeters(
      exifCoords.lat,
      exifCoords.lng,
      candidate.lat,
      candidate.lng,
    );
    if (distance <= radiusMeters && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function classifySearchHits(
  hits: GeocoderSearchResult[],
  config: UploadLocationConfig,
  exifCoords?: ExifCoords,
): ClassifySearchOutcome {
  if (!hits.length) {
    return { kind: 'failed' };
  }

  const candidates = mapGeocoderHitsToCandidates(hits);
  if (exifCoords) {
    const assisted = pickExifAssistCandidate(
      candidates,
      exifCoords,
      config.exifAssistRadiusMeters,
    );
    if (assisted) {
      return { kind: 'auto', candidate: assisted };
    }
  }

  const sorted = [...candidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const top = sorted[0];
  const second = sorted[1];
  const topScore = top.score ?? 0;

  if (topScore < config.minMeaningfulScore) {
    return { kind: 'failed' };
  }

  if (topScore >= config.disambiguationAutoAssignThreshold) {
    return { kind: 'auto', candidate: top };
  }

  if (
    sorted.length === 1 ||
    (second &&
      topScore - (second.score ?? 0) >= config.minTopGap &&
      topScore >= config.disambiguationReviewLowerBound)
  ) {
    return { kind: 'auto', candidate: top };
  }

  if (sorted.length > 1 && topScore >= config.disambiguationReviewLowerBound) {
    return { kind: 'ambiguous', candidates: sorted };
  }

  return { kind: 'auto', candidate: top };
}

/** Pick UI collapse stage from candidate spread (city-first). */
export function pickCollapseStage(
  candidates: UploadAddressCandidate[],
  jobCount: number,
): UploadDisambiguationCollapseStage {
  const cities = new Set(
    candidates.map((c) => (c.city ?? '').trim().toLowerCase()).filter(Boolean),
  );
  if (cities.size > 1) {
    return 'city';
  }
  const labels = new Set(candidates.map((c) => c.addressLabel.trim().toLowerCase()));
  if (labels.size > 1) {
    return 'partial';
  }
  if (jobCount > 1) {
    return 'per_file';
  }
  return 'partial';
}

export function isGroupBlocked(group: {
  resolutionGateOpen: boolean;
  resolutionStatus: string;
}): boolean {
  return group.resolutionGateOpen && group.resolutionStatus === 'pending';
}

export function isJobBlocked(
  job: { disambiguationGroupId?: string; phase: string },
  groupsById: ReadonlyMap<string, { resolutionGateOpen: boolean; resolutionStatus: string }>,
): boolean {
  if (job.phase === 'awaiting_disambiguation') {
    return true;
  }
  if (!job.disambiguationGroupId) {
    return false;
  }
  const group = groupsById.get(job.disambiguationGroupId);
  return group ? isGroupBlocked(group) : false;
}
