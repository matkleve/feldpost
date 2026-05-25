#!/usr/bin/env node
/**
 * Diagnostic trace for Internet (Nominatim) geocoder search — no production code changes.
 *
 * Usage:
 *   node --experimental-strip-types scripts/diagnose-geocoder.ts --query "Denis"
 *   node --experimental-strip-types scripts/diagnose-geocoder.ts --query "Denis" --project-id <uuid>
 *
 * Env (repo-root `.env` or process env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   NOMINATIM_URL (optional, default https://nominatim.openstreetmap.org)
 *
 * @see docs/specs/service/location-resolver/search-algorithm-addresses-and-places.md
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_RPC = 'get_media_clusters(p_project_id uuid, p_radius_km double precision)';

/** Mirrors SEARCH_TUNING_SYSTEM_DEFAULTS.resolver + query — keep in sync with search-tuning.defaults.ts */
const TUNING = {
  enableInternetSearch: true,
  minQueryLength: 3,
  maxGeocoderResults: 3,
  contextDistanceMaxMeters: 120_000,
  lexicalLenLe4: 0.6,
  lexicalLen5to6: 0.7,
  lexicalLen7to9: 0.8,
  lexicalLenGe10: 0.85,
  lexicalSpecificStreet: 0.7,
  multiTokenExactMinScore: 0.35,
  specificStreetMinLength: 5,
  shortPrefixLenMin: 3,
  shortPrefixLenMax: 6,
  countryBounds: {
    at: { latMin: 46.3, latMax: 49.1, lngMin: 9.4, lngMax: 17.2 },
  },
} as const;

const NOMINATIM_FETCH_LIMIT = 15;
const NOMINATIM_USER_AGENT = 'Feldpost/1.0 (construction image management; diagnose-geocoder)';

interface CliArgs {
  query: string;
  projectId?: string;
  orgId?: string;
  radiusKm?: number;
  countryCodes: string[];
  unbounded: boolean;
  global: boolean;
  acceptLanguage: string;
}

interface ClusterRow {
  clusterId: number;
  viewbox: string;
  west: number;
  north: number;
  east: number;
  south: number;
  mediaCount: number;
  source: 'rpc' | 'fallback-bbox';
}

interface NominatimHit {
  lat: number;
  lng: number;
  displayName: string;
  name: string | null;
  importance: number;
  osmType?: string;
  osmClass?: string;
  address: Record<string, string | undefined> | null;
  raw: Record<string, unknown>;
}

interface ParsedResult {
  lat: number;
  lng: number;
  displayName: string;
  name: string | null;
  importance: number;
  address: {
    road?: string;
    house_number?: string;
    postcode?: string;
    country_code?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  } | null;
}

interface SearchContext {
  viewportBounds?: { north: number; east: number; south: number; west: number };
  countryCodes: string[];
  activeMarkerCentroid?: { lat: number; lng: number };
  activeProjectCentroid?: { lat: number; lng: number };
}

interface FilterVerdict {
  pass: boolean;
  failures: string[];
}

// ── Env / CLI ───────────────────────────────────────────────────────────────

function loadDotEnv(): void {
  for (const name of ['.env.local', '.env']) {
    loadEnvFile(join(REPO_ROOT, name));
  }
}

function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    query: 'Denis',
    countryCodes: ['at'],
    unbounded: false,
    global: false,
    acceptLanguage: 'de,en',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--query' && argv[i + 1]) {
      args.query = argv[++i];
    } else if (token === '--project-id' && argv[i + 1]) {
      args.projectId = argv[++i];
    } else if (token === '--org-id' && argv[i + 1]) {
      args.orgId = argv[++i];
    } else if (token === '--radius-km' && argv[i + 1]) {
      args.radiusKm = Number.parseFloat(argv[++i]);
    } else if (token === '--country' && argv[i + 1]) {
      args.countryCodes = argv[++i].split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
    } else if (token === '--unbounded') {
      args.unbounded = true;
    } else if (token === '--global') {
      args.global = true;
    } else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`diagnose-geocoder — trace Internet search / Nominatim pipeline

Usage:
  node --experimental-strip-types scripts/diagnose-geocoder.ts [options]

Options:
  --query <string>       Search string (default: Denis)
  --project-id <uuid>    Project with GPS media (default: busiest GPS project in org)
  --org-id <uuid>        Organization (default: first org)
  --radius-km <n>        Cluster radius km (default: 120 or org tuning)
  --country <codes>      countrycodes, comma-separated (default: at)
  --unbounded            Nominatim viewbox without bounded=1
  --global               Skip clusters; one global Nominatim call
  -h, --help             Show this help

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NOMINATIM_URL (optional)
`);
}

