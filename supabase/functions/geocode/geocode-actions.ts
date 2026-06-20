/**
 * Geocode request actions — single source of truth for the supported action set.
 *
 * Kept as a standalone, dependency-free module so the allowlist can be unit
 * tested without booting the Deno.serve handler. The handler (index.ts) and the
 * frontend (apps/web/src/app/core/geocoding/geocoding.service.ts) must agree on
 * this list; a mismatch silently 400s real requests (see geocode-actions.test.ts).
 */

export const GEOCODE_ACTIONS = [
  "reverse",
  "forward",
  "structured-search",
  "structured-forward",
  "structured-forward-bias",
  "street-house-numbers",
] as const;

export type GeocodeAction = (typeof GEOCODE_ACTIONS)[number];

/** Actions that may be served by Photon when GEOCODER_FORWARD_URL is configured. */
export const PHOTON_FORWARD_ACTIONS: ReadonlySet<GeocodeAction> = new Set([
  "forward",
  "structured-forward",
  "structured-forward-bias",
  "street-house-numbers",
]);

export function isSupportedGeocodeAction(action: unknown): action is GeocodeAction {
  return (
    typeof action === "string" &&
    (GEOCODE_ACTIONS as readonly string[]).includes(action)
  );
}

export function isPhotonForwardAction(action: unknown): action is GeocodeAction {
  return isSupportedGeocodeAction(action) && PHOTON_FORWARD_ACTIONS.has(action);
}
