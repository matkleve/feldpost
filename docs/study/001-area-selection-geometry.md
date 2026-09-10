---
id: STUDY-001
type: analysis
status: proposed
supersedes: none
corrected-by: none
---

# Area-selection geometry with variable location precision

**Written:** 2026-09-10 · **Branch:** `cursor/upload-heic-hash-order-3be6` @ `8fc56deb`
**Method:** static reading of `apps/web/src/app/**` and `supabase/migrations/**`, plus one ad-hoc Nominatim lookup for Vienna's bounding box and pen-and-paper geometry. No Feldpost geocode call was made; no map interaction was exercised.

**Status is `proposed`, and that is load-bearing.** This study argues that a product decision **already signed off on 2026-09-10** — full containment of a location's known area, evaluated by testing all four corners of its bounding box ([`address-resolution-model.area-extent-decisions.supplement.md`](../specs/service/media-upload-service/address-resolution-model.area-extent-decisions.supplement.md) § Decision 1) — should be replaced by a different geometry. **Nothing here is accepted.** Until the product owner rules, the supplement is the contract and this file is an argument. See § *What this would supersede*.

Read [`STUDY-FORMAT.md`](./STUDY-FORMAT.md) for the grades. Geometric derivations below are graded by their **weakest input**: the formulas are exact, but the Vienna measurements feeding them are `[B]`, so the radii they produce are `[B]`.

---

## 1. The corner artifact is real, and it is large

`[B]` Vienna's Nominatim bounding box measures **29.4 km × 22.8 km ≈ 669 km²**. Vienna's actual administrative area is **≈ 415 km²**. The rectangle is therefore about **61 % larger in area** than the city it stands for — it is the axis-aligned box around an irregular shape, and the excess sits in the corners, which are exactly the points a whole-bbox rule tests.

`[B]` Containing all four corners of that rectangle, measured from the point the geocoder returns as Vienna's location (which is **not** the bbox centre — it sits off-centre, so the farthest corner is farther than the half-diagonal from the box's own middle), requires a selection radius of about **19.7 km**.

`[C]` Consequence: under corner containment, "select everything in Vienna" needs a circle of roughly 40 km diameter — most of which is not Vienna. A user drawing a circle that visually covers the whole city will still miss city-precision items, and will not be able to see why.

## 2. Disc containment with the circumscribed radius buys nothing

The obvious simplification is to give each item a radius and test `d + r_item <= r_sel`, where `d` is centre-to-centre distance.

`[C]` If `r_item` is the **circumscribed** (half-diagonal) radius, this test is equivalent to bbox-corner containment: the circumscribed disc contains the rectangle including its corners, and the radius it demands is the same half-diagonal. It is never looser than the corner test, and equal to it whenever the farthest corner lies on the ray from the selection centre through the item centre. **It removes the four corner comparisons but not the corner geometry** — the same ~19.7 km is still required for Vienna. Simpler code, identical behaviour, no product improvement.

## 3. Proposal — the equal-area disc

`[D]` Represent a coarse location's known area as a disc of the **same area** as its bounding box:

```
r_item = sqrt(w_m * h_m / PI)
```

`[B]` For Vienna that is `sqrt(669 km² / π)` ≈ **14.6 km** instead of ≈ 19.7 km — a circle that covers the city as users understand it, rather than the box that circumscribes it.

`[D]` Pair it with a precision split:

| Stored precision | Known area | Inclusion test |
| --- | --- | --- |
| `houseNumber`, `street` | a point | point-in-circle (unchanged from today) |
| `city`, `postcode`, and coarser | equal-area disc from the stored bbox | `d + r_item <= r_sel` |

## 4. The honest cost

`[B]` The equal-area disc **under-covers the bounding box corners by up to ~5 km** for Vienna (14.6 km versus 19.7 km). So for selection radii between roughly **14.6 km and 19.8 km**, this rule includes Vienna-precision items that a strict whole-bbox rule would exclude. That is a real behavioural difference, not a rounding detail, and it is the trade being proposed: a circle that matches the user's mental model of "Vienna" at the price of not guaranteeing every corner of the OSM rectangle is covered.

