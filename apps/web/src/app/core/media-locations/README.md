# media-locations (core service module)

**What it does:** Loads and saves **multiple org-scoped locations per media item** via `locations` + `media_item_location_links`. List order (`sort_order`) defines which row hydrates detail title / legacy `ImageRecord` address fields (`displayLocationFromRows`).

**UI it connects to:**

| UI | Role |
| --- | --- |
| `app-media-detail-location-section` | Workspace pane → Media detail → **Location** block |
| `app-media-location-add-search` | Top row: add/search address (4-zone dropdown) |
| `app-media-location-row` | One linked location per row (edit, copy, map GPS, delete) |
| `MediaDetailViewComponent` | Orchestrator: list load, mutations, `refreshMediaAfterLocationMutation` |
| `MapShellComponent` | Map pick with `locationRowId` → row-scoped update |

**Upload / whole-item resolve:** `core/media-location-update/` (`resolve_media_location` + `link_media_to_location`).

**Row “Change to different address”:** `replaceMediaItemLocationLink` → `unlink_media_from_location` + `find_or_create_location` + `link_media_to_location` (adapter; not `update_media_item_location` on the old row).

## Structure

```
media-locations/
├── README.md
├── media-locations.types.ts
├── media-locations.helpers.ts
├── media-locations-batch.helpers.ts
├── media-locations.service.ts
└── adapters/
    └── supabase-media-locations.adapter.ts
```

## Database (source of truth)

- Tables: `public.locations`, `public.media_item_location_links`
- Migrations: `20260524120000_locations_nn_junction.sql`, `20260525130000_drop_media_items_location_columns.sql`
- Spec: `docs/specs/service/media-locations/media-locations-service.md`

## Data flow (detail panel)

```
MediaDetailViewComponent
  ├─ loadMedia() → dataFacade (media_items + enrichWithPrimaryLocation)
  ├─ reloadLocations() → MediaLocationsService.listForMedia()
  └─ mutations → RPC → refreshMediaAfterLocationMutation()
        └─ re-list links; merge first row into media() display fields
```
