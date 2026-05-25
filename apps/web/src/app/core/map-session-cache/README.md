# map-session-cache

Last-viewport-only session cache for `MapShellComponent` (center, zoom, fetched bounds, viewport RPC rows).

Leaflet re-inits on each visit; cache avoids redundant viewport RPC when bounds still match.

Invalidated on upload (root `UploadManagerService`) and logout.

@see docs/specs/system/route-session-cache.md
