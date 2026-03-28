# Media Page

**Status:** Element Spec  
**Route:** `/media`  
**Parent:** `AppShellComponent` main content area (flex 1)

---

## What It Is

The **Media Page** is the canonical `/media` route for browsing all media assets with grouping, filtering, and sorting, while AppShell owns pane lifecycle and page components provide selected-items context through explicit interfaces.

---

## Design Philosophy

**Problem:** Users need a dedicated, non-spatial view to browse all their media with powerful discovery operators (grouping by project, date, address; sorting; filtering). The map view is spatial-first; media browsing deserves its own page.

**Solution:**

1. Create `/media` route with MediaPageComponent
2. Use same Workspace Pane as other pages (map, projects)

- "Selected Items" tab shows media grid browsed on this page
- "Upload" tab is seitenübergreifend (persists across page changes)

3. Reuse all existing workspace infrastructure (selection, operators, detail view)

---

## What It Looks Like

**Desktop Layout:**

```
AppShell (top-level, persistent across routes)
├── Header (nav, logo, user menu)
├── Main Content
│   ├── MediaPageComponent (flex 1)
│   │   ├── Breadcrumb: / > Media
│   │   ├── [Optional] MediaToolbar (grouping/sort/filter)
│   │   └── MediaGridComponent
│   │       ├── GroupSectionHeader × N
│   │       │   └── ThumbnailCard × N
│   │       │       ├── image preview (photo/video thumb or doc icon)
│   │       │       ├── Title + date overlay
│   │       │       ├── Address chip (optional)
│   │       │       └── Hover state (linked-hover to workspace)
│   │       └── No-results placeholder
│   │
│   └── WorkspacePaneComponent (right side, always visible unless closed)
│       ├── PaneHeaderComponent (title, close button, width control)
│       ├── TabSelectorComponent ← NEW: "Selected Items" | "Upload"
│       └── ContentArea @switch(activeTab)
│           ├── Tab: "Selected Items"
│           │   └── [same ThumbnailGridComponent as workspace]
│           └── Tab: "Upload"
│               └── [UploadPanelComponent 1:1 embed]
│
└── Footer (optional)
```

**Mobile Layout (Phase 2):**

- Media grid fills viewport
- Workspace pane becomes bottom sheet (snap points)

---

## Where It Lives

- **Route:** `/media` (routed by AppRouter → MediaPageComponent)
- **Parent Container:** `AppShellComponent` main content flex area
- **Workspace Pane:** Mounted by AppShellComponent (seitenübergreifend, not media-specific)
- **Trigger:** Navigation from main nav, or view-all-media action
- **Persistence:** Media page state (filters, sort, group) saved to localStorage; workspace pane state (tab, selection, uploads) is independent

---

## Actions & Interactions

**Media Grid Tab (Selected Items in Workspace Pane):**

| #   | User Action                                        | System Response                                                     | Notes                                 |
| --- | -------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------- |
| 1a  | Navigates to `/media`                              | MediaPageComponent loads, workspace pane shows "Selected Items" tab | Filtered to "All media" if no filters |
| 1b  | Workspace applies saved filter state               | Grid re-renders with filtered/sorted/grouped images                 | localStorage or query params          |
| 2   | Uses Grouping operator (project/date/address)      | Grid reorganizes with section headers (if toolbar shown)            | Computed via `WorkspaceViewService`   |
| 3   | Uses Sorting operator (newest/oldest/name)         | Grid re-sorts within groups                                         | Reactive recompute                    |
| 4   | Uses Filter operator (project/date/tag/media-type) | Grid hides non-matching items                                       | Cascading filter logic                |
| 5   | Clicks thumbnail in grid                           | Opens media detail view (modal overlay)                             | Same detail component as workspace    |
| 6   | Closes detail                                      | Returns to grid, clears `detailImageId`                             | Grid state preserved                  |
| 7   | Hovers thumbnail                                   | Shows optional linked-hover underlay                                | Same pattern as workspace hover       |
| 8   | Selects one or more thumbnails                     | Selected count updates in workspace pane header                     | Affects "Selected Items" tab content  |

**Upload Tab (Global, Seitenübergreifend):**

