import { SearchAddressCandidate, SearchQueryContext } from './search.models';

const SEARCH_DEBUG_STORAGE_KEY = 'feldpost-search-debug';
const SEARCH_DEBUG_LOG_STORAGE_KEY = 'feldpost-search-debug-log';
const SEARCH_DEBUG_MAX_ENTRIES = 400;

interface SearchDebugEntry {
  ts: string;
  kind: string;
  payload: unknown;
}

interface SearchDebugApi {
  get: () => SearchDebugEntry[];
  clear: () => void;
  exportText: () => string;
}

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

  appendSearchDebugLog('geocoder-ranked', {
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

export function logSearchEvent(kind: string, payload: unknown): void {
  if (!isSearchDebugEnabled()) return;
  appendSearchDebugLog(kind, payload);
}

export function logGeocoderResolverStage(stage: string, payload: unknown): void {
  if (!isSearchDebugEnabled()) return;
  appendSearchDebugLog(`resolver:${stage}`, payload);
}

function isSearchDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SEARCH_DEBUG_STORAGE_KEY) === '1';
}

function appendSearchDebugLog(kind: string, payload: unknown): void {
  if (typeof window === 'undefined') return;
  installSearchDebugWindowApi();

  const entries = readSearchDebugEntries();
  entries.push({ ts: new Date().toISOString(), kind, payload });
  const trimmed = entries.slice(-SEARCH_DEBUG_MAX_ENTRIES);

  try {
    window.localStorage.setItem(SEARCH_DEBUG_LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage failures in debug logging.
  }
}

function readSearchDebugEntries(): SearchDebugEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(SEARCH_DEBUG_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSearchDebugEntry);
  } catch {
    return [];
  }
}

function clearSearchDebugEntries(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SEARCH_DEBUG_LOG_STORAGE_KEY);
}

function exportSearchDebugText(): string {
  return JSON.stringify(readSearchDebugEntries(), null, 2);
}

function installSearchDebugWindowApi(): void {
  if (typeof window === 'undefined') return;
  const target = window as Window & { feldpostSearchDebug?: SearchDebugApi };
  if (target.feldpostSearchDebug) return;

  target.feldpostSearchDebug = {
    get: () => readSearchDebugEntries(),
    clear: () => clearSearchDebugEntries(),
    exportText: () => exportSearchDebugText(),
  };
}

function isSearchDebugEntry(value: unknown): value is SearchDebugEntry {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SearchDebugEntry>;
  return (
    typeof candidate.ts === 'string' && typeof candidate.kind === 'string' && 'payload' in candidate
  );
}
