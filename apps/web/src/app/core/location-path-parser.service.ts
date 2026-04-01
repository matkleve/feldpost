/* eslint-disable max-lines */
import { Injectable } from '@angular/core';
import { CITY_REGISTRY } from './location-path-parser/city-registry.const';
import { POSTAL_CODE_PATTERNS } from './location-path-parser/postal-code-patterns.const';
import { runDisambiguation } from './location-path-parser/disambiguation-algorithms';
import type {
  DisambiguationAlgorithm,
  DisambiguationOutcome,
} from './location-path-parser/disambiguation-strategy';
import {
  findCityBySegment,
  formatAddressLine,
  hasStreetKeyword,
  isNoiseSegment,
  normalizeSegment,
  parseStreetAndHouse,
  parseZipAndCity,
  splitPathSegments,
  stripFileExtension,
  detectCountryCode,
} from './location-path-parser.util';

export interface AddressContext {
  country: string | null;
  city: string | null;
  zip: string | null;
  street: string | null;
  house_number: string | null;
  unit: string | null;
}
export interface AddressSource {
  country_source: string | null;
  city_source: string | null;
  zip_source: string | null;
  street_source: string | null;
  house_number_source: string | null;
  unit_source: string | null;
  filename_override: string | null;
}
export interface AddressExtractionResult {
  address_context: AddressContext;
  disambiguation: DisambiguationOutcome;
  confidence_score: number;
  issue: string | null;
  address_notes: string[];
  ignored_segments: string[];
  source: AddressSource;
}

const BASE_CONFIDENCE = 0.5;
const CITY_STREET_INCREMENT = 0.2;
const ZIP_INCREMENT = 0.25;
const AUTO_ASSIGN_THRESHOLD = 0.95;
const REVIEW_LOWER_BOUND = 0.7;
const ZIP_CANDIDATE_PROBABILITY = 0.8;
const DEFAULT_CANDIDATE_PROBABILITY = 0.2;
const DEFAULT_DISAMBIGUATION: DisambiguationOutcome = {
  algorithm: 'cluster-majority',
  chosen_city: null,
  probability: 0,
  candidates: [],
  auto_assigned: false,
  needs_review: false,
};

function emptyContext(): AddressContext {
  return { country: null, city: null, zip: null, street: null, house_number: null, unit: null };
}
function emptySource(): AddressSource {
  return {
    country_source: null,
    city_source: null,
    zip_source: null,
    street_source: null,
    house_number_source: null,
    unit_source: null,
    filename_override: null,
  };
}
function uniq(values: readonly string[]): string[] {
  return [...new Set(values.filter((v) => v.trim().length > 0))];
}

@Injectable({ providedIn: 'root' })
export class LocationPathParserService {
  private readonly disambiguationAlgorithm: DisambiguationAlgorithm = 'cluster-majority';

  parsePathSegments(fullPath: string): AddressExtractionResult {
    const context = emptyContext();
    const source = emptySource();
    const notes: string[] = [];
    const ignored: string[] = [];
    const segments = splitPathSegments(fullPath);
    const filename = segments.at(-1) ?? '';
    const folders = filename.includes('.') ? segments.slice(0, -1) : segments;
    let confidence = BASE_CONFIDENCE;

    folders.forEach((segment, index) => {
      const signal = this.applyFolderSegment(segment, context, source, index);
      confidence += signal.confidenceBoost;
      notes.push(...signal.notes);
      ignored.push(...signal.ignored);
    });

    let conflict: string | null = null;
    if (filename.includes('.')) {
      const filenameResult = this.extractAddressFromFilename(filename);
      const merged = this.mergeFilenameResult(filenameResult, context, source, filename);
      conflict = merged.conflict;
      notes.push(...filenameResult.address_notes);
      ignored.push(...filenameResult.ignored_segments);
    }

    const disambiguation = this.resolveDisambiguation(context, confidence);
    const issue = this.resolveIssue(context, conflict, disambiguation);

    if (conflict) {
      console.warn('[location-path-parser] geographic mismatch detected', {
        fullPath,
        conflict,
        context,
      });
    }

    return this.formatResult({
      address_context: context,
      disambiguation,
      confidence_score: confidence,
      issue,
      address_notes: notes,
      ignored_segments: ignored,
      source,
    });
  }

