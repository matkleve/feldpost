# media marker.viewport and clustering.supplement

> Parent: [`media-marker.md`](./media-marker.md)

## Viewport-Driven Marker Lifecycle

Markers are loaded based on the current map viewport, not once at initialization. This section defines the lifecycle that replaces the current load-once-at-init approach. See `architecture.md` §8 for the canonical viewport query contract.

### Trigger

The Map Shell listens to Leaflet's `moveend` event (fires after pan or zoom completes). It does **not** listen to `move` or `zoomanim` — no marker work happens while the camera is animating.

### Flow

1. `moveend` fires → start a **350 ms** debounce timer.
2. If another `moveend` fires within **350 ms**, reset the timer (rapid pan/pinch coalescing).
3. On debounce expiry, abort any in-flight query (`AbortController`) and issue a new viewport query.
4. The query bounds are the current viewport expanded by 10% on each edge (pre-fetch buffer).
5. The server returns **clusters** at zoom ≤ 14 (`ST_SnapToGrid`) or **individual markers** at zoom ≥ 15.
6. On response:
   - **Reconcile**, don't replace: diff incoming marker keys against the current `uploadedPhotoMarkers` map.
   - **Keep** markers that still match (same key, same count) — do not recreate their DivIcon.

- **Reuse and move** outgoing markers whenever possible — first by identity match, then by nearest-marker fallback — reassign to the new key and animate `setLatLng()` so as many markers as possible glide to the new centroid.
- **Add** new markers that entered the viewport.
- **Remove** markers that left the viewport (call `marker.remove()` and delete from the map).
- **Update** markers whose count or thumbnail changed (set a new icon via `setIcon()`).

7. During the query flight, existing markers remain visible (optimistic retention).

### Constraints

- **Max 2000 results per viewport.** Beyond this the server must return clusters.
- **No marker DOM work during zoom animation.** The `zoomend` handler must not call `refreshAllPhotoMarkers()` if a viewport query is about to fire — defer to the `moveend` debounce instead.
- **Reuse marker DOM elements.** When a marker key survives across viewport changes, keep the existing `L.Marker` instance and only call `setIcon()` if the rendered state actually changed.
- Freshly uploaded markers (from `ImageUploadedEvent`) are added optimistically on the client and survive until the next viewport query reconciles them.

### Zoom-Level Behaviour (from architecture.md §8)

| Zoom Level            | Server Returns                          | Client Renders                                |
| --------------------- | --------------------------------------- | --------------------------------------------- |
| 1–10 (country/region) | Clusters only (grid-based, large cells) | Cluster markers with count badges             |
| 11–14 (city/district) | Clusters (smaller cells)                | Cluster markers; dense areas remain clustered |
| 15–17 (street)        | Individual markers + small clusters     | Individual pins; nearby pins clustered        |
| 18–19 (building)      | Individual markers only                 | Individual pins                               |

## Clustering

Clustering is proximity-based and adapts to zoom level. It is **not** tied to fixed address or administrative zoom bands.

### Server-Side Clustering (target architecture)

At zoom ≤ 14 the database returns pre-aggregated clusters using `ST_SnapToGrid` with a grid cell size that shrinks as zoom increases:

| Zoom Range | Approximate Grid Cell | Result                        |
| ---------- | --------------------- | ----------------------------- |
| 1–8        | ~10 km                | Country/region-level clusters |
| 9–11       | ~1 km                 | City-level clusters           |
| 12–14      | ~100 m                | Neighbourhood-level clusters  |

At zoom ≥ 15 the server returns individual **media** rows. If a grid cell at zoom 15–17 contains more media items than a threshold (e.g., > 50), the server still returns a cluster for that cell.

### Client-Side Clustering (current interim implementation)

The current implementation uses `toMarkerKey()` which rounds coordinates to 4 decimal places (~11 m precision). This groups media items within ~11 m of each other into a single marker regardless of zoom level. This approach:

- Works for small datasets but does **not** adapt grid size to zoom level.
- Does **not** split clusters as the user zooms in.
- Should be replaced by the server-side approach above once `ViewportQueryService` is wired.

### Cluster Expansion

When the user zooms past the cluster's grid threshold, the cluster must split into its constituent markers on the next viewport query. The client reconciles this by removing the old cluster marker and adding the new individual markers during the diff step.

### Cluster Click Behaviour

