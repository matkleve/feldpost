# media-locations (core service module)

**What it does (short):** Loads and saves **multiple address rows per media item** in Postgres (`media_item_locations`). One row can be **primary**; that row is mirrored onto legacy `media_items` columns for map/search compatibility.

**UI it connects to:**

| UI | Role |
| --- | --- |
| `app-media-detail-location-section` | Workspace pane → Media detail → **Location** block |
| `app-media-location-add-search` | Top row: add/search address (4-zone dropdown) |
| `app-media-location-row` | One saved address per row (edit, copy, map GPS, delete) |
| `MediaDetailViewComponent` | Orchestrator: loads list, calls this service, refreshes `media()` after primary changes |
| `MapShellComponent` | Map pick with `locationRowId` → `updateFromCoordinates` on a specific row |

**Not used for:** Upload panel location pick (still uses `MediaLocationUpdateService` + `media_items` until migrated).

## Structure

```
media-locations/
├── README.md                          ← you are here
├── media-locations.types.ts           ← DTOs matching DB/RPC rows
├── media-locations.helpers.ts           ← display line, list filter, RPC error text
├── media-locations.helpers.spec.ts
├── media-locations.service.ts           ← facade (inject this from components)
└── adapters/
    └── supabase-media-locations.adapter.ts  ← RPC only; no direct table writes
```

## Database (source of truth)

- Table: `public.media_item_locations` — migration `supabase/migrations/20260522120000_media_item_locations.sql`
- RPCs: `list_*`, `add_*`, `update_*`, `delete_*`, `set_primary_*`
- Spec: `docs/specs/service/media-locations/media-locations-service.md`
- UI spec: `docs/specs/ui/media-detail/media-detail-location-section.md`

## Related legacy module

- `core/media-location-update/` — still updates **`media_items`** via `resolve_media_location` (single-location era). Multi-location detail should prefer **this** module; primary row projection keeps `media_items` in sync.

## Data flow (detail panel)

```
MediaDetailViewComponent
  ├─ loadMedia() → dataFacade (media_items row)
  ├─ reloadLocations() → MediaLocationsService.listForMedia()
  └─ user actions → add/update/delete/setPrimary → RPC → refreshMediaAfterLocationMutation()
        └─ dataFacade.refreshMediaLocationFields()  (legacy columns from primary row)

MapShell (change GPS on row)
  └─ MediaLocationsService.updateFromCoordinates(locationRowId)
  └─ MediaDetailLocationSyncService.notifyCoordinatesUpdated(..., locationRowId)
```
