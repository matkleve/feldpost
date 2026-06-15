/** UTC calendar date as YYYY-MM-DD (storage / editor wire format). */
export function toIsoDateValue(date: Date | null): string {
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD to UTC midnight Date. */
export function parseIsoDateValue(value: string): Date | null {
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

/** Separator for compact date fields — product convention (DD.MM.YYYY), not locale literals. */
const DATE_FIELD_SEPARATOR = '.';

function dateFieldFormatParts(locale: string): Intl.DateTimeFormatPart[] {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatToParts(new Date(Date.UTC(2026, 2, 27)));
}

/** Placeholder hint derived from active locale field order (always DD.MM.YYYY-style dots). */
export function dateFieldPlaceholderForLocale(locale: string): string {
  return dateFieldFormatParts(locale)
    .map((part) => {
      switch (part.type) {
        case 'day':
          return 'DD';
        case 'month':
          return 'MM';
        case 'year':
          return 'YYYY';
        case 'literal':
          return DATE_FIELD_SEPARATOR;
        default:
          return '';
      }
    })
    .join('');
}

/** Display value for compact date fields — locale field order, dot separators. */
export function formatDateFieldValue(date: Date | null, locale: string): string {
  if (!date) return '';

  const values: Record<'day' | 'month' | 'year', string> = {
    day: String(date.getUTCDate()).padStart(2, '0'),
    month: String(date.getUTCMonth() + 1).padStart(2, '0'),
    year: String(date.getUTCFullYear()),
  };

  return dateFieldFormatParts(locale)
    .filter((part): part is Intl.DateTimeFormatPart & { type: 'day' | 'month' | 'year' } =>
      part.type === 'day' || part.type === 'month' || part.type === 'year',
    )
    .map((part) => values[part.type])
    .join(DATE_FIELD_SEPARATOR);
}

/**
 * Parse typed date text using locale field order; accepts `.`, `/`, `-` separators.
 * Returns UTC midnight Date or null when empty / unparseable.
 */
export function parseDateFieldValue(raw: string, locale: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const order = dateFieldFormatParts(locale)
    .filter((part): part is Intl.DateTimeFormatPart & { type: 'day' | 'month' | 'year' } =>
      part.type === 'day' || part.type === 'month' || part.type === 'year',
    )
    .map((part) => part.type);

  const sepMatch = trimmed.match(/^(\d{1,2})[./\-](\d{1,2})(?:[./\-](\d{2,4}))?$/);
  if (sepMatch) {
    const a = parseInt(sepMatch[1], 10);
    const b = parseInt(sepMatch[2], 10);
    let year = sepMatch[3] ? parseInt(sepMatch[3], 10) : new Date().getUTCFullYear();
    if (year < 100) year += 2000;

    let day = a;
    let month = b;
    if (order[0] === 'month' && order[1] === 'day') {
      month = a;
      day = b;
    } else if (order[0] === 'year') {
      year = a < 100 ? a + 2000 : a;
      month = b;
      day = parseInt(sepMatch[3] ?? '1', 10);
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return parseIsoDateValue(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    );
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  const d = new Date(parsed);
  return parseIsoDateValue(
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
  );
}