Cluster click **never zooms**. Regardless of zoom level or cluster size, clicking a cluster always opens the Workspace Pane with the cluster's media pre-loaded into the Active Selection tab.

| Cluster State                    | Click Result                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| Any cluster                      | Fetch all media IDs in the cluster cell, populate Active Selection, open Workspace Pane |
| Large cluster (> 50 media items) | Show count badge in pane header; thumbnails load progressively as the pane scrolls      |

The map does **not** zoom or re-center on cluster click. The map stays at its current view, preserving the user's spatial context.

## Reactive Updates from Upload Manager

When the user replaces media or attaches media to a **media row that had no file yet** in the **Media Detail View**, the `UploadManagerService` handles the upload pipeline and emits events on success. The `MapShellComponent` subscribes to these events and applies marker changes without a full viewport refresh.

### Update Types

| Event Source                  | Marker Action                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `imageReplaced$`              | Rebuild DivIcon with new thumbnail (local ObjectURL) via `setIcon()`           |
| `imageAttached$`              | Rebuild DivIcon: placeholder → real thumbnail via `setIcon()`                  |
| `imageUploaded$` (new upload) | Creates a new optimistic marker (existing behaviour)                           |
| Correction mode drag          | Marker already at new position from drag — update key mapping + corrected flag |

### Replace Media Flow

```mermaid
sequenceDiagram
  participant Manager as UploadManagerService
  participant Shell as MapShellComponent
  participant Marker as L.Marker (Leaflet)

  Manager->>Shell: imageReplaced$ { imageId, localObjectUrl, newStoragePath, ... }
  Shell->>Shell: markersByMediaId → markerKey; state.thumbnailUrl = localObjectUrl
  Shell->>Shell: refreshPhotoMarker → buildPhotoMarkerHtml(blob URL)
  Shell->>Marker: setIcon(newDivIcon)
  Note over Marker: Instant preview from blob URL
  Note over Shell: Next viewport pass uses MediaDownloadService.getSignedUrl from storagePath
```

### Attach media (placeholder row → file attached)

```mermaid
sequenceDiagram
  participant Manager as UploadManagerService
  participant Shell as MapShellComponent
  participant Marker as L.Marker (Leaflet)

  Manager->>Shell: imageAttached$ { imageId, localObjectUrl, newStoragePath, coords, ... }
  Shell->>Shell: markersByMediaId → markerKey; state.thumbnailUrl = localObjectUrl
  Shell->>Shell: refreshPhotoMarker — placeholder → real preview
  Shell->>Marker: setIcon(newDivIcon)
  Note over Marker: CSS placeholder replaced by <img> from blob URL
```

### Key Mapping

Markers are keyed by coordinate-based `markerKey` (from `toMarkerKey()`). When coordinates change:

1. Remove the old `markerKey → marker` entry from the markers map.
2. Compute the new `markerKey` from the updated coordinates.
3. If the new key collides with an existing marker (another media item at the same rounded location), merge into a cluster.
4. Otherwise, insert the marker under the new key.

The Map Shell also maintains a **secondary index** `markersByMediaId: Map<string, L.Marker>` for O(1) lookups when handling detail view events. This index is populated during marker creation and cleaned up during marker removal.

## Performance Rules

These rules exist to prevent marker lag during map pan/zoom interactions.

1. **No marker work during camera animation.** Marker creation, icon regeneration, and DOM updates must not run during `move`, `zoom`, or `zoomanim` events. All marker work fires on `moveend` only, after a **350 ms** debounce.
2. **Reconcile, don't rebuild.** On each viewport query response, diff the new marker set against the existing set. Only add/remove/update markers that actually changed. Do not clear and recreate all markers.
3. **Limit `setIcon()` calls.** Only regenerate DivIcon HTML when the marker's rendered state (count, thumbnail, selected, zoom level, corrected, uploading) actually changed. Compare the relevant fields before calling `setIcon()`.
4. **Cap DOM elements.** The map should never hold more than 2000 marker DOM elements. The server enforces this via the max-results-per-viewport cap and forced clustering at high density.
5. **Prefer cached delivery.** `MediaDownloadService` tier cache avoids duplicate signing/download for the same media id across markers, workspace, and list surfaces; batch or viewport-assisted signing remains a future optimization.
6. **Keep markers as DivIcon, not Angular components.** Marker HTML is raw strings from `buildPhotoMarkerHtml()`. Pulling markers into Angular's change detection tree would degrade performance.