  extractAddressFromFilename(filename: string): AddressExtractionResult {
    const context = emptyContext();
    const source = emptySource();
    const notes: string[] = [];
    const ignored: string[] = [];
    const stem = stripFileExtension(filename).replace(/[_-]+/g, ' ').trim();
    let confidence = BASE_CONFIDENCE;

    if (!stem) {
      return this.formatResult({
        address_context: context,
        disambiguation: { ...DEFAULT_DISAMBIGUATION },
        confidence_score: confidence,
        issue: 'missing_anchor',
        address_notes: [],
        ignored_segments: [],
        source,
      });
    }

    confidence += this.applyZipCityFromStem(stem, context, source);
    confidence += this.applyStreetFromStem(stem, context, source);
    this.applyFallbackFromStem(stem, context, source, notes, ignored);

    source.filename_override = stem;
    return this.formatResult({
      address_context: context,
      disambiguation: { ...DEFAULT_DISAMBIGUATION },
      confidence_score: confidence,
      issue: !context.city && !context.zip ? 'missing_anchor' : null,
      address_notes: notes,
      ignored_segments: ignored,
      source,
    });
  }

  validateAddressComponent(
    segment: string,
    type: 'country' | 'city' | 'zip' | 'street' | 'house_number' | 'unit',
    countryCode?: string | null,
  ): boolean {
    if (!segment || !segment.trim()) return false;
    if (type === 'country') return detectCountryCode(segment) !== null;
    if (type === 'city') return findCityBySegment(segment) !== null;
    if (type === 'zip') {
      const value = segment.trim();
      if (countryCode && POSTAL_CODE_PATTERNS[countryCode])
        return POSTAL_CODE_PATTERNS[countryCode].test(value);
      return Object.values(POSTAL_CODE_PATTERNS).some((pattern) => pattern.test(value));
    }
    if (type === 'street')
      return hasStreetKeyword(segment) || parseStreetAndHouse(segment).street !== null;
    if (type === 'house_number') return /^\d{1,4}[A-Za-z]?$/.test(segment.trim());
    return /^(Top\s*\d+|Stiege\s*[A-Za-z0-9]+|Tür\s*\d+|Unit\s*[A-Za-z0-9]+)$/i.test(
      segment.trim(),
    );
  }

  formatResult(result: AddressExtractionResult): AddressExtractionResult {
    return {
      ...result,
      confidence_score: Math.max(0, Math.min(1, result.confidence_score)),
      address_notes: uniq(result.address_notes),
      ignored_segments: uniq(result.ignored_segments),
    };
  }

  formatAddressLine(
    street: string | null,
    houseNumber: string | null,
    city: string | null,
  ): string {
    return formatAddressLine(street, houseNumber, city);
  }

  private applyFolderSegment(
    segment: string,
    context: AddressContext,
    source: AddressSource,
    index: number,
  ): { confidenceBoost: number; notes: string[]; ignored: string[] } {
    if (!normalizeSegment(segment)) return { confidenceBoost: 0, notes: [], ignored: [] };
    if (isNoiseSegment(segment)) return { confidenceBoost: 0, notes: [], ignored: [segment] };

    if (this.tryApplyFolderCountry(segment, context, source, index)) {
      return { confidenceBoost: 0, notes: [], ignored: [] };
    }

    let boost = 0;
    const zipCity = parseZipAndCity(segment);
    boost += this.applyFolderZipCity(segment, zipCity, context, source, index);
    const parsedStreet = parseStreetAndHouse(segment);
    boost += this.applyFolderStreet(segment, parsedStreet, context, source, index);

    const cityCandidate = zipCity.city
      ? findCityBySegment(zipCity.city)
      : findCityBySegment(segment);
    if (!parsedStreet.street && !zipCity.zip && !cityCandidate) {
      return { confidenceBoost: boost, notes: [`Unparsed segment: ${segment}`], ignored: [] };
    }

    return { confidenceBoost: boost, notes: [], ignored: [] };
  }

