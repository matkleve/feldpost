# Media Locations Service

> **Module:** `apps/web/src/app/core/media-locations/`  
> **UI:** [media-detail-location-section.md](../../ui/media-detail/media-detail-location-section.md)

## What It Is

Facade for `media_item_locations` CRUD, primary promotion, and compatibility projection to legacy `media_items` columns during rollout.

## What It Looks Like

N/A (headless service). Consumers render rows per [media-detail-location-section.md](../../ui/media-detail/media-detail-location-section.md).

## Where It Lives

- **Code:** `apps/web/src/app/core/media-locations/`
- **UI consumer:** `MediaDetailViewComponent`, `MapShellComponent` (row-scoped map pick)

## Actions

| RPC | Trigger |
| --- | --- |
| `list_media_item_locations` | Detail open / after mutation |
| `add_media_item_location` | Add new Address |
| `update_media_item_location` | Row save / map GPS |
| `delete_media_item_location` | Row delete confirm |
| `set_primary_media_item_location` | Overflow set primary |

## Schema Contract (`media_item_locations`)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `media_item_id` | uuid FK | CASCADE delete |
| `organization_id` | uuid | RLS scope |
| `street` | text nullable | |
| `house_number` | text nullable | |
| `staircase` | text nullable | |
| `door` | text nullable | **Must stay text** — values like `11-12`, `DG`, `Dachgeschoss` |
| `extra_information` | text nullable | User note only; never geocode/sort/projection |
| `city` | text nullable | |
| `district` | text nullable | |
| `country` | text nullable | |
| `latitude` | numeric nullable | |
| `longitude` | numeric nullable | |
| `address_label` | text nullable | Display/search label |
| `is_primary` | boolean NOT NULL | Max one true per media (partial unique index) |
| `sort_order` | integer NOT NULL | |
| `staircase_sort_key` | text NOT NULL | Derived; never shown/edited |
| `door_sort_key` | text NOT NULL | Derived; never shown/edited |
| `created_at` / `updated_at` | timestamptz | |

### Sort key derivation (pseudo-code)

```text
function buildSortKey(rawText):
  if rawText is null: return "~~"
  value = trim(rawText)
  if value is empty: return "~"
  firstNumber = first contiguous digit sequence in value
  if firstNumber exists: return leftPad(firstNumber, 6, "0") + "|" + value
  return "~" + value
```

List order: `sort_order ASC`, then `staircase_sort_key ASC`, then `door_sort_key ASC`.

### Idempotent backfill

Unique key: `(media_item_id, normalized_address_hash)` where hash covers street, house_number, staircase, door, lat/lng. `INSERT ... ON CONFLICT DO NOTHING`.

## RPC Contract

| RPC | Purpose |
| --- | --- |
| `list_media_item_locations(p_media_item_id, p_limit, p_offset)` | Paginated list; default limit 50 |
| `add_media_item_location(...)` | Create row; first row becomes primary |
| `update_media_item_location(p_location_id, ...)` | Patch fields/GPS |
| `delete_media_item_location(p_location_id)` | Delete; trigger promotes new primary if needed |
| `set_primary_media_item_location(p_location_id)` | Promote; sync projection |

### Error codes (taxonomy)

| Code | Meaning |
| --- | --- |
| `not_found` | Row or media not in org |
| `forbidden` | Viewer or wrong org |
| `validation_error` | Invalid coords or empty patch |
| `conflict` | Primary constraint violation |

### Response DTO (`MediaItemLocationRow`)

Includes: `id`, `media_item_id`, all address fields, `extra_information`, `latitude`, `longitude`, `is_primary`, `sort_order`, `staircase_sort_key`, `door_sort_key`.

### Compatibility projection

When primary row changes, trigger/RPC updates `media_items.street`, `city`, `district`, `country`, `latitude`, `longitude`, `address_label` from primary row only.

## Copy Dropdown Contract

| Copy action | Field | i18n key |
| --- | --- | --- |
| Copy street | `street` | `location.copy.street` |
| Copy house number | `house_number` | `location.copy.house_number` |
| Copy staircase | `staircase` | `location.copy.staircase` |
| Copy door / Top | `door` | `location.copy.door` |
| Copy district | `district` | `location.copy.district` |
| Copy country | `country` | `location.copy.country` |
| Copy GPS | `latitude,longitude` | `location.copy.gps` |

Hidden when source empty. `extra_information` excluded.

## i18n Keys

- `location.street.label`
- `location.house_number.label`
- `location.staircase.label`
- `location.door.label`
- `location.door.placeholder`
- `location.staircase.placeholder`
- `location.extra_information.label`
- `location.extra_information.placeholder`
- `location.action.set_primary`
- `location.primary.badge`
- `location.primary.tooltip`
- `location.action.set_primary_error`
- `location.copy.street` … `location.copy.gps` (see table)
- `location.addSearch.placeholder`
- `location.dropdown.section.results`
- `location.dropdown.section.otherMedia`
- `location.dropdown.section.internet`
- `location.dropdown.addNew`

## File Map

| File | Purpose |
| --- | --- |
| `media-locations.service.ts` | Facade |
| `media-locations.types.ts` | DTOs |
| `media-locations.helpers.ts` | Display line, sort helpers |
| `adapters/supabase-media-locations.adapter.ts` | RPC calls |
| `README.md` | Module index |

## Acceptance Criteria

- [ ] All CRUD via RPC only (no direct table writes from components)
- [ ] Primary promotion updates projection
- [ ] Sort keys recomputed on write
- [ ] Backfill migration is idempotent

## Reconciliation Note (SPEC GAP resolved in this module)

`media_items.address_label` remains for map/search/index compatibility but is **not** canonical storage for multi-location detail. Canonical granular storage is `media_item_locations`. Resolver/search string flows are unchanged (out of scope).
