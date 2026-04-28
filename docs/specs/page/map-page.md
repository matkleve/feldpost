# Map Shell

## What It Is

Full-screen **map route host** after login: **map zone** (Leaflet), floating controls, and map-specific dialogs. **`MapShellComponent`** is loaded as the **child** of **`app-authenticated-app-layout`** for **`/`**, **`/map`**, and **`/settings/**`** (`app.routes.ts`). **Workspace Pane** + horizontal split are **not** owned here — they live on **`AuthenticatedAppLayoutComponent`** (see [workspace-pane § Layout host](../ui/workspace/workspace-pane.md#layout-host-canonical)). **See:** [map-shell use cases](../use-cases/map-shell.md), [workspace-pane](../ui/workspace/workspace-pane.md), [search-bar](../ui/search-bar/search-bar.md), [media-marker](../ui/media-marker/media-marker.md), [upload-button-zone](../component/upload/upload-button-zone.md), [drag-divider](../component/workspace/drag-divider.md); product UCs 1–3 in use-case docs.

## What It Looks Like

Full viewport inside the layout **main column** (the layout host owns sidebar + split + pane). **Map zone** fills the column: background `--color-bg-base`. No chrome, no header bar — the map dominates.

## Where It Lives

- **Parent**: **`AuthenticatedAppLayoutComponent`** main column via `router-outlet` (see [workspace-pane](../ui/workspace/workspace-pane.md))
- **Component**: `MapShellComponent` at `features/map/map-shell/`

## Actions

| #   | User Action                             | System Response                                                                                                                | Triggers                                                                                  |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | Navigates to `/` (authenticated)        | Renders full map shell with sidebar, map, floating controls                                                                    | Map init via `MapAdapter`                                                                 |
| 2   | Resizes browser window                  | Layout reflows: sidebar collapses to bottom bar on mobile (<768px), workspace pane becomes bottom sheet                        | Responsive breakpoint                                                                     |
| 3   | Opens workspace pane                    | Drag Divider appears, map zone shrinks via clip-path reveal                                                                    | **`photoPanelOpen.set(true)`** on layout host (`MapShellState`); see [workspace-pane](../ui/workspace/workspace-pane.md) §1/1b |
| 4   | Enters placement mode                   | Map Container gets crosshair cursor, Placement Banner appears                                                                  | `placementActive` signal                                                                  |
| 5   | Requests pin-drop from search bar       | Map enters pin-drop mode (crosshair cursor, placement banner with "Click the map to drop a pin")                               | `searchPlacementActive` signal                                                            |
| 6   | Closes workspace pane                   | Workspace pane slides out (clip-path reverse), Drag Divider removed, map zone expands                                          | **`photoPanelOpen.set(false)`** on layout host — [workspace-pane § Terminology](../ui/workspace/workspace-pane.md#terminology-symbols-and-product-language) |
| 7   | Clicks empty map area                   | Deselects the active marker (selection highlight clears); workspace pane stays open                                            | `selectedMarkerKey` → null                                                                |
| 8   | GPS geolocation resolves during startup | Stores/updates user position and marker without forced recenter                                                                | startup geolocation flow                                                                  |
| 9   | GPS toggle is active                    | Runs periodic GPS refresh (~60s) and keeps user marker above media markers                                                     | `gpsTrackingActive` signal + Leaflet z-index offset                                       |
| 10  | Clicks `Zoom to location` in detail     | Centers map to media coordinates at detail zoom (without fly animation) and applies marker/cluster spotlight when render-ready | `onZoomToLocation` deferred spotlight flow                                                |

## Component Hierarchy

```
MapShell                                    ← fills layout main column; map-only
├── MapZone                                 ← fills host height/width
│   ├── Map style switch (top-left)
│   ├── UploadButtonZone                    ← fixed top-right, z-20 (visually over map)
│   ├── MapContainer                        ← div where Leaflet mounts
│   ├── SearchBar                           ← floating top-center, z-30
│   ├── GPSButton                           ← floating bottom-right
│   ├── [future] ActiveFilterChips          ← strip below search bar (when filters active)
│   └── [placement] PlacementBanner         ← bottom-center pill
```

**Workspace split** (drag divider + `WorkspacePane`) is rendered by **`app-authenticated-app-layout`**, not inside this tree — see [workspace-pane](../ui/workspace/workspace-pane.md).

## Data

### Data Flow (Mermaid)

```mermaid
flowchart LR
  UI[UI Component] --> S[Service Layer]
  S --> DB[(Supabase Tables)]
  DB --> S
  S --> UI
```

| Field            | Source                                                           | Type            |
| ---------------- | ---------------------------------------------------------------- | --------------- |
| Viewport markers | `supabase.rpc('viewport_markers', { bounds, zoom })`             | `ViewportRow[]` |
| User media       | `supabase.from('media_items').select('*').eq('created_by', uid)` | `MediaRecord[]` |

## State

| Name                    | Type                                                                         | Default | Controls                                                                   |
| ----------------------- | ---------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `placementActive`       | `boolean`                                                                    | `false` | Crosshair cursor on map, placement banner visibility                       |
| `searchPlacementActive` | `boolean`                                                                    | `false` | Crosshair cursor on map for search pin-drop                                |
| `uploadPanelOpen`       | `boolean`                                                                    | `false` | Upload panel expanded/collapsed                                            |
| `photoPanelOpen`        | `boolean`                                                                    | `false` | **Layout host** (`MapShellState` on authenticated route): Workspace pane visibility (product: Workspace Pane) |
| `gpsLocating`           | `boolean`                                                                    | `false` | GPS spinner state while awaiting fix                                       |
| `gpsTrackingActive`     | `boolean`                                                                    | `false` | GPS toggle active state and periodic refresh loop                          |
| `userPosition`          | `[number, number] \| null`                                                   | `null`  | Latest known user coordinates                                              |
| `pendingZoomHighlight`  | `{ mediaId: string; lat: number; lng: number; requestedAt: number } \| null` | `null`  | Pending spotlight request until viewport markers are loaded and reconciled |

## File Map

| File                                              | Purpose                         |
| ------------------------------------------------- | ------------------------------- |
| `layout/authenticated-app-layout.component.ts` | Authenticated split host + `router-outlet` |
| `features/map/map-shell/map-shell.component.ts`   | Map route component (map zone only) |
| `features/map/map-shell/map-shell.component.html` | Template (already exists)       |
| `features/map/map-shell/map-shell.component.scss` | Layout styles (already exists)  |

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

- Loaded via Angular Router as a **child** of **`app-authenticated-app-layout`** at `/`, `/map`, and `/settings/**` with `authGuard`
- Initializes Leaflet in `afterNextRender` (browser-only)
- All child floating components are positioned via CSS within Map Zone
- Never calls Leaflet directly from template — uses `MapAdapter`
- WorkspacePane close button emits `(closed)` → **layout host** sets **`photoPanelOpen`** false ([workspace-pane](../ui/workspace/workspace-pane.md))
- Clicking empty map deselects the active marker but does **not** close the workspace pane
- Detail zoom intent (`zoomToLocationRequested`) stores a pending highlight request and retries spotlight after viewport marker reconciliation when needed

## Acceptance Criteria

- [ ] Full viewport with no scrollbars
- [ ] Sidebar on left (desktop) / bottom (mobile)
- [ ] Map fills remaining space
- [ ] Floating controls (search, upload, GPS) don't overlap each other
- [ ] Startup geolocation does not auto-zoom to user location
- [ ] GPS recenter is only triggered by explicit GPS button activation
- [ ] User location marker is rendered above media markers
- [ ] Workspace pane slides in from right without pushing sidebar
- [ ] Placement mode adds crosshair cursor to map
- [ ] Workspace pane has a close button that hides the pane
- [ ] Clicking empty map deselects marker but keeps pane open
- [ ] Works on mobile: sidebar → bottom bar, workspace → bottom sheet
