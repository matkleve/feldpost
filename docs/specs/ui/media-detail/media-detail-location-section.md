# Media Detail Location Section

> **Parent:** [media-detail-view.md](media-detail-view.md)  
> **Service:** [media-locations-service.md](../../service/media-locations/media-locations-service.md)  
> **Add/Search dropdown:** [address-search.md](address-search.md) (4-zone variant in location list mode)

## What It Is

Multi-location editor for one media item: one always-visible **Add/Search Address** row, then a scrollable list of location rows (`0..n`). Each row owns granular address fields on a shared org **`locations`** row (via **`media_item_location_links`**). There is no shared global street/district/country/GPS block on `media_items`.

Canonical persistence: **`locations`** + **`media_item_location_links`**. Detail header title (`address_label`) edits the **first linked row** by `sort_order` (same hydrate as `displayLocationFromRows`). After any location CRUD, `reloadLocations` + `mergeLocationDisplayIntoMediaRecord` patch `media()` from the same list snapshot.

## What It Looks Like

One **Add or search address** row at the top, then a plain scrollable list of location rows (no card chrome). Each row uses the standard five-slot `detail-row` layout (two actions per side). No primary pin badge (primary model removed).

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
| `read` | Single-line address + actions | → `editing`, `overflow_menu_open`, `delete_armed` |
| `editing` | Separate inputs: street, house_number, staircase, door, floor, postcode, extra_information | → `read` (save/cancel) |
| `overflow_menu_open` | 3-dot menu (copy fields, change GPS on map) | → `read` |
| `delete_armed` | Inline double-confirm delete | → `read` (cancel) or row removed |

Host exposes `[attr.data-state]` with the active state. **No** `set_primary` / `set_primary_error` states in product UX.

## Row Display Format

Single-line read format via `formatLocationDisplayLine` (segments omitted when empty):

`[street] [house_number][/Stiege staircase][/Top door], [postcode] [city]`

- Staircase suffix: literal `/Stiege {staircase}`; door: `/Top {door}` (product copy, not i18n-interpolated on this line)
- Locality tail `, {postcode} {city}` only when **both** postcode and city are set
- `floor`, `district`, `country`, `extra_information` are **not** on this line
- Fallback: trimmed `address_label`, else `—`

Detail header / `resolveFullAddress` use `LocationDisplayFields` on `media()` only (`street`, `city`, …) — not this full line. Per-row read UI uses `formatLocationDisplayLine` on `MediaItemLocationRow`.

## Row Slot Actions

| Slot | Action |
| --- | --- |
| `l2` | Edit |
| `l1` | Show on map (disabled when row has no coordinates) |
| `r1` | Overflow menu: change GPS on map, **Copy** submenu (flyout to the right) |
| `r2` | Delete (double-confirm inline) |

Overflow menu uses `hlmMenuItem` rows with icons (same pattern as detail header context menu).

| Menu item | Behavior |
| --- | --- |
| **Edit address** | `app-confirm-dialog` with `location.shared_edit.confirm.*` — then inline row edit → `update_media_item_location` (patches shared `locations` row for all linked media) |
| **Change to different address** | Opens section **Add or search address** in replace mode → `unlink_media_from_location` + `find_or_create_location` + `link_media_to_location` via `MediaLocationsService.replaceMediaItemLocationLink` |
| **Change GPS on map** | Map pick → `update_media_item_location` on row |
| **Copy** | Side submenu (full address first, then parts) |

Slot **l2** edit and center address click use the same shared-edit confirm as **Edit address**. Null/empty copy fields hidden; `extra_information` excluded from copy.

## Add/Search Dropdown (4 zones)

1. **Recent** (empty query) or **Results** (typed query) — org locations via `search_locations` RPC; two-line format D via `app-location-picker-row` + `formatLocationPickerLines`; rows with `is_linked_to_media === true` are **excluded** on every org suggestions update (Recent and typed search). Org row click sets combobox + `pickQuerySnapshot` to the **same** `formatLocationDisplayLine` string (single assignment — must match for pre-resolve commit).
2. **Other media** — org DB address candidates (`SearchBarService`); format D primary/secondary from structured location fields on `db-address` candidates (`label` + `secondaryLabel`).
3. **Internet** — geocoder; format D via `formatGeocoderPickerLines` / candidate `label` + `secondaryLabel`; click fills input and re-runs search only
4. **Add new Address** — when query non-empty; primary = trimmed query, secondary = `location.dropdown.addNew.hint`; Enter or click uses text/geocode path unless pre-resolve commit applies

**Pre-resolved commit:** When query still equals `pickQuerySnapshot` after an org row click, Enter/confirm emits `locationLinked` → `link_media_to_location` only (no `find_or_create`). `pickQuerySnapshot` and the combobox value must both be set from one `formatLocationDisplayLine` result — divergence causes silent duplicate `locations` via `find_or_create`. Any edit after pick clears pre-resolve and falls through to add/replace text flows.

**Keyboard focus order (ArrowUp/Down):** org Recent/Results → other media → internet → add new.

**Replace mode:** `locationLinked` with replace target → parent `unlink` + `linkExistingLocation`.

## Map Row Target

`change_location_map` from a row passes `{ mediaItemId, locationRowId }`. Map pick persists to that `locations.id` only via `update_media_item_location`. See service spec.

## Detail refresh exit criterion

After any location mutation, parent calls `refreshMediaAfterLocationMutation(mediaId)`:

- Re-load `list_locations_for_media` and merge into `MediaRecord` display fields (lat/lng, address_label, street, city, …).
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
