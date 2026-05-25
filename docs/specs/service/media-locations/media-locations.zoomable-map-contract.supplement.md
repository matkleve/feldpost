# Media locations — zoomable map contract (supplement)

> **Parent:** [media-locations-service.md](./media-locations-service.md)  
> **Map picker:** [media-item-map-action.md](../../component/media/media-item-map-action.md)  
> **Upload routing:** [upload-manager-pipeline.location-routing.supplement.md](../media-upload-service/upload-manager-pipeline.location-routing.supplement.md)

## What it is

Normative glossary and cross-pipeline rules for **address-visible**, **display-hydrate**, and **zoomable** locations. Parent specs MUST link here; they MUST NOT duplicate the affordance table or redefine “has location.”

---

## 1. Glossary (read this first)

| Term | Definition | Forbidden synonyms |
| --- | --- | --- |
| **Address-visible link** | A `media_item_location_links` row whose joined `locations` row has display text (e.g. `address_label`, `street`) whether or not coords exist | “has location”, “resolved”, “on the map” |
| **Zoomable link** | A link whose `latitude` and `longitude` pass `legacyMediaHasGps` in [`media-locations.helpers.ts`](../../../../apps/web/src/app/core/media-locations/media-locations.helpers.ts); DB row also has `geog` for [`viewport_markers`](../../../../supabase/migrations/20260524120000_locations_nn_junction.sql) | “GPS chip”, “address-visible”, `location_status = resolved` alone |
| **Display-hydrate row** | The single `MediaItemLocationRow` chosen to fill detail header fields and `mergeLocationDisplayIntoMediaRecord` on `media()` | “primary location”, “the location”, “only location” |
| **Zoomable location count** | Count of zoomable links for one `media_item_id`; exposed as `zoomable_location_count` on gallery/workspace DTOs and as `locationsWithGps(rows).length` on list reads | `media.latitude != null` alone; address row count |

**Multi-location is normative:** one media item MAY have many links. Map UX depends on **how many zoomable links** exist, not how many address lines appear.

---

## 2. Hard invariants

1. **Map affordances** (tile map icon, map picker, `mapZoomRequested`, viewport pins, upload `zoomToLocationRequested`) MUST consider **zoomable links only**.
2. **Address-visible, non-zoomable** links MAY appear in the detail LOCATION list; they MUST NOT enable the tile map icon, MUST NOT appear in `viewport_markers`, and MUST NOT emit zoom with null coords.
3. **`location_status = resolved`** on `media_items` does NOT imply zoomable; forward geocode failure with text-only persist is address-visible only.
4. **Display-hydrate** MUST NOT be confused with the map picker target list; picker uses **all** zoomable rows via `locationsWithGps`.

---

## 3. Tile map affordance table (canonical)

Threshold constant: `MAP_LOCATION_SEARCH_THRESHOLD = 5` in [`media-item-map-action.helpers.ts`](../../../../apps/web/src/app/shared/media-item/media-item-map-action.helpers.ts) — search UI when **target count > 5** (i.e. **6+** zoomable links).

| Zoomable count | Tile map (`app-media-item-map-action`) | Parent gate (`mediaHasZoomableLocation`) |
| --- | --- | --- |
| **0** | Map control disabled / hidden | `zoomable_location_count === 0` (and no legacy paired fallback) |
| **1** | Click → immediate `mapZoomRequested` | enabled |
| **2–5** | Click → location picker dropdown (no search) | enabled |
| **6+** | Click → picker with search field | enabled |

Detail **Show on map** (per row): enabled only when **that row** is zoomable; see [media-detail-location-section.md](../../ui/media-detail/media-detail-location-section.md).

---

## 4. Display-hydrate algorithm

Implemented in `displayLocationFromRows(rows)`:

1. Sort links by `sort_order` ascending (stable tie-break: existing list RPC order).
2. If any row is zoomable, return the **lowest `sort_order` among zoomable rows**.
3. Else return the **lowest `sort_order` row overall** (address-only fallback for header / `media()` text fields only).

Rationale: header and GPS chip projection align with a coord-bearing row when one exists; address-only items still show street text without implying map zoom.

---

## 5. Normative test oracle — zero zoomable, address-visible only

Fixture: two links, both address-only (null or invalid lat/lng), sort 0 = “Theatergasse”, sort 1 = other text.

