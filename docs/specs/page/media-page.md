# Media Page

**Status:** Element Spec  
**Route:** `/media`  
**Parent:** `AppShellComponent` main content area (flex 1)

---

## What It Is

Canonical `/media` route: page-level layout, pane integration, and persistence only; child component specs own grid, items, and media chrome (this phase: `media.component.md`, `media-content.md`, `media-item.md`, `item-grid.md` media path, etc.).

## Documentation Phase Boundary

- This refactoring pass MUST modify only the `/media` page specification set:
  - `docs/specs/page/media-page.md`
  - `docs/specs/component/media.component.md`
  - `docs/specs/component/media-content.md`
  - `docs/specs/component/media-item.md`
  - `docs/specs/component/media-display.md`
  - `docs/specs/component/media-item-quiet-actions.md`
  - `docs/specs/component/media-item-upload-overlay.md`
  - `docs/specs/component/item-grid.md` (media-path constraints only)
  - `docs/specs/component/media-page-header.md`
  - `docs/specs/component/media-toolbar.md`
- Broader documentation cleanup MUST be deferred to later phases.

## Layer Ownership Contract

- The page layer MUST own orchestration, routing, high-level layout composition, and page-level state ownership.
- The component layer MUST own behavior contracts, FSM transitions, and API/service boundaries.
- The item/domain layer MUST own tile visuals, local UI states, and atomic data mapping.
- When page and component specs conflict on a shared boundary, the component spec MUST be authoritative for behavior and the page spec MUST be authoritative for composition.

---

## What It Looks Like

**Desktop Layout:**

```
AppShell (top-level, persistent across routes)
├── SideMenuComponent (AppShell-owned, rendered independent from MediaComponent)
├── Main Content
│   ├── MediaComponent (flex 1)
│   │   ├── MediaPageHeaderComponent
│   │   ├── [Optional] MediaToolbar
│   │   └── MediaContentComponent
│   │
│   └── WorkspacePaneComponent (right side, always visible unless closed)
│       ├── PaneHeaderComponent (title, close button, width control)
│       ├── TabSelectorComponent: "Selected Items" | "Upload"
│       └── ContentArea @switch(activeTab)
│           ├── Tab: "Selected Items"
│           │   └── Selected-items provider bound by current route context
│           └── Tab: "Upload"
│               └── [UploadPanelComponent 1:1 embed]
│
└── Footer (optional)
```

**Mobile Layout (Phase 2):**

- The media content region MUST fill the available viewport height.
- Workspace pane behavior SHOULD switch to a bottom-sheet pattern.

---

## Where It Lives

- **Route:** `/media` (routed by AppRouter → MediaComponent)
- **Parent Container:** `AppShellComponent` main content flex area
- **Workspace Pane:** Mounted by AppShellComponent (seitenübergreifend, not media-specific)
- **Trigger:** Navigation via AppShell side menu, or view-all-media action
- **Persistence:** Media page state (filters, sort, group) saved to localStorage; media list snapshots and pagination cursor are cache-retained per user/query (no forced clear on normal revisit); workspace pane state (tab, selection, uploads) is independent

---

## Actions & Interactions

| #  | Trigger | Orchestration Response | Ownership |
| --- | --- | --- | --- |
| 1 | Route enters `/media` without persisted tab state | Page composition MUST mount `MediaComponent` and bind `WorkspacePaneComponent` context with default tab `selected-items`. | Page |
| 2 | Route re-enters `/media` with persisted tab state | Page composition MUST restore the last active tab unless an explicit URL anchor/intent overrides it. | Page |
| 3 | Explicit URL anchor/intent requests a tab | Page composition MUST prioritize explicit URL anchor/intent over persisted tab state. | Page |
| 4 | User switches to `upload` tab | Pane host MUST render `UploadPanelComponent` without remounting the route shell. | AppShell + pane host |
| 5 | User navigates between `/media` and `/map` | Pane host MUST preserve upload continuity and tab state across route transitions. | AppShell + pane host |
| 6 | User invokes grouping/sorting/filtering via toolbar | Page composition MUST forward intent routing to `MediaComponent` command methods; toolbar MUST remain intent-only. | Page + shell component |
| 7 | Child emits selection/detail intents | Page composition MUST bind and forward typed intents through selected-items context ports. | Page + pane host |

Page contract note:

- Child tile rendering details (for example address chips, overlay typography, per-item hover visuals) MUST be owned by domain/component contracts and MUST NOT be specified in this page spec.

---

## Component Hierarchy

