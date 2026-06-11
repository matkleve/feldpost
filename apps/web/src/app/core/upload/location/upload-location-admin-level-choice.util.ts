/**
 * Apply admin_level_conflict tray choices to Search Objects.
 * @see docs/specs/service/media-upload-service/upload-search-object.md#admin-level-map
 */

import {
  buildGroupingKey,
  expandPostcodeOnSearchObject,
} from '../../location-path-parser/upload-search-object.builder';
import type { PlzMap } from '../../location-path-parser/local-geo-data.adapter';
import type {
  AdminFieldKey,
  AdminLevelConflict,
  FieldLevelEntry,
} from '../address-resolution/upload-address-level-map.types';
import { detectAdminLevelConflicts } from '../../location-path-parser/upload-address-level-map.helpers';
import type { UploadSearchObject } from '../address-resolution/upload-address-resolution.types';

const ADMIN_CANDIDATE_PREFIX = 'admin-level|';
const ADMIN_MANUAL_PREFIX = 'admin-manual|';

export function adminLevelCandidateId(entry: FieldLevelEntry): string {
  return `${ADMIN_CANDIDATE_PREFIX}${entry.field}|level:${entry.level}|${encodeURIComponent(entry.value)}`;
}

export function adminLevelManualCandidateId(field: AdminFieldKey): string {
  return `${ADMIN_MANUAL_PREFIX}${field}`;
}

export function parseAdminLevelCandidateId(
  candidateId: string,
): { field: AdminFieldKey; value: string } | null {
  if (candidateId.startsWith(ADMIN_MANUAL_PREFIX)) {
    return null;
  }
  if (!candidateId.startsWith(ADMIN_CANDIDATE_PREFIX)) {
    return null;
  }
  const body = candidateId.slice(ADMIN_CANDIDATE_PREFIX.length);
  const sep = body.indexOf('|');
  if (sep < 0) {
    return null;
  }
  const field = body.slice(0, sep) as AdminFieldKey;
  const rest = body.slice(sep + 1);
  const valueSep = rest.indexOf('|');
  if (valueSep < 0) {
    return null;
  }
  const value = decodeURIComponent(rest.slice(valueSep + 1));
  return { field, value };
}

export function applyAdminLevelSelectionsToSearchObject(
  so: UploadSearchObject,
  selections: Partial<Record<AdminFieldKey, string>>,
  geo: { municipalities: { n: string; b: string }[]; postcodeMap: PlzMap },
): UploadSearchObject {
  const next: UploadSearchObject = {
    ...so,
    country: selections.country ?? so.country,
    state: selections.state ?? so.state,
    postcode: selections.postcode ?? so.postcode,
    city: selections.city ?? so.city,
    adminLevelMap: { ...so.adminLevelMap },
    adminLevelConflicts: [],
  };

  for (const [field, value] of Object.entries(selections) as [AdminFieldKey, string][]) {
    if (!value?.trim()) {
      continue;
    }
    next[field] = value.trim();
    next.adminLevelMap = {
      ...next.adminLevelMap,
      [field]: [{ level: 0, value: value.trim(), source: 'filename', field }],
    };
  }

  const rechecked = detectAdminLevelConflicts(next.adminLevelMap ?? {}, {
    municipalities: geo.municipalities,
    postcodeMap: geo.postcodeMap,
    country: next.country,
  });
  next.adminLevelConflicts = rechecked;

  const expanded = expandPostcodeOnSearchObject(next, geo.postcodeMap);
  return {
    ...expanded,
    groupingKey: buildGroupingKey(expanded),
    adminLevelConflicts: rechecked,
  };
}

export function buildAdminConflictCandidates(
  conflicts: AdminLevelConflict[],
): { id: string; addressLabel: string }[] {
  const candidates: { id: string; addressLabel: string }[] = [];
  const seen = new Set<string>();
  for (const conflict of conflicts) {
    for (const entry of conflict.entries) {
      const id = adminLevelCandidateId(entry);
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      candidates.push({
        id,
        addressLabel: `Level ${entry.level}: ${entry.value} (${entry.field})`,
      });
    }
    const manualId = adminLevelManualCandidateId(conflict.field);
    if (!seen.has(manualId)) {
      seen.add(manualId);
      candidates.push({
        id: manualId,
        addressLabel: `Manual: ${conflict.field}`,
      });
    }
  }
  return candidates;
}
