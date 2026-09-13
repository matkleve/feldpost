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

/**
 * Which Austrian states a postcode's first digit can plausibly belong to.
 *
 * Deliberately generous: `5280 Braunau am Inn` is Oberösterreich although 5 reads as Salzburg, and
 * `9900 Lienz` is Tirol although 9 reads as Kärnten. The map is therefore only ever used to reject
 * a gross contradiction (`Tirol/1090`), never to derive a state.
 * @see docs/specs/service/media-upload-service/upload-search-object.derivation-rules.md
 */
const POSTCODE_STATE_PLAUSIBILITY: Readonly<Record<string, readonly string[]>> = {
  '1': ['Wien', 'Niederösterreich'],
  '2': ['Niederösterreich', 'Wien'],
  '3': ['Niederösterreich'],
  '4': ['Oberösterreich', 'Niederösterreich'],
  '5': ['Salzburg', 'Oberösterreich'],
  '6': ['Tirol', 'Vorarlberg'],
  '7': ['Burgenland', 'Niederösterreich'],
  '8': ['Steiermark', 'Burgenland'],
  '9': ['Kärnten', 'Tirol'],
};

/** Every Austrian postcode is four digits; a shorter or longer token is not one. */
const AT_POSTCODE_LENGTH = 4;

function normalizeStateName(value: string): string {
  return value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Could this postcode sit in this state? Unknown country, unknown digit or a state we cannot place
 * answers `true` — the check may only raise a question it is sure about.
 */
export function isPostcodePlausibleForState(
  postcode: string | null | undefined,
  state: string | null | undefined,
  countryCode: string | null | undefined,
): boolean {
  if (normalizeCountryCode(countryCode) !== 'AT') {
    return true;
  }
  const digits = postcode?.trim() ?? '';
  const plausible = POSTCODE_STATE_PLAUSIBILITY[digits.slice(0, 1)];
  const claimed = state?.trim();
  if (!plausible || !claimed || digits.length !== AT_POSTCODE_LENGTH) {
    return true;
  }
  return plausible.some((name) => normalizeStateName(name) === normalizeStateName(claimed));
}
