# 08 — Product intent vs code (address precision)

**Measured:** 2026-09-10 · **Branch:** `cursor/upload-heic-hash-order-3be6` · **Method:** static reading of `apps/web/src/app/core/upload/**`, `core/geocoding/**`, `core/location-resolver/**`, `features/upload/**`, `shared/workspace-pane/media-detail/**`, `supabase/functions/geocode/**`, `supabase/migrations/**`. No live Nominatim calls in this environment.

**Audience:** Product owner (non-engineer). Engineering evidence uses `path:line` shorthand (`core/…` = `apps/web/src/app/core/…`).

**Related:** [`07-what-happens-when.md`](./07-what-happens-when.md) (phase walkthrough) · [`06-improvement-plan.md`](./06-improvement-plan.md) items 13–14 · [`02-new-issues.md`](./02-new-issues.md) NF-39, NF-40.

---

## Summary table

| # | Product statement | Code today | Match? | Key evidence |
| --- | --- | --- | --- | --- |
| 1 | Uploading is a background task — don't make me think | Principle recorded in spec; tray/HEIC ordering fixed on this branch; address still resolves fire-and-forget with silent failure (NF-39) | **Partial** | `docs/specs/service/media-upload-service/upload-manager.md:12`; `core/upload/support/upload-file-persist.util.ts:232-240`; NF-38/tray fixes on branch |
| 2 | Don't wait on HEIC for folder questions; don't convert files about to be skipped as duplicates | HEIC hash + lazy conversion + tray gate decoupled from `isHeic` on this branch | **Already fixed** | `core/upload/support/upload-heic-prepare.util.ts`; `core/upload/address-resolution/upload-tray-resolution-gate.helpers.ts:34-37`; `06-improvement-plan.md` items 1–2 |
| 3 | Reverse geocoding should always happen (initial PO reaction) | Whenever `finalCoords` exist at save time, `resolveUploadAddress` runs reverse geocode — **no** check for existing text address | **Violated** (superseded by 4) | `core/upload/support/upload-file-persist.util.ts:232-240`; `core/upload/address-resolution/upload-address-resolve.util.ts:20-36` |
| 4 | Reverse geocoding is enrichment for coordinates-only; skip when text address already established | Reverse runs unconditionally whenever coords exist; `titleAddress` never written to `locations` street/city fields | **Violated** | Same as row 3; `core/upload/pipelines/new/upload-new-post-save.util.ts:145-147` (stub only); forward geocode during pre-resolve sets `job.coords` only |
| 5 | Address precision is a spectrum; partial addresses (city-only or street-level) are valid end states | Spec Step 6 describes admin-centroid / `metadata_only`; runtime still forward-geocodes city text to a point, then reverse-fills structured fields | **Partial** | `core/location-path-parser/upload-search-object.completeness.helpers.ts:67-68`; `core/upload/address-resolution/upload-address-resolution.orchestrator.ts:329-341`; no stored precision level on `locations` |
| 6 | Never fabricate precision (e.g. `Vienna/` → only "Vienna", not a random street) | City folder → forward geocode centroid → unconditional reverse → Nominatim street at that point persisted via RPC | **Violated** | End-to-end trace § A below; `supabase/functions/geocode/index.ts:220-221` (no zoom/admin cap on reverse) |
| 7 | Users can add more detail later | Media Detail supports inline address edit; upload panel offers map/address actions on **uploaded** rows; Issues-lane recovery for stuck jobs — **not** the same as G4 defer | **Partial** | `shared/workspace-pane/media-detail/media-location-row/media-location-row.component.ts:5-7`; `features/upload/upload-panel/upload-panel-row-action-registry.ts:45-68`; G4 gap § C |
| 8 | Progressive per-group upload — resolved groups upload without waiting for the rest | Per-subfolder `groupingKey`; `awaiting_disambiguation` excluded from active phases and blocked from queue drain | **Already satisfied** | `core/location-path-parser/upload-search-object.builder.ts:239-253`; `core/upload/support/upload-phase-transitions.ts:19-33`; `core/upload/location/upload-location-resolution.helpers.ts:616-627`; `core/upload/manager/upload-manager-drain.util.ts:49-52` |

