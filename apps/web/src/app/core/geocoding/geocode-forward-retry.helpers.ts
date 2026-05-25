/**
 * Generic forward-geocode query variants (no per-street typo tables).
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
 */

/** Default locality anchor when folder/filename hints omit city (org-wide; not street-specific). */
const DEFAULT_LOCALITY_ANCHOR = 'Wien, Österreich';

export function buildForwardGeocodeRetryQueries(address: string): string[] {
  const trimmed = address.trim();
  if (!trimmed) {
    return [];
  }

  const queries = [trimmed];

  if (!/,/.test(trimmed)) {
    queries.push(`${trimmed}, ${DEFAULT_LOCALITY_ANCHOR}`);
  }

  return queries;
}
