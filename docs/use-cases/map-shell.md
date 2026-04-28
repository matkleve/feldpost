# Map Shell — Interaction Scenarios

> **Element spec:** [specs/page/map-page.md](../specs/page/map-page.md)
> **Contracts:** [map-page spec](../specs/page/map-page.md), [workspace-pane](../specs/ui/workspace/workspace-pane.md)
> **Product use cases:** [UC1](README.md#uc1--technician-on-site-view-history), [UC2](README.md#uc2--clerk-preparing-a-quote), [UC3](README.md#uc3--upload-and-correct-a-new-image)
> **Related specs:** [workspace-pane](../specs/ui/workspace/workspace-pane.md), [drag-divider](../specs/component/drag-divider.md), [search-bar](../specs/ui/search-bar/search-bar.md), [upload-button-zone](../specs/component/upload-button-zone.md), [photo-marker](../specs/ui/media-marker/media-marker.md), [image-detail-view](../specs/ui/media-detail/media-detail-view.md), [map-context-menu](../specs/component/map-context-menu.md)
> **Related use cases:** [map-context-menu](map-context-menu.md)

---

## IS-1: Initial Map Load (spec Actions #1)

**Product context:** Every UC begins here. The technician (UC1) or clerk (UC2) sees the map immediately after login.

```mermaid
sequenceDiagram
    actor User
    participant Router
    participant MapShell
    participant Leaflet
    participant Browser

    User->>Router: Navigate to / (authenticated)
    Router->>MapShell: Render component
    MapShell->>Leaflet: Init map (afterNextRender)
    MapShell->>Browser: Request GPS position
    alt GPS available
        Browser-->>MapShell: Position
        MapShell->>Leaflet: setView(userCoords, 13)
    else GPS denied
        MapShell->>Leaflet: Keep Vienna fallback
    end
    MapShell->>MapShell: queryViewportMarkers() RPC
    Note over MapShell: Sidebar visible (desktop left rail / mobile bottom bar)
    Note over MapShell: Search bar floating top-center
    Note over MapShell: Upload button floating top-right
    Note over MapShell: GPS button floating bottom-right
```

**Expected state after:**

- `placementActive` = false
- `searchPlacementActive` = false
- `uploadPanelOpen` = false
- `photoPanelOpen` = false (Workspace Pane closed; **interim:** signal on `MapShellComponent` — see [Workspace Pane visibility](#workspace-pane-visibility-canonical-vs-interim))
- Map renders with markers from viewport query

---

## IS-2: Open Workspace Pane via Marker Click (spec Actions #3)

**Product context:** UC1 step 6 (tap marker), UC2 step 6 (browse markers).
**Related:** [photo-marker spec](../specs/ui/media-marker/media-marker.md) §Cluster Click, [workspace-pane spec](../specs/ui/workspace/workspace-pane.md) §1/§1b

```mermaid
sequenceDiagram
    actor User
    participant Marker
    participant MapShell
    participant WorkspacePane

    User->>Marker: Click single-image marker
    Marker->>MapShell: handlePhotoMarkerClick(key)
    MapShell->>MapShell: setSelectedMarker(key), photoPanelOpen → true
    MapShell->>MapShell: openDetailView(imageId)
    MapShell->>WorkspacePane: Render with clip-path reveal animation
    Note over WorkspacePane: PaneHeader visible with close button
    Note over WorkspacePane: Image detail view shown
```

**For cluster markers:**

```mermaid
sequenceDiagram
    actor User
    participant Cluster
    participant MapShell
    participant WorkspacePane

    User->>Cluster: Click cluster marker
    Cluster->>MapShell: handlePhotoMarkerClick(key)
    MapShell->>MapShell: setSelectedMarker(key), photoPanelOpen → true
    Note over MapShell: count > 1, no openDetailView
    MapShell->>WorkspacePane: Render with Active Selection tab
    Note over WorkspacePane: Shows thumbnail grid for cluster images
```

---

## IS-3: Close Workspace Pane (spec Actions #6)

**Product context:** User is done reviewing; wants to return to map-only view.
**Related:** [workspace-pane spec](../specs/ui/workspace/workspace-pane.md) §3

```mermaid
sequenceDiagram
    actor User
    participant WorkspacePane
    participant MapShell
    participant Leaflet

    User->>WorkspacePane: Click close button (×)
    WorkspacePane->>MapShell: closeWorkspacePane()
    MapShell->>MapShell: photoPanelOpen → false
    MapShell->>MapShell: detailImageId → null
    MapShell->>MapShell: selectedMarkerKey → null
    Note over MapShell: Pane removed from DOM (@if)
    Note over MapShell: DragDivider removed from DOM
    MapShell->>Leaflet: invalidateSize() (map reclaims space)
```

**Expected state after:**

- `photoPanelOpen` = false (same as Workspace Pane closed; **target** rename `workspacePaneOpen` on layout host per [symbol rename backlog](../backlog/media-photo-symbol-rename-roadmap.md))
- `detailImageId` = null
- `selectedMarkerKey` = null

---

## IS-4: Click Empty Map While Pane Open (spec Actions #7)

**Product context:** User clicks a blank area on the map. Deselects the marker but keeps the pane open for continued browsing.

```mermaid
sequenceDiagram
    actor User
    participant MapShell

    User->>MapShell: Click empty map area
    MapShell->>MapShell: handleMapClick()
    MapShell->>MapShell: setSelectedMarker(null)
    Note over MapShell: Marker highlight clears
    Note over MapShell: photoPanelOpen stays true
    Note over MapShell: Pane shows "Select a marker on the map to see photos."
```

---

## IS-5: Upload and Placement Mode (spec Actions #4, #5)

**Product context:** UC3 — upload a new image, place it if no EXIF GPS.
**Related:** [upload-button-zone spec](../specs/component/upload-button-zone.md)

```mermaid
sequenceDiagram
    actor User
    participant UploadPanel
    participant MapShell
    participant Leaflet

    User->>MapShell: Click upload button
    MapShell->>MapShell: uploadPanelPinned → true
    User->>UploadPanel: Select image without GPS EXIF
    UploadPanel->>MapShell: placementRequested(key)
    MapShell->>MapShell: placementActive → true
    MapShell->>Leaflet: Crosshair cursor on map
    Note over MapShell: Placement banner: "Click the map to place the image"
    User->>Leaflet: Click on map
    Leaflet->>MapShell: handleMapClick(latlng)
    MapShell->>UploadPanel: placeFile(key, coords)
    MapShell->>MapShell: placementActive → false
```

### Search pin-drop variant (spec Actions #5):

```mermaid
sequenceDiagram
    actor User
    participant SearchBar
    participant MapShell
    participant Leaflet

    User->>SearchBar: Click "Drop pin" action
    SearchBar->>MapShell: dropPinRequested
    MapShell->>MapShell: searchPlacementActive → true
    MapShell->>Leaflet: Crosshair cursor on map
    Note over MapShell: Placement banner: "Click the map to drop a pin"
    User->>Leaflet: Click on map
    Leaflet->>MapShell: handleMapClick(latlng)
    MapShell->>MapShell: renderSearchLocationMarker(coords)
    MapShell->>MapShell: searchPlacementActive → false
```

---

## IS-6: Browser Resize — Responsive Reflow (spec Actions #2)

**Product context:** Technician switches orientation on tablet, or clerk resizes browser window.

| Breakpoint | Sidebar                     | Workspace Pane           | Upload |
| ---------- | --------------------------- | ------------------------ | ------ |
| ≥ 768px    | Left rail (floating, icons) | Right panel with divider | FAB    |
| < 768px    | Bottom tab bar (full width) | Bottom sheet (40vh)      | FAB    |

No JS needed — CSS media queries handle the reflow. `NavComponent` handles sidebar transformation independently.

---

## Workspace Pane visibility (canonical vs interim)

**Canonical:** The **authenticated layout host** owns the horizontal split and mounts **Workspace Pane** alongside route content. See [workspace-pane § Layout host](../specs/ui/workspace/workspace-pane.md#layout-host-canonical).

**Interim:** The pane DOM is still mounted under **`MapShellComponent`** on map and settings routes until the layout hoist matches that contract. See [workspace-pane § Interim implementation](../specs/ui/workspace/workspace-pane.md#interim-implementation-until-layout-hoist).

**Symbols:** Product language is **Workspace Pane** / **media item**. The shipped visibility signal is **`photoPanelOpen`** on `MapShellComponent` today; a post-hoist rename (e.g. `workspacePaneOpen` on the layout host) is deferred — [workspace-pane § Terminology](../specs/ui/workspace/workspace-pane.md#terminology-symbols-and-product-language), [media-photo-symbol-rename-roadmap](../backlog/media-photo-symbol-rename-roadmap.md).

Sequence diagrams above use **`photoPanelOpen`** to match current TypeScript.
