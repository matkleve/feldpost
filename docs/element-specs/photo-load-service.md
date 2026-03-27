# Photo Load Service

> **Related specs:** [media-renderer-system](media-renderer-system.md), [photo-marker](photo-marker.md), [thumbnail-card](thumbnail-card.md), [image-detail-photo-viewer](image-detail-photo-viewer.md), [image-detail-view](image-detail-view.md)
> **Use cases:** [use-cases/photo-loading.md](../use-cases/photo-loading.md)

## What It Is

A centralized Angular service that owns all photo signed-URL generation, caching, preloading, and loading-state management. Every surface that displays a photo (map markers, thumbnail cards, detail view, lightbox) uses this service instead of calling Supabase Storage directly. It replaces the scattered signing logic currently duplicated across `WorkspaceViewService`, `MapShellComponent`, and `ImageDetailViewComponent`.

## What It Looks Like

Not a visual element — this is a headless service. However, it standardizes the visual loading states that consumers render:

- **`idle`** — no URL requested yet; consumer shows nothing or a static placeholder
- **`loading`** — signed URL requested or `<img>` downloading; consumer shows pulsing placeholder (gradient + camera icon, 1400ms ease-in-out)
- **`loaded`** — image ready to display; consumer fades in the `<img>` (200ms)
- **`error`** — signing or download failed; consumer shows static no-photo icon (crossed-out image, 0.55 opacity)
- **`no-photo`** — `storage_path IS NULL`; consumer shows upload prompt or permanent no-photo icon immediately (no loading phase)

The service provides a canonical SVG icon data-URI for both the camera placeholder and the no-photo icon so every consumer renders an identical visual.

### Load-State Machine

```mermaid
stateDiagram-v2
    [*] --> idle : getLoadState() called

    state hasPhoto <<choice>>
    idle --> hasPhoto : getSignedUrl() / batchSign()
    hasPhoto --> no_photo : storage_path IS NULL
    hasPhoto --> loading : storage_path exists

    loading --> loaded : signed URL received + preload succeeds
    loading --> error : signing fails or preload onerror

    error --> loading : invalidate() → re-sign
    loaded --> loading : invalidate() → re-sign

    no_photo --> loading : setLocalUrl() (imageAttached$)
    loaded --> loaded : setLocalUrl() (replaces URL in-place)
    loading --> loaded : setLocalUrl() (blob loads ~0ms)

    loaded --> idle : revokeLocalUrl() (cache cleared)
```

## Where It Lives

- **Scope**: `providedIn: 'root'` singleton
- **File**: `core/photo-load.service.ts`
- **Used by**: `MapShellComponent`, `WorkspaceViewService`, `ThumbnailCardComponent`, `ImageDetailViewComponent`, `PhotoLightboxComponent`, `marker-factory.ts`

## Actions

| #   | Consumer calls                    | Service response                                                                                                      | Returns / emits                         |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | `getSignedUrl(storagePath, size)` | Checks cache → if valid, returns cached URL; else signs via Supabase Storage with size-appropriate transform          | `Promise<SignedUrlResult>`              |
| 2   | `batchSign(items[], size)`        | Groups items by thumbnail-path vs storage-path; batch-signs where possible, individual-signs with transform otherwise | `Promise<Map<string, SignedUrlResult>>` |
| 3   | `getLoadState(imageId, size)`     | Returns a readonly signal tracking the current `PhotoLoadState` for this image+size pair                              | `Signal<PhotoLoadState>`                |
| 4   | `preload(url)`                    | Creates a hidden `Image()` element, resolves when loaded or rejects on error                                          | `Promise<boolean>`                      |
| 5   | `invalidate(imageId)`             | Clears all cached URLs for this image (all sizes); next `getSignedUrl` will re-sign                                   | `void`                                  |
| 6   | `invalidateStale(maxAgeMs)`       | Clears entries older than `maxAgeMs`; called on interval or before batch operations                                   | `number` (entries cleared)              |
| 7   | `setLocalUrl(imageId, blobUrl)`   | Injects a local `ObjectURL` (from upload) into the cache at all sizes — loads in ~0ms, no network                     | `void`                                  |
| 8   | `revokeLocalUrl(imageId)`         | Calls `URL.revokeObjectURL` on the cached blob and clears it; next access re-signs from storage                       | `void`                                  |

### Event Streams

| #   | Observable       | Payload                                                       | Fires when                                                                  |
| --- | ---------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 9   | `urlChanged$`    | `{ imageId: string, size: PhotoSize, url: string }`           | A new signed URL or local blob URL is set for any image+size pair           |
| 10  | `stateChanged$`  | `{ imageId: string, size: PhotoSize, state: PhotoLoadState }` | Any `PhotoLoadState` transition occurs (idle→loading, loading→loaded, etc.) |
| 11  | `batchComplete$` | `{ imageIds: string[], size: PhotoSize }`                     | A `batchSign()` call finishes (success or partial failure)                  |

