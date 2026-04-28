# media detail media viewer.progressive loading.supplement

> Parent: [`media-detail-media-viewer.md`](./media-detail-media-viewer.md)

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

> See [PL-7 / PL-8](../../../use-cases/media-loading.md#pl-7-replace-photo--loading-state-reset) for detailed sequence diagrams.

