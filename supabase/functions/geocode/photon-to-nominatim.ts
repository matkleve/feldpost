/**
 * Photon GeoJSON → Nominatim search JSON adapter for the geocode Edge Function.
 * @see docs/specs/service/geocoding/geocoding-service.md
 */

export interface PhotonFeatureProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
  countrycode?: string;
  district?: string;
  locality?: string;
  county?: string;
  rank?: number;
  osm_value?: string;
  osm_key?: string;
}

export interface PhotonFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: PhotonFeatureProperties;
}

export interface PhotonGeoJsonResponse {
  type: "FeatureCollection";
  features: PhotonFeature[];
}

/** Nominatim forward-search row shape returned to the Angular client. */
export interface NominatimSearchRow {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  importance: number;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    county?: string;
  };
}

export interface PhotonForwardSearchParams {
  q: string;
  limit?: number;
  acceptLanguage?: string;
  viewbox?: string;
  bounded?: number;
}

/** OSM highway/place values treated as address-like when Photon addressLayer is requested. */
const PHOTON_ADDRESS_OSM_VALUES = new Set([
  "house",
  "street",
  "residential",
  "living_street",
  "primary",
  "secondary",
  "tertiary",
  "town",
  "city",
  "village",
  "hamlet",
  "yes",
  "apartments",
]);

/**
 * Nominatim viewbox: west,north,east,south (minLon,maxLat,maxLon,minLat).
 * Returns viewbox center for Photon proximity bias (lat, lon).
 */
