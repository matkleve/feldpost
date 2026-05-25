# Route session cache (invalidation matrix)

Cross-cutting contract for shell revisit caches. Product vocabulary: **media** (not legacy “image” rows in new code).

| Event | Media (`MediaPageStateService`) | Map (`MapSessionCacheService`) |
|-------|--------------------------------|--------------------------------|
| Upload / replace / attach (any shell) | Debounced revalidate via root `UploadManagerService` | `invalidate()` — next visit refetches viewport |
| Delete / restore undo | Remove ids from snapshot; restore → invalidate | `invalidate()` on upload; delete wiring via map shell reconcile |
| Filter / sort / group / project scope | New `querySignature` → cache miss | N/A (viewport-driven) |
| Logout | `clearAll()` | `invalidate()` |
| Settings open/close only | No op | No op |

## Services

- [`media-page-state-service.md`](../service/media-page-state/media-page-state-service.md)
- Code: `apps/web/src/app/core/media-page-state/`, `apps/web/src/app/core/map-session-cache/`

## Map revisit

Leaflet re-inits each visit; cache skips viewport RPC when bounds/zoom still match. **`map.invalidateSize()`** after restore is mandatory (pane resize while destroyed).