  private mergeFilenameResult(
    filenameResult: AddressExtractionResult,
    context: AddressContext,
    source: AddressSource,
    filename: string,
  ): { conflict: string | null } {
    const filenameCtx = filenameResult.address_context;
    if (!filenameCtx.street) return { conflict: null };

    const hasConflict =
      !!context.city &&
      !!filenameCtx.city &&
      normalizeSegment(context.city) !== normalizeSegment(filenameCtx.city);

    if (hasConflict) {
      return { conflict: `geographic_mismatch:${context.city}_vs_${filenameCtx.city}` };
    }

    this.applyFilenameContext(filenameCtx, context, source);
    source.filename_override = stripFileExtension(filename);
    return { conflict: null };
  }

  private tryApplyFolderCountry(
    segment: string,
    context: AddressContext,
    source: AddressSource,
    index: number,
  ): boolean {
    const countryCode = detectCountryCode(segment);
    if (!countryCode || context.country) return false;
    context.country = countryCode;
    source.country_source = `folder_level_${index}`;
    return true;
  }

  private applyFolderZipCity(
    segment: string,
    zipCity: { zip: string | null; city: string | null },
    context: AddressContext,
    source: AddressSource,
    index: number,
  ): number {
    let boost = 0;
    if (
      zipCity.zip &&
      !context.zip &&
      this.validateAddressComponent(zipCity.zip, 'zip', context.country)
    ) {
      context.zip = zipCity.zip;
      source.zip_source = `folder_level_${index}`;
      boost += ZIP_INCREMENT;
    }

    const cityCandidate = zipCity.city
      ? findCityBySegment(zipCity.city)
      : findCityBySegment(segment);
    if (!cityCandidate || context.city) return boost;
    context.city = cityCandidate.city;
    source.city_source = `folder_level_${index}`;
    if (!context.country) {
      context.country = cityCandidate.country;
      source.country_source = `folder_level_${index}`;
    }
    return boost + CITY_STREET_INCREMENT;
  }

  private applyFolderStreet(
    segment: string,
    parsedStreet: { street: string | null; houseNumber: string | null; unit: string | null },
    context: AddressContext,
    source: AddressSource,
    index: number,
  ): number {
    let boost = 0;
    if ((hasStreetKeyword(segment) || parsedStreet.street) && !context.street) {
      context.street = parsedStreet.street;
      source.street_source = `folder_level_${index}`;
      if (hasStreetKeyword(segment)) boost += CITY_STREET_INCREMENT;
    }
    if (parsedStreet.houseNumber && !context.house_number) {
      context.house_number = parsedStreet.houseNumber;
      source.house_number_source = `folder_level_${index}`;
    }
    if (parsedStreet.unit && !context.unit) {
      context.unit = parsedStreet.unit;
      source.unit_source = `folder_level_${index}`;
    }
    return boost;
  }

  private applyZipCityFromStem(
    stem: string,
    context: AddressContext,
    source: AddressSource,
  ): number {
    let boost = 0;
    const zipCity = parseZipAndCity(stem);
    if (zipCity.zip && this.validateAddressComponent(zipCity.zip, 'zip', context.country)) {
      context.zip = zipCity.zip;
      source.zip_source = 'filename';
      boost += ZIP_INCREMENT;
    }

    const cityMatch = zipCity.city ? findCityBySegment(zipCity.city) : null;
    if (!cityMatch) return boost;
    context.city = cityMatch.city;
    context.country = cityMatch.country;
    source.city_source = 'filename';
    source.country_source = 'filename';
    return boost + CITY_STREET_INCREMENT;
  }

