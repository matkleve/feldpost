# Media Page State Service

**Status:** Service contract  
**Code:** `apps/web/src/app/core/media-page-state/`  
**Page:** [media-page.md](../../page/media-page.md)

## What It Is

Root-scoped **facade** for the `/media` gallery: one `WorkspaceMedia[]` snapshot per `querySignature` (user, project filter, sorts, groupings, filter rules). Storage and cross-shell event dispatch are delegated to [`RouteSessionCacheService`](route-session-cache-service.md) (`shellKey: 'media'`).

## Upload invalidation (cross-shell)

`RouteSessionCacheService` dispatches upload events; this facade registers the revalidate handler and performs `MediaQueryService` fetch:

| Stream | Policy |
|--------|--------|
| `batchComplete$` | Debounced revalidate for active cache signature |
| `imageUploaded$` | Same |
| `imageReplaced$` | Same |
| `imageAttached$` | Same |

Uploads on `/map` (or any shell) update or refresh cache **before** the user returns to `/media`, so a cache hit is not stale.

Debounce: ~400ms; `revalidating` (from route cache) prevents parallel revalidates for the same signature.

## Delete / auth

| Stream | Policy |
|--------|--------|
| `MediaDeleteUndoService.mediaDeleted$` | Remove ids from cached snapshot |
| `MediaDeleteUndoService.mediaRestored$` | Invalidate cache (safe miss) |
| `AuthService.session` → null | `RouteSessionCacheService.invalidateAll()` (all shells) |

## API

| Method | Purpose |
|--------|---------|
| `lookup(inputs)` | Cache hit/miss for current query |
| `writeCache(inputs, mediaItems)` | Store snapshot after load |
| `scheduleRevalidate(inputs)` | Background refresh (debounced) |
| `invalidateActiveCache()` | Force miss for current media shell key |
| `revalidating` | Readonly signal while background revalidate runs |

## Acceptance

- [x] Cross-shell upload → revalidate without `MediaComponent` mounted (`media-page-state.service.spec.ts`).
- [x] `MediaComponent` cache-first wiring with upload invalidation verified.
