import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isPhotonForwardAction,
  isSupportedGeocodeAction,
} from "./geocode-actions.ts";

// Regression: the frontend (geocoding.service.ts) sends these two actions, but
// the edge function used to reject them with a 400, silently breaking
// bias-ranked structured search and house-number enumeration.
Deno.test("structured-forward-bias is a supported action", () => {
  assert(isSupportedGeocodeAction("structured-forward-bias"));
});

Deno.test("street-house-numbers is a supported action", () => {
  assert(isSupportedGeocodeAction("street-house-numbers"));
});

Deno.test("the four original actions remain supported", () => {
  for (const action of [
    "reverse",
    "forward",
    "structured-search",
    "structured-forward",
  ]) {
    assert(isSupportedGeocodeAction(action), `${action} should be supported`);
  }
});

Deno.test("unknown actions are rejected", () => {
  assertEquals(isSupportedGeocodeAction("delete-everything"), false);
  assertEquals(isSupportedGeocodeAction(""), false);
  assertEquals(isSupportedGeocodeAction(undefined), false);
  assertEquals(isSupportedGeocodeAction(42), false);
});

// Photon bias / house-number enumeration must be eligible for the Photon
// upstream, otherwise lat/lon/zoom biasing never takes effect.
Deno.test("bias and house-number actions are Photon-forward eligible", () => {
  assert(isPhotonForwardAction("structured-forward-bias"));
  assert(isPhotonForwardAction("street-house-numbers"));
  assert(isPhotonForwardAction("forward"));
  assert(isPhotonForwardAction("structured-forward"));
});

Deno.test("reverse and structured-search are not Photon-forward eligible", () => {
  assertEquals(isPhotonForwardAction("reverse"), false);
  assertEquals(isPhotonForwardAction("structured-search"), false);
});