**Note on 3 vs 4:** Statement 3 was the product owner's first instinct and matches what the code does today. Statement 4 is the **operative** intent (confirmed correction). This document treats 4 as the requirement and 3 as historical context for why the pipeline was built this way.

---

## A. City-only fabrication case (`Vienna/`, random filenames, no EXIF)

### Scenario

Folder `Vienna/` containing files like `IMG_4821.jpg` with **no GPS in EXIF**.

### Static trace (what the code does)

| Step | What happens | Evidence |
| --- | --- | --- |
| 1. Intake | `webkitRelativePath` → `directorySegments` include `Vienna`; job gets `titleAddress: "Vienna"` (or localized parse, e.g. `Wien`) from folder hint | `core/upload/manager/upload-manager-submit.util.ts:279-301` |
| 2. Search Object | Folder name parses to city-tier SO (`city` set, no `street`) → completeness class **`metadata_only`** | `core/location-path-parser/upload-search-object.completeness.helpers.ts:67-68` |
| 3. Batch classify | Group status **`partial`**, `geocodeBranch: 'metadata_only'` — Photon Step 5 (street-only) does **not** run | `core/upload/address-resolution/upload-address-resolution.orchestrator.ts:329-341` |
| 4. Pre-resolve | `markGroupPartial` sets `pendingPartialLocation: true` on jobs; placement continues because orchestrator returned `partial`, not `held` | `core/upload/location/upload-location-pre-resolve-orchestrator.service.ts:125-127`, `:239-246`; `core/upload/pipelines/new/upload-new-pre-resolve.util.ts:345-358` |
| 5. Forward geocode (legacy path) | With `titleAddress` but no coords, `resolveJobTitleAddress` runs Nominatim/Photon **search** for `"Vienna"` → picks a hit → sets `titleAddressCoords`, then `finalizePlacement` sets **`job.coords`** to that point (city centroid or best search hit, not user-provided street) | `core/upload/location/upload-location-placement.service.ts:104-125`; `core/upload/pipelines/new/upload-new-pre-resolve.util.ts:238-261` |
| 6. Upload / DB insert | `persistUploadFile` inserts `media_items` with coords; `titleAddress` is **not** written to `locations` — only optional `address_notes` for low-confidence filename fragments | `core/upload/support/upload-file-persist.util.ts:192-207` (insert fields); no `titleAddress` in RPC payload |
| 7. Reverse geocode (always) | If `finalCoords` → `resolveUploadAddress` called **without `await`**; `geocoding.reverse(lat,lng)` → `resolve_media_location` RPC with **`p_street`, `p_city`, `p_district` from reverse result** | `core/upload/support/upload-file-persist.util.ts:232-240`; `core/upload/address-resolution/upload-address-resolve.util.ts:21-36` |
| 8. Edge function | Reverse URL is Nominatim `.../reverse?lat=…&lon=…&format=json&addressdetails=1` — **no `zoom` or admin-level parameter** to cap precision | `supabase/functions/geocode/index.ts:220-221` |
| 9. Stored shape | `locations` has `street`, `city`, `district`, `address_label`, lat/lng — **no precision / granularity column** | `supabase/migrations/20260524120000_locations_nn_junction.sql:53-68`; `resolve_media_location` at `20260526140000_resolve_media_location_enrich_primary_link.sql:72-82` |

### Verdict

**Static analysis strongly supports the fabrication suspicion.** The only address precision the user supplied is city-tier text (`Vienna`). The pipeline:

1. Converts that text into **coordinates** via forward search (a point on the map).
2. **Discards** those text fields for structured storage.
3. **Always** reverse-geocodes the point and persists whatever street Nominatim associates with that coordinate.

