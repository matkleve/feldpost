# registry.feature-local.supplement

> Linked from [`registry.md`](registry.md). Split-out catalog body; excluded from element-spec lint (`.supplement.md`).

## Feature-Local Components

> Feature-local components are not intended for reuse outside their feature folder. If the same pattern is needed
> elsewhere, flag it for promotion to `shared/` before copying.

### Map Feature

#### `<ss-gps-button>` — GPS Button

- **File**: `apps/web/src/app/features/map/gps-button/gps-button.component.ts`
- **Purpose**: Map overlay button that requests and animates to the user's GPS location.
- **Spec**: [`docs/specs/component/map/gps-button.md`](map/gps-button.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Gaps**: none

---

#### `<ss-search-bar>` — Map Search Bar

- **File**: `apps/web/src/app/features/map/search-bar/search-bar.component.ts`
- **Purpose**: Geocoding search bar with ghost-trie suggestions and committed/idle FSM states.
- **Spec**: @no-spec
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `state` (internal signal) | `SearchState` | `idle`, `focused-empty`, `typing`, `committed` | Dropdown visibility, loading spinner |
- **Composed of**: `ss-search-dropdown-item`
- **Gaps**: `@no-spec`

---

#### `<ss-search-dropdown-item>` — Search Dropdown Item

- **File**: `apps/web/src/app/features/map/search-bar/search-dropdown-item.component.ts`
- **Purpose**: Single row in the geocoding suggestion dropdown.
- **Spec**: @no-spec
- **Variant axes**: none (active state is a boolean, not a visual enum)
- **Other inputs**: `candidate: SearchCandidate` (required), `active: boolean`, `optionId: string` (required)
- **Composed of**: standalone
- **Gaps**: `@no-spec`

---

#### `<app-map-shell>` — Map Shell

- **File**: `apps/web/src/app/features/map/map-shell/map-shell.component.ts`
- **Purpose**: Root orchestrator for the map view; manages Leaflet map, markers, workspace pane, upload panel, and all map-layer interactions.
- **Map pierced CSS (Leaflet DivIcon / overlays):** `apps/web/src/styles/_map-shell-leaflet-global.scss` — selectors scoped under **`app-map-shell`**; **`@use`** from `apps/web/src/styles.scss` (Phase 8 Path A). See [`phase-8-global-scss-elimination.md`](../../migration/phase-8-global-scss-elimination.md) §7 and [`phase-10-visual-qa.md`](../../migration/phase-10-visual-qa.md#stacking-sanity).
- **Spec**: @no-spec (UI system spec: `docs/specs/ui/`)
- **Variant axes**: none
- **Composed of**: `ss-search-bar`, `ss-gps-button`, `app-workspace-pane-shell`, `app-upload-panel`, `app-workspace-toolbar`
- **Gaps**: `@no-spec`

---

### Media Feature

#### `<app-media>` — Media Page

- **File**: `apps/web/src/app/features/media/media.component.ts`
- **Purpose**: Root of the `/media` route; wires `MediaPageHeaderComponent` and `MediaContentComponent`.
- **Spec**: [`docs/specs/component/media/media.component.md`](media/media.component.md)
- **Variant axes**: none
- **Composed of**: `app-media-page-header`, `app-media-content`, `app-card-variant-switch`
- **Gaps**: none

---

#### `<app-media-content>` — Media Content

- **File**: `apps/web/src/app/features/media/media-content.component.ts`
- **Purpose**: Grid content area for the media page; handles loading/error/ready state transitions.
- **Spec**: [`docs/specs/component/media/media-content.md`](media/media-content.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `state` | `MediaContentState` | `loading`, `error`, `ready` | Grid vs. skeleton vs. empty state |
- **Other inputs**: `items: MediaRecord[]` (required), `projectNameFor` (required)
- **Composed of**: `app-item-grid`, `app-media-item`, `app-group-header`
- **Gaps**: none

---

#### `<app-media-empty>` — Media Empty

- **File**: `apps/web/src/app/features/media/media-empty.component.ts`
- **Purpose**: Empty state for the media page when no images match current filters.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: `app-centered-layout`
- **Gaps**: `@no-spec`

---

#### `<app-media-error>` — Media Error

- **File**: `apps/web/src/app/features/media/media-error.component.ts`
- **Purpose**: Error state for the media page.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: `app-centered-layout`
- **Gaps**: `@no-spec`

---

#### `<app-media-page-header>` — Media Page Header

- **File**: `apps/web/src/app/features/media/media-page-header.component.ts`
- **Purpose**: Title + subtitle header bar for the `/media` route.
- **Spec**: [`docs/specs/component/media/media-page-header.md`](media/media-page-header.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `state` | `MediaPageHeaderState` | `loading`, `ready` | Title skeleton vs. visible |
- **Other inputs**: `title: string`
- **Composed of**: standalone
- **Gaps**: none

---

### Projects Feature

#### `<app-project-card>` — Project Card

- **File**: `apps/web/src/app/features/projects/cards/project-card.component.ts`
- **Purpose**: Clickable project card shown in grid or compact-row layout.
- **Spec**: [`docs/specs/component/project/project-item.md`](project/project-item.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `variant` | `CardVariant` | `row`, `small`, `medium`, `large` | Card height, thumbnail size, info density |
- **Other inputs**: `project: ProjectListItem` (required), `colorTokenFor` (required), `formatRelativeDate` (required)
- **Composed of**: `app-item-state-frame`, `app-universal-media`, `app-chip`
- **Gaps**: none

---

#### `<app-project-color-picker>` — Project Color Picker

- **File**: `apps/web/src/app/features/projects/cards/project-color-picker.component.ts`
- **Purpose**: Colour swatch grid for picking a project accent colour.
- **Spec**: [`docs/specs/component/project/project-color-picker.md`](project/project-color-picker.md)
- **Variant axes**: none
- **Other inputs**: `selectedColor: ProjectColorKey` (required)
- **Composed of**: standalone
- **Gaps**: none

---

#### `<app-projects-grid-view>` — Projects Grid View

- **File**: `apps/web/src/app/features/projects/views/projects-grid-view.component.ts`
- **Purpose**: Grouped card grid layout for the projects page.
- **Spec**: @no-spec
- **Variant axes**: none (variant passed through to `app-project-card`)
- **Composed of**: `app-card-grid`, `app-project-card`, `app-group-header`
- **Gaps**: `@no-spec`

---

#### `<app-projects-table-view>` — Projects Table View

- **File**: `apps/web/src/app/features/projects/views/projects-table-view.component.ts`
- **Purpose**: Tabular list layout for the projects page with sortable columns.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: standalone
- **Gaps**: `@no-spec`

---

#### `<app-projects-toolbar>` — Projects Toolbar

- **File**: `apps/web/src/app/features/projects/chrome/projects-toolbar.component.ts`
- **Purpose**: Toolbar for the projects page: grouping, filter, sort, view-toggle, card-variant switch.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: `app-filter-dropdown`, `app-grouping-dropdown`, `app-sort-dropdown`, `app-projects-view-toggle`, `app-card-variant-switch`
- **Gaps**: `@no-spec`

---

#### `<app-projects-page-header>` — Projects Page Header

- **File**: `apps/web/src/app/features/projects/chrome/projects-page-header.component.ts`
- **Purpose**: Title + action header bar for the `/projects` route.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: standalone
- **Gaps**: `@no-spec`

---

### Upload Feature

#### `<app-upload-shell>` — Upload Shell

- **File**: `apps/web/src/app/features/upload/upload-shell/upload-shell.component.ts`
- **Purpose**: Fixed top-right shell: upload trigger, dock column for panel + resolver tray on all authenticated routes.
- **Spec**: [`docs/specs/component/upload/upload-shell.md`](upload/upload-shell.md)
- **Variant axes**: none (panel open/closed via shell state)
- **Composed of**: `app-upload-panel`, `app-upload-resolver-tray`, upload trigger
- **Used in**: `authenticated-app-layout`
- **Gaps**: none

---

#### `<app-upload-resolver-tray>` — Upload Resolver Tray

- **File**: `apps/web/src/app/features/upload/upload-resolver-tray/upload-resolver-tray.component.ts`
- **Purpose**: Pre-upload address disambiguation card (questions, numbered options, media chip, carousel).
- **Spec**: [`docs/specs/component/upload/upload-resolver-tray.md`](upload/upload-resolver-tray.md), [`upload-resolver-tray.question-copy.md`](upload/upload-resolver-tray.question-copy.md)
- **Variant axes**: `data-state` (`passive` | `active`); programmatic `trayMode` includes `hidden`
- **Other inputs**: `panelOpen`, `embeddedInPane`
- **Outputs**: `previewLocation`, `candidateSelected`, `groupChanged`, `deferRequested`
- **Composed of**: `app-chip`, `app-dropdown-shell`, `hlm` button
- **Used in**: `app-upload-shell`
- **Gaps**: `context_distance` (Prompt B) UI not implemented

---

#### `<app-upload-panel>` — Upload Panel

- **File**: `apps/web/src/app/features/upload/upload-panel/upload-panel.component.ts`
- **Purpose**: Slide-in panel that lists active upload jobs with per-item controls and a drop-zone.
- **Spec**: [`docs/specs/component/upload/upload-panel.md`](upload/upload-panel.md)
- **Variant axes**: none
- **Composed of**: `app-upload-panel-item`, `app-panel-trigger`
- **Used in**: `app-upload-shell` (and workspace pane embed without shell tray)
- **Gaps**: none

---

#### `<app-upload-panel-item>` — Upload Panel Item

- **File**: `apps/web/src/app/features/upload/upload-panel/upload-panel-item.component.ts`
- **Purpose**: Single upload job row: thumbnail, progress bar, phase chip, and action menu.
- **Spec**: [`docs/specs/component/upload/upload-panel.md`](upload/upload-panel.md)
- **Variant axes**: none (state driven by `UploadJob`)
- **Other inputs**: `job: UploadJob` (required)
- **Composed of**: `app-chip`, `app-universal-media`
- **Used in**: `app-upload-panel`
- **Gaps**: none

---

### Settings Feature

#### `<ss-settings-overlay>` — Settings Overlay

- **File**: `apps/web/src/app/features/settings-overlay/settings-overlay.component.ts`
- **Purpose**: Full-screen settings sheet with sections for appearance, density, search bias, and language.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `open: boolean`
- **Composed of**: `app-segmented-switch` (repeated per section)
- **Gaps**: `@no-spec`

---

### Nav / Layout

#### `<app-nav>` — Navigation Bar

- **File**: `apps/web/src/app/features/nav/nav.component.ts`
- **Purpose**: Primary application navigation bar (map / media / projects / settings links).
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: standalone
- **Gaps**: `@no-spec`

---

#### `<app-authenticated-app-layout>` — Authenticated App Layout

- **File**: `apps/web/src/app/layout/authenticated-app-layout.component.ts`
- **Purpose**: Root layout shell for authenticated users; composes nav, map-shell, media, projects, and workspace pane host.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: `app-nav`, `app-map-shell`, `app-workspace-pane-shell`, `ss-toast-container`, `ss-settings-overlay`
- **Gaps**: `@no-spec`

---

### Auth Feature

Auth components (`app-login`, `app-register`, `app-reset-password`, `app-update-password`, `app-auth-map-layer`, `app-account-feature`) are route-level page components. They have no reusable variant axes and no shared-component promotion candidates. Omitted from the variant table to keep this registry focused on composable building blocks.

---

## Candidate Extractions

The following inline patterns appear in two or more feature templates but have no dedicated shared component yet. Flag before duplicating:

- **Auth form card**: `app-login`, `app-register`, `app-reset-password`, and `app-update-password` all render a centred card with a logo, heading, form body, and submit button using near-identical Tailwind compositions. Candidate for `<app-auth-card>` in `shared/auth/`.
- **Context menu panel**: `app-image-detail-header` and `app-workspace-selected-items-grid` both render an inline `<div>` dropdown list with `dd-item` items positioned via absolute layout. No dedicated component — candidate for `<app-context-menu>` in `shared/`.
- **Empty-state slot**: `app-media-empty` and `app-media-error` both wrap `app-centered-layout` with an icon + heading + optional body text in near-identical structure. Candidate for a generic `<app-empty-state>` in `shared/`.
- **Sortable column header**: `app-projects-table-view` renders sort-direction chevrons inline per column header without a shared directive or component. Candidate for a `[appSortableColumn]` directive in `shared/`.

---

## Figma-Only Gaps

The following variant axes are documented in Figma but have no Angular `@Input` mapping yet:

- `app-media-display` — Figma documents a `staged-reveal` timing variant (fast / slow) that has no input surface; timing is hardcoded in SCSS.
- `app-chip` — Figma documents a `size` axis (`sm` / `md`); the Angular component does not expose a `size` input (all chips render at one size).
- `app-quick-info-chips` — Figma documents a `compact` layout variant; no Angular input maps to it.
- `ss-search-bar` — Figma documents a `condensed` width variant for mobile viewports; no responsive input exists.