```text
MediaComponent (route shell)
├── MediaPageHeaderComponent
├── [Optional] MediaToolbar
└── MediaContentComponent

[Workspace Pane is mounted by AppShellComponent, not MediaComponent]
WorkspacePaneComponent (seitenübergreifend)
├── PaneHeaderComponent
├── TabSelectorComponent ("Selected Items" | "Upload")
└── ContentArea @switch(activeTab)
    ├── "Selected Items" tab (context-bound provider)
    └── "Upload" tab
        └── UploadPanelComponent
```

---

## Data Requirements

| Source                                  | Fields Needed                                                        | Purpose                                      |
| --------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| `media_items` table                     | All columns (id, title, address_label, captured_at, media_type, ...) | Grid content                                 |
| `MediaPageStateService`                 | cachedItems, nextOffset, totalCount, querySignature, lastSyncedAt    | Restore list on revisit without forced clear |
| `MediaDownloadService`                  | bestCachedTierUrl, loadState, signed URL reuse                       | Warm preview + cross-route cache reuse       |
| `share_sets` + `share_set_items` tables | share_set_id, fingerprint, ordered media_item_id membership          | Persisted shared selections (media-era)      |
| `UploadManagerService`                  | jobs(), batches(), activeCount()                                     | Upload tab progress + lane data              |
| `WorkspaceViewService`                  | getGroupedAndFiltered() logic (reuse)                                | Grouping/filtering/sorting                   |
| `WorkspaceSelectionService`             | selectedMediaIds, toggleSelection()                                  | Selection state for "Selected Items" tab     |

### Data Flow

```mermaid
flowchart LR
    A["Navigate /media"] --> B["MediaComponent"]
    B --> C["MediaPageStateService cache lookup"]
    C --> D{"Media list cache hit?"}
    D -->|yes| E["Restore cached media list immediately"]
    D -->|no| F["Show neutral gray placeholders"]
    E --> G["MediaPageStateService background revalidate query"]
    F --> G
    G --> H["Merge fresh diff into grid"]

    I["UploadManagerService jobs signal"] --> J["WorkspacePaneComponent"]
    J --> K{"Which tab?"}
    K -->|Selected Items| L["Show media grid"]
    K -->|Upload| M["Show UploadPanelComponent"]
    M --> N["Lane buckets by issue kind + lane semantics"]
    N --> O["Uploaded actions: assign project, prioritize, open media, download"]
```

---

## State

### Page-Level Ownership (Mandatory)

- This page spec MUST own route composition and cross-route pane orchestration only.
- Route-shell lifecycle FSM behavior MUST be owned by `docs/specs/component/media.component.md`.
- Content-render FSM behavior MUST be owned by `docs/specs/component/media-content.md`.
- Tile visuals and per-item UI mapping MUST be owned by domain-level specs (`MediaItemComponent` and related item contracts).

### Deterministic Tab Entry Policy (Mandatory)

- On re-entry, the page MUST restore the last active tab unless an explicit URL anchor/intent overrides it.
- Selection context restore behavior MUST be subordinate to the tab policy above.
- If the restored/overridden tab is `selected-items`, the route context MUST rebind selected-items provider contracts for `/media`.
- If the restored/overridden tab is `upload`, upload continuity MUST remain uninterrupted and selected-items context MAY rebind in background.

**Cross-route contracts (AppShell-owned pane lifecycle remains unchanged):**

| Name              | Type                             | Default            | Write Owner                                  | Controls                                                    |
| ----------------- | -------------------------------- | ------------------ | -------------------------------------------- | ----------------------------------------------------------- |
| `activeTabGlobal` | `'selected-items' \| 'upload'`   | `'selected-items'` | Workspace pane host (`AppShell` integration) | Single source of truth for tab restore across route changes |
| `pageContextKey`  | `'map' \| 'media' \| 'projects'` | `'media'`          | App shell route host                         | Which selected-items provider should render in pane         |
| `selectionScope`  | `'media-item-id'`                | `'media-item-id'`  | `WorkspaceSelectionService` boundary         | Canonical ID namespace for selection service integration    |

**WorkspacePaneComponent (extended):**

| Name               | Type                           | Default            | Write Owner                        | Controls                                        |
| ------------------ | ------------------------------ | ------------------ | ---------------------------------- | ----------------------------------------------- |
| `activeTab`        | `'selected-items' \| 'upload'` | `'selected-items'` | `WorkspacePaneComponent` host port | Which workspace pane tab is shown               |
| `isOpen`           | `boolean`                      | `true`             | `WorkspacePaneComponent`           | Pane visibility; same close button as existing  |
| `detailMediaId`    | `string \| null`               | `null`             | `WorkspacePaneComponent`           | If set, detail modal opens on any tab/page      |
| `width`            | `number`                       | `320`              | `WorkspacePaneComponent`           | Desktop pane width (unchanged)                  |
| `selectedMediaIds` | `Set<string>`                  | empty set          | `WorkspaceSelectionService`        | Current selection from active page's media grid |

