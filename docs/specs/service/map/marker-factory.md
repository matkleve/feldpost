# Map marker HTML factory

## What It Is

Pure **Leaflet DivIcon HTML builder** for **media markers** on the map: CSS class assembly, thumbnail vs cluster count body, loading pulse, selection / linked-hover / correction / upload overlays. No DI — imported by map shell / marker layer code. Product term **media marker**; legacy CSS prefix **`map-photo-marker*`** per rename backlog.

## What It Looks Like

Rendered markers match [media-marker](../../ui/media-marker/media-marker.md) visual contract: square body, tail, cluster count, correction dot, pending upload ring.

## Where It Lives

- **Runtime module:** `apps/web/src/app/core/map/marker-factory.ts`
- **Consumers:** map shell marker refresh pipeline

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Map needs marker HTML | Returns HTML string for DivIcon | `buildPhotoMarkerHtml(options)` |
| 2 | Zoom tier | CSS class `map-photo-marker--zoom-{far\|mid\|near}` | `PhotoMarkerZoomLevel` |

## Component Hierarchy

```text
marker-factory.ts (pure functions + constants)
`- consumed by MapShell / marker layer (features/map)
```

## Data

None (options in only).

## State

None.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/map/marker-factory.ts` | HTML builder |
| `docs/specs/service/map/marker-factory.md` | This contract |

## Wiring

### Forbidden

- No Supabase or geocoder calls in this module.

## Acceptance Criteria

- [ ] Output HTML class names stay aligned with `media-marker` spec selectors.
- [ ] Icon size / anchor constants exported as `PHOTO_MARKER_ICON_*` until CSS rename backlog ships.
- [ ] Map marker spec links here for HTML structure ownership.
