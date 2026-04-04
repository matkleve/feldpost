# Media Detail — Media Viewer

> **Parent spec:** [media-detail-view](media-detail-view.md)
> **Architecture parent:** [media-download-service](../media-download/media-download-service.md)
> **Media loading service (runtime class):** `apps/web/src/app/core/photo-load.service.ts`
> **Media loading use cases:** [use-cases/media-loading.md](../../use-cases/media-loading.md)
> **Media editing use cases:** [use-cases/image-editing.md](../../use-cases/image-editing.md) (IE-10)

## What It Is

The hero media preview area inside the Media Detail View. Handles progressive media loading (placeholder → thumbnail/preview → full-res), lightbox enlargement, and media replacement/upload for records without a media file. For document-like media and sufficiently large viewer slots, it can render generated first-page thumbnails through the same progressive pipeline before deterministic fallback. Delegates all signed-URL generation and load-state tracking to `PhotoLoadService`; delegates file uploads to `UploadManagerService`.
It uses the same `PhotoLoadService` cache namespace as map markers and `/media` tiles, so previously loaded media can be shown immediately without surface-local reload logic.

## What It Looks Like

A rounded-corner media surface (`--radius-lg`) centered with side margins (`--spacing-4`). Fixed to approximately **1/3 of viewport height** (`max-height: 33vh`), 4:3 aspect ratio. On hover, a subtle `--color-primary` ring appears. A replace-media edit-icon button sits in the **top-right corner**, overlaid with a semi-transparent dark scrim (`rgba(0,0,0,0.5)`), visible on hover (desktop) or always (touch). When `storage_path IS NULL`, an upload prompt/placeholder is shown instead.

## Where It Lives

- **Parent**: `MediaDetailViewComponent` — placed in MediaColumn (wide layout) or top of SingleColumnLayout (narrow)
- **Appears when**: Media detail view is open

## Actions

| #   | User Action                                             | System Response                                                                                                                                                                             | Triggers                        |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Clicks media preview                                    | Opens full-screen lightbox overlay (dark backdrop, `rgba(0,0,0,0.9)`). Media preview at `95vw / 95vh`, `object-fit: contain`. Close button (X) top-right.                                   | Lightbox opens                  |
| 2   | Clicks lightbox backdrop / X                            | Closes lightbox                                                                                                                                                                             | Lightbox closes                 |
| 3   | Presses Escape in lightbox                              | Closes lightbox                                                                                                                                                                             | Lightbox closes                 |
| 4   | Clicks replace-media button                             | Opens file picker; delegates to `uploadManager.replaceFile(mediaId, file)`                                                                                                                  | `replacing` → true              |
| 5   | Replace upload succeeds                                 | `imageReplaced$` fires → `UploadManagerService` calls `photoLoad.setLocalUrl(mediaId, blobUrl)` → all surfaces see new media instantly → service re-signs on next access                    | `replacing` → false             |
| 6   | Replace upload fails                                    | Inline error below media surface; no DB/storage changes                                                                                                                                     | `replaceError` set              |
| 7   | Clicks upload button (no media)                         | Opens file picker; delegates to `uploadManager.attachFile(mediaId, file)`                                                                                                                   | Attach pipeline starts          |
| 8   | Attach upload succeeds                                  | `imageAttached$` fires → `UploadManagerService` calls `photoLoad.setLocalUrl(mediaId, blobUrl)` → switches from upload placeholder to media display                                         | Media display shown             |
| 9   | Right-clicks detail thumbnail                           | Opens the same detail context action menu as the header 3-dot trigger                                                                                                                       | Detail context menu             |
| 10  | Same media was loaded by marker or `/media`             | Detail viewer reuses cached URL tier immediately (warm preview or sharp), then upgrades in background when needed                                                                           | Shared `PhotoLoadService` cache |
| 11  | Opens document detail with generated first-page preview | Viewer requests signed preview URL from `document_preview_path` through `PhotoLoadService`, shows preview when available, then keeps cache/tier-upgrade behavior consistent across surfaces | Document preview pipeline       |

