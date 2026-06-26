/**
 * Builds UploadSearchObject from relativePath + fileName.
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */

import type {
  UploadAddressSourceDeviation,
  UploadAddressSourceEntry,
  UploadSearchObject,
} from '../upload/address-resolution/upload-address-resolution.types';
import type {
  AdminFieldKey,
  FieldLevelEntry,
} from '../upload/address-resolution/upload-address-level-map.types';
import {
  collapseAdminFlatFields,
  detectAdminLevelConflicts,
} from './upload-address-level-map.helpers';
import type { GemeindeRecord, PlzMap } from './local-geo-data.adapter';
import {
  classifyTokensInSegment,
  isUncertainConfidence,
  tokenizeSegment,
  type ClassifiedToken,
  type TokenClassificationContext,
} from './path-token-classifier';
import { splitPathSegments, stripFileExtension } from './location-path-parser.util';
import type { BundeslandRecord } from './local-geo-data.adapter';
import {
  collapseAtSlashPathSegments,
  parseAtSegmentUnits,
} from './upload-search-object.unit-parsing.at';
import { normalizeCountryCode } from './postcode-patterns';

type SoFields = Pick<
  UploadSearchObject,
  | 'country'
  | 'state'
  | 'postcode'
  | 'city'
  | 'street'
  | 'houseNumber'
  | 'staircase'
  | 'door'
  | 'project'
>;

function emptyFields(): SoFields {
  return {
    country: null,
    state: null,
    postcode: null,
    city: null,
    street: null,
    houseNumber: null,
    staircase: null,
    door: null,
    project: null,
  };
}

function fieldKeyForKind(kind: ClassifiedToken['kind']): keyof SoFields | null {
  switch (kind) {
    case 'postcode':
      return 'postcode';
    case 'houseNumber':
      return 'houseNumber';
    case 'staircase':
      return 'staircase';
    case 'door':
      return 'door';
    case 'project':
      return 'project';
    case 'country':
      return 'country';
    case 'state':
      return 'state';
    case 'city':
      return 'city';
    case 'street':
      return 'street';
    default:
      return null;
  }
}

const ADMIN_FIELD_KEYS: AdminFieldKey[] = ['country', 'state', 'city', 'postcode'];

function applyTokenToFields(
  fields: SoFields,
  token: ClassifiedToken,
  source: 'folder' | 'filename',
  sources: UploadAddressSourceEntry[],
  uncertainFields: Set<string>,
  filenameOverride: boolean,
  deviations: UploadAddressSourceDeviation[],
  level: number,
  adminLevelMap: Partial<Record<AdminFieldKey, FieldLevelEntry[]>>,
  previousFolderValue?: string,
): void {
  const key = fieldKeyForKind(token.kind);
  if (!key) {
    return;
  }

  if (token.confidence < 0.9 && token.kind !== 'street') {
    return;
  }

  if (filenameOverride && previousFolderValue != null && previousFolderValue !== token.value) {
    deviations.push({
      field: key,
      folderValue: previousFolderValue,
      filenameValue: token.value,
    });
  }

  if (key === 'street' && fields.street) {
    fields.street = `${fields.street} ${token.value}`.trim();
  } else if (!filenameOverride || fields[key] == null) {
    // Folder segments still fill/refine fields; the filename only supplements
    // fields the folder left empty (a folder/filename disagreement is recorded
    // as a sourceDeviation above, not silently overwritten).
    fields[key] = token.value;
  }

  sources.push({
    field: key,
    value: token.value,
    source,
    confidence: token.confidence,
    uncertain: isUncertainConfidence(token.confidence),
  });

  if (isUncertainConfidence(token.confidence)) {
    uncertainFields.add(key);
  }

  if (ADMIN_FIELD_KEYS.includes(key as AdminFieldKey) && token.value) {
    const adminKey = key as AdminFieldKey;
    const bucket = adminLevelMap[adminKey] ?? [];
    bucket.push({ level, value: token.value, source, field: adminKey });
    adminLevelMap[adminKey] = bucket;
  }
}

function applyPresetUnits(
  fields: SoFields,
  preset: { houseNumber?: string | null; staircase?: string | null; door?: string | null },
  source: 'folder' | 'filename',
  sources: UploadAddressSourceEntry[],
): void {
  if (preset.houseNumber?.trim()) {
    fields.houseNumber = preset.houseNumber.trim();
    sources.push({
      field: 'houseNumber',
      value: preset.houseNumber.trim(),
      source,
      confidence: 1,
    });
  }
  if (preset.staircase?.trim()) {
    fields.staircase = preset.staircase.trim();
    sources.push({
      field: 'staircase',
      value: preset.staircase.trim(),
      source,
      confidence: 1,
    });
  }
  if (preset.door?.trim()) {
    fields.door = preset.door.trim();
    sources.push({
      field: 'door',
      value: preset.door.trim(),
      source,
      confidence: 1,
    });
  }
}

