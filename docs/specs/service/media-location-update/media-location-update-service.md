# Media Location Update Service

## What It Is

Persists **location and structured address fields** for an existing **`media_items`** row by calling RPC **`resolve_media_location`**. Combines **`GeocodingService`** (reverse fill) with explicit forward-geocode suggestions from the address resolver / search UI.

## What It Looks Like

Detail view and map correction flows show success or inline error string from **`MediaLocationUpdateResult`**. No UI in the service itself.

## Where It Lives

- **Route:** media detail, map correction, address picker flows
- **Runtime module:** `apps/web/src/app/core/media-location-update/`
- **Related:** [address-resolver](../location-resolver/address-resolver.md), [geocoding-service](../geocoding/geocoding-service.md)

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | User picks geocoder suggestion | RPC with lat/lng + structured fields | `updateFromAddressSuggestion(mediaId, suggestion)` |
| 2 | User drops pin / map coords | Reverse geocode then RPC | `updateFromCoordinates(mediaId, coords)` |

## Component Hierarchy

```text
MediaLocationUpdateService
|- GeocodingService (reverse)
`- SupabaseService → RPC resolve_media_location
```

## Data

| RPC | Fields |
| --- | --- |
| `resolve_media_location` | `p_media_item_id`, coordinates, address_label, city, district, street, country |

## State

None (async methods only).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/media-location-update/media-location-update.service.ts` | Facade |
| `docs/specs/service/media-location-update/media-location-update-service.md` | This contract |
| `docs/specs/service/media-location-update/README.md` | Status + RPC alignment notes |

## Wiring

### Injected services

- `SupabaseService`, `GeocodingService`

### Location status

- New writes follow canonical **`pending` \| `resolved` \| `unresolvable`** semantics per README in this folder.

## Acceptance Criteria

- [ ] All persists go through `resolve_media_location` RPC (no direct table updates from this facade).
- [ ] Reverse path supplies nullable structured fields when geocoder returns null.
- [ ] Errors surfaced as `{ ok: false, error }` without throwing.
