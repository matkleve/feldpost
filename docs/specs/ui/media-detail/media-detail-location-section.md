# Media Detail Location Section

> **Parent:** [media-detail-view.md](media-detail-view.md)  
> **Service:** [media-locations-service.md](../../service/media-locations/media-locations-service.md)  
> **Add/Search dropdown:** [address-search.md](address-search.md) (4-zone variant in location list mode)

## What It Is

Multi-location editor for one media item: one always-visible **Add/Search Address** row, then a scrollable list of location rows (`0..n`). Each row owns granular address fields on a shared org **`locations`** row (via **`media_item_location_links`**). There is no shared global street/district/country/GPS block on `media_items`.

Canonical persistence: **`locations`** + **`media_item_location_links`**. Detail header title (`address_label`) edits the **first linked row** by `sort_order` (same hydrate as `primaryLocationFromRows`).

## What It Looks Like

One **Add or search address** row at the top, then a plain scrollable list of location rows (no card chrome). Each row uses the standard five-slot `detail-row` layout with edit, copy menu, and overflow menu. No primary pin badge (primary model removed).

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-location-section/`
- **Children:** `media-location-add-search/`, `media-location-row/`
- **Parent:** `MediaDetailViewComponent`

## Actions

| # | User Action | System Response |
| --- | --- | --- |
| 1 | Clicks Add or search address | Opens inline search with 4-zone dropdown |
| 2 | Enter / Add new Address | `add_media_item_location` → link |
| 3 | Clicks internet result | Fills input; re-runs search (no create) |
| 4 | Edit row | Granular field editor (street, house number, staircase, door, floor, postcode, extra info) |
| 5 | Copy menu item | Copies field value to clipboard |
| 6 | Change GPS on map | Map pick with `locationRowId` → `update_media_item_location` |
| 7 | Delete (double confirm) | `delete_media_item_location`; re-fetch list |
| 8 | Edit shared location floor | Updates `locations.floor` for all media sharing that `location_id`; show `location.shared_edit.hint` when applicable |

## Constants

| Name | Value | Purpose |
| --- | --- | --- |
| `MEDIA_DETAIL_LOCATION_LIST_SCROLL_THRESHOLD` | `10` | Max visible rows before list scroll; list filter appears when count exceeds threshold |

## Component Hierarchy

```
MediaDetailLocationSection
├── MediaLocationAddSearch (Add/Search row, 4-zone dropdown)
├── [optional] list filter input (count > threshold)
└── MediaLocationRow × n (plain scroll list)
```

## Location Row FSM

| State | Visual | Transitions |
| --- | --- | --- |
| `read` | Single-line address + actions | → `editing`, `copy_menu_open`, `overflow_menu_open`, `delete_armed` |
| `editing` | Separate inputs: street, house_number, staircase, door, floor, postcode, extra_information | → `read` (save/cancel) |
| `copy_menu_open` | Copy dropdown | → `read` |
| `overflow_menu_open` | 3-dot menu | → `read`, `delete_armed` |
| `delete_armed` | Inline double-confirm delete | → `read` (cancel) or row removed |

Host exposes `[attr.data-state]` with the active state. **No** `set_primary` / `set_primary_error` states in product UX.

## Row Display Format

Single-line read format (segments in `[]` omitted when empty):

`{street} {house_number}[, {staircase}][, {doorLabel} {door}]`

- `doorLabel` from i18n `location.door.label` (default `Top`)
- `extra_information` is **not** in this line; shown only in edit/expanded details

## Row Slot Actions

| Slot | Action |
| --- | --- |
| `l1` | Edit |
| `r1` | Copy dropdown (see copy table in service spec) |
| `r2` | Overflow: change GPS on map, delete (double-confirm) |

Copy actions for null/empty fields are **hidden**. `extra_information` is excluded from copy menu.

## Add/Search Dropdown (4 zones)

1. **Results** — current media location rows matching input
2. **Other media results** — org DB candidates (locations-backed suggest)
3. **Internet results** — geocoder places; click fills input and re-runs search only
4. **Add new Address: "{query}"** — always visible; creates row on click or Enter in input

## Map Row Target

`change_location_map` from a row passes `{ mediaItemId, locationRowId }`. Map pick persists to that `locations.id` only via `update_media_item_location`. See service spec.

## Detail refresh exit criterion

After any location mutation, parent calls `refreshMediaAfterLocationMutation(mediaId)`:

- Re-load `list_locations_for_media` and merge into `ImageRecord` display fields (lat/lng, address_label, street, city, …).
- **Must not** read or write dropped `media_items` address/GPS columns.
- Map actions use `media().latitude` / `longitude` from hydrated first link only.

## i18n Keys

See [media-locations-service.md](../../service/media-locations/media-locations-service.md#i18n-keys).

## Acceptance Criteria

- [x] Add/Search row always visible; no separate Add button
- [x] List scrolls after `MEDIA_DETAIL_LOCATION_LIST_SCROLL_THRESHOLD` rows
- [x] Four dropdown zones render while typing
- [x] Internet pick does not create row until Enter or Add new Address
- [x] No primary pin / set-primary actions
- [x] Copy menu matches granular field table; empty fields hidden
- [x] Post-mutation refresh uses link list only (exit criterion above)