  private applyStreetFromStem(
    stem: string,
    context: AddressContext,
    source: AddressSource,
  ): number {
    const parsedStreet = parseStreetAndHouse(stem);
    if (parsedStreet.street) {
      context.street = parsedStreet.street;
      source.street_source = 'filename';
    }
    if (parsedStreet.houseNumber) {
      context.house_number = parsedStreet.houseNumber;
      source.house_number_source = 'filename';
    }
    if (parsedStreet.unit) {
      context.unit = parsedStreet.unit;
      source.unit_source = 'filename';
    }
    return parsedStreet.street && hasStreetKeyword(stem) ? CITY_STREET_INCREMENT : 0;
  }

  private applyFallbackFromStem(
    stem: string,
    context: AddressContext,
    source: AddressSource,
    notes: string[],
    ignored: string[],
  ): void {
    if (context.street) return;

    const fallback = stem.match(
      /^([A-Za-z][A-Za-z.'\-\s]+)\s+(\d{1,4}[A-Za-z]?)(?:,\s*([A-Za-z][A-Za-z.'\-\s]+))?$/,
    );
    if (!fallback) {
      ignored.push(stem);
      notes.push(`Token '${stem}' could not be mapped to address pattern`);
      return;
    }

    const fallbackStreet = (fallback[1] ?? '').trim() || null;
    const fallbackHouse = (fallback[2] ?? '').trim() || null;
    const fallbackCity = fallback[3]?.trim() || null;

    context.street = fallbackStreet;
    context.house_number = context.house_number ?? fallbackHouse;
    context.city = context.city ?? fallbackCity;
    source.street_source = source.street_source ?? 'filename';
    source.house_number_source = source.house_number_source ?? 'filename';
    if (context.city) {
      source.city_source = source.city_source ?? 'filename';
    }
  }

  private applyFilenameContext(
    filenameCtx: AddressContext,
    context: AddressContext,
    source: AddressSource,
  ): void {
    context.country = filenameCtx.country ?? context.country;
    context.city = filenameCtx.city ?? context.city;
    context.zip = filenameCtx.zip ?? context.zip;
    context.street = filenameCtx.street ?? context.street;
    context.house_number = filenameCtx.house_number ?? context.house_number;
    context.unit = filenameCtx.unit ?? context.unit;
    source.country_source = filenameCtx.country ? 'filename' : source.country_source;
    source.city_source = filenameCtx.city ? 'filename' : source.city_source;
    source.zip_source = filenameCtx.zip ? 'filename' : source.zip_source;
    source.street_source = filenameCtx.street ? 'filename' : source.street_source;
    source.house_number_source = filenameCtx.house_number ? 'filename' : source.house_number_source;
    source.unit_source = filenameCtx.unit ? 'filename' : source.unit_source;
  }

  private resolveDisambiguation(
    context: AddressContext,
    confidence: number,
  ): DisambiguationOutcome {
    if (!(context.street && context.house_number && !context.city))
      return { ...DEFAULT_DISAMBIGUATION };
    const candidates = CITY_REGISTRY.map((city) => ({
      city: city.name,
      probability: city.zips.includes(context.zip ?? '')
        ? ZIP_CANDIDATE_PROBABILITY
        : DEFAULT_CANDIDATE_PROBABILITY,
      zipMatch: !!context.zip && city.zips.includes(context.zip),
      countryMatch: !!context.country && city.country === context.country,
      parserConfidence: confidence,
      streetExact: true,
      houseNumberExact: true,
      cityLat: city.lat,
      cityLng: city.lng,
    }));
    const result = runDisambiguation(
      this.disambiguationAlgorithm,
      candidates,
      {},
      AUTO_ASSIGN_THRESHOLD,
      REVIEW_LOWER_BOUND,
    );
    if (result.auto_assigned && result.chosen_city) context.city = result.chosen_city;
    return result;
  }

  private resolveIssue(
    context: AddressContext,
    conflict: string | null,
    disambiguation: DisambiguationOutcome,
  ): string | null {
    if (conflict) return conflict;
    if (!context.city || !context.zip) return 'missing_anchor';
    if (disambiguation.needs_review) return 'needs_review';
    if (
      !disambiguation.auto_assigned &&
      disambiguation.probability > 0 &&
      disambiguation.probability < REVIEW_LOWER_BOUND
    )
      return 'low_disambiguation_probability';
    return null;
  }
}
