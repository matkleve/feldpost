/**
 * geocode — Supabase Edge Function that proxies Nominatim requests.
 *
 * Eliminates browser CORS issues and enforces server-side rate limiting
 * (1 request/second to Nominatim).
 *
 * Endpoints:
 *   POST /geocode  { action: "reverse", lat, lng }
 *   POST /geocode  { action: "forward", q }
 */

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const MIN_INTERVAL_MS = 1100;
const USER_AGENT = "Feldpost/1.0 (construction image management)";
const NOMINATIM_TIMEOUT_MS = 10000;
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

let lastRequestTime = 0;

/** Simple server-side rate limiter — serializes via await. */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

function resolveAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) {
    return null;
  }

  if (ALLOWED_ORIGINS.length === 0) {
    // Fail closed in production: if no allow-list is configured, do not allow browser origins.
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

Deno.serve(async (req: Request) => {
  const allowedOrigin = resolveAllowedOrigin(req);

  // Handle CORS preflight
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

  // Parse request body
  let body: {
    action?: string;
    lat?: number;
    lng?: number;
    q?: string;
    limit?: number;
    countrycodes?: string;
    viewbox?: string;
    bounded?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }

  const { action } = body;

  if (action !== "reverse" && action !== "forward") {
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "reverse" or "forward".' }),
      {
        status: 400,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }

  // Build Nominatim URL
  let nominatimUrl: string;

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
    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "Coordinates out of range" }),
        {
          status: 400,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }
    nominatimUrl = `${NOMINATIM_REVERSE_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1`;
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
    nominatimUrl = `${NOMINATIM_SEARCH_URL}?q=${encodeURIComponent(q.trim())}&format=json&limit=${encodeURIComponent(String(body.limit ?? 5))}&addressdetails=1${body.countrycodes ? `&countrycodes=${encodeURIComponent(body.countrycodes)}` : ""}${body.viewbox ? `&viewbox=${encodeURIComponent(body.viewbox)}` : ""}${body.bounded != null ? `&bounded=${encodeURIComponent(String(body.bounded))}` : ""}`;
  }

  // Rate-limit then fetch from Nominatim
  await rateLimit();

  try {
    const nominatimResp = await fetch(nominatimUrl, {
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
      },
    });

    if (!nominatimResp.ok) {
      const upstreamBody = sanitizeSnippet(await nominatimResp.text());
      return new Response(
        JSON.stringify({
          error: "Nominatim request failed",
          failureType: "upstream_http",
          status: nominatimResp.status,
          upstreamBody,
        }),
        {
          status: 502,
          headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const data = await nominatimResp.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? sanitizeSnippet(error.message) : "Unknown error";
    return new Response(
      JSON.stringify({
        error: "Failed to reach Nominatim",
        failureType: "network",
        message,
      }),
      {
        status: 502,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
