/**
 * Postcode token patterns by ISO country code.
 * No country → no postcode classification (unknown format).
 * @see docs/specs/service/media-upload-service/upload-search-object.md
 */

const POSTCODE_PATTERNS: Readonly<Record<string, RegExp>> = {
  AT: /^\d{4}$/,
  DE: /^\d{5}$/,
  CH: /^\d{4}$/,
  IT: /^\d{5}$/,
  FR: /^\d{5}$/,
  GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
  US: /^\d{5}(-\d{4})?$/,
};

export function normalizeCountryCode(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length === 2 ? trimmed.toUpperCase() : trimmed.toUpperCase();
}

export function getPostcodePattern(countryCode: string | null | undefined): RegExp | null {
  const code = normalizeCountryCode(countryCode);
  if (!code) {
    return null;
  }
  return POSTCODE_PATTERNS[code] ?? null;
}

export function isPostcodeToken(token: string, countryCode: string | null | undefined): boolean {
  const pattern = getPostcodePattern(countryCode);
  if (!pattern) {
    return false;
  }
  return pattern.test(token.trim());
}
