# Media Item Map Action

> **Parent orchestration:** [media-item.md](media-item.md) → [media-item-quiet-actions.md](media-item-quiet-actions.md)  
> **Glossary / affordance table:** [media-locations.zoomable-map-contract.supplement.md](../../service/media-locations/media-locations.zoomable-map-contract.supplement.md) §1–§3  
> **Service:** [media-locations-service.md](../../service/media-locations/media-locations-service.md)

## What it is

Tile-level **map** quiet action: resolves **zoomable** links for one `media_item_id`, then either zooms immediately, opens a location picker (2–5), or opens picker with search (6+). Does not own selection or upload overlay.

## Where it lives

- **Code:** `apps/web/src/app/shared/media-item/media-item-map-action.component.ts`
- **Parent:** `app-media-item-quiet-actions` (map button delegates click here)

## Affordance behavior

Normative thresholds: [zoomable-map-contract supplement §3](../../service/media-locations/media-locations.zoomable-map-contract.supplement.md#3-tile-map-affordance-table-canonical). **Do not duplicate the table in this file.**

| Phase | Behavior |
| --- | --- |
| Click while `disabled` or `loading` | No-op |
| `resolveZoomTargets()` → length 0 | No-op (address-visible only) |
| length 1 | Emit `mapZoomRequested` immediately |
| length 2–5 | Open dropdown; user picks row → emit |
| length > `MAP_LOCATION_SEARCH_THRESHOLD` (5) | Dropdown includes search filter |

## Target resolution

1. `MediaLocationsService.listForMedia(mediaItemId)` (cache or RPC).
2. `locationsWithGps(result.rows)` — zoomable links only.
3. **Legacy fallback** (deprecated): paired `legacyLatitude` / `legacyLongitude` inputs when list empty and parent did not set `zoomable_location_count`; prefer batch count + list path.

Each target: `{ mediaId, lat, lng, locationId?, label }`.

## Outputs

| Output | Payload |
| --- | --- |
| `mapZoomRequested` | `{ mediaId, lat, lng, locationId? }` |

Parent bubbles to workspace / map shell `onZoomToLocation`.

## Parent gate (not owned here)

`MediaItemComponent.hasMapLocation` uses `mediaHasZoomableLocation(record)` → `zoomable_location_count > 0` when set. Map button `disabled` when gate false. See quiet-actions `mapDisabled` / `interactive-*-map-disabled` states.

## State (programmatic)

| State | Driver | Visual |
| --- | --- | --- |
| `idle` | default | Map icon |
| `loading` | `listForMedia` in flight | Suppress double-click |
| `picker_open` | 2+ targets | Dropdown shell |

Root may expose `[attr.data-state]` when FSM migration completes on quiet-actions parent.

## File map

| File | Purpose |
| --- | --- |
| `media-item-map-action.component.ts` | Target resolution + picker |
| `media-item-map-action.component.html` | Trigger + dropdown |
| `media-item-map-action.component.scss` | Geometry only |

## Acceptance criteria

- [x] 0 / 1 / 2–5 / 6+ behavior matches supplement §3
- [x] Targets from `locationsWithGps` only, not address-only rows
- [x] `MAP_LOCATION_SEARCH_THRESHOLD = 5` (search when more than five targets)
- [ ] Vitest: 0 / 1 / 2 / 6+ target branches (see plan Phase 2.2)
- [ ] After upload enrich + cache invalidate: batch `zoomable_location_count` === `locationsWithGps` length (integration — supplement §7)