| Check | Expected |
| --- | --- |
| `displayLocationFromRows` | Row at sort 0 (not null) |
| `locationDisplaySnapshotFromRows` | `location_unresolved: true`; `latitude` / `longitude` null on merged `media()` |
| `mediaHasZoomableLocation` | `false` |
| Tile map | disabled (`interactive-*-map-disabled`) |
| `locationsWithGps(rows)` | `[]` |
| LOCATION list UI | Still shows address lines (**address-visible without zoomable**) |

This is the common regression class: user sees a street name; map does nothing.

---

## 6. `resolve_media_location` (upload / attach placement)

When media already has at least one link and placement supplies coords or address patch:

- **Enrich** the lowest-`sort_order` existing link via `update_location` on that `locations.id`.
- **Do not** append a second link for the same upload placement pass.

Migration: [`20260526140000_resolve_media_location_enrich_primary_link.sql`](../../../../supabase/migrations/20260526140000_resolve_media_location_enrich_primary_link.sql).

`find_or_create_location` ON CONFLICT merges `latitude` / `longitude` when provided.

---

## 7. Post-mutation sync matrix

| Event | Required follow-up |
| --- | --- |
| Forward geocode completes (`enrichWithForwardGeocode`) | `invalidateListCache(mediaItemId)`; optional re-batch hydrate for gallery |
| Detail location CRUD | `reloadLocations` → `locationDisplaySnapshotFromRows` → `mergeLocationDisplayIntoMediaRecord` |
| `imageUploaded$` with coords | Optimistic map pin + `queryViewportMarkers`; gallery patch sets `zoomableLocationCount` only when `event.coords` present |
| Gallery / workspace load | `hydrateSummariesAndSeedCache` seeds `zoomable_location_count` |

### Count parity (integration gate — Step H)

Two read paths MUST agree after cache invalidate for the same `media_item_id`:

| Path | Source |
| --- | --- |
| Batch / summary | `loadLocationSummaryByMediaIds` → `zoomableCountByMediaId` → `zoomable_location_count` on `WorkspaceMedia` / `MediaRecord` |
| List / picker | `listForMedia` → `locationsWithGps(rows).length` |

**Done criterion:** `zoomable_location_count === locationsWithGps(list rows).length` after `invalidateListCache(mediaId)` and a fresh list read. Tile gate and map picker MUST NOT disagree.

Step B (batch helper unit tests) alone is **not sufficient** without this parity check.

Implementation helper: `MediaLocationsService.syncListCacheAfterPlacement(mediaItemId)` invalidates list cache, reloads via `listForMedia`, returns `countZoomableLinks(rows)` for upload enrich parity.

### Environment matrix (migrations)

| Target | Command | Required versions |
| --- | --- | --- |
| Local Supabase | `supabase migration up --include-all` | `20260525200000` (comment), `20260526140000` (enrich existing link on `resolve_media_location`) |
| Hosted / remote | `supabase db push --include-all` | Same; verify with `supabase migration list` |

---

## 8. Anti-patterns (must not ship)

- Using `media.latitude != null` without `longitude` for GPS chip or map gate.
- Treating gallery `latitude: 0` / `longitude: 0` placeholders as zoomable.
- Duplicating the §3 affordance table in parent specs.
- Calling a link “primary” in prose — use **display-hydrate row** or **zoomable link**.
- Stale `mediaToLinks` cache after enrich while gallery shows `zoomableLocationCount: 1` and picker returns 0 targets.

---

## Acceptance criteria

- [x] Glossary §1 referenced from [media-locations-service.md](./media-locations-service.md), [media-detail-location-section.md](../../ui/media-detail/media-detail-location-section.md), [media-item-map-action.md](../../component/media/media-item-map-action.md), upload location supplement
- [x] §3 affordance table exists only in this file; parents link here
- [x] §5 address-only oracle covered by vitest in `media-locations.helpers.spec.ts`
- [x] §7 count parity documented for implementation Step H
- [ ] **Manual LIVE CHECK** (product owner) — folder upload, Auto location ON → tile map zoom → detail Show on map → marker in viewport after fly-to; see [agent-communication.md](../../../agent-workflows/agent-communication.md) LIVE VERIFICATION
