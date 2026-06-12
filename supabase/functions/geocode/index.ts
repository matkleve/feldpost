/**
 * geocode — Supabase Edge Function that proxies geocoding requests.
 *
 * Forward/search: local Photon when GEOCODER_FORWARD_URL is set (dev), else Nominatim.
 * Reverse and structured-search: always Nominatim.
 *
 * Endpoints:
 *   POST /geocode  { action: "reverse", lat, lng }
 *   POST /geocode  { action: "forward", q, limit?, viewbox?, ... }
 *   POST /geocode  { action: "structured-search", street, city }
 */

import {
  buildPhotonSearchUrl,
  buildPhotonStructuredUrl,
  photonGeoJsonToNominatimSearch,
  type PhotonGeoJsonResponse,
} from "./photon-to-nominatim.ts";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100;
const USER_AGENT = "Feldpost/1.0 (construction image management)";
const UPSTREAM_TIMEOUT_MS = 10000;
const GEOCODER_FORWARD_URL = (Deno.env.get("GEOCODER_FORWARD_URL") ?? "").trim();
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

let lastNominatimRequestTime = 0;

/** Serializes Nominatim calls only (public API rate limit). */
async function rateLimitNominatim(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNominatimRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastNominatimRequestTime = Date.now();
}

function resolveAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    return null;
  }

  if (ALLOWED_ORIGINS.length === 0) {
    return null;
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }

  return null;
}

function corsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };

  const allowedOrigin = resolveAllowedOrigin(req);
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
}

function sanitizeSnippet(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, 500);
}

function acceptLanguageHeader(body: {
  acceptLanguage?: string;
}): string {
  return typeof body.acceptLanguage === "string" &&
      body.acceptLanguage.trim()
    ? body.acceptLanguage.trim()
    : "de,en";
}

type GeocodeBody = {
  action?: string;
  lat?: number;
  lng?: number;
  q?: string;
  limit?: number;
  countrycodes?: string;
  viewbox?: string;
  bounded?: number;
  acceptLanguage?: string;
  addressLayer?: boolean;
  street?: string;
  city?: string;
  postcode?: string;
  countryCode?: string;
  lat?: number;
  lng?: number;
  lon?: number;
  zoom?: number;
};

function buildNominatimSearchUrl(body: GeocodeBody): string {
  const q = typeof body.q === "string" ? body.q.trim() : "";
  return `${NOMINATIM_SEARCH_URL}?q=${encodeURIComponent(q)}&format=json&limit=${encodeURIComponent(String(body.limit ?? 5))}&addressdetails=1${body.addressLayer !== false ? "&layer=address" : ""}${body.countrycodes ? `&countrycodes=${encodeURIComponent(body.countrycodes)}` : ""}${body.viewbox ? `&viewbox=${encodeURIComponent(body.viewbox)}` : ""}${body.bounded != null ? `&bounded=${encodeURIComponent(String(body.bounded))}` : ""}`;
}

