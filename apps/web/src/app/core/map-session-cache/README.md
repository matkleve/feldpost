# map-session-cache

Last-viewport-only session cache for `MapShellComponent` (center, zoom, fetched bounds, viewport RPC rows).

Leaflet re-inits on each visit; cache avoids redundant viewport RPC when bounds still match.

Delegates storage and invalidation to `RouteSessionCacheService` (`shellKey: 'map'`, signature `MAP_VIEWPORT_SIGNATURE`).

@see docs/specs/system/route-session-cache.md
@see docs/specs/service/route-session-cache/route-session-cache-service.md