`[C]` The trade looks right because the rectangle's corners are an artifact of axis-aligned boxing (§ 1), not places the photo could plausibly be. But that is an inference about which error users would rather have, and it has not been tested with anyone.

## 5. Distance model

`[B]` At Austrian latitudes, flat-earth and haversine distance differ by **under 12 m (< 0.06 %)** across Vienna-scale edges — immaterial at these radii.

`[A]` A shared implementation exists: `apps/web/src/app/core/geo/haversine.util.ts` (consolidated in `0445a213`). Leaflet's `map.distance` is the other legitimate source, and is what radius selection uses today (`apps/web/src/app/features/map/map-shell/radius/radius-selection.service.ts:59-60`).

`[D]` Use one of those two consistently. **Never** mix in the flat `degrees × 111 km` approximation: the error is small, but a selection rule whose two sides disagree produces items that are inside by one test and outside by the other, which is the kind of defect nobody reproduces.

## 6. Tier-identity inclusion is not a viable primary rule

`[C]` "Include an item if its administrative tier value matches an area in play" fails in both directions:

- A circle containing **only** coarse markers puts no area in play, so it selects nothing — the user drew a circle around visible content and got an empty selection.
- One precise pin inside a single district puts `city = Wien` in play, so the rule pulls in **every** `city = Wien` item in the organization — a district-sized gesture selecting a city-sized result.

`[D]` It remains defensible as a **narrow, explicit fallback** (for example, an opt-in "also include everything in this city" affordance), never as the default containment rule.

## 7. Scope correction: this is all media, not photos

`[A]` `viewport_markers` (latest definition `supabase/migrations/20260524120000_locations_nn_junction.sql:757`) and `cluster_images` (latest definition `supabase/migrations/20260525130000_drop_media_items_location_columns.sql:248`) filter on `organization_id` and on coordinates/`geog` being non-null. **Neither carries a `media_type` predicate.** Everything the map selects — and everything this geometry governs — is *all media with coordinates*, including documents, not photos only.

`[C]` Any copy written for this feature ("N more photos in Wien") is therefore wrong for mixed batches, and any performance estimate based on photo counts understates the row count.

---

## What this would supersede

If the product owner accepts § 3, the following change and this file's status becomes `accepted`:

- [`address-resolution-model.area-extent-decisions.supplement.md`](../specs/service/media-upload-service/address-resolution-model.area-extent-decisions.supplement.md) § Decision 1 — "every corner of the known-area rectangle must lie inside the circle" becomes the equal-area disc test for coarse tiers. The point test for `street`/`houseNumber` is unchanged either way.
- [`06-improvement-plan.md`](../audits/upload-flow-review-2026-09-10/06-improvement-plan.md) item 15 step 2, which currently says "rectangle for coarse precision".

If the owner declines, this file's status becomes `rejected` and stays here so the geometry is not re-derived from scratch next time.

## What this study could not prove

| Open | Why |
| --- | --- |
| What Feldpost's own geocode path returns as Vienna's bbox and centre | The measurement used a direct Nominatim lookup, not `GeocodingService` through the `/geocode` edge function. The analysis itself put the gap at roughly ±10 % versus the production forward-geocode path. |
| Whether bboxes exist to select on at all | `[A]` `boundingbox` has **zero occurrences** in `apps/web/src/app/core/geocoding/` — the Nominatim path returns upstream JSON verbatim (`supabase/functions/geocode/index.ts:366-371`) and the client never reads the field. Capturing it is Decision 3 of the supplement and is not built. |
| Which error users prefer (§ 4) | No user research. |
| Cluster-click behaviour under any of these rules | `cluster_images` selects by grid-snapped centroid cell, which is a different geometry again — see [STUDY-002](./002-coarse-precision-map-ux.md) § open questions. |
