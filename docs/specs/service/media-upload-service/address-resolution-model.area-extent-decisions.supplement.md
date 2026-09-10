# Address resolution — area extent & map display decisions (supplement)

> **Parent:** [address-resolution-model.md](./address-resolution-model.md)  
> **Audit:** [`docs/audits/upload-flow-review-2026-09-10/08-product-intent-vs-code.md`](../../../audits/upload-flow-review-2026-09-10/08-product-intent-vs-code.md) · plan item 15 in [`06-improvement-plan.md`](../../../audits/upload-flow-review-2026-09-10/06-improvement-plan.md)

Product-owner decisions recorded **2026-09-10**. Normative intent below; implementation tracked in improvement-plan item 15. **Not implemented in this change set.**

---

## Proxy-condition anti-pattern (recurring defect class)

A **proxy condition** is a runtime predicate whose name or shape does **not** state the invariant it enforces. It hides the real signal behind an incidental correlate. Recognizing the class is what caught three defects on this branch:

| Instance | Proxy (what code checked) | Actual invariant | Status |
| --- | --- | --- | --- |
| Tray Continue gate | `!isHeic(job.file)` | Phase 0 file prepare complete | Fixed on `cursor/upload-heic-hash-order-3be6` |
| Post-save phase | `resolving_address` around empty stub | Reverse geocode completion or honest pending state | Open — NF-39 |
| Map / zoom affordances | `locationPinEligible` (`street` + coords) | Stored address **precision** sufficient for point pin | **Decision 2** — spec updated; code pending item 15 |

**Rule for specs and reviews:** When a gate's comment or name disagrees with what it actually tests, treat it as a proxy until the real signal (`filePrepareComplete`, phase work location, `address_precision`, …) is named in code and spec.

---

## Decision 1 — Radius / area selection uses full containment

When a user draws a circle on the map, a photo is **included only if the photo's known geographic area is entirely inside the circle**.

| Precision | Known area | Inclusion test |
| --- | --- | --- |
| `houseNumber` / `street` (point-known) | Effectively a point at stored coords | Point-in-circle (same as today for true point pins) |
| `city` / `postcode` / coarser | Extent from stored bounding box (Decision 3) | **Full containment:** every corner of the known-area rectangle must lie inside the circle |

**Not current behavior.** `RadiusSelectionService.selectRadiusImages` tests `map.distance(center, cell) <= radiusMeters` on marker coordinates from `viewport_markers` — centroid distance, with **no** pin-eligibility gate and **no** extent (`radius-selection.service.ts:56-60`). A `Vienna/` city-level photo at a centroid is included when circling central Vienna even though the city's extent is not fully contained.

**Why centroid distance is insufficient:** A city-level photo's "known area" is not its centre. Centroid-plus-distance cannot implement full containment; it requires a stored **extent** (Decision 3).

Normative map contract: [radius-selection.md](../../component/map/radius-selection.md) § Area selection semantics · [media-locations.zoomable-map-contract.supplement.md](../media-locations/media-locations.zoomable-map-contract.supplement.md) § Known area.

---

## Decision 2 — Remove `locationPinEligible`; drive map UX from `address_precision`

**Decision:** Retire `locationPinEligible` (street text + coords) as the gate for map pins, tile zoom affordances, and list-side zoom targets. Use **`locations.address_precision`** (and coords presence) instead.

**Reasoning (product):** The gate keys on **address text** to decide whether to show a **coordinate** — a category error. It was a **proxy for precision** when precision was not stored. Precision is now stored explicitly ([address-precision-writers supplement](./address-resolution-model.address-precision-writers.supplement.md)); the proxy is redundant and strictly worse than the real signal.

| Concern | Old proxy | Normative signal |
| --- | --- | --- |
| Viewport pins / `viewport_markers` eligibility | `street` present | Coords + `geog`; precision governs **how** drawn, not whether coords exist |
| Tile map icon / zoom picker | `locationPinEligible` | Precision tier ≥ street (or product rule in zoomable contract §3) |
| Radius selection (Decision 1) | (none today — raw coords) | Known-area extent from precision + bbox |

**Implementation drift (2026-09-10):** Code still uses `locationPinEligible` in `media-locations.helpers.ts:309-314` and downstream affordances. Specs updated; code removal is item 15.

Replace Step 6's `locationPinEligible=false` language in the parent flow table with: tier-only Search Objects persist at established precision; map **rendering** follows precision rules in the zoomable contract — not street-text gating.

---

## Decision 3 — Capture geocoder bounding box (zero extra requests)

**Decision:** Persist the Nominatim **`boundingbox`** returned on forward and reverse geocode responses already proxied through `supabase/functions/geocode/index.ts`.

| Property | Detail |
| --- | --- |
| Cost | **Zero additional external requests** — bbox is present in responses we already fetch |
| Storage | New column(s) on `locations` (e.g. `extent_bbox` or PostGIS envelope derived from bbox) — migration required; **unverified** in agent environments |
| Use | Known-area rectangle for Decision 1 containment; coarse-precision map overlays (visual treatment **not** signed off — see item 15) |

**Honest limitation (accepted):** Geocoder bounding boxes are **axis-aligned rectangles**, not true administrative boundaries. "Fully contains Vienna" is exact against the rectangle and approximate against the real city edge. True polygons would require boundary data we do not have and new external dependencies. Product owner accepted the rectangle.

**Implementation drift (2026-09-10):** Bbox is **discarded today.** Edge function forwards Nominatim JSON unchanged (`geocode/index.ts:366-371`), but `GeocodingService` types omit `boundingbox` (`geocoding.service.ts:26-35`, `132-140`); `parseReverseResponse` / `parseForwardResponse` never read it (`:873-891`). Nothing persists extent to `locations`.

