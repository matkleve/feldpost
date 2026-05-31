/**
 * Token classification for upload Search Object building.
 * Two-pass per segment: text tokens first (country before postcode), numeric tokens last.
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */

import Fuse from 'fuse.js';
import type { BundeslandRecord, GemeindeRecord } from './local-geo-data.adapter';
import { COUNTRY_NAMES } from './city-registry.const';
import { isPostcodeToken, normalizeCountryCode } from './postcode-patterns';
import { normalizeSegment } from './location-path-parser.util';

export type ClassifiedTokenKind =
  | 'postcode'
  | 'houseNumber'
  | 'staircase'
  | 'door'
  | 'project'
  | 'country'
  | 'state'
  | 'city'
  | 'street';

export interface ClassifiedToken {
  raw: string;
  kind: ClassifiedTokenKind;
  value: string;
  confidence: number;
}

export interface TokenClassificationContext {
  country: string | null;
}

const HOUSE_NUMBER_RE = /^\d{1,4}[a-zA-Z]?$/;
const STIEGE_RE = /^(stiege?|stg)/i;
const DOOR_RE = /^(tür|top)/i;
const PROJEKT_RE = /^projekt[:\s]/i;

const UNCERTAIN_LOW = 0.9;

/** Numeric tokens are classified after country/city/street tokens in the same segment. */
function isDeferredNumericToken(token: string): boolean {
  return /^\d+[a-zA-Z]?$/i.test(token);
}

function fuseConfidence(fuseScore: number | undefined): number {
  if (fuseScore == null || !Number.isFinite(fuseScore)) {
    return 0;
  }
  return Math.max(0, Math.min(1, 1 - fuseScore));
}

function classifyCountry(token: string): ClassifiedToken | null {
  const normalized = normalizeSegment(token);
  for (const [code, aliases] of Object.entries(COUNTRY_NAMES)) {
    if (aliases.includes(normalized) || normalized === code.toLowerCase()) {
      return { raw: token, kind: 'country', value: code, confidence: 1 };
    }
  }
  return null;
}

function classifyWithFuse<T extends { n: string; a?: string[] }>(
  token: string,
  items: T[],
  kind: 'state' | 'city',
): ClassifiedToken | null {
  if (!items.length) {
    return null;
  }
  const fuse = new Fuse(items, {
    keys: [
      { name: 'n', weight: 0.7 },
      { name: 'a', weight: 0.3 },
    ],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
  });
  const results = fuse.search(token);
  const top = results[0];
  if (!top?.item) {
    return null;
  }
  const confidence = fuseConfidence(top.score);
  if (confidence < UNCERTAIN_LOW) {
    return null;
  }
  return {
    raw: token,
    kind,
    value: top.item.n,
    confidence,
  };
}

function classifyNonNumericToken(
  token: string,
  geo: { states: BundeslandRecord[]; municipalities: GemeindeRecord[] },
  context: TokenClassificationContext,
  useAtGeo: boolean,
): ClassifiedToken | null {
  if (PROJEKT_RE.test(token)) {
    return { raw: token, kind: 'project', value: token, confidence: 1 };
  }
  if (DOOR_RE.test(token)) {
    return { raw: token, kind: 'door', value: token, confidence: 1 };
  }
  if (STIEGE_RE.test(token)) {
    return { raw: token, kind: 'staircase', value: token, confidence: 1 };
  }

  const country = classifyCountry(token);
  if (country) {
    context.country = country.value;
    return country;
  }

  if (useAtGeo) {
    const state = classifyWithFuse(token, geo.states, 'state');
    if (state) {
      return state;
    }

    const city = classifyWithFuse(token, geo.municipalities, 'city');
    if (city) {
      return city;
    }
  }

  if (token.length >= 2) {
    return {
      raw: token,
      kind: 'street',
      value: token,
      confidence: 0.5,
    };
  }

  return null;
}

/**
 * House numbers only when country is known, or short tokens (1–3 digits) when country is not.
 * Avoids treating a 4-digit postcode-shaped token as a house number before country is set.
 */
function isHouseNumberToken(token: string, countryCode: string | null): boolean {
  if (countryCode) {
    return HOUSE_NUMBER_RE.test(token);
  }
  return /^\d{1,3}[a-zA-Z]?$/.test(token);
}

function classifyNumericToken(
  token: string,
  context: TokenClassificationContext,
): ClassifiedToken | null {
  if (isPostcodeToken(token, context.country)) {
    return { raw: token, kind: 'postcode', value: token, confidence: 1 };
  }

  if (isHouseNumberToken(token, context.country)) {
    return { raw: token, kind: 'houseNumber', value: token, confidence: 1 };
  }

  return null;
}

export function tokenizeSegment(segment: string): string[] {
  return segment
    .split(/[\s\-_. ,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function classifyTokensInSegment(
  tokens: string[],
  geo: {
    states: BundeslandRecord[];
    municipalities: GemeindeRecord[];
  },
  context: TokenClassificationContext,
): ClassifiedToken[] {
  const classified: ClassifiedToken[] = [];
  const countryCode = normalizeCountryCode(context.country);
  const useAtGeo = countryCode === 'AT';

  const deferredNumeric: string[] = [];
  const nonNumeric: string[] = [];

  for (const token of tokens) {
    if (isDeferredNumericToken(token)) {
      deferredNumeric.push(token);
    } else {
      nonNumeric.push(token);
    }
  }

  for (const token of nonNumeric) {
    const hit = classifyNonNumericToken(token, geo, context, useAtGeo);
    if (hit) {
      classified.push(hit);
    }
  }

  for (const token of deferredNumeric) {
    const hit = classifyNumericToken(token, context);
    if (hit) {
      classified.push(hit);
    }
  }

  return classified;
}

export function isAcceptedConfidence(confidence: number): boolean {
  return confidence >= 0.98;
}

export function isUncertainConfidence(confidence: number): boolean {
  return confidence >= UNCERTAIN_LOW && confidence < 0.98;
}