function assertRpcSignature(): void {
  const migrationPath = join(
    REPO_ROOT,
    'supabase/migrations/20260523140000_get_media_clusters.sql',
  );
  if (!existsSync(migrationPath)) {
    console.error('SPEC GAP: migration 20260523140000_get_media_clusters.sql not found.');
    process.exit(1);
  }
  const sql = readFileSync(migrationPath, 'utf8');
  const hasProject = /get_media_clusters\s*\(\s*\n?\s*p_project_id\s+uuid/i.test(sql);
  const hasRadius = /p_radius_km\s+double\s+precision/i.test(sql);
  if (!hasProject || !hasRadius) {
    console.error('SPEC GAP: get_media_clusters signature differs from expected.');
    console.error(`Expected: ${EXPECTED_RPC}`);
    console.error('Read migration file and update this script before continuing.');
    process.exit(1);
  }
}

// ── Supabase helpers ────────────────────────────────────────────────────────

async function resolveSupabaseConfig(): Promise<{ url: string; key: string }> {
  loadDotEnv();
  let url = process.env.SUPABASE_URL?.trim();
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    try {
      const { spawnSync } = await import('node:child_process');
      const result = spawnSync('supabase', ['status', '-o', 'env'], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      if (result.status === 0 && result.stdout) {
        url = url ?? result.stdout.match(/API_URL="([^"]+)"/)?.[1];
        key = key ?? result.stdout.match(/SERVICE_ROLE_KEY="([^"]+)"/)?.[1];
      }
    } catch {
      // supabase CLI not available
    }
  }

  if (!url || !key) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env or supabase status -o env).',
    );
    process.exit(1);
  }

  return { url, key };
}

async function loadOrgId(supabase: SupabaseClient, orgId?: string): Promise<string> {
  if (orgId) return orgId;
  const { data, error } = await supabase.from('organizations').select('id').limit(1);
  if (error) throw new Error(`organizations query failed: ${error.message}`);
  if (!data?.[0]?.id) throw new Error('No organization found.');
  return data[0].id as string;
}

async function loadRadiusKm(
  supabase: SupabaseClient,
  orgId: string,
  override?: number,
): Promise<number> {
  if (override != null && Number.isFinite(override)) return override;

  const { data } = await supabase
    .from('org_search_tuning_profiles')
    .select('values_json')
    .eq('organization_id', orgId)
    .maybeSingle();

  const meters = (data?.values_json as { resolver?: { contextDistanceMaxMeters?: number } } | null)
    ?.resolver?.contextDistanceMaxMeters;
  if (typeof meters === 'number' && Number.isFinite(meters)) {
    return meters / 1000;
  }
  return TUNING.contextDistanceMaxMeters / 1000;
}

