import {
  buildPhotonSearchUrl,
  buildPhotonStructuredUrl,
  isPhotonAddressLayerFeature,
  nominatimViewboxToPhotonBbox,
  nominatimViewboxToPhotonCenter,
  photonFeatureToNominatimRow,
  photonGeoJsonToNominatimSearch,
  photonLangFromAcceptLanguage,
  type PhotonFeature,
} from "./photon-to-nominatim.ts";

import { assertEquals, assertExists } from "jsr:@std/assert";

Deno.test("nominatimViewboxToPhotonBbox converts search-bar viewport", () => {
  assertEquals(nominatimViewboxToPhotonBbox("15,49,17,47"), "15,47,17,49");
});

Deno.test("nominatimViewboxToPhotonCenter returns viewbox midpoint", () => {
  assertEquals(nominatimViewboxToPhotonCenter("15,49,17,47"), {
    lat: 48,
    lon: 16,
  });
});

Deno.test("nominatimViewboxToPhotonCenter rejects invalid viewbox", () => {
  assertEquals(nominatimViewboxToPhotonCenter("1,2,3"), null);
});

Deno.test("nominatimViewboxToPhotonBbox rejects invalid viewbox", () => {
  assertEquals(nominatimViewboxToPhotonBbox("1,2,3"), null);
  assertEquals(nominatimViewboxToPhotonBbox("a,b,c,d"), null);
});

Deno.test("buildPhotonSearchUrl omits bbox when viewbox invalid", () => {
  const url = buildPhotonSearchUrl("http://localhost:2322", {
    q: "Wien",
    viewbox: "bad",
    bounded: 1,
  });
  assertEquals(url.includes("bbox="), false);
});

Deno.test("buildPhotonSearchUrl uses lat lon bias when bounded is not 1", () => {
  const url = buildPhotonSearchUrl("http://localhost:2322/", {
    q: "Wien",
    limit: 3,
    acceptLanguage: "de,en",
    viewbox: "15,49,17,47",
    bounded: 0,
  });
  assertEquals(url.includes("bbox="), false);
  assertEquals(url.includes("lat=48"), true);
  assertEquals(url.includes("lon=16"), true);
});

Deno.test("buildPhotonSearchUrl includes bbox when bounded is 1", () => {
  const url = buildPhotonSearchUrl("http://localhost:2322/", {
    q: "Wien",
    limit: 3,
    acceptLanguage: "de,en",
    viewbox: "15,49,17,47",
    bounded: 1,
  });
  assertEquals(url.includes("bbox=15%2C47%2C17%2C49"), true);
});

Deno.test("photonLangFromAcceptLanguage", () => {
  assertEquals(photonLangFromAcceptLanguage("de,en"), "de");
  assertEquals(photonLangFromAcceptLanguage(undefined), "de");
});

Deno.test("photonGeoJsonToNominatimSearch maps Fuchsthallergasse feature", () => {
  const feature: PhotonFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [16.356, 48.225] },
    properties: {
      name: "Fuchsthallergasse 4",
      street: "Fuchsthallergasse",
      housenumber: "4",
      postcode: "1090",
      city: "Wien",
      country: "Österreich",
      countrycode: "AT",
      rank: 30,
    },
  };
  const rows = photonGeoJsonToNominatimSearch({
    type: "FeatureCollection",
    features: [feature],
  });
  assertEquals(rows.length, 1);
  assertEquals(rows[0].lat, "48.225");
  assertEquals(rows[0].lon, "16.356");
  assertEquals(rows[0].display_name.includes("Fuchsthallergasse"), true);
  assertEquals(rows[0].display_name.includes("1090"), true);
  assertEquals(rows[0].address.house_number, "4");
  assertEquals(rows[0].address.city, "Wien");
});

Deno.test("photonFeatureToNominatimRow returns null for bad geometry", () => {
  assertEquals(
    photonFeatureToNominatimRow(
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [NaN, 48] },
        properties: { name: "x" },
      },
      0,
    ),
    null,
  );
});

Deno.test("buildPhotonStructuredUrl includes lat lon zoom for bias", () => {
  const url = buildPhotonStructuredUrl("http://localhost:2322", {
    street: "Thaliastraße 4",
    countryCode: "at",
    lat: 48.19,
    lon: 16.34,
    zoom: 14,
    limit: 50,
  });
  assertEquals(url.includes("lat=48.19"), true);
  assertEquals(url.includes("lon=16.34"), true);
  assertEquals(url.includes("zoom=14"), true);
  assertEquals(url.includes("limit=50"), true);
});

Deno.test("photonGeoJsonToNominatimSearch filters non-address features when addressLayer", () => {
  const memorial: PhotonFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [15.6, 48.2] },
    properties: {
      name: "Stein der Erinnerung",
      city: "St. Pölten",
      countrycode: "AT",
      osm_key: "historic",
      osm_value: "memorial",
    },
  };
  const street: PhotonFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [15.61, 48.21] },
    properties: {
      name: "Wilhelm Wirtinger-Gasse",
      city: "St. Pölten",
      postcode: "3100",
      countrycode: "AT",
      osm_key: "highway",
      osm_value: "residential",
    },
  };

  assertEquals(isPhotonAddressLayerFeature(memorial), false);
  assertEquals(isPhotonAddressLayerFeature(street), true);

  const rows = photonGeoJsonToNominatimSearch(
    { type: "FeatureCollection", features: [memorial, street] },
    { addressLayer: true },
  );
  assertEquals(rows.length, 1);
  assertEquals(rows[0].display_name.includes("Wilhelm Wirtinger-Gasse"), true);
});

Deno.test("photonGeoJsonToNominatimSearch keeps all features when addressLayer false", () => {
  const memorial: PhotonFeature = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [15.6, 48.2] },
    properties: {
      name: "Stein der Erinnerung",
      city: "St. Pölten",
      countrycode: "AT",
    },
  };
  const rows = photonGeoJsonToNominatimSearch(
    { type: "FeatureCollection", features: [memorial] },
    { addressLayer: false },
  );
  assertEquals(rows.length, 1);
});

Deno.test("photonGeoJsonToNominatimSearch empty features", () => {
  assertEquals(
    photonGeoJsonToNominatimSearch({ type: "FeatureCollection", features: [] }),
    [],
  );
});

Deno.test("photonGeoJsonToNominatimSearch empty features", () => {
  assertEquals(
    photonGeoJsonToNominatimSearch({ type: "FeatureCollection", features: [] }),
    [],
  );
});