| #   | User Action                                     | System Response                                                                                | Notes                                                       |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 9a  | Clicks "Upload" tab in workspace                | Tab switches, shows full UploadPanelComponent                                                  | Same as upload on map                                       |
| 9b  | Drags files onto Drop Zone                      | Creates upload jobs via UploadManagerService                                                   | Queue + progress visible                                    |
| 10  | Clicks "Select Folder" button                   | Opens folder picker, scans + enqueues                                                          | Folder address hint applied                                 |
| 11  | Folder name contains address                    | Address becomes default for all files in folder                                                | Folder precedence rule                                      |
| 12  | Clicks "Uploading" / "Uploaded" / "Issues" lane | Lane list filters to show matching jobs                                                        | 1:1 copy of upload panel                                    |
| 13  | Duplicate detected                              | Modal appears, user selects use/upload/reject                                                  | Job state resolved                                          |
| 13a | User opens action menu on uploaded row          | Embedded upload tab exposes saved-media follow-up actions                                      | `Zu Projekt hinzufügen`, `Priorisieren`, `/media`, download |
| 13b | Uploaded row belongs to a bound project         | `Projekt öffnen` action is available                                                           | Only when project context already exists                    |
| 13c | Issue row represents missing GPS                | Upload tab exposes placement-oriented actions only                                             | No `Trotzdem hochladen` for GPS issues                      |
| 13d | Issue row represents duplicate-photo review     | Upload tab exposes `Trotzdem hochladen` and existing-media actions                             | Only for duplicate review                                   |
| 14  | Switches back to "Selected Items"               | Tab switches, media grid stays in last filter state                                            | Uploads continue in background                              |
| 15  | Navigates away to `/map`                        | MediaPage unmounts, Map loads; **Workspace pane stays open with Upload tab content preserved** | Uploads never interrupted                                   |
| 16  | Navigates back from `/map` to `/media`          | MediaPage mounts; pane stays on previously active tab (global restore policy)                  | If tab is `selected-items`, media context is rebound        |

---

## Component Hierarchy

**STRICT PRIMITIVE REQUIREMENT:** The Media Page and its grid structural components must strictly rely on `.ui-container` and `.ui-item`. Do not create deep nested `div` elements for the grid sections; the group headers and thumbnail cards should be structurally flat siblings or one-level deep inside a standard container.

```text
MediaPageComponent (new route component, flex 1)
├── BreadcrumbComponent
│   └── "/" > "Media" > [Project filter]?
├── [Optional] MediaToolbarComponent
│   ├── Standard dropdown/segmented primitives
└── MediaGridComponent (new - flat structure using .ui-container/.ui-item equivalents)
    ├── GroupSectionHeader × N (if grouping active)
    │   └── ThumbnailCard × N (reused from workspace)
    │       ├── Image/video/doc preview
    │       ├── Title + date overlay
    │       ├── Address chip (optional)
    │       └── Hover state (linked-hover)
    └── No-results placeholder

[Workspace Pane is mounted by AppShellComponent, not MediaPageComponent]
WorkspacePaneComponent (seitenübergreifend)
├── PaneHeaderComponent (unchanged)
├── TabSelectorComponent (NEW: two-button toggle)
│   ├── "Selected Items" button
│   └── "Upload" button
└── ContentArea @switch(activeTab)
    ├── "Selected Items" tab
    │   └── ThumbnailGridComponent (shows current page's selection)
    └── "Upload" tab
        └── UploadPanelComponent (unchanged, 1:1 embed)
```

---

## Data Requirements

| Source                      | Fields Needed                                                        | Purpose                                  |
| --------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| `images` table              | All columns (id, title, address_label, captured_at, media_type, ...) | Grid content                             |
| `saved_groups` table        | id, name, org_id, member images                                      | Group filter options (Phase 2)           |
| `UploadManagerService`      | jobs(), batches(), activeCount()                                     | Upload tab progress + lane data          |
| `WorkspaceViewService`      | getGroupedAndFiltered() logic (reuse)                                | Grouping/filtering/sorting               |
| `WorkspaceSelectionService` | selectedMediaIds, toggleSelection()                                  | Selection state for "Selected Items" tab |

### Data Flow

```mermaid
flowchart LR
    A["Navigate /media"] --> B["MediaPageComponent"]
    B --> C["Query: all images from DB"]
    C --> D["MediaGridComponent"]
    D --> E["Render grid with grouping"]

    F["UploadManagerService jobs signal"] --> G["WorkspacePaneComponent"]
    G --> H{"Which tab?"}
    H -->|Selected Items| I["Show media grid"]
    H -->|Upload| J["Show UploadPanelComponent"]
    J --> K["Lane buckets by issue kind + lane semantics"]
    K --> L["Uploaded actions: add to project, prioritize, open media, download"]
```

