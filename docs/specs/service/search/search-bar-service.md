# Search Bar Service

## What It Is

Orchestrates **search bar** behavior: recent searches (local storage), **DB address + content** candidates, **geocoder** candidates via **`GeocodingService`**, ghost completion trie, coordinate detection, scoring/ranking, and diagnostic hooks. Heavy logic lives in colocated `search-*.ts` modules; this class is the **`providedIn: 'root'`** entry consumers inject.

## What It Looks Like

Floating search pill shows merged sections (recents, DB, places) per [search-bar](../../ui/search-bar/search-bar.md) UI spec. Typing streams through this service’s observable/query APIs.

## Where It Lives

- **Route:** map shell (primary), any host embedding `SearchBarComponent`
- **Runtime module:** `apps/web/src/app/core/search/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Load / persist recents | Read/write `feldpost-recent-searches` | `loadRecentSearches`, `persistRecentSearches` |
| 2 | Query DB + geocoder | Merged ranked candidates | internal resolvers + `GeocodingService.search` |
| 3 | Coordinate paste detection | Parsed lat/lng or null | `detectCoordinates` |
| 4 | Ghost trie | Prefix completion | `buildGhostTrie`, `queryGhostCompletion` |

## Component Hierarchy

```text
SearchBarService
|- search.models.ts, search-query.ts, search-bar-helpers.ts
|- search-bar-resolvers.ts (DB + geocoder fetch)
`- GeocodingService, SupabaseService
```

## Data

| Source | Notes |
| --- | --- |
| `media_items` address fields | DB address candidates |
| `projects` | Content candidates |
| Nominatim via Edge | Through `GeocodingService` |

## State

In-memory: ghost trie, context city cache, diagnostic toggles (see `search-debug.ts`).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/search/search-bar.service.ts` | Facade |
| `docs/specs/service/search/search-bar-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService`, `GeocodingService`

### UI specs

- [search-bar](../../ui/search-bar/search-bar.md), [search-bar-data-and-service](../../ui/search-bar/search-bar-data-and-service.md)

## Acceptance Criteria

- [ ] No direct Leaflet calls from this service (map intent goes to host components).
- [ ] Geocoder limits and viewbox options respect runtime config where applicable.
- [ ] Split non-normative algorithm prose into supplements if this file approaches lint line caps.
