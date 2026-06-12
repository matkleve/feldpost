import type { GeocoderSearchResult } from '../geocoding/geocoding.service';

// ── Scoring ────────────────────────────────────────────────────────────────

export function computeTextMatchScore(label: string, query: string): number {
  const normalizedLabel = label.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedLabel || !normalizedQuery) return 0;

  if (normalizedLabel === normalizedQuery) return 1;
  if (normalizedLabel.startsWith(normalizedQuery)) return 0.92;
  if (normalizedLabel.includes(normalizedQuery)) return 0.8;

  const sharedTokens = normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => normalizedLabel.includes(token)).length;

  return Math.min(0.79, sharedTokens * 0.2);
}

// ── Address Formatting ─────────────────────────────────────────────────────

export function formatGeocoderAddressLabel(result: GeocoderSearchResult): string {
  const addr = result.address;
  if (!addr) {
    return (
      formatLabelFromGeocoderDisplayName(result.displayName, undefined) ??
      truncateDisplayName(result.displayName)
    );
  }

  const city = addr.city || addr.town || addr.village || addr.municipality;
  const district = extractGeocoderDistrict(addr);
  const road =
    addr.road?.trim() ||
    (!addr.house_number
      ? undefined
      : addr.village?.trim() || addr.hamlet?.trim() || addr.suburb?.trim() || undefined);
  const parts = buildAddressParts(
    road,
    addr.house_number,
    addr.postcode,
    city,
    district,
    addr.country,
  );
  if (parts?.includes(',')) {
    return parts;
  }

  const fromDisplay = formatLabelFromGeocoderDisplayName(result.displayName, addr.road);
  if (fromDisplay?.includes(',')) {
    return fromDisplay;
  }

  return parts || truncateDisplayName(result.displayName);
}

/** Build "Street, Locality, Country" from Nominatim display_name when structured fields are sparse. */
export function formatLabelFromGeocoderDisplayName(
  displayName: string,
  road?: string,
): string | null {
  const parts = displayName
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  let streetPart = road?.trim() || parts[0];
  if (!road?.trim() && /^\d+[a-z]?$/i.test(parts[0] ?? '') && parts[1]) {
    streetPart = `${parts[1]} ${parts[0]}`;
  }
  const country = parts[parts.length - 1];
  const middle = parts.slice(1, -1);
  const postcodeCity =
    middle.find((part) => /\b\d{4,5}\b/.test(part)) ??
    (middle.length > 0 ? middle[middle.length - 1] : parts[1]);
  const locality = postcodeCity ?? parts[1];

  return [streetPart, locality, country].filter(Boolean).join(', ');
}

export function extractGeocoderDistrict(
  addr: NonNullable<GeocoderSearchResult['address']>,
): string | null {
  const district =
    addr.city_district?.trim() ||
    addr.suburb?.trim() ||
    addr.borough?.trim() ||
    addr.quarter?.trim() ||
    null;
  if (district) return district;

  const city = (addr.city || addr.town || addr.village || addr.municipality)?.trim() || null;
  const postcode = addr.postcode?.trim() || null;
  if (postcode && city) return `${postcode} ${city}`;
  return city;
}

function buildAddressParts(
  street?: string,
  number?: string,
  postcode?: string,
  city?: string,
  district?: string | null,
  country?: string,
): string | null {
  const streetPart = street ? (number ? `${street} ${number}` : street) : null;
  const locality =
    district?.trim() ||
    (postcode && city ? `${postcode} ${city}` : city?.trim() || null);
  const countryPart = country?.trim() || null;

  const segments = [streetPart, locality, countryPart].filter(
    (segment): segment is string => !!segment,
  );
  if (segments.length === 0) return null;
  return segments.join(', ');
}

function truncateDisplayName(displayName: string): string {
  return displayName.length > 60 ? displayName.slice(0, 60) + '…' : displayName;
}

export function formatDbAddressLabel(
  rawLabel: string,
  street: string | null,
  city: string | null,
): string {
  if (street && city) return `${street}, ${city}`;
  if (street) return street;
  if (city) return city;
  return rawLabel;
}

// ── Query Normalization ────────────────────────────────────────────────────

/** Single-token street names long enough to treat as an explicit address search (not a map-local prefix). */
export function isSpecificStreetQuery(query: string, minLength = 5): boolean {
  const normalized = query.trim().toLowerCase();
  return normalized.length >= minLength && !normalized.includes(' ');
}