---

## State

**MediaPageComponent:**

| Name               | Type                                                | Default    | Controls                                     |
| ------------------ | --------------------------------------------------- | ---------- | -------------------------------------------- |
| `groupingMode`     | `'none' \| 'project' \| 'date' \| 'address'`        | `'none'`   | How grid is organized into sections          |
| `sortMode`         | `'newest' \| 'oldest' \| 'name_asc' \| 'name_desc'` | `'newest'` | Grid sort order                              |
| `activeFilters`    | `FilterSpec[]`                                      | `[]`       | Applied filter chips (projects, date ranges) |
| `filteredImages`   | `Signal<Image[]>`                                   | `[]`       | Computed: images matching active filters     |
| `groupedAndSorted` | `Signal<ImageGroup[]>`                              | `[]`       | Computed: filtered + grouped + sorted        |
| `hoveredImageId`   | `string \| null`                                    | `null`     | Current thumbnail under pointer              |
| `detailImageId`    | `string \| null`                                    | `null`     | If set, detail modal is open                 |

**Cross-route contracts:**

| Name              | Type                             | Default            | Controls                                                    |
| ----------------- | -------------------------------- | ------------------ | ----------------------------------------------------------- |
| `activeTabGlobal` | `'selected-items' \| 'upload'`   | `'selected-items'` | Single source of truth for tab restore across route changes |
| `pageContextKey`  | `'map' \| 'media' \| 'projects'` | `'media'`          | Which selected-items provider should render in pane         |
| `selectionScope`  | `'media-item-id'`                | `'media-item-id'`  | Canonical ID namespace for selection service integration    |

**WorkspacePaneComponent (extended):**

| Name               | Type                           | Default            | Controls                                        |
| ------------------ | ------------------------------ | ------------------ | ----------------------------------------------- |
| `activeTab`        | `'selected-items' \| 'upload'` | `'selected-items'` | Which workspace pane tab is shown               |
| `isOpen`           | `boolean`                      | `true`             | Pane visibility; same close button as existing  |
| `detailImageId`    | `string \| null`               | `null`             | If set, detail modal opens on any tab/page      |
| `width`            | `number`                       | `320`              | Desktop pane width (unchanged)                  |
| `selectedMediaIds` | `Set<string>`                  | empty set          | Current selection from active page's media grid |

## Module Interfaces (Schnittstellen)

### Input/Output Contract

```ts
export type WorkspacePaneTab = "selected-items" | "upload";
export type WorkspacePageContextKey = "map" | "media" | "projects";

export interface SelectedItemsContextPort {
  contextKey: WorkspacePageContextKey;
  selectedMediaIds$: Signal<Set<string>>;
  openDetail: (mediaId: string) => void;
  clearDetail: () => void;
  setHover: (mediaId: string | null) => void;
}

export interface WorkspacePaneHostPort {
  activeTab$: Signal<WorkspacePaneTab>;
  setActiveTab: (tab: WorkspacePaneTab) => void;
  bindContext: (port: SelectedItemsContextPort) => void;
  unbindContext: () => void;
}
```

### Contract Invariants

- `activeTabGlobal` is the single source of truth across routes; per-page state must not duplicate the tab key.
- Route transition contract: `unbindContext` runs before `bindContext` when context key changes.
- Upload tab visibility is globally persistent; selected-items provider is route-scoped and hot-swappable.
- Naming contract is canonical: `selectedMediaIds` in page, pane, and service interfaces.

### Observer/Hooks Contract

| Hook                              | Owner                   | Input         | Output                            | Cleanup                                  |
| --------------------------------- | ----------------------- | ------------- | --------------------------------- | ---------------------------------------- |
| `onRouteContextEnter(contextKey)` | App shell route host    | route key     | binds selected-items port         | unbind previous port before binding next |
| `onRouteContextLeave(contextKey)` | App shell route host    | route key     | detaches selected-items port      | clear transient hover only               |
| `onContextSwap(nextContextKey)`   | App shell route host    | route key     | unbind + bind in one transition   | no duplicate observers                   |
| `onUploadJobsChanged(jobs)`       | upload observer adapter | `UploadJob[]` | updates upload tab lanes/progress | unsubscribe in pane destroy              |
| `onActiveTabChanged(tab)`         | workspace pane          | selected tab  | persists `activeTabGlobal`        | none                                     |