/** GPS via `locations` + `media_item_location_links` (post-20260525130000 schema). */
async function loadProjectGpsPoints(
  supabase: SupabaseClient,
  orgId: string,
  projectId: string,
): Promise<Array<{ lat: number; lng: number }>> {
  const { data, error } = await supabase
    .from('media_projects')
    .select(
      'media_items!inner(organization_id, media_item_location_links!inner(locations!inner(latitude, longitude)))',
    )
    .eq('project_id', projectId)
    .eq('media_items.organization_id', orgId)
    .limit(3000);

  if (error) throw new Error(error.message);

  const points: Array<{ lat: number; lng: number }> = [];
  for (const row of data ?? []) {
    const media = (row as { media_items?: unknown }).media_items;
    const items = Array.isArray(media) ? media : media ? [media] : [];
    for (const item of items) {
      const links = (item as { media_item_location_links?: unknown }).media_item_location_links;
      const linkRows = Array.isArray(links) ? links : links ? [links] : [];
      for (const link of linkRows) {
        const locRaw = (link as { locations?: unknown }).locations;
        const locs = Array.isArray(locRaw) ? locRaw : locRaw ? [locRaw] : [];
        for (const loc of locs) {
          const lat = Number((loc as { latitude?: number }).latitude);
          const lng = Number((loc as { longitude?: number }).longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            points.push({ lat, lng });
          }
        }
      }
    }
  }
  return points;
}

async function resolveProjectId(
  supabase: SupabaseClient,
  orgId: string,
  projectId?: string,
): Promise<{ projectId: string; gpsCount: number }> {
  if (projectId) {
    const points = await loadProjectGpsPoints(supabase, orgId, projectId);
    return { projectId, gpsCount: points.length };
  }

  const { data: rows, error: qErr } = await supabase
    .from('projects')
    .select('id')
    .eq('organization_id', orgId)
    .limit(500);

  if (qErr) throw new Error(qErr.message);

  const projectIds = [...new Set((rows ?? []).map((r) => (r as { id: string }).id))];
  let best: { projectId: string; gpsCount: number } | null = null;

  for (const pid of projectIds) {
    const points = await loadProjectGpsPoints(supabase, orgId, pid);
    if (!best || points.length > best.gpsCount) {
      best = { projectId: pid, gpsCount: points.length };
    }
  }

  if (!best || best.gpsCount === 0) {
    throw new Error('No project with GPS-tagged locations found for org.');
  }
  return best;
}