## Component Hierarchy

Not applicable — headless service. No template or DOM.

## State

| Name                  | Type                                          | Default     | Controls                                                   |
| --------------------- | --------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `cache`               | `Map<string, CacheEntry>`                     | empty       | Stores signed URLs keyed by `${imageId}:${size}`           |
| `loadStates`          | `Map<string, WritableSignal<PhotoLoadState>>` | empty       | Per image+size loading state; consumers read these signals |
| `STALE_THRESHOLD_MS`  | `number`                                      | `3_000_000` | 50 minutes — matches current map-shell staleness window    |
| `SIGN_EXPIRY_SECONDS` | `number`                                      | `3600`      | Supabase signed URL TTL                                    |

## File Map

| File                              | Purpose                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `core/photo-load.service.ts`      | Service: signing, caching, state management, preloading                                        |
| `core/photo-load.service.spec.ts` | Unit tests                                                                                     |
| `core/photo-load.model.ts`        | Shared types: `PhotoLoadState`, `PhotoSize`, `CacheEntry`, `SignedUrlResult`, event interfaces |

## Wiring

### Consumer Integration Overview

```mermaid
flowchart LR
    PLS[PhotoLoadService]
    SB[(Supabase Storage)]

    PLS -- "createSignedUrl /<br/>createSignedUrls" --> SB

    MS[MapShellComponent] -- "getSignedUrl(path, marker)<br/>+ preload()" --> PLS
    WVS[WorkspaceViewService] -- "batchSign(images, thumb)" --> PLS
    IDV[ImageDetailViewComponent] -- "getSignedUrl(path, thumb)<br/>getSignedUrl(path, full)" --> PLS
    UMS[UploadManagerService] -- "setLocalUrl()<br/>revokeLocalUrl()" --> PLS

    MS -- "passes URL to" --> MF[marker-factory.ts]
    IDV -- "passes URL to" --> LB[PhotoLightboxComponent]
    WVS -- "updates rawImages →" --> TC[ThumbnailCardComponent]
```

### Detail View Progressive Loading via Service

```mermaid
sequenceDiagram
    actor User
    participant Detail as ImageDetailViewComponent
    participant PhotoLoad as PhotoLoadService
    participant Supabase as Supabase Storage

    User->>Detail: Open image detail
    Detail->>Detail: Check storage_path

    alt storage_path IS NULL
        Detail->>PhotoLoad: getLoadState(imageId, 'thumb')
        PhotoLoad-->>Detail: signal = 'no-photo'
        Note over Detail: Show upload prompt immediately
    else storage_path exists
        par Tier 2 (thumbnail)
            Detail->>PhotoLoad: getSignedUrl(thumbPath, 'thumb')
            PhotoLoad->>Supabase: createSignedUrl(thumbPath, 3600)
            Supabase-->>PhotoLoad: thumbUrl
            PhotoLoad-->>Detail: { url: thumbUrl }
            Note over Detail: Show blurred 256×256 thumbnail
        and Tier 3 (full-res)
            Detail->>PhotoLoad: getSignedUrl(storagePath, 'full')
            PhotoLoad->>Supabase: createSignedUrl(storagePath, 3600)
            Supabase-->>PhotoLoad: fullUrl
            PhotoLoad-->>Detail: { url: fullUrl }
        end
        Detail->>PhotoLoad: preload(fullUrl)
        PhotoLoad-->>Detail: true
        Note over Detail: Crossfade to sharp full-res image
    end
```

### Invalidation & Staleness

```mermaid
sequenceDiagram
    participant MapShell as MapShellComponent
    participant PhotoLoad as PhotoLoadService
    participant Cache

    Note over MapShell: User pans map → moveend fires
    MapShell->>PhotoLoad: invalidateStale(3_000_000)
    PhotoLoad->>Cache: Iterate all entries
    loop Each entry
        alt isLocal = true
            Note over Cache: Keep (blob URLs never stale)
        else age > 50 min
            PhotoLoad->>Cache: Delete entry
        else age ≤ 50 min
            Note over Cache: Keep
        end
    end
    PhotoLoad-->>MapShell: count of cleared entries

    MapShell->>PhotoLoad: getSignedUrl(path, 'marker')
    Note over PhotoLoad: Cleared entries re-sign on next access
```

### New consumers (inject service)

All components that currently sign URLs directly will `inject(PhotoLoadService)` and delegate to it:

- **`WorkspaceViewService`** — replace `batchSignThumbnails()` internals with `photoLoad.batchSign(images, 'thumb')`
- **`MapShellComponent`** — replace `lazyLoadThumbnail()` internals with `photoLoad.getSignedUrl(path, 'marker')` + `photoLoad.preload(url)`
- **`ImageDetailViewComponent`** — replace `loadSignedUrls()` with `photoLoad.getSignedUrl(path, 'thumb')` + `photoLoad.getSignedUrl(path, 'full')`
- **`PhotoLightboxComponent`** — receive URL from parent (no change), but parent uses service to sign
- **`marker-factory.ts`** — no direct injection (pure function), but receives pre-signed URLs from `MapShellComponent`

### Upload integration

- **`UploadManagerService`** — on `imageAttached$` / `imageReplaced$`, calls `photoLoad.setLocalUrl(imageId, blobUrl)` so every surface updates instantly
- After storage upload completes and next batch-sign runs, the local URL is replaced; service calls `revokeLocalUrl` to free memory

### Staleness management

- `MapShellComponent.maybeLoadThumbnails()` calls `photoLoad.invalidateStale(STALE_THRESHOLD_MS)` before re-signing visible markers
- Alternatively, the service can run an internal `setInterval` cleanup (implementation choice)

### Placeholder assets

The service exports two constants that consumers use for consistent visuals:

```typescript
/** Camera icon SVG data-URI — used in loading/idle placeholders */
export const PHOTO_PLACEHOLDER_ICON: string;

/** Crossed-out image SVG data-URI — used in error/no-photo placeholders */
export const PHOTO_NO_PHOTO_ICON: string;
```

These replace the inline SVG data-URIs currently duplicated in `thumbnail-card.component.scss`, `map-shell.component.scss`, and `image-detail-view.component.scss`.

### Before / After Architecture

```mermaid
flowchart TB
    subgraph BEFORE["Before — scattered signing"]
        direction TB
        MS1[MapShellComponent] -- direct --> SB1[(Supabase Storage)]
        WVS1[WorkspaceViewService] -- direct --> SB1
        IDV1[ImageDetailViewComponent] -- direct --> SB1
        Note1["Each manages its own cache,<br/>state signals, staleness,<br/>and placeholder icons"]
    end

    subgraph AFTER["After — centralized via PhotoLoadService"]
        direction TB
        MS2[MapShellComponent] --> PLS2[PhotoLoadService]
        WVS2[WorkspaceViewService] --> PLS2
        IDV2[ImageDetailViewComponent] --> PLS2
        UMS2[UploadManagerService] --> PLS2
        PLS2 -- "single point of<br/>contact" --> SB2[(Supabase Storage)]
        Note2["One cache, one state model,<br/>one set of placeholder icons,<br/>one staleness strategy"]
    end
```

## Acceptance Criteria

- [x] `getSignedUrl('path', 'marker')` returns a signed URL with `{ width: 80, height: 80, resize: 'cover' }` transform
- [x] `getSignedUrl('path', 'thumb')` returns a signed URL with `{ width: 256, height: 256, resize: 'cover' }` transform
- [x] `getSignedUrl('path', 'full')` returns a signed URL with no transform
- [x] Repeated calls for the same path+size within the staleness window return the cached URL without a new Supabase request
- [x] `batchSign()` uses `createSignedUrls` (batch) for items with `thumbnailPath`, individual `createSignedUrl` with transform for others
- [x] `getLoadState(imageId, size)` returns a signal that transitions: `idle` → `loading` → `loaded` or `error`
- [x] When `storage_path` is null, `getLoadState` returns a signal with value `no-photo` immediately — no network request
- [x] `preload(url)` resolves `true` when the image loads, `false` on error
- [x] `invalidate(imageId)` clears all size variants; next call re-signs
- [x] `invalidateStale(ms)` only clears entries older than the threshold
- [x] `setLocalUrl(imageId, blobUrl)` makes all sizes return the blob URL immediately
- [x] `revokeLocalUrl(imageId)` calls `URL.revokeObjectURL` and clears the cache entry
- [x] `PHOTO_PLACEHOLDER_ICON` and `PHOTO_NO_PHOTO_ICON` are valid SVG data-URIs identical to current placeholder icons
- [x] After integration, no component calls `supabase.client.storage.from('images').createSignedUrl` directly — all go through `PhotoLoadService`
- [x] `urlChanged$` emits `{ imageId, size, url }` whenever a signed URL or local blob is cached
- [x] `stateChanged$` emits on every `PhotoLoadState` transition (idle→loading, loading→loaded, etc.)
- [x] `batchComplete$` emits `{ imageIds[], size }` when `batchSign()` finishes
- [x] Signals are updated before events fire — both mechanisms stay in sync
- [x] All 4 surfaces (marker, thumbnail card, detail view, lightbox) render identical placeholder/error visuals