---

## File Map

**New Files:**

| File                                          | Purpose                                                              |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `features/media/media-page.component.ts`      | Route component for `/media`                                         |
| `features/media/media-page.component.html`    | Template: breadcrumb + grid (no pane — pane is in AppShell)          |
| `features/media/media-page.component.scss`    | Page layout styles                                                   |
| `features/media/media-grid.component.ts`      | NEW: Responsive thumbnail grid with grouping                         |
| `features/media/media-grid.component.html`    | Grid template with grouping sections                                 |
| `features/media/media-grid.component.scss`    | Grid layout + responsive columns                                     |
| `features/media/media-toolbar.component.ts`   | OPTIONAL Phase 2: Grouping/Sort/Filter operators                     |
| `features/media/media-toolbar.component.html` | Toolbar template (Phase 2)                                           |
| `features/media/media-toolbar.component.scss` | Toolbar styles (Phase 2)                                             |
| `core/media-view.service.ts`                  | Grouping, filtering, sorting logic (or share with workspace service) |
| `core/workspace-pane-context.port.ts`         | Shared interface contract for selected-items context provider        |
| `core/workspace-pane-host.port.ts`            | Host contract for tab and context binding                            |
| `core/workspace-pane-observer.adapter.ts`     | Observer lifecycle adapter (route, upload, tab persistence)          |

**Modified Files:**

| File                                                        | Change                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `features/map/workspace-pane/workspace-pane.component.ts`   | Add `activeTab` signal + tab container logic + imports |
| `features/map/workspace-pane/workspace-pane.component.html` | Add tab selector UI at top before content              |
| `app-shell.component.ts`                                    | Add `/media` route option (if not already present)     |
| Routing config                                              | Wire `/media` → MediaPageComponent                     |

**Reused Components:**

- `ThumbnailCardComponent` (from workspace)
- `MediaDetailViewComponent` (overlay variant)
- `UploadPanelComponent` (full embed in Upload tab)

---

## Wiring

### App-Level Architecture

```mermaid
flowchart TD
    A["AppShellComponent"] --> B["RouterOutlet: MainContentArea"]
    A --> C["WorkspacePaneComponent"]

    B -->|/map| D["MapShellComponent"]
    B -->|/media| E["MediaPageComponent"]
    B -->|/projects| F["ProjectsPageComponent"]

    D --> G["SelectedItemsContextPort(map)"]
    E --> H["SelectedItemsContextPort(media)"]
    F --> I["SelectedItemsContextPort(projects)"]

    G --> C
    H --> C
    I --> C

    C --> J["activeTabGlobal"]
    C --> K["UploadPanelComponent"]
```

### Media Page Flow

```mermaid
sequenceDiagram
    participant Browser
    participant ReflectorRouter as AppRouter
    participant MediaPage as MediaPageComponent
    participant MediaGrid as MediaGridComponent
    participant Pane as WorkspacePaneComponent
    participant Upload as UploadManagerService

    Browser->>ReflectorRouter: Navigate to /media
    ReflectorRouter->>MediaPage: Route activated
    MediaPage->>MediaGrid: Render (load images from DB)
    MediaGrid->>Pane: Workspace pane already mounted by AppShell
    Pane->>Pane: activeTab = 'selected-items'
    Upload-->>Pane: Subscribe to jobs() for Upload tab

    Note over Pane,Upload: Uploads visible in Upload tab<br/>even though user is browsing Media

    Browser->>ReflectorRouter: Navigate to /map
    ReflectorRouter->>MediaPage: Unmount
    ReflectorRouter->>MapShell: Route activated
    Pane->>Pane: Still open, activeTab preserved
    Upload-->>Pane: Jobs continue in Upload tab
```

---

## Acceptance Criteria

**Route & Page:**

- [ ] `/media` route accessible from main navigation
- [ ] MediaPageComponent renders breadcrumb: "/" > "Media"
- [ ] Page loads all media (images, videos, documents) from DB
- [ ] Workspace pane opens by default, "Selected Items" tab active