export function normalizeSearchQuery(query: string): string {
  return applyStreetTokenCorrections(
    query
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ß/g, 'ss')
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

export interface StreetHouseQuery {
  street: string;
  houseNumber: string;
}

/** Street + trailing house number (e.g. `denisgasse 4` → Denisgasse / 4). */
export function parseStreetAndHouseNumber(normalizedQuery: string): StreetHouseQuery | null {
  const trimmed = normalizedQuery.trim();
  if (!trimmed.includes(' ')) return null;

  const match = trimmed.match(/^(.+?)\s+(\d+[a-z]?)$/i);
  if (!match) return null;

  const street = match[1].trim();
  const houseNumber = match[2].trim().toLowerCase();
  if (street.length < 3 || !houseNumber) return null;

  return { street, houseNumber };
}

/** House numbers that share a digit prefix with the query (4 → 4, 40, 41; not 14). */
export function houseNumberSharesQueryPrefix(houseNumber: string, queryHouseNumber: string): boolean {
  const hn = houseNumber.trim().toLowerCase();
  const query = queryHouseNumber.trim().toLowerCase();
  if (!hn || !query) return false;
  return hn === query || hn.startsWith(query);
}

export function buildFallbackQueries(normalizedQuery: string): string[] {
  const candidates = new Set<string>();
  const correctedFull = applyStreetTokenCorrections(normalizedQuery);
  addIfDistinct(candidates, correctedFull, normalizedQuery);

  const base = correctedFull || normalizedQuery;

  const noDigitQuery = base.replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
  addIfDistinct(candidates, noDigitQuery, normalizedQuery, correctedFull, base);

  const streetOnly = base.replace(/\s+\d+[a-zA-Z]?\s*$/, '').trim();
  addIfDistinct(candidates, streetOnly, normalizedQuery, correctedFull);

  const streetOnlyNoDigits = streetOnly.replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
  addIfDistinct(
    candidates,
    streetOnlyNoDigits,
    normalizedQuery,
    correctedFull,
    base,
    noDigitQuery,
    streetOnly,
  );

  const correctedStreetOnly = applyStreetTokenCorrections(streetOnly);
  addIfDistinct(candidates, correctedStreetOnly, normalizedQuery, correctedFull, streetOnly);

  for (const prefix of buildPrefixBackoffQueries(base)) {
    addIfDistinct(
      candidates,
      prefix,
      normalizedQuery,
      correctedFull,
      base,
      noDigitQuery,
      streetOnly,
      streetOnlyNoDigits,
      correctedStreetOnly,
    );
  }

  return [...candidates];
}

function buildPrefixBackoffQueries(query: string): string[] {
  const compact = query.replace(/\s+/g, ' ').trim();
  if (!compact || compact.includes(' ')) return [];

  const fallbacks: string[] = [];
  for (let cut = 1; cut <= 3; cut++) {
    const candidate = compact.slice(0, Math.max(0, compact.length - cut)).trim();
    if (candidate.length >= 5) {
      fallbacks.push(candidate);
    }
  }
  return fallbacks;
}

function addIfDistinct(set: Set<string>, value: string, ...exclude: string[]): void {
  if (value && !exclude.includes(value)) set.add(value);
}

function applyStreetTokenCorrections(query: string): string {
  return query
    .split(' ')
    .map((token) => correctStreetToken(token))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUFFIX_REPLACEMENTS: [string, string][] = [
  ['strassee', 'strasse'],
  ['strase', 'strasse'],
  ['stras', 'strasse'],
  ['str.', 'strasse'],
  ['str', 'strasse'],
  ['gase', 'gasse'],
  ['gass', 'gasse'],
  ['gas', 'gasse'],
];

function correctStreetToken(token: string): string {
  if (!token) return token;

  if (token === 'g' || token === 'g.') return 'gasse';
  if (token === 'str' || token === 'str.') return 'strasse';

  for (const [suffix, replacement] of SUFFIX_REPLACEMENTS) {
    if (token.endsWith(suffix)) {
      return token.slice(0, -suffix.length) + replacement;
    }
  }
  return token;
}

// ── Type Coercion ──────────────────────────────────────────────────────────

export function toNumber(value: number | string | null): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}