## Component Hierarchy

```
MediaViewer                                ← object-fit: contain, background: #111
├── [not loaded] Placeholder               ← neutral surface placeholder
├── [tier 2] ThumbnailPreview              ← 256×256 signed URL (blurred via CSS filter)
├── [tier 3] FullResPreview                ← original res, crossfades over thumbnail
├── [hover / touch] ReplaceMediaButton     ← edit icon, scrim overlay, top-right
├── [no storage_path] UploadPrompt         ← Placeholder with file picker button
└── [lightbox open] LightboxOverlay        ← fixed, dark backdrop, z-modal
    ├── FullResPreview                     ← 95vw / 95vh, object-fit: contain
    └── CloseButton (X)                    ← top-right
```

## State Machine

Load-state tracking is delegated to `PhotoLoadService`. The component reads `photoLoad.getLoadState(mediaId, size)` signals and maps them to visual tiers.

```mermaid
stateDiagram-v2
    [*] --> CheckStoragePath : Component init

    state check <<choice>>
    CheckStoragePath --> check
    check --> NoMediaReady : storage_path IS NULL (photoLoad returns 'no-photo')
    check --> LoadingState : storage_path exists

    state NoMediaReady {
        [*] --> UploadPrompt
        UploadPrompt : PHOTO_NO_PHOTO_ICON + file picker button
        UploadPrompt : No loading spinner, no network requests
        UploadPrompt : View is fully resolved immediately
        UploadPrompt --> Attaching : User selects file
        Attaching : Delegated to UploadManagerService
        Attaching --> UploadPrompt : Attach fails
    }

    NoMediaReady --> LoadingState : photoLoad.setLocalUrl() (imageAttached$)

    state LoadingState {
        [*] --> CSSPlaceholder
        CSSPlaceholder : neutral placeholder surface (optional media icon)
        CSSPlaceholder : photoLoad.getLoadState(id, 'thumb') = 'loading'
        CSSPlaceholder --> ThumbnailLoaded : thumbState = 'loaded'
        ThumbnailLoaded : Blurred 256×256 from photoLoad
        ThumbnailLoaded --> FullResLoaded : fullState = 'loaded'
        FullResLoaded : Sharp full-res preview
        CSSPlaceholder --> ErrorState : thumbState = 'error' AND fullState = 'error'
        ThumbnailLoaded --> ThumbnailFallback : fullState = 'error'
    }

    state ErrorState {
        [*] --> BrokenImage
        BrokenImage : PHOTO_NO_PHOTO_ICON + alt="Media unavailable"
    }

    LoadingState --> Replacing : User clicks Replace media
    state Replacing {
        [*] --> Uploading
        Uploading : Progress from uploadManager.jobs()
    }
    Replacing --> LoadingState : photoLoad.setLocalUrl() (imageReplaced$)
    Replacing --> LoadingState : Replace fails (original media stays)
```

### No-Media Fast Path

When `storage_path IS NULL`, the MediaViewer **immediately** enters the `NoMediaReady` state:

- No CSS loading placeholder is shown
- No signed URL requests are made
- No loading spinner or "Loading…" text appears
- The upload prompt is the **final resolved state** — not a loading intermediate
- The parent detail-view loading signal is `false` as soon as the record fetch completes

This prevents records without media from appearing stuck in a perpetual loading state.

## Progressive Media Loading

