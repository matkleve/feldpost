import { GeocoderSearchResult } from '../geocoding.service';
import { SearchAddressCandidate, SearchQueryContext, SearchRecentCandidate } from './search.models';

export interface AddressGroup {
  label: string;
  ids: string[];
  latTotal: number;
  lngTotal: number;
  count: number;
  activeProjectHits: number;
  latestCreatedAtMs: number;
  score: number;
}

export interface StoredRecentSearch {
  label: string;
  lastUsedAt: string;
  projectId?: string;
  usageCount: number;
}

export function sanitizeRecentLabel(label: string): string {
  const parts = label
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 3) return label.trim();
  return parts.slice(0, 3).join(', ');
}

export function compareRecents(
  left: SearchRecentCandidate,
  right: SearchRecentCandidate,
  activeProjectId?: string,
): number {
  const leftProject = activeProjectId && left.projectId === activeProjectId ? 1 : 0;
  const rightProject = activeProjectId && right.projectId === activeProjectId ? 1 : 0;
  const leftLastUsed = Date.parse(left.lastUsedAt || '') || 0;
  const rightLastUsed = Date.parse(right.lastUsedAt || '') || 0;
  const leftUsage = left.usageCount ?? 1;
  const rightUsage = right.usageCount ?? 1;

  if (leftProject !== rightProject) return rightProject - leftProject;
  if (leftLastUsed !== rightLastUsed) return rightLastUsed - leftLastUsed;
  if (leftUsage !== rightUsage) return rightUsage - leftUsage;
  return left.label.localeCompare(right.label);
}

export function computeRecencyDecay(timestampMs: number): number {
  if (!timestampMs || Number.isNaN(timestampMs)) return 1;
  const ageDays = Math.max(0, (Date.now() - timestampMs) / 86400000);
  return 1 / (1 + ageDays / 30);
}

export function toSizeSignal(size: number): number {
  return 1 + Math.log2(Math.max(1, size) + 1) * 0.35;
}

export function computeProximityDecay(
  lat: number,
  lng: number,
  context: SearchQueryContext,
): number {
  const distances: number[] = [];

  if (context.dataCentroid) {
    distances.push(haversineMeters(lat, lng, context.dataCentroid.lat, context.dataCentroid.lng));
  }

  if (context.viewportBounds) {
    const centerLat = (context.viewportBounds.north + context.viewportBounds.south) / 2;
    const centerLng = (context.viewportBounds.east + context.viewportBounds.west) / 2;
    distances.push(haversineMeters(lat, lng, centerLat, centerLng));
  }

  if (distances.length === 0) {
    return 1;
  }

  const minDistanceMeters = Math.min(...distances);
  return 1 / (1 + minDistanceMeters / 6000);
}

export function computeCountryBoost(result: GeocoderSearchResult, countryCodes?: string[]): number {
  if (!countryCodes?.length) {
    return 1;
  }

  const normalized = new Set(countryCodes.map((code) => code.toLowerCase()));
  const resultCountryCode = result.address?.country_code?.toLowerCase();
  if (!resultCountryCode) {
    return 1;
  }

  return normalized.has(resultCountryCode) ? 1.6 : 0.7;
}

export function distanceToCentroidMeters(
  candidate: SearchAddressCandidate,
  centroid?: { lat: number; lng: number },
): number {
  if (!centroid) return Number.POSITIVE_INFINITY;
  return haversineMeters(candidate.lat, candidate.lng, centroid.lat, centroid.lng);
}

export function haversineMeters(
  leftLat: number,
  leftLng: number,
  rightLat: number,
  rightLng: number,
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6371000;

  const deltaLat = toRad(rightLat - leftLat);
  const deltaLng = toRad(rightLng - leftLng);
  const lat1 = toRad(leftLat);
  const lat2 = toRad(rightLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function normalizeStreetPart(street: string | null): string | null {
  return street?.trim() || null;
}

export function buildCityPart(postcode: string | null, city: string | null): string | null {
  const normalizedCity = city?.trim() || null;
  const normalizedPostcode = postcode?.trim() || null;
  if (normalizedPostcode && normalizedCity) return `${normalizedPostcode} ${normalizedCity}`;
  return normalizedCity;
}

export function isInViewport(
  candidate: SearchAddressCandidate,
  viewport?: { north: number; east: number; south: number; west: number },
): boolean {
  if (!viewport) return false;
  return (
    candidate.lat <= viewport.north &&
    candidate.lat >= viewport.south &&
    candidate.lng >= viewport.west &&
    candidate.lng <= viewport.east
  );
}
