# Media Detail Location Section

> **Parent:** [media-detail-view.md](media-detail-view.md)  
> **Service:** [media-locations-service.md](../../service/media-locations/media-locations-service.md)  
> **Add/Search dropdown:** [address-search.md](address-search.md) (4-zone variant in location list mode)

## What It Is

Multi-location editor for one media item: one always-visible **Add/Search Address** row, then a scrollable list of location rows (`0..n`). Each row owns granular address fields; there is no shared global street/district/country/GPS block.

Canonical persistence is `media_item_locations`. Legacy `media_items` address columns are a compatibility projection from the primary row only.

## What It Looks Like

One **Add or search address** row at the top, then a plain scrollable list of location rows (no card chrome). Primary rows show a leading pin icon. Each row uses the standard five-slot `detail-row` layout with edit, copy menu, and overflow menu.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-location-section/`
- **Children:** `media-location-add-search/`, `media-location-row/`
- **Parent:** `MediaDetailViewComponent`

## Actions

| # | User Action | System Response |
| --- | --- | --- |
| 1 | Clicks Add or search address | Opens inline search with 4-zone dropdown |
| 2 | Enter / Add new Address | Creates `media_item_locations` row |
| 3 | Clicks internet result | Fills input; re-runs search (no create) |
| 4 | Edit row | Granular field editor (street, house number, staircase, door, extra info) |
| 5 | Copy menu item | Copies field value to clipboard |
| 6 | Set as primary | RPC promotion; list indicators update |
| 7 | Change GPS on map | Map pick with `locationRowId` |
| 8 | Delete (double confirm) | Deletes row; re-fetches list |

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
| `editing` | Separate inputs: street, house_number, staircase, door, extra_information | → `read` (save/cancel) |
| `copy_menu_open` | Copy dropdown | → `read` |
| `overflow_menu_open` | 3-dot menu | → `read`, `delete_armed` |
| `delete_armed` | Inline double-confirm delete | → `read` (cancel) or row removed |
| `set_primary_error` | Inline error on row | → `read` (dismiss/retry) |

Host exposes `[attr.data-state]` with the active state.

## Row Display Format

Single-line read format (segments in `[]` omitted when empty):

`{street} {house_number}[, {staircase}][, {doorLabel} {door}]`

- `doorLabel` from i18n `location.door.label` (default `Top`)
- `extra_information` is **not** in this line; shown only in edit/expanded details

## Primary Row UX

| Rule | Behavior |
| --- | --- |
| Indicator | Leading icon (filled pin) in row left slot when `is_primary` |
| Badge text | `location.primary.badge` — accessible name / companion label for marker |
| Overflow on primary row | Informational non-action item: `location.primary.tooltip` (not actionable set-primary) |
| Overflow on non-primary | Action `location.action.set_primary` when list count > 1 |
| Single row | Set-primary hidden; row is primary; indicator still shown |
| Set primary | RPC `set_primary_media_item_location`; reactive list update; inline `set_primary_error` on failure |

## Row Slot Actions

| Slot | Action |
| --- | --- |
| `l1` | Edit |
| `r1` | Copy dropdown (see copy table in service spec) |
| `r2` | Overflow: set primary (if applicable), change GPS on map, delete (double-confirm) |

Copy actions for null/empty fields are **hidden**. `extra_information` is excluded from copy menu.

## Add/Search Dropdown (4 zones)

1. **Results** — current media location rows matching input
2. **Other media results** — org DB candidates (same DB-first stack as address search)
3. **Internet results** — geocoder places; click fills input and re-runs search only
4. **Add new Address: "{query}"** — always visible; creates row on click or Enter in input

## Visual Behavior Contract

### Ownership Triad (primary indicator)

| Behavior | Geometry | State | Visual | Same? |
| --- | --- | --- | --- | --- |
| Primary pin icon | row `l1` slot | `is_primary` on row | leading icon | yes |

Parent list MUST NOT apply primary styling classes.

## Map Row Target

`change_location_map` from a row passes `{ mediaItemId, locationRowId }`. Map pick persists to that row only via `update_media_item_location` RPC. See service spec.

## Delete + Primary

After confirmed delete of primary row with siblings remaining: re-fetch location list from server; do not optimistically pick promoted primary.

## i18n Keys

See [media-locations-service.md](../../service/media-locations/media-locations-service.md#i18n-keys).

## Acceptance Criteria

- [ ] Add/Search row always visible; no separate Add button
- [ ] List scrolls after `MEDIA_DETAIL_LOCATION_LIST_SCROLL_THRESHOLD` rows
- [ ] Four dropdown zones render while typing
- [ ] Internet pick does not create row until Enter or Add new Address
- [ ] Primary indicator uses leading icon + `location.primary.badge` for a11y
- [ ] Copy menu matches granular field table; empty fields hidden
- [ ] Legacy single-field address block removed from this section