So the photo can show a **specific street name the user never provided**. This violates statements 4 and 6.

### Where static analysis stops

| Unknown | Why |
| --- | --- |
| Exact street name Nominatim returns for Vienna's search centroid | External service behavior; depends on which forward hit was chosen and what OSM feature sits at that lat/lng |
| Whether forward search returns city center vs a named suburb | Photon/Nominatim ranking |

Neither `GeocodingService.reverse` nor the `/geocode` edge function constrains reverse results by zoom or admin level. The client sends only lat/lng (`core/geocoding/geocoding.service.ts:239-244`).

### Live check (product owner or QA)

1. Upload folder `Vienna/` with one no-EXIF JPEG through the app (or staging).
2. After upload completes, open Media Detail → note **street** and **city** on the linked location.
3. Optionally confirm the coordinate choice: DevTools → network → `functions/v1/geocode` forward search for `Vienna`, then reverse for the persisted lat/lng.

**Pass criterion for statement 6:** stored address shows city **only** (e.g. `city=Wien`, `street` empty or null), pin optional/disabled. **Current expected fail:** non-empty `street` from reverse geocode.

Unauthenticated curl (forward centroid approximate):

```bash
# Forward (city centroid — compare with app's chosen point)
curl -s "https://nominatim.openstreetmap.org/search?q=Vienna&format=json&limit=1&addressdetails=1"
# Reverse at returned lat/lon — observe whether `address.road` is populated
curl -s "https://nominatim.openstreetmap.org/reverse?lat=48.2082&lon=16.3738&format=json&addressdetails=1"
```

---

## B. Post-upload address refinement (statement 7)

### Already-uploaded media (statement 7 target)

| Path | Exists? | Evidence |
| --- | --- | --- |
| Media Detail — edit street, house number, city, district, country | **Yes** | `shared/workspace-pane/media-detail/media-location-row/media-location-row.component.ts:5-7`; spec `docs/specs/ui/media-detail/address-field-editing.md` |
| Media Detail — address search / reconciliation | **Yes** | `shared/workspace-pane/media-detail/address-search/address-search.component.ts`; `core/location-resolver/location-resolver.service.ts:343-387` (background reverse for missing fields) |
| Upload panel — **Uploaded** lane: Change on map / Change address | **Yes** | `features/upload/upload-panel/upload-panel-row-action-registry.ts:45-68` (`lane === 'uploaded' && mediaId`) |
| Upload panel — **Issues** lane: placement recovery (missing GPS, deferred, document) | **Yes** (pre-complete) | Same registry `:51-53`, `:126-129` for `missing_gps`, `address_deferred`, `document_unresolved` |

### Distinction

- **Statement 7** = refine a **completed** item that uploaded with a coarse but valid address.
- **Issues lane actions** = fix a job that **never finished** upload or was routed to `missing_data` before `complete`.

Refinement after successful upload is real via Media Detail (and upload-panel row actions while the job row still exists in the Uploaded lane). There is **no** dedicated "upgrade precision" workflow — user edits fields manually or uses address search.

---

## C. G4 vs statement 7

| | **G4 (deferred-address lifecycle)** | **Statement 7 (later refinement)** |
| --- | --- | --- |
| **When** | User clicks **Skip** on a **blocking tray question** during upload | After upload **succeeded** with a coarse address |
| **Spec intent** | `resolutionStatus: 'deferred'`, upload without pin, reconciliation hint in Media Detail | Edit or search to add street/house detail |
| **Code today** | Skip → `resolutionStatus: 'failed'`, `issueKind: 'address_deferred'`, `missing_data` — **not** durable deferred through upload | Media Detail editing works for normal completed items |
| **Evidence** | `core/upload/location/upload-location-candidate-apply.service.ts:161-165`; `docs/specs/service/media-upload-service/contradiction-resolution-model.md:140-148` | § B above |