**Media Grid (MVP - Phase 1):**

- [ ] MediaGridComponent displays thumbnails in responsive grid (2–4 columns)
- [ ] ThumbnailCard component reused from workspace (same styling)
- [ ] Each card shows image/video/doc preview + title + date overlay + address chip
- [ ] Clicking card opens detail view (modal overlay)
- [ ] Closing detail returns to grid with state preserved
- [ ] Hovering card shows optional linked-hover effect

**Workspace Pane Integration:**

- [ ] Tab selector visible at top of pane (two buttons: "Selected Items" / "Upload")
- [ ] "Selected Items" tab shows grid of media selected on this page
- [ ] "Upload" tab shows UploadPanelComponent (same as map view)
- [ ] Tab state persists globally via `activeTabGlobal` (single source of truth)
- [ ] Selecting thumbnails in media grid updates "Selected Items" tab count
- [ ] Selected-items content is provided through `SelectedItemsContextPort` (documented in/out contract)
- [ ] Route change rebinds selected-items provider via observer hook without remounting pane

**Upload Persistence (Seitenübergreifend):**

- [ ] User can open Upload tab and drag files while on `/media`
- [ ] Jobs appear in progress board immediately
- [ ] Navigate to `/map`, workspace pane stays open, Upload tab visible
- [ ] Navigate back to `/media`, pane still open, "Selected Items" tab active
- [ ] Uploads continue in background regardless of page navigation
- [ ] Uploads not cancelled when navigating away

**Mobile (Phase 2):**

- [ ] Workspace pane becomes bottom sheet at <800px viewport
- [ ] Sheet has snap points (64px, 50vh, 100vh)
- [ ] Media grid shows 1–2 columns above sheet
- [ ] All touch targets 44×44px minimum

**Operators (Phase 2):**

- [ ] Grouping operator (project/date/address) reorganizes grid
- [ ] Sorting operator (newest/oldest/name) re-orders items
- [ ] Filter operator (project/date/tag/media-type) hides non-matching
- [ ] Filter state persists to localStorage

**Modularity & Contracts:**

- [ ] No route component directly controls pane lifecycle; all pane open/close ownership is in AppShell host
- [ ] Module interfaces are documented for pane host and selected-items provider
- [ ] Observer lifecycle (bind/unbind/subscribe/unsubscribe) is documented with cleanup behavior
- [ ] Selection naming is canonical (`selectedMediaIds`) across page, pane, and service contracts
- [ ] Context swap is atomic on route change (`unbindContext` before `bindContext`) with no duplicate observer subscriptions
- [ ] Global tab persistence uses only `activeTabGlobal` (no per-route duplicate tab state key)
- [ ] Media page containers and list-like rows use shared layout primitives (`.ui-container`, `.ui-item`) instead of ad-hoc wrappers
- [ ] Hover/selected visual states never change card/list geometry (no padding/height jitter)

---

## Design Details

- **Grid Columns (responsive):** 2 (mobile) → 3 (tablet) → 4 (desktop 1440px+)
- **Thumbnail Card Size:** 128×128px (matches workspace grid)
- **Group Section Header Font:** Smaller than pane header, muted color token `--color-text-muted`
- **Pane Width:** Same as map workspace (default 320px, 280–640px range)
- **Pane Close Button:** Top-right, consistent with map/projects
- **Tab Selector Style:** Simple segmented control or button toggle at pane top

## Delivery Slices

### MVP Delivery (first implementation wave)

- Route activation for `/media` and page-level media grid render
- Workspace pane integration through existing AppShell ownership
- Stable two-tab behavior (`selected-items` / `upload`) with global tab persistence
- Reuse of existing thumbnail/detail/upload components and shared primitives (`.ui-container`, `.ui-item`)
- No early feature-local wrappers or media-page-specific pane forks

### Expansion Delivery (post-MVP)

- Advanced operators (grouping, sorting, filtering)
- Mobile bottom-sheet behavior and snap-point refinements
- Progressive loading for very large clusters or group buckets
- Additional linked-hover polish and non-critical UX refinements

---

## Related Specs

- [workspace-pane.md](workspace-pane.md) — extended with Upload tab
- [upload-panel.md](upload-panel.md) — embedded in workspace pane Upload tab (no changes)
- [media-detail-inline-editing.md](media-detail-inline-editing.md) — detail modal reused on media page