Forbidden writers in this page contract:

- `MediaToolbar`, `MediaContentComponent`, and `MediaItemComponent` MUST NOT directly mutate `groupingMode`, `sortMode`, or `activeFilters`.
- `MediaItemComponent` MUST NOT write route lifecycle or cross-route tab/detail state.

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

- `activeTabGlobal` is the single source of truth across routes; per-page state MUST NOT duplicate the tab key.
- Route transition contract: `unbindContext` MUST run before `bindContext` when context key changes.
- Upload tab visibility MUST remain globally persistent; selected-items provider MUST remain route-scoped and hot-swappable.
- Naming contract MUST remain canonical: `selectedMediaIds` in page, pane, and service interfaces.

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

| File                                          | Purpose                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------- |
| `features/media/media.component.ts`           | Route component for `/media`                                              |
| `features/media/media.component.html`         | Template: breadcrumb + content shell (no pane — pane is in AppShell)      |
| `features/media/media.component.scss`         | Page layout styles                                                        |
| `features/media/media-content.component.ts`   | Responsive ItemGrid-backed content renderer with state switching          |
| `features/media/media-content.component.html` | Content template with grouped sections / empty / error branches           |
| `features/media/media-content.component.scss` | Content-region layout and transition styles                               |
| `features/media/media-toolbar.component.ts`   | OPTIONAL Phase 2: Grouping/Sort/Filter operators                          |
| `features/media/media-toolbar.component.html` | Toolbar template (Phase 2)                                                |
| `features/media/media-toolbar.component.scss` | Toolbar styles (Phase 2)                                                  |
| `core/media-view.service.ts`                  | Grouping, filtering, sorting logic (or share with workspace service)      |
| `core/media-page-state.service.ts`            | Route-stable media list snapshot cache + background revalidation metadata |
| `core/workspace-pane-context.port.ts`         | Shared interface contract for selected-items context provider             |
| `core/workspace-pane-host.port.ts`            | Host contract for tab and context binding                                 |
| `core/workspace-pane-observer.adapter.ts`     | Observer lifecycle adapter (route, upload, tab persistence)               |

**Modified Files:**

| File                                                        | Change                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| `features/map/workspace-pane/workspace-pane.component.ts`   | Add `activeTab` signal + tab container logic + imports |
| `features/map/workspace-pane/workspace-pane.component.html` | Add tab selector UI at top before content              |
| `app-shell.component.ts`                                    | Add `/media` route option (if not already present)     |
| Routing config                                              | Wire `/media` → MediaComponent                         |

**Reused Components:**

- `ItemGridComponent` (shared)
- `MediaItemComponent` (media domain item)
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
    B -->|/media| E["MediaComponent"]
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
    participant MediaPage as MediaComponent
    participant MediaContent as MediaContentComponent
    participant Pane as WorkspacePaneComponent
    participant Upload as UploadManagerService

    Browser->>ReflectorRouter: Navigate to /media
    ReflectorRouter->>MediaPage: Route activated
    MediaPage->>MediaContent: Render (load media from DB)
    MediaContent->>Pane: Workspace pane already mounted by AppShell
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

- [ ] `/media` route MUST be accessible through AppShell navigation.
- [ ] Page composition MUST include `MediaComponent` and MUST integrate with `WorkspacePaneComponent` without pane remount on route changes.
- [ ] Tab persistence MUST follow one deterministic rule: restore last active tab on re-entry unless explicit URL anchor/intent overrides it.
- [ ] Selection context restore MUST be subordinate to tab persistence and MUST rebind only for `selected-items` context.
- [ ] Page spec MUST NOT define child tile visual mapping details; those details MUST be referenced through component/domain contracts.
- [ ] Toolbar contract naming MUST use `MediaToolbar` when referring to the `/media` toolbar boundary.
- [ ] All enforceable statements in this file MUST use RFC 2119 language (`MUST`, `SHOULD`, `MAY`).

## Canonical Name Registry Gate

- Every component name used in this spec MUST match a canonical entry in glossary/registry.
- Names that do not resolve to a canonical glossary/registry entry MUST be treated as unresolved and MUST block completion.
- This refactor pass MUST NOT create or rename glossary/registry entries outside the in-scope media-page specification set.
- If a required canonical name cannot be resolved, documentation work MUST stop with: `⚠ SPEC GAP: [missing file or ambiguous owner]`.
