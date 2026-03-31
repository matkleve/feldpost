/**
 * FilenameParserService — extracts address hints from image filenames.
 *
 * Simplified version of the planned FilenameLocationParser
 * (see folder-import.md §4.1). Rejects camera-generated filenames
 * and timestamps, then looks for European street-type suffixes.
 *
 * ⚠️ SPEC GAP: Should delegate to LocationPathParserService for:
 *  - Address component parsing (city/zip/street separation)
 *  - City registry lookup & validation
 *  - Disambiguation when multiple matches found
 * See: docs/element-specs/location-path-parser.md § Entry points.
 * Current: Returns raw address string without component parsing.
 * TODO: Inject LocationPathParserService; use parseAddressComponent() to
 *       extract city, zip, street hierarchically. Refactor confidence model
 *       to account for registry match vs. pattern-only fallback.
 */

import { Injectable } from '@angular/core';

/** Camera-generated filename prefixes that carry no address information. */
const CAMERA_PREFIXES = /^(IMG|DSC|DCIM|P|PXL|MVIMG|PANO|VID|MOV|Screenshot)[\s_-]/i;

/** Timestamps like 20260311, 2026-03-11, 20260311_143022, etc. */
const TIMESTAMP_PATTERN = /^\d{4}[-_]?\d{2}[-_]?\d{2}([-_T]\d{2}[-_]?\d{2}[-_]?\d{2})?$/;

/**
 * European street type suffixes recognised for address extraction.
 * Matches in the middle or end of a token sequence.
 */
const STREET_SUFFIXES =
  /(?:stra(?:ß|ss)e|strasse|str\.?|gasse|weg|allee|platz|gässli|ring|damm|ufer|zeile|road|street|st\.?|avenue|ave\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|court|ct\.?|way)\b/i;

/**
 * Conservative fallback: "StreetName 12" with optional ", City".
 * Used only when no explicit street suffix was detected.
 */
const STREET_NUMBER_PATTERN =
  /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.'-]*(?:\s+[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.'-]*)*)\s+(\d{1,4}[A-Za-z]?)(?:,\s*([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.'\s-]*))?$/;

const NON_ADDRESS_WORDS = new Set([
  'img',
  'dsc',
  'screenshot',
  'photo',
  'picture',
  'pic',
  'test',
  'upload',
  'file',
]);

export interface ParsedAddress {
  address: string;
  confidence: 'high' | 'low';
}

@Injectable({ providedIn: 'root' })
export class FilenameParserService {
  /**
   * Attempts to extract an address hint from a filename with confidence level.
   * High: explicit street-type suffix detected.
   * Low: conservative fallback "StreetName 12[, City]" pattern.
   * Returns undefined for camera-generated filenames and timestamps.
   *
   * ⚠️ SPEC GAP: Missing delegation to LocationPathParserService for:
   *  - Address component validation (street + house number presence)
   *  - City registry lookup (validate city names against known cities)
   *  - Disambiguation if pattern matches multiple registered locations
   * Current: Pattern-based extraction only; no registry validation.
   * TODO: After parsing address string, call LocationPathParserService.parseAddressComponent()
   *       to validate components and increase confidence only if registry match found.
   */
  extractAddress(filename: string): ParsedAddress | undefined {
    // Strip extension
    const base = filename.replace(/\.[^.]+$/, '');

    // Reject obvious camera-generated filenames
    if (CAMERA_PREFIXES.test(base)) return undefined;

    // Reject pure timestamps
    if (TIMESTAMP_PATTERN.test(base)) return undefined;

    // Normalise separators to spaces
    const normalised = base.replace(/[_-]+/g, ' ').trim();

    const withoutTrailingArtifacts = normalised
      // Remove trailing camera-like counters, e.g. "_0327", "-0001".
      .replace(/[\s,]+\d{3,6}$/g, '')
      .trim();

    const cleaned = withoutTrailingArtifacts.replace(/\s+/g, ' ').trim();
    if (!cleaned) return undefined;

    // Primary path: explicit street-type suffix (high confidence).
    if (STREET_SUFFIXES.test(cleaned)) {
      return { address: cleaned, confidence: 'high' };
    }

    // Fallback path: conservative "StreetName 12[, City]" detection (low confidence).
    const fallback = this.extractFallbackAddress(cleaned);
    return fallback ? { address: fallback, confidence: 'low' } : undefined;
  }

  private extractFallbackAddress(cleaned: string): string | undefined {
    const match = cleaned.match(STREET_NUMBER_PATTERN);
    if (!match) return undefined;

    const streetPart = (match[1] ?? '').trim();
    const cityPart = (match[3] ?? '').trim();
    if (!streetPart) return undefined;

    const streetWords = streetPart.split(/\s+/).filter(Boolean);
    if (streetWords.length === 0) return undefined;

    // Guard against generic filename words.
    const hasNonAddressWord = streetWords.some((word) =>
      NON_ADDRESS_WORDS.has(word.toLowerCase().replace(/[^a-zäöüß]/gi, '')),
    );
    if (hasNonAddressWord) return undefined;

    // Confidence guard:
    // - single-word street names must be long enough
    // - multi-word names are accepted with normal token length
    if (streetWords.length === 1) {
      if (streetWords[0].length < 8 && cityPart.length < 3) return undefined;
    } else if (streetWords.some((word) => word.length < 3)) {
      return undefined;
    }

    return cleaned;
  }
}
