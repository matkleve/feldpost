---
id: STUDY-002
type: analysis
status: proposed
supersedes: none
corrected-by: none
---

# UX for coarse-precision media on the map

**Written:** 2026-09-10 · **Branch:** `cursor/upload-heic-hash-order-3be6` @ `8fc56deb`
**Method:** static reading of `apps/web/src/app/**` and `supabase/migrations/**`. No usability testing, no session recordings, no analytics — **every claim about what users do or expect in this document is an inference**, graded `[C]` or `[D]` accordingly. See [`STUDY-FORMAT.md`](./STUDY-FORMAT.md).

**Companion:** [STUDY-001](./001-area-selection-geometry.md) settles the geometry question ("which items are in the circle?"). This study is the question after it: **what does the user see, and how do they find a photo whose location is known only to city precision?**

Status is `proposed`. Nothing here is approved, and § 3 in particular touches marker visuals, which are **explicitly gated** on product-owner sign-off (`AGENTS.md` § Component styling gate).

---

## 1. Containment is the right rule; its cost should be absorbed, not routed around

`[D]` Full containment — an item is selected only when its whole known area is inside the circle — is the correct primary semantics, as decided in [`address-resolution-model.area-extent-decisions.supplement.md`](../specs/service/media-upload-service/address-resolution-model.area-extent-decisions.supplement.md) § Decision 1.

`[C]` Its cost is that coarse items drop out of ordinary neighbourhood-sized selections. The temptation will be to soften the rule with a tolerance factor or a "mostly inside" heuristic. That reintroduces exactly the fuzziness containment was chosen to remove, and it does it invisibly. Absorb the cost in **disclosure** (§ 4) and in **non-spatial retrieval** (§ 5), not in the predicate.

## 2. Removing `locationPinEligible` is only safe if it is *replaced*

`[A]` Today `locationPinEligible(row)` returns true only when `row.street` is non-empty and the coordinates are valid (`apps/web/src/app/core/media-locations/media-locations.helpers.ts:309-315`). It gates zoom targets and picker lists (`locationsWithGps` `:318-320`, `countZoomableLinks` `:323-325`, primary-location choice `:367-373`).

`[A]` It does **not** gate the map's own marker query. `viewport_markers` (`supabase/migrations/20260524120000_locations_nn_junction.sql:757`) selects every link whose location has coordinates and `geog`, with no street and no precision predicate. **So a city-precision row with coordinates already renders as an ordinary point marker on the map today** — a pin standing on a centroid the user never chose.

`[C]` This is why the gate exists at all: it was a workaround for the centroid lie, suppressing zoom affordances that would have taken the user to a fabricated point. Deleting it without putting a coarse-area representation in its place makes the map **more** misleading, not less — the pin stays, and the one signal that said "do not trust this point enough to zoom to it" is gone.

`[D]` Ordering that follows: the replacement (precision-driven rendering) ships **with or before** the removal, never after.

## 3. Coarse media stays visible — but never as a point pin

`[D]` Two requirements, in tension, and both are firm:

1. A city-precision photo **must remain findable on the map**. Hiding it is a data-loss experience: the user uploaded it, it has a location, and it vanishes.
2. It **must not** render as a point pin on a centroid. A pin is a claim of point precision, and the claim is false.

`[C]` Anything satisfying both is some form of area representation rather than a point. **What that looks like is not decided here** — area marker, extent overlay, count badge at the tier level, or something else. Visual treatment requires explicit product sign-off before any SCSS or marker code is touched.

## 4. Disclosure after a circle selection: one quiet line

`[D]` When a containment selection excludes coarse items that overlap the circle, show a single line beneath the selection summary:

> *N more in Wien* — tap to include

`[C]` The reasoning, and it is inference rather than evidence: silence is the worst option, because the user's model ("I circled it, so I got it") is wrong and nothing corrects it. A precision-vocabulary banner is the second-worst, because it explains a data model to someone who wanted to select photos. A count plus a place name plus a way to act is the smallest thing that repairs the model.

`[C]` One tap is sufficient teaching — after the user has taken the affordance once, the concept is learned and the line becomes background. **This is an assumption with no user research behind it**, and it is the single claim in this document most worth testing before building on it.

## 5. Retrieval for coarse media is non-spatial, and it already exists

`[A]` `/media` already renders both dropdowns: `apps/web/src/app/features/media/media.component.html:106` (`app-grouping-dropdown`) and `:115` (`app-filter-dropdown`).

`[A]` `address` and `city` are built-in metadata fields with value accessors and group labels — `apps/web/src/app/core/metadata/adapters/built-in-metadata-fields.adapter.ts:17-18`, `:59-60`, `:106`, `:110` (including `Unknown city` / `Unknown address` bucket labels).

`[C]` So "show me everything filed under Wien" is a filter rule and a grouping, not a map gesture — and it is shipped. **No new component is needed** for coarse-precision retrieval; per the component-reuse gate, building one would be a duplicate.

`[C]` The premise underneath this section — that field users reach for the map and circle things first, and only fall back to list filters — is an inference about habit, not an observation. If it is wrong, the disclosure line in § 4 matters less and the filter path matters more.

## 6. No post-upload refinement prompts

`[D]` Do not add "your photo only has city precision — want to add a street?" prompts after upload. `upload-manager.md` states the principle: *uploading is a background task — don't make me think*. A prompt inverts it, and it arrives at the moment the user has already moved on.

`[A]` The refinement paths that exist are the right ones and are unprompted: Media Detail inline address editing and address search, and the Uploaded-lane row actions (`docs/audits/upload-flow-review-2026-09-10/08-product-intent-vs-code.md` § B).

---

## Open questions for the product owner

| # | Question | Why it cannot be answered here |
| --- | --- | --- |
| 1 | **Area-marker visual treatment** (§ 3) — what does a coarse location look like on the map? | Component styling gate: visual decisions need explicit approval in the task that touches SCSS/markers. |
| 2 | **Should cluster click follow the same containment rule as radius selection?** | They diverge today: `cluster_images` selects by grid-snapped centroid cell (`supabase/migrations/20260525130000_drop_media_items_location_columns.sql:248`) `[A]`, which is a third geometry alongside point-in-circle and containment. Making them agree is a product call, not a refactor. |
| 3 | **Copy when a circle overlaps several cities** — one line per city, or one aggregate line? | § 4's line is written for the single-city case; the multi-city shape is a copy decision. |
| 4 | **Should committing a search populate the workspace selection?** | Ties map retrieval to workspace semantics; out of scope for a map-display study. |
| 5 | **Rectangle honesty in copy** — the stored extent is an axis-aligned box ~61 % larger than Vienna's real area ([STUDY-001](./001-area-selection-geometry.md) § 1) `[B]`. Should the UI ever say so, or is the approximation silent? | Product judgement about how much model to expose. |

## What this study could not prove

- Anything at all about actual user behaviour. §§ 4 and 5's "field users rely primarily on circling" and "one tap is sufficient teaching" are `[C]` inferences stated as premises, not findings.
- Whether coarse items are common enough in real organizations to matter. No production data was available.
- How the disclosure line behaves at scale (dozens of overlapping coarse areas) — untested.
