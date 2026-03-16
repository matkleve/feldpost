import { SearchAddressCandidate, SearchQueryContext } from './search.models';

const SEARCH_DEBUG_STORAGE_KEY = 'feldpost-search-debug';

export function logGeocoderDiagnostics(
  rawQuery: string,
  normalizedQuery: string,
  context: SearchQueryContext,
  results: SearchAddressCandidate[],
): void {
  if (!isSearchDebugEnabled()) return;

  const top = results.slice(0, 3).map((candidate, index) => ({
    rank: index + 1,
    label: candidate.label,
    score: candidate.score,
    textScore: candidate.textScore,
    geoScore: candidate.geoScore,
    qualityScore: candidate.qualityScore,
    noisePenalty: candidate.noisePenalty,
    lat: candidate.lat,
    lng: candidate.lng,
  }));

  console.info('[SearchDebug][Geocoder]', {
    rawQuery,
    normalizedQuery,
    total: results.length,
    countryCodes: context.countryCodes,
    viewportBounds: context.viewportBounds,
    activeProjectCentroid: context.activeProjectCentroid,
    activeMarkerCentroid: context.activeMarkerCentroid,
    currentLocation: context.currentLocation,
    top,
  });
}

function isSearchDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SEARCH_DEBUG_STORAGE_KEY) === '1';
}
