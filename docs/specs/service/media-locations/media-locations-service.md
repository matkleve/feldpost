# Media Locations Service

> **Module:** `apps/web/src/app/core/media-locations/`  
> **UI:** [media-detail-location-section.md](../../ui/media-detail/media-detail-location-section.md)  
> **Migrations:** `supabase/migrations/20260524120000_locations_nn_junction.sql`, `supabase/migrations/20260525130000_drop_media_items_location_columns.sql`

## What It Is

Facade for org-scoped **`locations`** linked to media via **`media_item_location_links`**. No primary row: list order is `sort_order ASC`, then staircase/door sort keys. Detail title and legacy `MediaRecord` address fields are hydrated from the **first zoomable linked row** by `sort_order`, else the lowest `sort_order` row (`displayLocationFromRows`). `resolve_media_location` updates that primary link’s location instead of appending a second link when one already exists.

Upload / map GPS assignment for a whole item uses **`MediaLocationUpdateService`** (`resolve_media_location` + `link_media_to_location`), not this facade.

## What It Looks Like

N/A (headless service). Consumers render rows per [media-detail-location-section.md](../../ui/media-detail/media-detail-location-section.md).

## Where It Lives

- **Code:** `apps/web/src/app/core/media-locations/`
- **UI consumer:** `MediaDetailViewComponent`, `MediaDetailLocationSection`, `MapShellComponent` (row-scoped map pick)

## Actions

| RPC (stable name) | Trigger |
| --- | --- |
| `list_locations_for_media` | Detail open / after mutation / batch primary hydrate |
| `add_media_item_location` | Add new Address |
| `update_media_item_location` | Row save / map GPS on row / detail title field save |
| `delete_media_item_location` | Row delete confirm |
| `link_media_to_location` | Upload resolve, `resolve_media_location` completion; row **Change to different address** (via facade) |
| `find_or_create_location` | Deduped org location create; add flow and replace-link flow |
| `unlink_media_from_location` | Row **Change to different address** (via facade `replaceMediaItemLocationLink`) |
| `update_location` | Direct location patch (SECURITY DEFINER); reached via `update_media_item_location` |
## Schema Contract

### `public.locations` (org-scoped, shared)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid FK | RLS scope |
| `street` … `country` | text nullable | Structured address |
| `house_number`, `staircase`, `door` | text nullable | Door/staircase stay text (`11-12`, `DG`, …) |
| `floor` | text nullable | **Per-location only** — excluded from dedupe key; editable when location is linked to multiple media |
| `postcode` | text nullable | Included in dedupe key |
| `extra_information` | text nullable | User note; never geocode/sort/map pin |
| `latitude` / `longitude` | numeric nullable | Pair constraint; `(0,0)` invalid for map zoom |
| `address_label` | text nullable | Display/search label |
| `address_dedupe_key` | text NOT NULL | `compute_location_address_dedupe_key(...)` — excludes `floor`, `extra_information` |
| `geog` | geography | Synced when lat/lng set |
| `staircase_sort_key` / `door_sort_key` | text NOT NULL | Derived on write |
| `created_at` / `updated_at` | timestamptz | |

Unique: `(organization_id, address_dedupe_key)`.

### `public.media_item_location_links`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Returned as `link_id` in list RPC |
| `media_item_id` | uuid FK | CASCADE |
| `location_id` | uuid FK | CASCADE |
| `organization_id` | uuid | RLS |
| `sort_order` | integer NOT NULL | List order; first row = display hydrate |

Unique: `(media_item_id, location_id)`.

### `public.media_items` (location columns removed)

Address/GPS for map, search, and detail title are **not** stored on `media_items`. Remaining location-related columns: `exif_latitude`, `exif_longitude`, `location_status`, `gps_assignment_allowed`, `address_field_meta` (verification JSON only).

## Dedupe key (normative)

Hash covers: street, house_number, staircase, door, postcode, city, district, country, and lat/lng pair (when both set). **Excludes:** `floor`, `extra_information`, `address_label`.

## RPC Contract

| RPC | Purpose |
| --- | --- |
| `list_locations_for_media(p_media_item_id, p_limit, p_offset)` | Join links → locations; default limit 50 |
| `add_media_item_location(...)` | `find_or_create_location` + link; assigns `sort_order` |
| `update_media_item_location(p_location_id, ...)` | `update_location` with org gate |
| `delete_media_item_location(p_location_id)` | Unlink; delete location if orphan |
| `unlink_media_from_location(p_media_item_id, p_location_id)` | Remove one junction row (scoped to media item) |
| `find_or_create_location(...)` | Insert or return existing by dedupe key |
| `link_media_to_location(p_media_item_id, p_location_id)` | Idempotent link; bumps `locations.last_used_at` |
| `search_locations(p_query, p_limit, p_media_item_id)` | Org picker: empty query → recent by `last_used_at`; typed → ILIKE rank (street prefix first); optional `is_linked_to_media` hint |
| `update_location(p_location_id, ...)` | Patch shared location (shared-edit semantics) |

### Facade: replace link (normative)

`MediaLocationsService.replaceMediaItemLocationLink({ mediaItemId, previousLocationId, patch })` calls, in order:

1. `unlink_media_from_location`
2. `find_or_create_location`
3. `link_media_to_location`

Does **not** call `update_media_item_location` on the previous location. Helpers: `replaceLocationLinkFromFreeText`, `replaceLocationLinkFromGeocode`.

### Facade: add from EXIF coordinates (detail UI)

`addFromExifCoordinates(mediaItemId, coords: { lat, lng })`:

1. `GeocodingService.reverse(lat, lng)`
2. On success → `addFromGeocodeSuggestion` with reverse fields and **EXIF** lat/lng (not corrected coords)
3. On reverse failure → `addLocation` with EXIF lat/lng only (`address_label` optional coord fallback)

Does not mutate `media_items.exif_*`. UI: [media-detail-inline-section.md](../../ui/media-detail/media-detail-inline-section.md).

### Facade: link existing (picker pre-resolve)

`linkExistingLocation(mediaItemId, locationId)` — `link_media_to_location` only (no `find_or_create`).

`replaceWithExistingLocation(mediaItemId, previousLocationId, locationId)` — unlink previous, then `linkExistingLocation`.

### `last_used_at`

Column on `locations`; updated **only** in `link_media_to_location` (not on `find_or_create` alone). Drives Recent list in add/search picker.

### Error codes

| Code | Meaning |
| --- | --- |
| `not_found` | Location or media not in org |
| `forbidden` | Viewer or wrong org |
| `validation_error` | Invalid coords or empty patch |
| `conflict` | Dedupe / constraint violation |

### Response DTO (`MediaItemLocationRow`)

`id` = `locations.id`, optional `link_id`, all address fields including `floor` and `postcode`, `sort_order`, sort keys, timestamps. `is_primary` is **not** returned (shim may emit `false` during transition).

## Map / gallery integration (read paths)

| Concern | Source |
| --- | --- |
| Viewport markers | `viewport_markers` v2 — zoomable links; `location_id` on marker; cluster count = `COUNT(DISTINCT media_item_id)` |
| Grid map affordance | `zoomable_location_count` on gallery list rows |
| Marker preview URL | `MediaDownloadService.resolveMarkerPreview(mediaId, path)` — cache key `mediaId` + `marker` tier |
| Workspace / gallery hydrate | `hydrateSummariesAndSeedCache` (batch summary + `listCache` seed) or `loadLocationSummaryByMediaIds` / `loadDisplayLocationsByMediaIds` without seed |
| Thumbnail map menu | `listForMedia` reads in-memory cache when warm |

### In-memory list cache (N:N)

| Map | Key | Value |
| --- | --- | --- |
| `locationToRow` | `locations.id` | `MediaLocationCoreRow` (no `sort_order` / `media_item_id` / `link_id`) |
| `mediaToLinks` | `media_item_id` | `MediaLocationLinkRef[]` (`locationId`, `link_id`, `sort_order`) |

- **Seed:** `seedListCache` / `hydrateSummariesAndSeedCache` — always `locationToRow.set` (overwrite; latest batch wins).
- **Read:** assemble + sort by link `sort_order`. If `refs.length !==` count of resolved cores → **cache miss** (data integrity; never return partial list).
- **Update:** `updateLocation` → `updateCachedLocation` only (no full clear).
- **Delete:** `deleteLocation` → `invalidateByLocationId`.
- **Per-media invalidate:** `invalidateListCache(mediaItemId)` removes `mediaToLinks` entry only.

## Floor edit rule

When the same `location_id` is linked to more than one `media_item_id`, editing **floor** on one item updates the shared `locations` row (all linked items see the change). UI shows `location.shared_edit.hint`.

## Copy Dropdown Contract

Side submenu under overflow **Copy** (full address first, then parts). Hidden when source empty. `extra_information` excluded.

| Copy action | Field | i18n key |
| --- | --- | --- |
| Copy full address | composed line | `location.copy.full_address` |
| Copy street | `street` | `location.copy.street` |
| Copy house number | `house_number` | `location.copy.house_number` |
| Copy staircase | `staircase` | `location.copy.staircase` |
| Copy door / Top | `door` | `location.copy.door` |
| Copy postcode | `postcode` | `location.copy.postcode` |
| Copy floor | `floor` | `location.copy.floor` |
| Copy city | `city` | `location.copy.city` |
| Copy district | `district` | `location.copy.district` |
| Copy country | `country` | `location.copy.country` |
| Copy GPS | `latitude,longitude` | `location.copy.gps` |

## i18n Keys

- `location.street.label`, `location.house_number.label`, `location.staircase.label`, `location.door.label`
- `location.postcode.label`, `location.floor.label`
- `location.extra_information.label`, `location.addSearch.placeholder`
- `location.shared_edit.hint`
- `location.copy.*` (see table)
- Dropdown sections: `location.dropdown.section.results`, `.otherMedia`, `.internet`, `location.dropdown.addNew`

## File Map

| File | Purpose |
| --- | --- |
| `media-locations.service.ts` | Facade |
| `media-locations.types.ts` | DTOs |
| `media-locations.helpers.ts` | Display line, `displayLocationFromRows`, zoomable helpers |
| `media-locations-batch.helpers.ts` | Batch list for workspace/projects |
| `adapters/supabase-media-locations.adapter.ts` | RPC calls |

## Acceptance Criteria

- [x] All CRUD via RPC only (no direct table writes from components)
- [x] No primary promotion in product UX; list order defines display hydrate
- [x] Dedupe key excludes floor and extra_information; includes postcode
- [x] `media_items` has no latitude/longitude/address_label/street/city/district/country/geog columns after `20260525130000`
- [x] Upload completion links location via `resolve_media_location` + `link_media_to_location`
- [x] Detail mutation exit: one `list_locations_for_media` reload + `locationDisplaySnapshotFromRows` + `mergeLocationDisplayIntoMediaRecord` patches `media()` (no `media_items` address columns)
- [x] `seedListCache` / `hydrateSummariesAndSeedCache`: batch load seeds N:N cache; map menu avoids redundant `list_locations_for_media` when cache is warm
- [x] Shared `locations.id` update visible on all cached media via `locationToRow` without per-media invalidation
- [x] Partial cache integrity failure forces RPC (no shortened list)