async function fetchUpstream(
  url: string,
  acceptLanguage: string,
  upstream: "nominatim" | "photon",
): Promise<Response> {
  const headers: Record<string, string> = {
    "Accept-Language": acceptLanguage,
  };
  if (upstream === "nominatim") {
    headers["User-Agent"] = USER_AGENT;
  }

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers,
  });

  if (!resp.ok) {
    const upstreamBody = sanitizeSnippet(await resp.text());
    return new Response(
      JSON.stringify({
        error: `${upstream === "photon" ? "Photon" : "Nominatim"} request failed`,
        failureType: "upstream_http",
        upstream,
        status: resp.status,
        upstreamBody,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return resp;
}

Deno.serve(async (req: Request) => {
  const allowedOrigin = resolveAllowedOrigin(req);

  if (req.method === "OPTIONS") {
    if (req.headers.get("origin") && !allowedOrigin) {
      return new Response(JSON.stringify({ error: "Origin not allowed" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    return new Response("ok", { headers: corsHeaders(req) });
  }

  if (req.headers.get("origin") && !allowedOrigin) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  let body: GeocodeBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const { action } = body;

  if (
    action !== "reverse" &&
    action !== "forward" &&
    action !== "structured-search" &&
    action !== "structured-forward"
  ) {
    return new Response(
      JSON.stringify({
        error:
          'Invalid action. Use "reverse", "forward", "structured-search", or "structured-forward".',
      }),
      {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }

  const acceptLanguage = acceptLanguageHeader(body);
  const usePhotonForward =
    GEOCODER_FORWARD_URL.length > 0 &&
    (action === "forward" || action === "structured-forward");

  let upstreamUrl: string;
  let upstreamKind: "nominatim" | "photon";

  if (action === "reverse") {
    const { lat, lng } = body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({
          error: "lat and lng are required numbers for reverse",
        }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of range" }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }
    upstreamUrl =
      `${NOMINATIM_REVERSE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1`;
    upstreamKind = "nominatim";
  } else if (
    action === "structured-search" ||
    action === "structured-forward" ||
    action === "structured-forward-bias" ||
    action === "street-house-numbers"
  ) {
    const street =
      typeof body.street === "string" ? body.street.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const postcode =
      typeof body.postcode === "string" ? body.postcode.trim() : "";
    if (!street) {
      return new Response(
        JSON.stringify({
          error: "street is required for structured geocoding",
        }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }
    const isBias = action === "structured-forward-bias";
    const isHouseEnum = action === "street-house-numbers";
    const usePhotonStructured =
      usePhotonForward &&
      (action === "structured-forward" || isBias || isHouseEnum);
    if (usePhotonStructured) {
      const lat = typeof body.lat === "number" ? body.lat : undefined;
      const lon =
        typeof body.lon === "number"
          ? body.lon
          : typeof body.lng === "number"
            ? body.lng
            : undefined;
      upstreamUrl = buildPhotonStructuredUrl(GEOCODER_FORWARD_URL, {
        street,
        city: city || undefined,
        postcode: postcode || undefined,
        countryCode:
          typeof body.countryCode === "string"
            ? body.countryCode
            : body.countrycodes?.split(",")[0],
        limit: isHouseEnum ? (body.limit ?? 50) : body.limit,
        acceptLanguage: body.acceptLanguage,
        lat: isBias ? lat : isHouseEnum ? lat : undefined,
        lon: isBias ? lon : isHouseEnum ? lon : undefined,
        zoom: isBias || isHouseEnum ? body.zoom : undefined,
      });
      upstreamKind = "photon";
    } else {
      if (!city && (isBias || isHouseEnum)) {
        return new Response(
          JSON.stringify({
            error: "Photon bias/house-number actions require GEOCODER_FORWARD_URL",
          }),
          {
            status: 400,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          },
        );
      }
      if (!city) {
        return new Response(
          JSON.stringify({
            error: "city is required for structured-search when Photon is unavailable",
          }),
          {
            status: 400,
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
          },
        );
      }
      upstreamUrl =
        `${NOMINATIM_SEARCH_URL}?street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&format=json&limit=${encodeURIComponent(String(body.limit ?? 5))}&addressdetails=1${body.countrycodes ? `&countrycodes=${encodeURIComponent(body.countrycodes)}` : ""}${postcode ? `&postalcode=${encodeURIComponent(postcode)}` : ""}`;
      upstreamKind = "nominatim";
    }
  } else {
    const { q } = body;
    if (typeof q !== "string" || !q.trim()) {
      return new Response(
        JSON.stringify({ error: "q is required for forward geocoding" }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }
    if (usePhotonForward) {
      upstreamUrl = buildPhotonSearchUrl(GEOCODER_FORWARD_URL, {
        q,
        limit: body.limit,
        acceptLanguage: body.acceptLanguage,
        viewbox: body.viewbox,
        bounded: body.bounded,
      });
      upstreamKind = "photon";
    } else {
      upstreamUrl = buildNominatimSearchUrl(body);
      upstreamKind = "nominatim";
    }
  }

  if (upstreamKind === "nominatim") {
    await rateLimitNominatim();
  }

  try {
    const upstreamResp = await fetchUpstream(
      upstreamUrl,
      acceptLanguage,
      upstreamKind,
    );
    if (upstreamResp.status !== 200) {
      const errorJson = await upstreamResp.json();
      return new Response(JSON.stringify(errorJson), {
        status: upstreamResp.status,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    console.info(
      `[geocode] action=${action} upstream=${upstreamKind} status=${upstreamResp.status}`,
    );

    const responseHeaders: Record<string, string> = {
      ...corsHeaders(req),
      "Content-Type": "application/json",
      "X-Feldpost-Geocoder-Upstream": upstreamKind,
    };

    if (upstreamKind === "photon") {
      const geoJson = (await upstreamResp.json()) as PhotonGeoJsonResponse;
      const rows = photonGeoJsonToNominatimSearch(geoJson);
      console.info(`[geocode] photon features=${geoJson.features?.length ?? 0} rows=${rows.length}`);
      return new Response(JSON.stringify(rows), {
        status: 200,
        headers: responseHeaders,
      });
    }

    const data = await upstreamResp.json();
    const rowCount = Array.isArray(data) ? data.length : 1;
    console.info(`[geocode] nominatim rows=${rowCount}`);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? sanitizeSnippet(error.message) : "Unknown error";
    return new Response(
      JSON.stringify({
        error: `Failed to reach ${upstreamKind === "photon" ? "Photon" : "Nominatim"}`,
        failureType: "network",
        upstream: upstreamKind,
        message,
      }),
      {
        status: 502,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
