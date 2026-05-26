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

export interface PhotonStructuredSearchParams {
  street: string;
  city?: string;
  postcode?: string;
  countryCode?: string;
  limit?: number;
  acceptLanguage?: string;
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

export function photonGeoJsonToNominatimSearch(
  payload: PhotonGeoJsonResponse,
): NominatimSearchRow[] {
  if (!payload?.features?.length) return [];
  const rows: NominatimSearchRow[] = [];
  for (let i = 0; i < payload.features.length; i++) {
    const row = photonFeatureToNominatimRow(payload.features[i], i);
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

  const bbox =
    typeof params.viewbox === "string" && params.viewbox.trim()
      ? nominatimViewboxToPhotonBbox(params.viewbox)
      : null;
  if (bbox) {
    url.searchParams.set("bbox", bbox);
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
  url.searchParams.set("limit", String(params.limit ?? 5));
  url.searchParams.set("lang", photonLangFromAcceptLanguage(params.acceptLanguage));
  return url.toString();
}