export function nominatimViewboxToPhotonCenter(
  viewbox: string,
): { lat: number; lon: number } | null {
  const parts = viewbox.split(",").map((s) => Number.parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  const [west, north, east, south] = parts;
  return {
    lat: (north + south) / 2,
    lon: (west + east) / 2,
  };
}

export interface PhotonStructuredSearchParams {
  street: string;
  city?: string;
  postcode?: string;
  countryCode?: string;
  limit?: number;
  acceptLanguage?: string;
  lat?: number;
  lon?: number;
  zoom?: number;
}

/**
 * Nominatim viewbox: west,north,east,south (minLon,maxLat,maxLon,minLat).
 * Photon bbox: minLon,minLat,maxLon,maxLat.
 */
export function nominatimViewboxToPhotonBbox(viewbox: string): string | null {
  const parts = viewbox.split(",").map((s) => Number.parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  const [west, north, east, south] = parts;
  return `${west},${south},${east},${north}`;
}

/** First language tag from Accept-Language (e.g. "de,en" → "de"). */
export function photonLangFromAcceptLanguage(acceptLanguage?: string): string {
  const raw =
    typeof acceptLanguage === "string" ? acceptLanguage.trim() : "";
  if (!raw) return "de";
  const first = raw.split(",")[0]?.trim() ?? "";
  const tag = first.split(";")[0]?.trim() ?? "";
  return tag.length > 0 ? tag : "de";
}

function buildDisplayName(properties: PhotonFeatureProperties): string {
  const parts: string[] = [];
  const streetLine = [properties.street, properties.housenumber]
    .filter((p) => typeof p === "string" && p.length > 0)
    .join(" ");
  if (streetLine) parts.push(streetLine);
  else if (properties.name) parts.push(properties.name);

  const locality =
    properties.city ?? properties.locality ?? properties.district;
  if (locality) parts.push(locality);
  if (properties.postcode) parts.push(properties.postcode);
  if (properties.state && properties.state !== locality) {
    parts.push(properties.state);
  }
  if (properties.country) parts.push(properties.country);

  if (parts.length > 0) return parts.join(", ");
  return properties.name ?? "";
}

function propertiesToAddress(
  properties: PhotonFeatureProperties,
): NominatimSearchRow["address"] {
  const city =
    properties.city ?? properties.locality ?? properties.district ?? undefined;
  return {
    road: properties.street,
    house_number: properties.housenumber,
    city,
    postcode: properties.postcode,
    country: properties.country,
    country_code: properties.countrycode?.toLowerCase(),
    state: properties.state,
    county: properties.county,
  };
}

function importanceFromFeature(
  feature: PhotonFeature,
  index: number,
): number {
  const rank = feature.properties.rank;
  if (typeof rank === "number" && Number.isFinite(rank)) {
    return Math.max(0, 1 / (1 + rank));
  }
  return Math.max(0.1, 1 - index * 0.05);
}

export function photonFeatureToNominatimRow(
  feature: PhotonFeature,
  index: number,
): NominatimSearchRow | null {
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lon, lat] = coords;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  const properties = feature.properties ?? {};
  const display_name = buildDisplayName(properties);
  if (!display_name) return null;

  return {
    lat: String(lat),
    lon: String(lon),
    display_name,
    name: properties.name,
    importance: importanceFromFeature(feature, index),
    address: propertiesToAddress(properties),
  };
}

/** Keep address-like Photon hits when mimicking Nominatim layer=address. */
export function isPhotonAddressLayerFeature(feature: PhotonFeature): boolean {
  const properties = feature.properties ?? {};
  const street = properties.street?.trim() ?? "";
  const housenumber = properties.housenumber?.trim() ?? "";
  if (street.length > 0 || housenumber.length > 0) {
    return true;
  }

  const osmKey = properties.osm_key?.trim().toLowerCase() ?? "";
  const osmValue = properties.osm_value?.trim().toLowerCase() ?? "";
  if (osmKey === "highway" && PHOTON_ADDRESS_OSM_VALUES.has(osmValue)) {
    return true;
  }
  if (osmKey === "place" && PHOTON_ADDRESS_OSM_VALUES.has(osmValue)) {
    return true;
  }

  const name = properties.name?.trim() ?? "";
  if (name.length > 0 && /\b(gasse|straße|strasse|weg|platz|allee)\b/i.test(name)) {
    return true;
  }

  return false;
}

export interface PhotonToNominatimOptions {
  /** When true, drop non-address Photon features (POIs, memorials, transit stops). */
  addressLayer?: boolean;
}

export function photonGeoJsonToNominatimSearch(
  payload: PhotonGeoJsonResponse,
  options: PhotonToNominatimOptions = {},
): NominatimSearchRow[] {
  if (!payload?.features?.length) return [];
  const rows: NominatimSearchRow[] = [];
  for (let i = 0; i < payload.features.length; i++) {
    const feature = payload.features[i];
    if (options.addressLayer !== false && !isPhotonAddressLayerFeature(feature)) {
      continue;
    }
    const row = photonFeatureToNominatimRow(feature, i);
    if (row) rows.push(row);
  }
  return rows;
}

/** Build Photon `/api` URL from forward/search body fields. */
export function buildPhotonSearchUrl(
  baseUrl: string,
  params: PhotonForwardSearchParams,
): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${trimmedBase}/api`);
  url.searchParams.set("q", params.q.trim());
  url.searchParams.set("limit", String(params.limit ?? 5));
  url.searchParams.set("lang", photonLangFromAcceptLanguage(params.acceptLanguage));

  const useHardBbox = params.bounded === 1;
  const viewbox =
    typeof params.viewbox === "string" && params.viewbox.trim()
      ? params.viewbox.trim()
      : null;

  if (viewbox && useHardBbox) {
    const bbox = nominatimViewboxToPhotonBbox(viewbox);
    if (bbox) {
      url.searchParams.set("bbox", bbox);
    }
  } else if (viewbox) {
    const center = nominatimViewboxToPhotonCenter(viewbox);
    if (center) {
      url.searchParams.set("lat", String(center.lat));
      url.searchParams.set("lon", String(center.lon));
    }
  }

  return url.toString();
}

/** Build Photon `/structured` URL for component-based forward geocoding. */
export function buildPhotonStructuredUrl(
  baseUrl: string,
  params: PhotonStructuredSearchParams,
): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${trimmedBase}/structured`);
  url.searchParams.set("street", params.street.trim());
  if (params.city?.trim()) {
    url.searchParams.set("city", params.city.trim());
  }
  if (params.postcode?.trim()) {
    url.searchParams.set("postcode", params.postcode.trim());
  }
  if (params.countryCode?.trim()) {
    url.searchParams.set(
      "countrycode",
      params.countryCode.trim().toLowerCase(),
    );
  }
  if (params.lat != null && Number.isFinite(params.lat)) {
    url.searchParams.set("lat", String(params.lat));
  }
  if (params.lon != null && Number.isFinite(params.lon)) {
    url.searchParams.set("lon", String(params.lon));
  }
  if (params.zoom != null && Number.isFinite(params.zoom)) {
    url.searchParams.set("zoom", String(params.zoom));
  }
  url.searchParams.set("limit", String(params.limit ?? 5));
  url.searchParams.set("lang", photonLangFromAcceptLanguage(params.acceptLanguage));
  return url.toString();
}