**Read:** Statement 7 **does not answer G4**. G4 is "I skipped the tray — bring me back to answer it." Statement 7 is "I uploaded with only Vienna — let me add a street later." Different lifecycle stages. G4 remains **open**; post-upload editing partially covers statement 7 only for items that reached `complete` with a location row.

---

## D. Progressive per-group upload (statement 8)

| Mechanism | Behavior | Evidence |
| --- | --- | --- |
| Grouping | `groupingKey` from Search Object (`country\|state\|postcode\|city\|street\|houseNumber`) — one geocode/tray per building-level key, per subfolder path | `core/location-path-parser/upload-search-object.builder.ts:239-253`; orchestrator `classifyBatch` groups by key `core/upload/address-resolution/upload-address-resolution.orchestrator.ts:218-227` |
| Held jobs | `awaiting_disambiguation` → `isJobBlocked` true → **not** selected by `drainQueue` | `core/upload/location/upload-location-resolution.helpers.ts:620-621`; `core/upload/manager/upload-manager-queue.util.ts:19` |
| Concurrency | Resolved jobs in `queued` consume up to 3 parallel slots; completing jobs call `drainQueue` again | `core/upload/support/upload-queue.service.ts:10`; `core/upload/pipelines/new/upload-new-post-save.util.ts:305-306` |
| Active-phase accounting | `awaiting_disambiguation` **not** in `ACTIVE_PHASES` — held groups do not count as "active upload work" | `core/upload/support/upload-phase-transitions.ts:19-33` |

**Verdict:** Statement 8 is **already satisfied**; no product work required for progressive group upload.

---

## Gap explanations (mismatches in plain language)

### Reverse geocoding always runs (statements 3 → 4)

**What you want:** If the folder already said `Mariahilfer Straße 12, Wien`, keep that — only reverse-geocode when you have GPS but no text.

**What happens:** Every upload with coordinates triggers reverse geocode, even when `titleAddress` was set from the folder. The folder text is kept on the in-memory job but **not** persisted as the structured address; reverse geocode overwrites `locations` with Nominatim's interpretation of the pin.

**Example:** Folder `Burgstraße 7/Berlin/` — forward geocode places the pin; reverse may return a slightly different label or street spelling, and a failed reverse still marks `unresolvable` while the upload shows complete (NF-39).

### Fabricated street from city folder (statement 6)

**What you want:** `Vienna/` + random filenames → address **Vienna** only.

**What happens:** The system picks a map point for "Vienna", then asks Nominatim "what street is here?" and saves that street. The user sees a precise address they never typed.

### No precision on stored locations (statement 5)

**What you want:** Legitimate end states at city, street, or house level — stored honestly.

**What happens:** The database stores full `street` / `city` / `district` columns with no field recording "this was city-level only." `adminLevel` exists only in tray conflict resolution, not at persist time.

---

## Open product questions

1. ~~**Allowed precision levels (statement 5):**~~ **Decided** — stored tiers aligned with Search Object / `groupingKey` vocabulary; see [address-resolution-model.md](../../specs/service/media-upload-service/address-resolution-model.md) § Address precision principle and item 14/15 in [`06-improvement-plan.md`](./06-improvement-plan.md).
2. ~~**City-only pins / `locationPinEligible`:**~~ **Decided (2026-09-10)** — remove street-text gate; drive map affordances from `address_precision`; capture geocoder bbox for known area. **Visual treatment of coarse pins/overlays not approved** — behavioral decisions in [area-extent supplement](../../specs/service/media-upload-service/address-resolution-model.area-extent-decisions.supplement.md); styling gate applies to implementation task.

---

## Planned fix (not implemented here)

See [`06-improvement-plan.md`](./06-improvement-plan.md) items 14–15 and [**NF-40**](./02-new-issues.md). Distinct from [**NF-39**](./02-new-issues.md) (timing/visibility of reverse geocode).
