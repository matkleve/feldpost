# Route session cache (invalidation matrix)

Cross-cutting contract for shell revisit caches. Product vocabulary: **media** (not legacy “image” rows in new code).

| Event | Media (`MediaPageStateService`) | Map (`MapSessionCacheService` + live shell) |
|-------|--------------------------------|--------------------------------|
| `imageUploaded$` (any shell) | Incremental patch when allowed; else debounced full revalidate | `invalidate()` + live `MapShellComponent` runs `queryViewportMarkers()` via `shellInvalidated$('map')` while hidden |
| `batchComplete$` / `imageReplaced$` / `imageAttached$` | Debounced full revalidate | `invalidate()` + hidden map refresh as above |
| Delete / restore undo | Remove ids from snapshot; restore → invalidate | `invalidate()` |
| Filter / sort / group / project scope | New `querySignature` → cache miss | N/A (viewport-driven) |
| Logout | `RouteSessionCacheService.invalidateAll()` | Same (all shells) |
| Settings open/close only | No op | No op |

## Services

- [`route-session-cache-service.md`](../service/route-session-cache/route-session-cache-service.md) — shared storage + policy dispatch
- [`media-page-state-service.md`](../service/media-page-state/media-page-state-service.md) — `/media` facade (delegates storage)
- Code: `apps/web/src/app/core/route-session-cache/`, `apps/web/src/app/core/media-page-state/`, `apps/web/src/app/core/map-session-cache/`

## Map revisit

`MapShellComponent` stays mounted under `AuthenticatedAppLayoutComponent` (hidden on `/media` / `/projects` via `visibility: hidden`; visible on map routes). Leaflet is not destroyed on shell switch; **`map.invalidateSize()`** on show and after cache restore. Session cache still skips viewport RPC when bounds/zoom match and live markers are empty; restore suppresses marker fade-in (see map-shell reconcile facade). On `invalidate('map')`, hidden shell refreshes markers in the background.