function applySegment(
  fields: SoFields,
  segment: string,
  source: 'folder' | 'filename',
  geo: { states: BundeslandRecord[]; municipalities: GemeindeRecord[] },
  context: TokenClassificationContext,
  sources: UploadAddressSourceEntry[],
  uncertainFields: Set<string>,
  deviations: UploadAddressSourceDeviation[],
  filenameOverride: boolean,
  level: number,
  adminLevelMap: Partial<Record<AdminFieldKey, FieldLevelEntry[]>>,
): void {
  const countryCode = normalizeCountryCode(context.country);
  const atUnits = parseAtSegmentUnits(segment, countryCode);
  applyPresetUnits(fields, atUnits, source, sources);
  const tokens = tokenizeSegment(atUnits.workingSegment);
  const classified = classifyTokensInSegment(tokens, geo, context);
  const folderSnapshot = filenameOverride ? { ...fields } : undefined;

  for (const token of classified) {
    const key = fieldKeyForKind(token.kind);
    const prev =
      filenameOverride && key ? (folderSnapshot?.[key] as string | null | undefined) : undefined;
    applyTokenToFields(
      fields,
      token,
      source,
      sources,
      uncertainFields,
      filenameOverride,
      deviations,
      level,
      adminLevelMap,
      prev ?? undefined,
    );
    if (token.kind === 'country') {
      context.country = token.value;
    }
  }
}

/**
 * True when the SO has no anchor fields (city, zip, postcode, high-confidence street).
 * Prevents garbage filenames (e.g. "CV Matthias Kleveta ERP DE.pdf") from
 * being wired onto jobs as if they were real addresses.
 * @see path-token-classifier.ts — fallback classifier emits street at 0.5
 */
export function isSearchObjectMeaningless(so: UploadSearchObject): boolean {
  if (so.city || so.postcode) {
    return false;
  }
  if (!so.street) {
    return true;
  }
  const streetSources = so.sources.filter((s) => s.field === 'street');
  const hasHighConfidenceStreet = streetSources.some((s) => s.confidence >= 0.9);
  return !hasHighConfidenceStreet;
}

export function buildGroupingKey(fields: SoFields): string {
  const norm = (v: string | null | undefined): string =>
    (v ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
  return [
    norm(fields.country),
    norm(fields.state),
    norm(fields.postcode),
    norm(fields.city),
    norm(fields.street),
    norm(fields.houseNumber),
  ].join('|');
}

export function expandPostcodeOnSearchObject(
  so: UploadSearchObject,
  postcodeMap: PlzMap,
): UploadSearchObject {
  if (!so.postcode || so.city) {
    return so;
  }
  const cities = postcodeMap[so.postcode];
  if (!cities?.length) {
    return so;
  }
  if (cities.length === 1) {
    return {
      ...so,
      city: cities[0],
      postcodeCandidates: [],
      sources: [
        ...so.sources,
        {
          field: 'city',
          value: cities[0],
          source: 'folder',
          confidence: 1,
        },
      ],
      groupingKey: buildGroupingKey({ ...so, city: cities[0] }),
    };
  }
  return {
    ...so,
    postcodeCandidates: [...cities],
  };
}

export function isSearchObjectComplete(so: UploadSearchObject): boolean {
  const hasLocality = !!(so.city?.trim() || so.postcode?.trim());
  const hasStreet = !!so.street?.trim();
  return hasLocality && hasStreet;
}

export function formatSearchObjectLabel(so: UploadSearchObject): string {
  const streetPart = [so.street, so.houseNumber].filter(Boolean).join(' ');
  const cityPart =
    so.postcode && so.city ? `${so.postcode} ${so.city}` : (so.city ?? so.postcode ?? '');
  if (streetPart && cityPart) {
    return `${streetPart}, ${cityPart}`;
  }
  return streetPart || cityPart || so.fileName;
}

export interface BuildSearchObjectGeo {
  states: BundeslandRecord[];
  municipalities: GemeindeRecord[];
  postcodeMap?: PlzMap;
}

export function buildSearchObjectFromRelativePath(
  relativePath: string,
  fileName: string,
  geo: BuildSearchObjectGeo,
): UploadSearchObject {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const segments = collapseAtSlashPathSegments(splitPathSegments(normalizedPath));
  const fileBase = stripFileExtension(fileName);
  const folderSegments =
    segments.length > 0 && segments[segments.length - 1] === fileName
      ? segments.slice(0, -1)
      : segments.filter((s) => s !== fileName);

  const fields = emptyFields();
  const sources: UploadAddressSourceEntry[] = [];
  const deviations: UploadAddressSourceDeviation[] = [];
  const uncertainFields = new Set<string>();
  const adminLevelMap: Partial<Record<AdminFieldKey, FieldLevelEntry[]>> = {};
  const context: TokenClassificationContext = { country: null };

  for (let segIdx = 0; segIdx < folderSegments.length; segIdx++) {
    const level = folderSegments.length - segIdx;
    applySegment(
      fields,
      folderSegments[segIdx],
      'folder',
      geo,
      context,
      sources,
      uncertainFields,
      deviations,
      false,
      level,
      adminLevelMap,
    );
  }

  if (fileBase) {
    applySegment(
      fields,
      fileBase,
      'filename',
      geo,
      context,
      sources,
      uncertainFields,
      deviations,
      true,
      0,
      adminLevelMap,
    );
  }

  const adminLevelConflicts = detectAdminLevelConflicts(adminLevelMap, {
    municipalities: geo.municipalities,
    postcodeMap: geo.postcodeMap,
    country: fields.country ?? context.country,
  });

  collapseAdminFlatFields(fields, adminLevelMap);

  const groupingKey = buildGroupingKey(fields);

  return {
    ...fields,
    sources,
    sourceDeviations: deviations,
    postcodeCandidates: [],
    uncertainFields: [...uncertainFields],
    groupingKey,
    relativePath: normalizedPath,
    fileName,
    adminLevelMap,
    adminLevelConflicts,
  };
}