---

## Reverse-geocode call pattern (context for external-request minimization)

Verified against code on `cursor/upload-heic-hash-order-3be6`:

| Stage | Granularity | Evidence |
| --- | --- | --- |
| Forward search (folder text) | **Once per `groupingKey`** in orchestrator pre-resolve; sibling jobs reuse via `applyPreResolveFromOrchestrator` (`upload-location-placement.service.ts:90-98`, `upload-address-resolution.orchestrator.ts`) | Group-level Photon/Nominatim search |
| Reverse at persist | **Once per uploaded file** when `finalCoords` exist | `persistUploadFile` → `resolveUploadAddress` per `media_items` insert (`upload-file-persist.util.ts:238-247`) |
| NF-40 conditional reverse (branch) | Skips reverse when text address established | `resolveUploadAddress` early return when `addressContext.hasEstablishedTextAddress` (`upload-address-resolve.util.ts:35-44`) |

**Historical waste (pre-NF-40):** A 200-image `Vienna/` folder made **200 reverse calls** re-deriving an address already known from the folder name — one per persist — while forward ran at group level. NF-40 on this branch eliminates those when text is established; coords-only paths still reverse once per file.

---

## ⏳ PENDING PRODUCT-OWNER DECISIONS (2026-09-10 advisory analyses)

**Status: NOT DECIDED.** Two advisory analyses completed after the decisions above were signed off. They are recorded here for the product owner and change nothing yet. Decisions 1–3 and the acceptance criteria below remain in force. Only the product owner may supersede a signed-off decision — in particular, bbox-corner containment (Decision 1) stands until they say otherwise.

### P1 — Geo analysis: bbox-corner containment has a corner artifact (recommends superseding Decision 1)

*Analysis, not a decision.*

- Vienna's Nominatim bbox is 29.4 × 22.8 km = **669 km²**, about **61 % larger** than Vienna's ~415 km² administrative area. Containing all four corners from a central anchor needs a **~19.7 km** selection radius.
- Disc containment `d + r_item <= r_sel` with `r_item` = circumscribed (half-diagonal) radius is **mathematically equivalent** to bbox-corner containment. It removes the corner tests but not the corner geometry, so it is **no improvement**.
- **Recommended instead: equal-area disc**, `r_item = sqrt(w_m * h_m / PI)` — **~14.6 km** for Vienna instead of ~19.7 km. Point-in-circle for `street` / `houseNumber`; disc containment for coarser tiers.
- **Honest cost:** the equal-area disc under-covers bbox corners by up to **~5 km** for Vienna. For selection radii between ~14.6 and ~19.8 km, items may be included that a strict whole-bbox rule would exclude.
- **Haversine is appropriate** at Austrian latitudes: flat-vs-haversine differs by **< 12 m (< 0.06 %)** on Vienna-scale edges. Use the existing [`haversine.util.ts`](../../../../apps/web/src/app/core/geo/haversine.util.ts) or Leaflet `map.distance` consistently; do **not** mix in flat degrees × 111 km.
- **Tier-identity inclusion is not viable as the primary rule.** A circle containing only coarse markers yields no areas in play and therefore includes nothing; and a single precise pin in one district would pull in every `city=Wien` item org-wide. Viable only as a narrowly scoped fallback.
- **Confirmed against SQL:** `viewport_markers` and `cluster_images` have **no `media_type` filter** — neither function body references the column. This is all media with coordinates, not photos only.

> Arithmetic note for the reviewer: the half-diagonal of a 29.4 × 22.8 km rectangle is 18.6 km, so the ~19.7 km figure implies an anchor off the bbox centre. Worth confirming which anchor the ~5 km under-coverage is measured from before any implementation.

### P2 — UX analysis: containment is right; absorb its cost

*Analysis, not a decision.*

- **Containment is the right rule** and its cost should be absorbed, not worked around.
- **Removing `locationPinEligible` is only safe if it is replaced, not merely deleted.** It was a workaround for the centroid lie. Deleting it without a coarse-area representation makes the map **more** misleading, because city-precision rows with coords already render as ordinary point markers today.
- Coarse media should **stay visible** but must **not** render as a point pin at a centroid.
- The **retrieval path for coarse media is non-spatial and already exists**: `app-filter-dropdown` City/Address rules on `/media`, plus `app-grouping-dropdown`. **No new component.**
- **Disclosure after a circle selection:** one quiet line — "N more in [city]", tap to include. Not silence, not a precision-jargon banner.
- **No post-upload refinement prompts** — that would violate "uploading is a background task, don't make me think".

**Open questions the product owner must answer:**

1. Area-marker visual treatment (subject to the component styling gate).
2. Whether cluster click should follow the same containment rule as radius — today `cluster_images` uses grid-snapped centroid cells, so the two diverge.
3. Multi-city overlap copy.
4. Whether search commit should populate the workspace.
5. Rectangle honesty in copy — never imply municipal-boundary precision.

---

## Acceptance criteria (implementation — item 15)

- [ ] `locations` stores geocoder bbox (or derived geometry) on forward/reverse persist paths
- [ ] Radius selection uses full containment against known area, not centroid distance alone
- [ ] `locationPinEligible` removed; affordances keyed on `address_precision`
- [ ] `viewport_markers` spec and SQL aligned (see zoomable contract § drift)
- [ ] Red-test-first: `Vienna/` at city precision excluded from small block radius; included when circle fully contains bbox