Three-tier strategy to show content as fast as possible, fully delegated to `PhotoLoadService`. **Only invoked when `storage_path` exists.** When `storage_path IS NULL`, `photoLoad.getLoadState()` returns `'no-photo'` immediately and the component shows the upload prompt (see [No-Media Fast Path](#no-media-fast-path) above).

Adaptive tier policy: the component measures the active viewer slot, converts dimensions to `rem`, and forwards them to `MediaOrchestratorService.selectRequestedTierForSlot(...)` to derive the requested tier for this render cycle. Service logic remains UI-agnostic and must not access DOM directly.

1. **Check** → `photoLoad.getLoadState(mediaId, 'thumb')` returns `'no-photo'` → skip to upload prompt
2. **Warm cache lookup** → `photoLoad.getBestCachedUrl(mediaId, requestedTier)`; if found, render immediately as warm preview
3. **View opens with media and no cache hit** → neutral CSS placeholder shown (no network)
4. **Tier 2** → `photoLoad.getSignedUrl(thumbPath, 'thumb')` → service returns cached or freshly signed URL
5. Thumbnail `<img>` loads → replaces placeholder with slight blur filter
6. **Tier 3** → `photoLoad.getSignedUrl(storagePath, 'full')` → service returns full-res URL
7. `photoLoad.preload(fullUrl)` → hidden preload → crossfade swaps it in
8. If Tier 3 fails (`fullState = 'error'`), Tier 2 remains visible (adequate quality for metadata editing)
9. If both fail, `PHOTO_NO_PHOTO_ICON` shown with `alt="Media unavailable"`

```mermaid
stateDiagram-v2
    [*] --> CheckMedia : View opens

    state hasMedia <<choice>>
    CheckMedia --> hasMedia
    hasMedia --> UploadPrompt : photoLoad.getLoadState() = 'no-photo'
    hasMedia --> Placeholder : storage_path exists

    state UploadPrompt {
        [*] --> NoMediaReady
        NoMediaReady : PHOTO_NO_PHOTO_ICON + file picker button
        NoMediaReady : Fully resolved — no loading state
    }

    state Placeholder {
        [*] --> CSSGradient
        CSSGradient : neutral placeholder surface
        CSSGradient : photoLoad.getLoadState(id, 'thumb') = 'loading'
    }

    Placeholder --> Tier2 : thumbState = 'loaded'
    state Tier2 {
        [*] --> BlurredThumb
        BlurredThumb : photoLoad.getSignedUrl(thumbPath, 'thumb')
        BlurredThumb : CSS blur filter applied
    }

    Tier2 --> Tier3 : fullState = 'loaded' + preload succeeds
    state Tier3 {
        [*] --> Crossfade
        Crossfade : photoLoad.getSignedUrl(storagePath, 'full')
        Crossfade --> FullRes
        FullRes : Sharp preview displayed
    }

    Tier2 --> Tier2Fallback : fullState = 'error'
    state Tier2Fallback {
        [*] --> ThumbStays
        ThumbStays : Blurred thumbnail remains
        ThumbStays : Adequate for metadata editing
    }

    Placeholder --> Unavailable : thumbState = 'error' AND fullState = 'error'
    state Unavailable {
        [*] --> ErrorPlaceholder
        ErrorPlaceholder : PHOTO_NO_PHOTO_ICON + alt="Media unavailable"
    }

    UploadPrompt --> Placeholder : photoLoad.setLocalUrl() via imageAttached$
```

### Signed URL Strategy (via PhotoLoadService)

The component never calls Supabase Storage directly. All signing is delegated to `PhotoLoadService`:

- **Document preview path:** for eligible document-like media, viewer resolves `document_preview_path` first (when present) and signs via `photoLoad.getSignedUrl(document_preview_path, tier)` using the same cache namespace as other media
- **Tier 2:** `photoLoad.getSignedUrl(thumbnail_path ?? storage_path, 'thumb')` → service applies `{ width: 256, height: 256, resize: 'cover' }` transform
- **Tier 3:** `photoLoad.getSignedUrl(storage_path, 'full')` → service returns original resolution (no transform)
- **Preload:** `photoLoad.preload(fullUrl)` → hidden `Image()` element confirms download before crossfade
- **Caching:** Service handles cache lookup, staleness (50 min threshold), and re-signing — component does not manage URL expiry

### Replace Media — Loading Restart

When `imageReplaced$` fires:

1. `UploadManagerService` calls `photoLoad.setLocalUrl(mediaId, blobUrl)` → blob URL injected into service cache at all sizes → all surfaces see the new media instantly (~0ms)
2. Component reads `photoLoad.getLoadState(mediaId, 'thumb')` / `photoLoad.getLoadState(mediaId, 'full')` — both show `'loaded'` (blob URL)
3. On next access, `photoLoad.invalidate(mediaId)` clears blob → service re-signs Tier 2 and Tier 3 from new `storagePath`
4. `photoLoad.revokeLocalUrl(mediaId)` frees the `ObjectURL` memory
5. Seamless transition — no visible flash between blob and signed URL

```mermaid
sequenceDiagram
    actor User
    participant Viewer as MediaViewerComponent
    participant Picker as File Picker
    participant Upload as UploadService
    participant Manager as UploadManagerService
    participant PhotoLoad as PhotoLoadService
    participant Storage as Supabase Storage

    User->>Viewer: Click replace-media button
    Viewer->>Upload: validateFile(file)
    alt Invalid file
        Upload-->>Viewer: Validation error
        Viewer->>Viewer: Show inline error below media preview
    else Valid file
        Viewer->>Picker: Open native file picker
        User->>Picker: Select file
        Picker-->>Viewer: File selected
        Viewer->>Manager: replaceFile(mediaId, file)
        Note over Viewer: replacing = true
        Manager->>Storage: Upload new file
        alt Upload succeeds
            Manager->>PhotoLoad: setLocalUrl(mediaId, blobUrl)
            PhotoLoad->>PhotoLoad: Cache blobUrl for all sizes, loadState → 'loaded'
            Note over Viewer: All surfaces see new media instantly (~0ms)
            Manager-->>Viewer: imageReplaced$ {mediaId, newStoragePath}
            Note over Viewer: replacing = false
            Note over PhotoLoad: Next getSignedUrl() call:
            PhotoLoad->>PhotoLoad: revokeLocalUrl(mediaId)
            PhotoLoad->>Storage: createSignedUrl(newStoragePath, 3600, {transform: 256×256})
            Storage-->>PhotoLoad: tier2Url (cached)
            PhotoLoad->>Storage: createSignedUrl(newStoragePath, 3600)
            Storage-->>PhotoLoad: tier3Url (cached)
            Note over Viewer: Seamless transition — no visible flash
        else Upload fails
            Manager-->>Viewer: Error
            Viewer->>Viewer: replaceError = message
            Note over Viewer: replacing = false, original media unchanged
        end
    end
```

### Attach Media — Placeholder to Media

When `imageAttached$` fires:

1. `UploadManagerService` calls `photoLoad.setLocalUrl(mediaId, blobUrl)` → blob URL injected at all sizes, `loadState` → `'loaded'`
2. Component detects state transition from `'no-photo'` → `'loaded'` → switches from upload prompt to media display
3. All surfaces see the new media instantly via the service's shared cache
4. On next access, service re-signs from new `storagePath` and calls `revokeLocalUrl()` to free memory

```mermaid
sequenceDiagram
    actor User
    participant Viewer as MediaViewerComponent
    participant Upload as UploadService
    participant Manager as UploadManagerService
    participant PhotoLoad as PhotoLoadService
    participant Storage as Supabase Storage

    Note over Viewer: photoLoad.getLoadState(id, 'thumb') = 'no-photo' → showing UploadPrompt
    User->>Viewer: Click upload button on placeholder
    Viewer->>Upload: validateFile(file)
    Viewer->>Manager: attachFile(mediaId, file)
    Manager->>Storage: Upload file + update row
    alt Attach succeeds
        Manager->>PhotoLoad: setLocalUrl(mediaId, blobUrl)
        PhotoLoad->>PhotoLoad: Cache blobUrl for all sizes, loadState → 'loaded'
        Manager-->>Viewer: imageAttached$ {mediaId, newStoragePath}
        Note over Viewer: loadState signal transitions 'no-photo' → 'loaded'
        Note over Viewer: Upload placeholder vanishes, real media preview appears (~0ms)
        Note over PhotoLoad: Next getSignedUrl() call:
        PhotoLoad->>PhotoLoad: revokeLocalUrl(mediaId)
        PhotoLoad->>Storage: createSignedUrl(newStoragePath, 3600, {transform: 256×256})
        Storage-->>PhotoLoad: tier2Url (cached)
        PhotoLoad->>Storage: createSignedUrl(newStoragePath, 3600)
        Storage-->>PhotoLoad: tier3Url (cached)
        Note over Viewer: Seamless transition — no visible flash
    else Attach fails
        Manager-->>Viewer: Error
        Viewer->>Viewer: Show inline error, stay on UploadPrompt
    end
```

> See [PL-7 / PL-8](../../use-cases/media-loading.md#pl-7-replace-photo--loading-state-reset) for detailed sequence diagrams.

## MediaViewer Sizing

| Layout | Rule                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------------- |
| Wide   | `height: 100%`, `max-height: calc(100vh - 60px)`, `object-fit: contain`, `background: #111` (letterbox) |
| Narrow | `width: 100%`, `max-height: 55vw`, `object-fit: contain`                                                |

## Lightbox

```mermaid
stateDiagram-v2
    [*] --> MediaDisplay : Component init

    state MediaDisplay {
        [*] --> HeroVisible
        HeroVisible : Media preview shown with hover overlay
        HeroVisible : ReplaceMediaButton visible on hover/touch
    }

    MediaDisplay --> LightboxOpen : User clicks media preview

    state LightboxOpen {
        [*] --> FullScreen
        FullScreen : Fixed overlay, z-modal
        FullScreen : Dark backdrop rgba(0,0,0,0.9)
        FullScreen : Media preview at 95vw / 95vh, object-fit contain
        FullScreen : Close button (X) top-right
    }

    LightboxOpen --> MediaDisplay : Click backdrop
    LightboxOpen --> MediaDisplay : Click X button
    LightboxOpen --> MediaDisplay : Press Escape
```

## State

| Name                      | Type                     | Default | Controls                                                                           |
| ------------------------- | ------------------------ | ------- | ---------------------------------------------------------------------------------- |
| `thumbState`              | `Signal<PhotoLoadState>` | —       | Read from `photoLoad.getLoadState(mediaId, 'thumb')` — drives placeholder/thumb    |
| `fullState`               | `Signal<PhotoLoadState>` | —       | Read from `photoLoad.getLoadState(mediaId, 'full')` — drives full-res crossfade    |
| `lightboxOpen`            | `boolean`                | `false` | Whether lightbox overlay is visible                                                |
| `replacing`               | `boolean`                | `false` | Whether a replace operation is in progress                                         |
| `replaceError`            | `string \| null`         | `null`  | Error message if replace failed                                                    |
| `documentPreviewEligible` | `boolean`                | `false` | Whether viewer slot size and file type allow first-page document preview rendering |

> **Removed:** `fullResLoaded`, `thumbLoaded`, `heroSrc` — replaced by `PhotoLoadState` signals from `PhotoLoadService`. The component no longer manages signed URLs or loading booleans directly.

## Wiring

### Wiring Flow (Mermaid)

```mermaid
sequenceDiagram
  participant P as Parent
  participant C as Component
  participant S as Service
  P->>C: Provide inputs and bindings
  C->>S: Request data or action
  S-->>C: Return updates
  C-->>P: Emit outputs/events
```

- Injects `PhotoLoadService` — calls `getSignedUrl(path, 'thumb')`, `getSignedUrl(path, 'full')`, `preload(url)`, and reads `getLoadState(mediaId, size)` signals. **Does not call Supabase Storage directly.**
- For document-like media with generated first-page preview, resolves `document_preview_path` first and signs through the same `PhotoLoadService` tier/cache flow used by other media paths.
- Uses `PHOTO_NO_PHOTO_ICON` as canonical error/no-media visual and may use `PHOTO_PLACEHOLDER_ICON` as optional loading glyph; neutral media placeholder remains valid baseline.
- Injects `UploadManagerService` — calls `replaceFile()` or `attachFile()`. Does **not** manage upload lifecycle directly.
- Injects `UploadService` for file validation (`validateFile()`) and MIME type constants.
- Subscribes to `imageReplaced$` / `imageAttached$` to detect state transitions — signed URL refresh is handled by `PhotoLoadService` (via `setLocalUrl` / `revokeLocalUrl`).
- Injects `WorkspaceViewService` to update the grid cache after Replace media.

## Acceptance Criteria

### PhotoLoadService Integration

- [x] All signed-URL generation delegated to `PhotoLoadService` — component never calls `supabase.client.storage.from('images').createSignedUrl` directly
- [x] Tier 2 thumbnail obtained via `photoLoad.getSignedUrl(thumbPath, 'thumb')` with `{ width: 256, height: 256, resize: 'cover' }` transform
- [x] Tier 3 full-res obtained via `photoLoad.getSignedUrl(storagePath, 'full')` with no transform
- [x] Full-res preloaded via `photoLoad.preload(fullUrl)` before crossfade
- [x] Component reads `photoLoad.getLoadState(mediaId, 'thumb')` and `photoLoad.getLoadState(mediaId, 'full')` signals — no local `thumbLoaded` / `fullResLoaded` booleans
- [ ] Cache namespace is shared with map markers and `/media` items so the same media identity resolves to the same cached URL set across surfaces.
- [ ] For document-like media with `document_preview_path`, signed URL generation and load-state resolution use the same `PhotoLoadService` flow (tier, cache, staleness, re-signing).
- [x] When `storage_path IS NULL`: `photoLoad.getLoadState()` returns `'no-photo'` → upload prompt shown immediately, no signed URL requests
- [x] Loading/idle placeholder supports neutral media surface baseline; optional `PHOTO_PLACEHOLDER_ICON` usage is allowed for consistency where needed
- [x] Uses `PHOTO_NO_PHOTO_ICON` from `PhotoLoadService` for error/no-media state (crossed-out image, 0.55 opacity)
- [ ] Placeholder visuals are identical across media detail viewer, thumbnail cards, and map markers

### Progressive Loading

- [x] When `storage_path IS NULL`: parent view `loading` resolves to `false` as soon as record fetch completes
- [x] When `storage_path` exists: neutral media placeholder shown immediately (spinner-free)
- [x] Tier 2 thumbnail (256×256 transform) loads and replaces placeholder with slight blur
- [x] Full-res preview loads and crossfades over blurred thumbnail
- [x] If full-res fails (`fullState = 'error'`), Tier 2 thumbnail stays visible
- [x] If both tiers fail, `PHOTO_NO_PHOTO_ICON` shown with `alt="Media unavailable"`
- [x] Component forwards measured viewer slot size in `rem` to orchestrator for adaptive tier selection
- [ ] For document-like media with eligible viewer size, generated first-page preview is used before icon fallback when `document_preview_path` exists.

### Upload Integration

- [x] Edit icon overlay on hero media preview opens file picker
- [x] File validated before upload (size + MIME type via `UploadService.validateFile()`)
- [x] Delegates to `UploadManagerService.replaceFile(mediaId, file)` — does not manage upload lifecycle directly
- [x] Spinner/progress shown by reading job state from `uploadManager.jobs()` signal
- [x] On `imageReplaced$`: `UploadManagerService` calls `photoLoad.setLocalUrl(mediaId, blobUrl)` → all surfaces update instantly
- [x] On `imageAttached$`: `UploadManagerService` calls `photoLoad.setLocalUrl(mediaId, blobUrl)` → component transitions from upload prompt to media preview
- [x] `localObjectUrl` freed via `photoLoad.revokeLocalUrl()` after signed URL takes over — no memory leaks
- [x] Upload survives component destruction (user can navigate away mid-replace)

### General

- [x] Lightbox opens on media-preview click with dark backdrop
- [x] Lightbox closes on X, backdrop click, or Escape
