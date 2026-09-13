/**
 * Pure decision logic for D-11 street corroboration: before an `admin_level_conflict` (C3) tray
 * opens for a `city`-vs-`city` disagreement, check whether the street named in the path actually
 * exists in one of the candidate cities.
 * @see docs/specs/service/media-upload-service/contradiction-resolution-model.c3-street-corroboration.supplement.md
 */

import type { GeocoderSearchResult } from '../../geocoding/geocoding.service';
import { normalizeAdminValue } from '../../location-path-parser/upload-area-evidence.helpers';
import { mapGeocoderHitsToCandidates } from './upload-location-resolution.helpers';
import { adminLevelCandidateId, applyAdminLevelSelectionsToSearchObject } from './upload-location-area-choice.util';
import type { PlzMap } from '../../location-path-parser/local-geo-data.adapter';
import type { FieldLevelEntry } from '../address-resolution/upload-area-evidence.types';
import type { UploadAddressSourceEntry, UploadSearchObject } from '../address-resolution/upload-address-resolution.types';

/** Provenance rule name for a `city` field the street corroboration pre-check auto-resolved. */
export const STREET_TO_CITY_CORROBORATION_RULE = 'street→city (corroboration)';

export type StreetCorroborationOutcome =
  | { kind: 'auto'; city: string; matchingHits: GeocoderSearchResult[] }
  | { kind: 'suggest'; city: string; matchingHits: GeocoderSearchResult[] }
  | { kind: 'none' };

/**
 * Group hits by their own `address.city`/`town`/`village` (never the mere presence of a result)
 * and decide the outcome per the decision table: exactly one city that matches a folder candidate
 * auto-resolves; exactly one city that matches none is a suggestion; anything else (a tie, no
 * signal at all) falls through to the plain tray.
 */
export function analyzeStreetCorroborationHits(
  hits: GeocoderSearchResult[],
  candidateCities: string[],
): StreetCorroborationOutcome {
  if (!hits.length) {
    return { kind: 'none' };
  }
  const candidates = mapGeocoderHitsToCandidates(hits);
  const groups = new Map<string, { original: string; hits: GeocoderSearchResult[] }>();
  hits.forEach((hit, index) => {
    const city = candidates[index]?.city?.trim();
    if (!city) {
      return;
    }
    const key = normalizeAdminValue(city);
    const existing = groups.get(key);
    if (existing) {
      existing.hits.push(hit);
    } else {
      groups.set(key, { original: city, hits: [hit] });
    }
  });

  if (groups.size !== 1) {
    return { kind: 'none' };
  }
  const [normalizedCity, group] = [...groups.entries()][0];
  const normalizedCandidates = candidateCities.map((c) => normalizeAdminValue(c));
  const candidateIndex = normalizedCandidates.indexOf(normalizedCity);
  if (candidateIndex >= 0) {
    return { kind: 'auto', city: candidateCities[candidateIndex], matchingHits: group.hits };
  }
  return { kind: 'suggest', city: group.original, matchingHits: group.hits };
}

/**
 * Tier 1 pin: prefer the hit whose own `address.house_number` matches the Search Object's — the
 * house number is checked, never assumed — falling back to the top-ranked hit in the corroborated
 * city when none matches exactly (still trustworthy, just not house-number-confirmed).
 */
export function pickStreetCorroborationPinHit(
  matchingHits: GeocoderSearchResult[],
  houseNumber: string | null | undefined,
): GeocoderSearchResult {
  const wanted = houseNumber?.trim();
  if (wanted) {
    const exact = matchingHits.find(
      (hit) => hit.address?.house_number && normalizeAdminValue(hit.address.house_number) === normalizeAdminValue(wanted),
    );
    if (exact) {
      return exact;
    }
  }
  return matchingHits[0];
}

/**
 * Tray copy for a suggested (non-candidate) city: names the evidence directly, per the "copy
 * asymmetry" rule — the folder's own candidates keep their plain labels, this one does not.
 */
export function buildSuggestedCityCandidate(
  city: string,
  folderCandidateCities: string[],
): { id: string; addressLabel: string } {
  const entry: FieldLevelEntry = {
    level: -1,
    value: city,
    source: 'folder',
    field: 'city',
    origin: 'derived',
    rule: STREET_TO_CITY_CORROBORATION_RULE,
  };
  const others = folderCandidateCities.join(' or ');
  return {
    id: adminLevelCandidateId(entry),
    addressLabel: `${city} — the street was found here, not in ${others}. Did you mean ${city}?`,
  };
}

/**
 * Write the corroborated city onto the Search Object with `derived` provenance
 * (`street→city (corroboration)`) — the same `FieldLevelEntry`/`sources` shape every other
 * derivation rule already uses, not a plain path value. Reuses the same field-selection plumbing
 * as a manual tray pick (groupingKey rebuild, postcode expansion, conflict recheck), then replaces
 * the entry it wrote with one carrying this rule's provenance instead of plain `path` origin.
 */
export function writeStreetCorroboratedCity(
  so: UploadSearchObject,
  city: string,
  street: string,
  geo: { municipalities: { n: string; b: string }[]; postcodeMap: PlzMap },
): UploadSearchObject {
  const applied = applyAdminLevelSelectionsToSearchObject(so, { city }, geo);
  const cityEntry: FieldLevelEntry = {
    ...(applied.areaEvidence?.city?.[0] ?? { level: 0, value: city, source: 'folder', field: 'city' }),
    origin: 'derived',
    rule: STREET_TO_CITY_CORROBORATION_RULE,
    derivedFrom: street,
  };
  const sourceEntry: UploadAddressSourceEntry = {
    field: 'city',
    value: city,
    source: 'folder',
    confidence: 1,
    origin: 'derived',
    rule: STREET_TO_CITY_CORROBORATION_RULE,
  };
  return {
    ...applied,
    areaEvidence: { ...applied.areaEvidence, city: [cityEntry] },
    sources: [...applied.sources, sourceEntry],
  };
}