async function loadClustersFromRpc(
  supabase: SupabaseClient,
  projectId: string,
  radiusKm: number,
): Promise<ClusterRow[]> {
  const { data, error } = await supabase.rpc('get_media_clusters', {
    p_project_id: projectId,
    p_radius_km: radiusKm,
  });

  if (error) {
    console.error(`get_media_clusters RPC error: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row: Record<string, unknown>, index: number) => {
    const lonMin = Number(row['lon_min']);
    const latMin = Number(row['lat_min']);
    const lonMax = Number(row['lon_max']);
    const latMax = Number(row['lat_max']);
    const clusterId = Number(row['cluster_id'] ?? index + 1);
    const viewbox = `${lonMin},${latMax},${lonMax},${latMin}`;
    return {
      clusterId,
      viewbox,
      west: lonMin,
      north: latMax,
      east: lonMax,
      south: latMin,
      mediaCount: Number(row['media_count'] ?? 0),
      source: 'rpc' as const,
    };
  });
}

/** Single bbox from project GPS when RPC returns nothing (e.g. service role + user_org_id()). */
async function loadClustersFallbackBbox(
  supabase: SupabaseClient,
  projectId: string,
  orgId: string,
  radiusKm: number,
): Promise<ClusterRow[]> {
  const points = await loadProjectGpsPoints(supabase, orgId, projectId);
  if (points.length === 0) return [];

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
  const latPad = radiusKm / 111.0;
  const lonPad = radiusKm / (111.0 * Math.cos((avgLat * Math.PI) / 180));
  const west = Math.min(...lngs) - lonPad;
  const east = Math.max(...lngs) + lonPad;
  const south = Math.min(...lats) - latPad;
  const north = Math.max(...lats) + latPad;
  const viewbox = `${west},${north},${east},${south}`;

  return [
    {
      clusterId: 1,
      viewbox,
      west,
      north,
      east,
      south,
      mediaCount: points.length,
      source: 'fallback-bbox',
    },
  ];
}

async function loadProjectCentroid(
  supabase: SupabaseClient,
  projectId: string,
  orgId: string,
): Promise<{ lat: number; lng: number } | undefined> {
  const points = await loadProjectGpsPoints(supabase, orgId, projectId);
  if (points.length === 0) return undefined;
  const latSum = points.reduce((a, p) => a + p.lat, 0);
  const lngSum = points.reduce((a, p) => a + p.lng, 0);
  return { lat: latSum / points.length, lng: lngSum / points.length };
}

// ── Nominatim ───────────────────────────────────────────────────────────────

function isShortAmbiguousPrefixQuery(query: string): boolean {
  return (
    query.length >= TUNING.shortPrefixLenMin &&
    query.length <= TUNING.shortPrefixLenMax &&
    !query.includes(' ')
  );
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNominatim(
  baseUrl: string,
  query: string,
  options: {
    viewbox?: string;
    bounded: boolean;
    countryCodes: string[];
    addressLayer: boolean;
  },
): Promise<NominatimHit[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: String(NOMINATIM_FETCH_LIMIT),
    addressdetails: '1',
  });
  if (options.countryCodes.length) {
    params.set('countrycodes', options.countryCodes.join(','));
  }
  if (options.viewbox) {
    params.set('viewbox', options.viewbox);
    if (options.bounded) params.set('bounded', '1');
  }
  if (options.addressLayer) {
    params.set('layer', 'address');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/search?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': NOMINATIM_USER_AGENT,
      'Accept-Language': 'de,en',
    },
  });

  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`Nominatim HTTP ${res.status}: ${body}`);
  }

  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) return [];

  return json.map((item) => {
    const row = item as Record<string, unknown>;
    const address =
      row['address'] && typeof row['address'] === 'object'
        ? (row['address'] as Record<string, string | undefined>)
        : null;
    return {
      lat: Number.parseFloat(String(row['lat'] ?? '')),
      lng: Number.parseFloat(String(row['lon'] ?? '')),
      displayName: String(row['display_name'] ?? ''),
      name: row['name'] != null ? String(row['name']) : null,
      importance: Number(row['importance'] ?? 0),
      osmType: row['type'] != null ? String(row['type']) : undefined,
      osmClass: row['class'] != null ? String(row['class']) : undefined,
      address,
      raw: row,
    };
  });
}

function parseHit(hit: NominatimHit): ParsedResult | null {
  if (!Number.isFinite(hit.lat) || !Number.isFinite(hit.lng)) return null;
  const addr = hit.address;
  return {
    lat: hit.lat,
    lng: hit.lng,
    displayName: hit.displayName,
    name: hit.name,
    importance: hit.importance,
    address: addr
      ? {
          road: addr['road'],
          house_number: addr['house_number'],
          postcode: addr['postcode'],
          country_code: (addr['country_code'] ?? hit.raw['country_code']) as string | undefined,
          city: addr['city'],
          town: addr['town'],
          village: addr['village'],
          municipality: addr['municipality'],
          country: addr['country'],
        }
      : null,
  };
}

// ── App filter reimplementation ─────────────────────────────────────────────

const SUFFIX_REPLACEMENTS: [string, string][] = [
  ['strassee', 'strasse'],
  ['strase', 'strasse'],
  ['gase', 'gasse'],
  ['gass', 'gasse'],
  ['gas', 'gasse'],
];

function correctStreetToken(token: string): string {
  if (!token) return token;
  if (token === 'g' || token === 'g.') return 'gasse';
  if (token === 'str' || token === 'str.') return 'strasse';
  for (const [suffix, replacement] of SUFFIX_REPLACEMENTS) {
    if (token.endsWith(suffix)) {
      return token.slice(0, -suffix.length) + replacement;
    }
  }
  return token;
}

/** Mirrors apps/web/src/app/core/search/search-query.ts normalizeSearchQuery */
function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((token) => correctStreetToken(token))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeTextMatchScore(label: string, query: string): number {
  const normalizedLabel = label.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedLabel || !normalizedQuery) return 0;
  if (normalizedLabel === normalizedQuery) return 1;
  if (normalizedLabel.startsWith(normalizedQuery)) return 0.92;
  if (normalizedLabel.includes(normalizedQuery)) return 0.8;
  const sharedTokens = normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => normalizedLabel.includes(token)).length;
  return Math.min(0.79, sharedTokens * 0.2);
}

function normalizeForLexicalMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

function isSpecificStreetQuery(query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return normalized.length >= TUNING.specificStreetMinLength && !normalized.includes(' ');
}

function minimumLexicalScore(query: string): number {
  if (isSpecificStreetQuery(query)) return TUNING.lexicalSpecificStreet;
  if (query.length <= 4) return TUNING.lexicalLenLe4;
  if (query.length <= 6) return TUNING.lexicalLen5to6;
  if (query.length <= 9) return TUNING.lexicalLen7to9;
  return TUNING.lexicalLenGe10;
}

function isStreetLevelResult(result: ParsedResult): boolean {
  const addr = result.address;
  if (!addr) return true;
  const hasCity = !!(addr.city || addr.town || addr.village || addr.municipality);
  const hasRoad = !!addr.road;
  return hasCity || hasRoad;
}

function meetsLexicalMatchThreshold(result: ParsedResult, normalizedQuery: string): boolean {
  const queryNorm = normalizeForLexicalMatch(normalizedQuery);
  if (queryNorm.length >= 3) {
    const normalizedFields = [
      result.displayName ?? '',
      result.name ?? '',
      result.address?.road ?? '',
      result.address?.city ?? '',
      result.address?.town ?? '',
      result.address?.village ?? '',
      result.address?.municipality ?? '',
    ].map((value) => normalizeForLexicalMatch(value));
    if (normalizedFields.some((field) => field.includes(queryNorm))) {
      return true;
    }
  }

  const displayNameScore = computeTextMatchScore(result.displayName ?? '', normalizedQuery);
  const roadScore = computeTextMatchScore(result.address?.road ?? '', normalizedQuery);
  const nameScore = computeTextMatchScore(result.name ?? '', normalizedQuery);
  const cityScore = computeTextMatchScore(result.address?.city ?? '', normalizedQuery);
  const bestScore = Math.max(displayNameScore, roadScore, nameScore, cityScore);

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (queryTokens.length > 1) {
    const normalizedFields = [
      result.displayName ?? '',
      result.address?.road ?? '',
      result.name ?? '',
      result.address?.city ?? '',
      result.address?.town ?? '',
      result.address?.village ?? '',
      result.address?.municipality ?? '',
    ]
      .map((value) => normalizeForLexicalMatch(value))
      .filter(Boolean);

    const matchedTokens = queryTokens.filter((token) =>
      normalizedFields.some((field) => field.includes(token)),
    ).length;

    const leadingToken = queryTokens[0] ?? '';
    const hasLeadingPrefix = normalizedFields.some((field) =>
      field
        .split(/\s+/)
        .filter(Boolean)
        .some((part) => part.startsWith(leadingToken)),
    );

    if (matchedTokens >= Math.min(2, queryTokens.length) && hasLeadingPrefix) {
      return true;
    }

    if (matchedTokens === queryTokens.length && bestScore >= TUNING.multiTokenExactMinScore) {
      return true;
    }
  }

  return bestScore >= minimumLexicalScore(normalizedQuery);
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isCoordinateInViewport(
  lat: number,
  lng: number,
  viewport?: SearchContext['viewportBounds'],
): boolean {
  if (!viewport) return false;
  return (
    lat <= viewport.north && lat >= viewport.south && lng >= viewport.west && lng <= viewport.east
  );
}

function distanceFromContextMeters(lat: number, lng: number, context: SearchContext): number {
  const distances: number[] = [];
  if (context.activeMarkerCentroid) {
    distances.push(
      haversineMeters(
        lat,
        lng,
        context.activeMarkerCentroid.lat,
        context.activeMarkerCentroid.lng,
      ),
    );
  }
  if (context.activeProjectCentroid) {
    distances.push(
      haversineMeters(
        lat,
        lng,
        context.activeProjectCentroid.lat,
        context.activeProjectCentroid.lng,
      ),
    );
  }
  if (context.viewportBounds) {
    const centerLat = (context.viewportBounds.north + context.viewportBounds.south) / 2;
    const centerLng = (context.viewportBounds.east + context.viewportBounds.west) / 2;
    distances.push(haversineMeters(lat, lng, centerLat, centerLng));
  }
  return distances.length ? Math.min(...distances) : Number.POSITIVE_INFINITY;
}

function isCoordinateInAllowedCountries(lat: number, lng: number, countryCodes: string[]): boolean {
  for (const code of countryCodes) {
    const bounds = TUNING.countryBounds[code as keyof typeof TUNING.countryBounds];
    if (!bounds) continue;
    if (
      lat >= bounds.latMin &&
      lat <= bounds.latMax &&
      lng >= bounds.lngMin &&
      lng <= bounds.lngMax
    ) {
      return true;
    }
  }
  return false;
}

function matchesCountryConstraint(
  result: ParsedResult,
  context: SearchContext,
  normalizedQuery: string,
): FilterVerdict {
  const allowed = context.countryCodes.map((c) => c.toLowerCase());
  const hasAnchor =
    !!context.viewportBounds ||
    !!context.activeMarkerCentroid ||
    !!context.activeProjectCentroid;

  if (allowed.length === 0) {
    if (!hasAnchor) return { pass: true, failures: [] };
    if (isCoordinateInViewport(result.lat, result.lng, context.viewportBounds)) {
      return { pass: true, failures: [] };
    }
    if (isSpecificStreetQuery(normalizedQuery)) {
      return { pass: true, failures: [] };
    }
    const dist = distanceFromContextMeters(result.lat, result.lng, context);
    if (dist <= TUNING.contextDistanceMaxMeters) {
      return { pass: true, failures: [] };
    }
    return {
      pass: false,
      failures: [`country/distance gate (>${TUNING.contextDistanceMaxMeters}m from context)`],
    };
  }

  const resultCode = result.address?.country_code?.toLowerCase();
  if (resultCode && allowed.includes(resultCode)) {
    return { pass: true, failures: [] };
  }

  if (!resultCode && isCoordinateInAllowedCountries(result.lat, result.lng, allowed)) {
    return { pass: true, failures: [] };
  }

  if (isCoordinateInViewport(result.lat, result.lng, context.viewportBounds)) {
    return { pass: true, failures: [] };
  }

  if (isSpecificStreetQuery(normalizedQuery)) {
    return { pass: true, failures: [] };
  }

  return {
    pass: false,
    failures: [
      `country gate (code=${resultCode ?? 'missing'}, allowed=${allowed.join(',')}, not in viewport)`,
    ],
  };
}

function applyFilters(
  results: ParsedResult[],
  normalizedQuery: string,
  context: SearchContext,
): Array<{ result: ParsedResult; verdict: FilterVerdict }> {
  return results.map((result) => {
    const failures: string[] = [];

    if (!isStreetLevelResult(result)) {
      failures.push('street/city-level (no road and no city/town/village/municipality in address)');
    }

    const country = matchesCountryConstraint(result, context, normalizedQuery);
    if (!country.pass) failures.push(...country.failures);

    if (!meetsLexicalMatchThreshold(result, normalizedQuery)) {
      failures.push(`lexical threshold (min score ${minimumLexicalScore(normalizedQuery)})`);
    }

    return { result, verdict: { pass: failures.length === 0, failures } };
  });
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  assertRpcSignature();

  const normalizedQuery = normalizeSearchQuery(cli.query);
  const nominatimBase = process.env.NOMINATIM_URL?.trim() || 'https://nominatim.openstreetmap.org';
  const { url, key } = await resolveSupabaseConfig();
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const orgId = await loadOrgId(supabase, cli.orgId);
  const radiusKm = await loadRadiusKm(supabase, orgId, cli.radiusKm);
  const { projectId, gpsCount } = await resolveProjectId(supabase, orgId, cli.projectId);
  const projectCentroid = await loadProjectCentroid(supabase, projectId, orgId);

  console.log('=== STEP 1: CLUSTERS ===');
  console.log(`Org: ${orgId}`);
  console.log(`Project: ${projectId} (GPS media rows in join sample: ${gpsCount})`);
  console.log(`Radius: ${radiusKm} km (contextDistanceMaxMeters / 1000 or --radius-km)`);
  console.log(`Expected RPC signature: ${EXPECTED_RPC}`);

  let clusters: ClusterRow[] = [];
  if (!cli.global) {
    clusters = await loadClustersFromRpc(supabase, projectId, radiusKm);
    if (clusters.length === 0) {
      console.log('');
      console.log(
        'Note: get_media_clusters returned 0 rows. With SUPABASE_SERVICE_ROLE_KEY, auth.uid() is null',
      );
      console.log(
        'so user_org_id() is empty inside the RPC. Using fallback project bbox (min/max lat/lng + pad).',
      );
      clusters = await loadClustersFallbackBbox(supabase, projectId, orgId, radiusKm);
    }
  } else {
    console.log('--global: skipping cluster load');
  }

  console.log(`Clusters found: ${clusters.length}`);
  for (const cluster of clusters) {
    console.log(
      `Cluster ${cluster.clusterId} [${cluster.source}] media=${cluster.mediaCount} viewbox=${cluster.viewbox}`,
    );
    console.log(
      `  west=${cluster.west.toFixed(5)} north=${cluster.north.toFixed(5)} east=${cluster.east.toFixed(5)} south=${cluster.south.toFixed(5)}`,
    );
  }

  const searchTargets: Array<{ label: string; viewbox?: string; bounded: boolean }> = cli.global
    ? [{ label: 'global', bounded: false }]
    : clusters.length > 0
      ? clusters.map((c) => ({
          label: `cluster-${c.clusterId}`,
          viewbox: c.viewbox,
          // App uses viewbox with bounded=0 (bias only); --unbounded is legacy CLI alias.
          bounded: false,
        }))
      : [{ label: 'no-cluster-fallback-global', bounded: false }];

  const addressLayer = !isShortAmbiguousPrefixQuery(normalizedQuery);

  console.log('');
  console.log('=== STEP 2: NOMINATIM RAW ===');
  console.log(`Query (raw): ${cli.query}`);
  console.log(`Query (normalized): ${normalizedQuery}`);
  console.log(`countrycodes: ${cli.countryCodes.join(',')}`);
  console.log(`layer=address: ${addressLayer ? 'yes' : 'no (short ambiguous prefix 3–6 chars)'}`);
  console.log(`limit: ${NOMINATIM_FETCH_LIMIT}, format: jsonv2`);

  if (normalizedQuery.length < TUNING.minQueryLength) {
    console.log(`SKIP: min query length gate (${TUNING.minQueryLength}) — app would not call Nominatim.`);
    process.exit(0);
  }

  if (!TUNING.enableInternetSearch) {
    console.log('SKIP: enableInternetSearch=false in defaults.');
    process.exit(0);
  }

  const allHits: Array<{ target: string; hits: NominatimHit[] }> = [];

  for (const target of searchTargets) {
    if (allHits.length > 0) await sleep(1100);
    const boundedLabel = target.viewbox
      ? `viewbox=${target.viewbox} bounded=${target.bounded ? '1' : '0'}`
      : 'no viewbox (global)';
    console.log('');
    console.log(`--- ${target.label} (${boundedLabel}) ---`);

    try {
      const hits = await fetchNominatim(nominatimBase, normalizedQuery, {
        viewbox: target.viewbox,
        bounded: target.bounded && !!target.viewbox,
        countryCodes: cli.countryCodes,
        addressLayer,
      });
      allHits.push({ target: target.label, hits });
      if (hits.length === 0) {
        console.log('Results: 0');
      } else {
        console.log(`Results: ${hits.length}`);
        hits.forEach((hit, i) => {
          console.log(
            `  [${i + 1}] ${hit.displayName}`,
          );
          console.log(
            `      type=${hit.osmType ?? '-'} class=${hit.osmClass ?? '-'} importance=${hit.importance} lat=${hit.lat} lng=${hit.lng}`,
          );
        });
      }
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('');
  console.log('=== STEP 3: FILTERS ===');
  console.log(
    'Reimplemented: min length, street/city-level, lexical (search-bar-resolvers), country/viewport/distance.',
  );
  console.log(
    'Skipped: candidateScoreFloor ranking, dedupe-by-label, city-hint retry, house-number sibling expansion.',
  );

  let totalRaw = 0;
  let passedStreet = 0;
  let passedLexical = 0;
  let passedCountry = 0;
  let passedAll = 0;
  const uiCandidates: ParsedResult[] = [];

  for (const batch of allHits) {
    for (const hit of batch.hits) {
      totalRaw += 1;
      const parsed = parseHit(hit);
      if (!parsed) {
        console.log(`FAIL [unparseable] ${hit.displayName}`);
        continue;
      }

      const context: SearchContext = {
        countryCodes: cli.countryCodes,
        activeProjectCentroid: projectCentroid,
        viewportBounds: batch.target.startsWith('cluster-')
          ? (() => {
              const cluster = clusters.find((c) => `cluster-${c.clusterId}` === batch.target);
              return cluster
                ? { north: cluster.north, south: cluster.south, east: cluster.east, west: cluster.west }
                : undefined;
            })()
          : undefined,
      };

      const streetOk = isStreetLevelResult(parsed);
      const lexicalOk = meetsLexicalMatchThreshold(parsed, normalizedQuery);
      const countryVerdict = matchesCountryConstraint(parsed, context, normalizedQuery);
      const countryOk = countryVerdict.pass;
      const allOk = streetOk && lexicalOk && countryOk;

      if (streetOk) passedStreet += 1;
      if (lexicalOk) passedLexical += 1;
      if (countryOk) passedCountry += 1;
      if (allOk) {
        passedAll += 1;
        uiCandidates.push(parsed);
      }

      const status = allOk ? 'PASS' : 'FAIL';
      const reasons: string[] = [];
      if (!streetOk) reasons.push('street/city-level');
      if (!lexicalOk) reasons.push('lexical');
      if (!countryOk) reasons.push(...countryVerdict.failures);

      console.log(`${status} ${parsed.displayName.slice(0, 80)}`);
      if (reasons.length) console.log(`      → ${reasons.join('; ')}`);
    }
  }

  if (totalRaw === 0) {
    console.log('No Nominatim results to filter.');
  }

  const uiCount = Math.min(uiCandidates.length, TUNING.maxGeocoderResults);

  console.log('');
  console.log('=== STEP 4: SUMMARY ===');
  console.log(`Nominatim raw hits (all targets): ${totalRaw}`);
  console.log(`Passed street/city-level: ${passedStreet}`);
  console.log(`Passed lexical: ${passedLexical}`);
  console.log(`Passed country/viewport/distance: ${passedCountry}`);
  console.log(`Passed all filters: ${passedAll}`);
  console.log(`Would reach UI (maxGeocoderResults=${TUNING.maxGeocoderResults}): ${uiCount}`);

  if (totalRaw === 0) {
    console.log('');
    console.log(
      `Verdict: Nominatim returned 0 results for "${cli.query}" with current parameters.`,
    );
    console.log('Try --unbounded or --global to see if viewbox/countrycodes/layer constrain results.');
  } else if (passedAll === 0) {
    console.log('');
    console.log(`Verdict: Nominatim returned ${totalRaw} hit(s) but app filters removed all of them.`);
    console.log('Inspect STEP 3 failure reasons above.');
  } else if (uiCount === 0) {
    console.log('');
    console.log('Verdict: Some hits passed filters but none would be shown (unexpected).');
  } else {
    console.log('');
    console.log(`Verdict: Pipeline OK — up to ${uiCount} Internet row(s) would show.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
