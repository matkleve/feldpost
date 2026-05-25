# Route Session Cache Service

**Status:** Service contract  
**Code:** `apps/web/src/app/core/route-session-cache/`  
**Matrix:** [route-session-cache.md](../../system/route-session-cache.md)

## What It Is

Root-scoped generic storage and cross-shell invalidation dispatch for route revisit caches. Shell facades (`MediaPageStateService`, `MapSessionCacheService`) delegate `save` / `restore` / `invalidate` and register shell-specific handlers.

## Shell keys

| Key | Signature | Facade |
|-----|-----------|--------|
| `'media'` | `buildMediaGalleryQuerySignature(inputs)` | `MediaPageStateService` |
| `'map'` | `MAP_VIEWPORT_SIGNATURE` (`'__viewport__'`) | `MapSessionCacheService` |

## Policy dispatch

| `shellKey` | On upload (if entry exists) | On `mediaDeleted$` | On `mediaRestored$` |
|------------|----------------------------|--------------------|---------------------|
| `'media'` | `scheduleRevalidate` (400ms debounce) | Registered delete-patch handler | `invalidate('media')` |
| `'map'` | `invalidate('map')` | `invalidate('map')` | `invalidate('map')` |

Upload streams: `UploadManagerService` (`batchComplete$`, `imageUploaded$`, `imageReplaced$`, `imageAttached$`) with `auditTime(300)`.

## API

| Method | Purpose |
|--------|---------|
| `save(shellKey, signature, data)` | Store one entry per shell key |
| `restore(shellKey, signature)` | Return data on signature match, else `null` |
| `getEntry(shellKey)` | Raw entry for handlers |
| `invalidate(shellKey)` | Drop shell entry |
| `invalidateAll()` | Logout / clear all |
| `registerRevalidateHandler(shellKey, fn)` | Shell fetch + rewrite (media) |
| `scheduleRevalidate(shellKey, signature)` | Debounced revalidate |
| `registerDeletePatchHandler(shellKey, fn)` | Partial delete (media) |

`revalidating` signal reflects in-flight revalidate for any shell.

## Lifecycle / eager construction

**Mitigation: Option A (guards).**

All services use `providedIn: 'root'` (lazy until first injection). `RouteSessionCacheService` may construct on first `/map` visit before `MediaPageStateService` registers handlers.

- `scheduleRevalidate` and delete-patch dispatch run only when a handler is registered for that `shellKey`.
- Media upload policy also requires `getEntry('media')`.
- `MediaPageStateService` must register handlers synchronously at the start of its constructor (before any `await`).

A `'media'` entry is only written via `MediaPageStateService.writeCache` after `/media` mounts, so handlers precede real media cache data in normal flows.

## Acceptance

- [x] Generic spec tests cover handler-not-registered and upload/map policy paths (`route-session-cache.service.spec.ts`).
- [x] Facade behavior unchanged from shell perspective (delegation only; `media-page-state` / `map-session-cache` specs pass).
