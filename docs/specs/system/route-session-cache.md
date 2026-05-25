# Route session cache (invalidation matrix)

Cross-cutting contract for shell revisit caches. Product vocabulary: **media** (not legacy “image” rows in new code).

| Event | Media (`MediaPageStateService`) | Map (`MapSessionCacheService`) |
|-------|--------------------------------|--------------------------------|
| Upload / replace / attach (any shell) | Debounced revalidate via root `UploadManagerService` | `invalidate()` — next visit refetches viewport |
| Delete / restore undo | Remove ids from snapshot; restore → invalidate | `invalidate()` |
| Filter / sort / group / project scope | New `querySignature` → cache miss | N/A (viewport-driven) |
| Logout | `RouteSessionCacheService.invalidateAll()` | Same (all shells) |
| Settings open/close only | No op | No op |

## Services

- [`route-session-cache-service.md`](../service/route-session-cache/route-session-cache-service.md) — shared storage + policy dispatch
- [`media-page-state-service.md`](../service/media-page-state/media-page-state-service.md) — `/media` facade (delegates storage)
- Code: `apps/web/src/app/core/route-session-cache/`, `apps/web/src/app/core/media-page-state/`, `apps/web/src/app/core/map-session-cache/`

## Map revisit

Leaflet re-inits each visit; cache skips viewport RPC when bounds/zoom still match. **`map.invalidateSize()`** after restore is mandatory (pane resize while destroyed).
