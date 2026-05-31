/**
 * Austria (AT) unit parsing — slash chains and labeled Tür/Top/Stiege before tokenization.
 * @see docs/specs/service/media-upload-service/upload-search-object.unit-parsing.at.md
 */

export interface AtSegmentUnitParse {
  /** Segment text after slash/unit extraction (for tokenizeSegment). */
  workingSegment: string;
  houseNumber: string | null;
  staircase: string | null;
  door: string | null;
}

const SLASH_PART_RE = /^\d+[a-zA-Z0-9+\-]*$/;
const STREET_SLASH_CHAIN_RE =
  /^(.+?)\s+(\d+[a-zA-Z0-9+\-]*(?:\/\d+[a-zA-Z0-9+\-]*){1,2})\s*$/u;

/**
 * Parse AT house/staircase/door slash chain on one path segment (e.g. `Gasse 15/4/5`).
 * @see docs/specs/service/media-upload-service/upload-search-object.unit-parsing.at.md#slash-chains-at
 */
export function parseAtSlashUnits(segment: string): Pick<
  AtSegmentUnitParse,
  'houseNumber' | 'staircase' | 'door'
> | null {
  const trimmed = segment.trim();
  const match = trimmed.match(STREET_SLASH_CHAIN_RE);
  if (!match) {
    return null;
  }
  const chainRaw = match[2];
  const parts = chainRaw.split('/').filter((p) => SLASH_PART_RE.test(p));
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }
  const streetRemainder = match[1].trim();
  if (!streetRemainder) {
    return null;
  }
  if (parts.length === 2) {
    return { houseNumber: parts[0], staircase: null, door: parts[1] };
  }
  return { houseNumber: parts[0], staircase: parts[1], door: parts[2] };
}

function extractLabeledUnit(
  segment: string,
  labelRe: RegExp,
): { value: string | null; remainder: string } {
  const match = segment.match(labelRe);
  if (!match) {
    return { value: null, remainder: segment };
  }
  const value = (match[2] ?? '').trim() || null;
  const remainder = segment.replace(match[0], ' ').replace(/\s+/g, ' ').trim();
  return { value, remainder };
}

/**
 * Extract labeled Stiege / Tür / Top and slash units; return working segment for token classifier.
 * @see docs/specs/service/media-upload-service/upload-search-object.unit-parsing.at.md
 */
export function parseAtSegmentUnits(
  segment: string,
  countryCode: string | null,
): AtSegmentUnitParse {
  const empty: AtSegmentUnitParse = {
    workingSegment: segment,
    houseNumber: null,
    staircase: null,
    door: null,
  };
  if (countryCode !== 'AT') {
    return empty;
  }

  let working = segment.trim();
  let houseNumber: string | null = null;
  let staircase: string | null = null;
  let door: string | null = null;

  const slash = parseAtSlashUnits(working);
  if (slash) {
    houseNumber = slash.houseNumber;
    staircase = slash.staircase;
    door = slash.door;
    const slashMatch = working.match(STREET_SLASH_CHAIN_RE);
    working = slashMatch?.[1]?.trim() ?? working;
  }

  const stiege = extractLabeledUnit(working, /\b(stiege?|stg)\s+([a-zA-Z0-9+\-]+)/iu);
  if (stiege.value) {
    staircase = stiege.value;
    working = stiege.remainder;
  }

  const tur = extractLabeledUnit(working, /\b(tür|top)\s+([a-zA-Z0-9+\-]+)/iu);
  if (tur.value) {
    door = tur.value;
    working = tur.remainder;
  }

  return {
    workingSegment: working,
    houseNumber,
    staircase,
    door,
  };
}

export function isAtCountry(countryCode: string | null): boolean {
  return countryCode === 'AT';
}

/**
 * Merge `Neustiftgasse 25` + `14` path segments into `Neustiftgasse 25/14` before parsing.
 * @see docs/specs/service/media-upload-service/upload-search-object.unit-parsing.at.md#slash-chains-at
 */
export function collapseAtSlashPathSegments(segments: string[]): string[] {
  const out: string[] = [];
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) {
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && SLASH_PART_RE.test(trimmed) && /\d/.test(prev)) {
      out[out.length - 1] = `${prev}/${trimmed}`;
    } else {
      out.push(trimmed);
    }
  }
  return out;
}
