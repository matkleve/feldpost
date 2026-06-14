# registry.primitives-and-layout.supplement

> Linked from [`registry.md`](registry.md). Split-out catalog body; excluded from element-spec lint (`.supplement.md`).

## Shared UI Primitives

### `<app-chip>` — Chip

- **File**: `apps/web/src/app/shared/components/chip/chip.component.ts`
- **Purpose**: Inline label with optional icon, avatar, dismiss action, and semantic color variant.
- **Spec**: [`docs/specs/component/ui-primitives/ui-primitives.chip.md`](ui-primitives/ui-primitives.chip.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `variant` | `ChipVariant` | `default`, `primary`, `status-success`, `status-warning`, `status-danger`, `filetype-image`, `filetype-video`, `filetype-document`, `filetype-spreadsheet`, `filetype-presentation`, `custom` | Fill color and icon color per semantic role |
- **Other inputs**: `icon`, `text`, `avatarSrc`, `avatarAlt`, `dismissible`, `color` (CSS color for `custom`), `maxWidth`, `dismissAriaLabel`
- **Composed of**: standalone, no child `app-*` selectors
- **Used in**: `upload-panel-item.component`, `quick-info-chips.component`, media item badges
- **Gaps**: none

---

### `select[hlmSelect]` — Native Select (spartan-style CVA)

- **File**: `apps/web/src/app/shared/ui/select/` (`HlmSelectDirective`, `selectVariants`, `HLM_SELECT_IMPORTS`)
- **Purpose**: Token-backed styling for native `<select>`; no overlay (`BrnSelect` is a separate future migration).
- **Spec**: `docs/migration/README.md` (Phase 3); native `select[hlmSelect]` in `shared/ui/select/` (legacy `ui-primitives.directive.ts` **removed** 2026-05-16)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `size` | `input` | `sm`, `md`, `lg` | Height, padding, text size |
  | `error` | `boolean` | `false`, `true` | Destructive border / focus ring |
- **Composed of**: standalone directive + CVA
- **Used in**: (opt-in) anywhere a native select uses `hlmSelect`; current callsites still use `[uiSelectControl]` shim
- **Gaps**: overlay combobox (`BrnSelect`) not covered here

---

### `<app-group-header>` — Group Header

- **File**: `apps/web/src/app/shared/ui-primitives/group-header.component.ts`
- **Purpose**: Section heading row used to label grouped lists or grid sections.
- **Spec**: [`docs/specs/component/ui-primitives/ui-primitives.group-header.md`](ui-primitives/ui-primitives.group-header.md)
- **Variant axes**: none (content via `ng-content`)
- **Composed of**: standalone
- **Used in**: item grid grouped views, projects grid sections
- **Gaps**: none

---

### `<app-quick-info-chips>` — Quick Info Chips

- **File**: `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.ts`
- **Purpose**: Horizontal row of icon+label chips summarising item metadata (e.g. file count, date).
- **Spec**: [`docs/specs/component/workspace/quick-info-chips.md`](workspace/quick-info-chips.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `chips[].variant` | `string` | `default`, `filled`, `success`, `warning` | Chip background and icon color |
- **Other inputs**: `chips: ChipDef[]` (each has `icon`, `text`, `variant?`, `title?`)
- **Composed of**: `app-chip` (via `UiChipDirective` / `[hlmBadge]` at callsites)
- **Used in**: media detail view, workspace pane
- **Gaps**: none

---

### `<app-panel-trigger>` — Panel Trigger

- **File**: `apps/web/src/app/shared/panel-trigger/panel-trigger.component.ts`
- **Purpose**: Disclosure trigger button with animated chevron; drives panel open/close state.
- **Spec**: [`docs/specs/component/ui-primitives/panel-trigger.md`](ui-primitives/panel-trigger.md), [`docs/specs/component/ui-primitives/ui-primitives.panel-trigger.md`](ui-primitives/ui-primitives.panel-trigger.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `panelState` | `PanelState` | `closed`, `open` | Chevron rotates 180°; drives `[attr.data-state]` |
  | `layout` | `PanelTriggerLayout` | `icon-text-action`, `text-action` | Horizontal padding variant |
- **Other inputs**: `disabled: boolean`
- **Composed of**: standalone (no child `app-*`)
- **Used in**: workspace pane toolbar panel sections
- **Gaps**: none

---

### `<app-menu-panel-search-row>` — Menu panel search row

- **File**: `apps/web/src/app/shared/menu-panel/menu-panel-search-row.component.ts`
- **Purpose**: Search field + clear + projected search-action slots for menu panels.
- **Spec**: [`docs/specs/component/ui-primitives/menu-panel-search-row.md`](ui-primitives/menu-panel-search-row.md)
- **Composed of**: `hlmBtn` for clear; projects `[dropdown-search-action]`
- **Used in**: `app-standard-dropdown` (sort, grouping, projects)

---

### `<app-menu-panel-scroll-region>` — Menu panel scroll region

- **File**: `apps/web/src/app/shared/menu-panel/menu-panel-scroll-region.component.ts`
- **Purpose**: Scroll host for `[dropdown-items]` with `scrollMode` contract.
- **Spec**: [`docs/specs/component/ui-primitives/menu-panel-scroll-region.md`](ui-primitives/menu-panel-scroll-region.md)
- **Used in**: `app-standard-dropdown`

---

### `<app-menu-panel-footer-action>` — Menu panel footer action

- **File**: `apps/web/src/app/shared/menu-panel/menu-panel-footer-action.component.ts`
- **Purpose**: Full-width footer add action row.
- **Spec**: [`docs/specs/component/ui-primitives/menu-panel-footer-action.md`](ui-primitives/menu-panel-footer-action.md)
- **Used in**: `app-standard-dropdown` (filter, projects)

---

### `<app-toolbar-dropdown-stack>` — Toolbar dropdown stack

- **File**: `apps/web/src/app/shared/dropdown-trigger/toolbar/toolbar-dropdown-stack.component.ts`
- **Purpose**: DRY `app-dropdown-shell` wiring for workspace/projects/media toolbars.
- **Spec**: [`docs/specs/component/filters/dropdown-system.md`](filters/dropdown-system.md)
- **Used in**: `workspace-toolbar`, `projects-toolbar`, `media.component`

---

### `<app-popover>` — Popover

- **File**: `apps/web/src/app/shared/popover/popover.component.ts`
- **Purpose**: Chrome-only floating surface shell; parent owns positioning and dismiss logic.
- **Spec**: [`docs/specs/component/ui-primitives/popover.md`](ui-primitives/popover.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `scrollable` | `boolean` | `false`, `true` | Adds internal scroll overflow |
- **Other inputs**: `panelClass: string` (extra CSS classes), `minWidth: number | null`, `maxWidth: number | null`
- **Composed of**: standalone
- **Used in**: dropdown shell, context menus, any floating overlay panel
- **Gaps**: none

---

### ~~`<app-segmented-switch>`~~ — DEPRECATED (removed)

> **Status:** Component file deleted. All callsites migrated to `[hlmPillToggle]` + `[hlmToggleGroup]` + `[hlmToggleGroupItem]` (see entry below).

- **Replacement**: `[hlmPillToggle]` directives
- **Spec**: [`docs/specs/component/filters/segmented-switch.md`](filters/segmented-switch.md) (historical reference only)

---

### `[hlmPillToggle]` + `[hlmToggleGroup]` + `[hlmToggleGroupItem]` — Spartan toggle-group shims

- **File**: `apps/web/src/app/shared/ui/toggle-group/` (`HlmPillToggleDirective`, `HlmToggleGroupDirective`, `HlmToggleGroupItemDirective`, `toggle-group-variants.ts`, `HLM_TOGGLE_GROUP_IMPORTS`)
- **Purpose**: Segmented pill rows/columns: **brain** `BrnToggleGroup` / `BrnToggleGroupItem` plus local **helm** CVA for items and a **pill shell** wrapper (`[hlmPillToggle]`) that replaces the removed global `hlm-toggle-group.scss` (track, density vars, motion-safe transitions via `pillToggleVariants` / `toggleGroupVariants`).
- **Spec**: [`docs/migration/phase-8-global-scss-elimination.md`](../../migration/phase-8-global-scss-elimination.md) §6; Phase 3 notes in [`docs/migration/README.md`](../../migration/README.md)
- **Wiring**: `imports: [...BrnToggleGroupImports, ...HLM_TOGGLE_GROUP_IMPORTS]` on the standalone host; outer host or inner `div` carries `hlmPillToggle`; child `hlmToggleGroup` + `hlmToggleGroupItem` per spartan brain API.
- **Variant axes (`[hlmPillToggle]` inputs)**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `size` | `PillToggleSize` | `sm`, `md`, `lg` | Shell padding / density CSS vars |
  | `fill` | `boolean` | `false`, `true` | Full-width track |
  | `hasInactive` | `boolean` | `false`, `true` | Inactive segment affordance |
  | `vertical` | `boolean` | `false`, `true` | Column shell (map-style switch uses feature SCSS for pierced items where needed) |
- **Composed of**: `@spartan-ng/brain/toggle-group` + local helm directives (no `@spartan-ng/ui-toggle-group-helm` until Phase 9 peers allow)
- **Used in**: `map-shell`, `projects-view-toggle`, `projects-toolbar`, `media`, `upload-panel`, `settings-overlay`, `workspace-toolbar` templates
- **Gaps**: published `@spartan-ng/ui-toggle-group-helm` swap (Phase 9)

---

### ~~`<app-card-variant-switch>`~~ — DEPRECATED (removed)

> **Status:** Component file deleted. Card variant cycling is now inline in toolbar templates using `[hlmToggleGroup]` + `card-variant-toggle.helpers.ts`.

- **Replacement**: Inline `[hlmToggleGroup]` wiring per toolbar + `apps/web/src/app/shared/workspace-pane/toolbar/card-variant-toggle.helpers.ts`
- **Spec**: [`docs/specs/component/ui-primitives/ui-primitives.card-variant-switch.md`](ui-primitives/ui-primitives.card-variant-switch.md) (historical reference only)

---

### `<app-card-grid>` — Card Grid

- **File**: `apps/web/src/app/shared/ui-primitives/card-grid.component.ts`
- **Purpose**: CSS grid container that adapts column count and gap to the active `CardVariant`.
- **Spec**: [`docs/specs/component/ui-primitives/ui-primitives.card-grid.md`](ui-primitives/ui-primitives.card-grid.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `variant` | `CardVariant` | `row`, `small`, `medium`, `large` | Grid template columns and gap |
- **Composed of**: standalone (`ng-content`)
- **Used in**: projects grid view
- **Gaps**: none

---

## Containers

### `<app-centered-layout>` — Centered Layout

- **File**: `apps/web/src/app/shared/containers/centered-layout.component.ts`
- **Purpose**: Full-area flex container that centres content — for empty states, error screens, loading placeholders.
- **Spec**: [`docs/specs/component/containers/containers.md`](containers/containers.md)
- **Variant axes**: none
- **Composed of**: standalone (`ng-content`)
- **Used in**: `app-media-empty`, `app-media-error`, auth pages
- **Gaps**: none

---

### `<app-max-width-container>` — Max-Width Container

- **File**: `apps/web/src/app/shared/containers/max-width-container.component.ts`
- **Purpose**: Block container that constrains content width to the design system's page-max-width token.
- **Spec**: [`docs/specs/component/containers/containers.md`](containers/containers.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: projects page, media page header
- **Gaps**: none

---

### `<app-page-container>` — Page Container

- **File**: `apps/web/src/app/shared/containers/page-container.component.ts`
- **Purpose**: Full-height page shell with standard top/side padding; wraps top-level page content.
- **Spec**: [`docs/specs/component/containers/containers.md`](containers/containers.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: projects page, media page, account page
- **Gaps**: none

---

### `<app-vstack>` — VStack

- **File**: `apps/web/src/app/shared/containers/stack.component.ts`
- **Purpose**: Vertical flex-column layout utility with token-based gap.
- **Spec**: [`docs/specs/component/containers/containers.md`](containers/containers.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `spacing` | `number` | `1–8` (maps to `--spacing-{n}` — [`docs/design/tokens.md`](../../design/tokens.md); layers [`docs/design/token-layers.md`](../../design/token-layers.md)) | Vertical gap between children |
- **Composed of**: standalone
- **Used in**: dialogs, detail forms, settings overlay
- **Gaps**: none

---

### `<app-hstack>` — HStack

- **File**: `apps/web/src/app/shared/containers/stack.component.ts`
- **Purpose**: Horizontal flex-row layout utility with token-based gap.
- **Spec**: [`docs/specs/component/containers/containers.md`](containers/containers.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `spacing` | `number` | `1–8` (maps to `--spacing-{n}` — [`docs/design/tokens.md`](../../design/tokens.md); layers [`docs/design/token-layers.md`](../../design/token-layers.md)) | Horizontal gap between children |
- **Composed of**: standalone
- **Used in**: toolbar rows, chip rows, dialog actions
- **Gaps**: none

---

## Dropdown System

### `<app-dropdown-shell>` — Dropdown Shell

- **File**: `apps/web/src/app/shared/dropdown-trigger/shell/dropdown-shell.component.ts`
- **Purpose**: Absolutely-positioned floating container that houses any dropdown panel; parent sets `top`/`left`.
- **Spec**: [`docs/specs/component/filters/dropdown-system.md`](filters/dropdown-system.md)
- **Variant axes**: none (visual geometry is fixed)
- **Other inputs**: `top: number` (required), `left: number` (required), `panelClass: string`, `outsideCloseEnabled: boolean`
- **Composed of**: `app-popover`
- **Used in**: `app-filter-dropdown`, `app-grouping-dropdown`, `app-sort-dropdown`, `app-standard-dropdown`
- **Gaps**: none

---

### `<app-standard-dropdown>` — Standard Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/standard/standard-dropdown.component.ts`
- **Purpose**: Generic searchable list dropdown with optional action button; used wherever a filtered list selection is needed.
- **Spec**: [`docs/specs/component/filters/dropdown-system.md`](filters/dropdown-system.md)
- **Variant axes**: none (behaviour flags only)
- **Other inputs**: `showSearch`, `searchPlaceholder`, `searchTerm`, `showDefaultClearAction`, `clearSearchAriaLabel`, `itemsClass`, `actionIcon`
- **Composed of**: `app-dropdown-shell`
- **Used in**: `app-projects-dropdown`, various filter dropdowns
- **Gaps**: none

---

### `<app-filter-dropdown>` — Filter Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/filter/filter-dropdown.component.ts`
- **Purpose**: Domain-aware filter builder dropdown with property + operator + value selection.
- **Spec**: [`docs/specs/component/filters/filter-dropdown.md`](filters/filter-dropdown.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`, `app-standard-dropdown`
- **Used in**: `app-workspace-toolbar`, `app-projects-toolbar`
- **Gaps**: none

---

### `<app-grouping-dropdown>` — Grouping Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/grouping/grouping-dropdown.component.ts`
- **Purpose**: Drag-reorderable grouping property selector dropdown.
- **Spec**: [`docs/specs/component/filters/grouping-dropdown.md`](filters/grouping-dropdown.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`, CDK drag-drop
- **Used in**: `app-workspace-toolbar`, `app-projects-toolbar`
- **Gaps**: none

---

### `<app-sort-dropdown>` — Sort Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/sort/sort-dropdown.component.ts`
- **Purpose**: Multi-sort configuration dropdown; supports asc/desc direction per property.
- **Spec**: [`docs/specs/component/filters/sort-dropdown.md`](filters/sort-dropdown.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`
- **Used in**: `app-workspace-toolbar`, `app-projects-toolbar`
- **Gaps**: none

---

## Item Grid

### `<app-item-grid>` — Item Grid

- **File**: `apps/web/src/app/shared/item-grid/item-grid.component.ts`
- **Purpose**: CSS grid host element that switches layout density based on `ItemDisplayMode`.
- **Spec**: [`docs/specs/component/item-grid/item-grid.md`](item-grid/item-grid.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `mode` | `ItemDisplayMode` | `grid-sm`, `grid-md`, `grid-lg`, `row`, `card` | Grid column template and gap |
- **Other inputs**: `role: string | null`
- **Composed of**: standalone (grid host for domain item components)
- **Used in**: `app-media-content`, `app-workspace-selected-items-grid`
- **Gaps**: none

---

### `<app-item-state-frame>` — Item State Frame

- **File**: `apps/web/src/app/shared/item-grid/item-state-frame.component.ts`
- **Purpose**: Shared state-layer wrapper that renders loading pulse, error surface, and empty overlay for any domain item.
- **Spec**: [`docs/specs/component/item-grid/item-state-frame.md`](item-grid/item-state-frame.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `state` | `ItemVisualState` | `content`, `loading`, `error`, `empty`, `selected`, `disabled` | State layer visibility and dimming |
- **Other inputs**: `mode: ItemDisplayMode`
- **Composed of**: standalone (wraps domain item content via `ng-content`)
- **Used in**: `app-media-item`, `app-project-card`
- **Gaps**: none

---

## Media Rendering

### `<app-universal-media>` — Universal Media

- **File**: `apps/web/src/app/shared/media/universal-media.component.ts`
- **Purpose**: Adapter boundary for rendering any media file (image, video, document) at a requested tier; handles download orchestration and upload overlays.
- **Spec**: @no-spec (rendering contract defined in `docs/specs/component/media/media-display.md`)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `context` | `MediaContext` | `grid`, `detail`, `lightbox` | Sizing and quality tier hints |
  | `requestedTier` | `MediaTier` | `small`, `medium`, `large`, `original` | Resolution tier requested |
  | `fit` | `'contain' \| 'cover'` | `contain`, `cover` | CSS `object-fit` |
- **Other inputs**: `fileIdentity`, `renderState`, `uploadOverlay`, `altText`, `interactive`, `slotWidthRem`, `slotHeightRem`, `minHeightRem`
- **Composed of**: standalone
- **Used in**: `app-media-item-render-surface`, `app-media-detail-media-viewer`
- **Gaps**: none

---

### `<app-media-display>` — Media Display

- **File**: `apps/web/src/app/shared/media-display/media-display.component.ts`
- **Purpose**: Progressive-reveal image viewer with ratio-lock, staged content transitions, and viewport intersection.
- **Spec**: [`docs/specs/component/media/media-display.md`](media/media-display.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `[attr.data-state]` | `MediaDisplayState` (internal) | `idle`, `ratio-known-contain`, `loading-surface-visible`, `media-ready`, `content-fade-in`, `content-visible` | Staged reveal animation progression |
- **Composed of**: standalone (no child `app-*`)
- **Used in**: `app-universal-media`
- **Gaps**: `@figma-only` — staged reveal timing variants not yet surfaced as inputs

---

### `<app-media-item>` — Media Item

- **File**: `apps/web/src/app/shared/media-item/media-item.component.ts`
- **Purpose**: Domain item for a single image in a grid or list; owns selection, upload, and quiet-action sub-layers.
- **Spec**: [`docs/specs/component/media/media-item.md`](media/media-item.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `state` | `MediaItemState` | `idle`, `selected`, `uploading`, `error` | Selection ring, upload overlay visibility |
- **Composed of**: `app-media-item-render-surface`, `app-media-item-quiet-actions`, `app-media-item-upload-overlay`
- **Used in**: `app-media-content`, `app-workspace-selected-items-grid`
- **Gaps**: none

---

### `<app-media-item-render-surface>` — Media Item Render Surface

- **File**: `apps/web/src/app/shared/media-item/media-item-render-surface.component.ts`
- **Purpose**: Visual geometry owner for the media thumbnail; renders the correct state layer (loading, content, selected ring, error, no-media placeholder).
- **Spec**: [`docs/specs/component/media/media-item.md`](media/media-item.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `state` | `MediaItemRenderSurfaceState` | `loading`, `content`, `content-selected`, `error`, `no-media` | Thumbnail content / selected ring / error surface |
- **Composed of**: `app-universal-media`, `app-chip`
- **Used in**: `app-media-item`
- **Gaps**: none

---

### `<app-media-item-quiet-actions>` — Media Item Quiet Actions

- **File**: `apps/web/src/app/shared/media-item/media-item-quiet-actions.component.ts`
- **Purpose**: Hover-reveal action overlay for a media item (select checkbox, map pin, open-detail button).
- **Spec**: [`docs/specs/component/media/media-item-quiet-actions.md`](media/media-item-quiet-actions.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `state` | `MediaItemQuietActionsState` | `interactive-unselected`, `interactive-selected`, `interactive-map-disabled`, `interactive-selected-map-disabled`, `disabled` | Button visibility, checkbox state, map button disabled |
- **Composed of**: standalone (UI primitive button directives)
- **Used in**: `app-media-item`
- **Gaps**: none

---

### `<app-media-item-map-action>` — Media Item Map Action

- **File**: `apps/web/src/app/shared/media-item/media-item-map-action.component.ts`
- **Purpose**: Tile map quiet action — zoomable location picker (0 / 1 / 2–5 / 6+ affordances).
- **Spec**: [`docs/specs/component/media/media-item-map-action.md`](media/media-item-map-action.md)
- **Glossary**: [`media-locations.zoomable-map-contract.supplement.md`](../service/media-locations/media-locations.zoomable-map-contract.supplement.md)
- **Composed of**: `app-dropdown-shell`, `app-standard-dropdown`
- **Used in**: `app-media-item-quiet-actions`
- **Gaps**: none

---

### `<app-media-item-upload-overlay>` — Media Item Upload Overlay

- **File**: `apps/web/src/app/shared/media-item/media-item-upload-overlay.component.ts`
- **Purpose**: Overlay layer rendered atop a media item during active upload (progress, cancel, retry).
- **Spec**: [`docs/specs/component/media/media-item-upload-overlay.md`](media/media-item-upload-overlay.md)
- **Variant axes**: state is driven via `UploadOverlayState` input (not a visual enum input — functional data)
- **Composed of**: standalone
- **Used in**: `app-media-item`
- **Gaps**: none

---

## Dialogs

### `<app-confirm-dialog>` — Confirm Dialog

- **File**: `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.ts`
- **Purpose**: Modal confirmation dialog with confirm/cancel actions; danger variant applies destructive styling.
- **Spec**: [`docs/specs/component/confirm-dialog/confirm-dialog.md`](confirm-dialog/confirm-dialog.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `danger` | `boolean` | `true`, `false` | Destructive confirm button colour |
- **Other inputs**: `title: string` (required), `message: string` (required), `confirmLabel`, `cancelLabel`
- **Composed of**: standalone
- **Used in**: projects, upload panel, media delete actions
- **Gaps**: none

---

### `<app-text-input-dialog>` — Text Input Dialog

- **File**: `apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.ts`
- **Purpose**: Modal dialog with a single text field; used for rename and create-name flows.
- **Spec**: [`docs/specs/component/text-input-dialog/text-input-dialog.md`](text-input-dialog/text-input-dialog.md)
- **Variant axes**: none
- **Other inputs**: `title: string` (required), `message`, `placeholder`, `confirmLabel`, `cancelLabel`, `initialValue`
- **Composed of**: standalone
- **Used in**: project rename, new project creation
- **Gaps**: none

---

### `<app-project-select-dialog>` — Project Select Dialog

- **File**: `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.ts`
- **Purpose**: Modal dialog for selecting one project from a list; used when assigning media to a project.
- **Spec**: [`docs/specs/component/project-select-dialog/project-select-dialog.md`](project-select-dialog/project-select-dialog.md)
- **Variant axes**: none
- **Other inputs**: `title: string` (required), `options: ProjectSelectOption[]` (required), `message`, `confirmLabel`, `cancelLabel`
- **Composed of**: standalone
- **Used in**: `app-workspace-pane-footer`, `app-workspace-selected-items-grid`
- **Gaps**: none

---

### `<app-share-link-audience-dialog>` — Share Link Audience Dialog

- **File**: `apps/web/src/app/shared/share-link-audience-dialog/share-link-audience-dialog.component.ts`
- **Purpose**: Modal dialog for choosing audience (public / named recipients) before creating a share link.
- **Spec**: [`docs/specs/component/workspace/share-link-audience-dialog.md`](workspace/share-link-audience-dialog.md)
- **Variant axes**: none (single audience-selection flow)
- **Composed of**: standalone
- **Used in**: `app-workspace-pane-footer`
- **Gaps**: none

---

### `<app-photo-lightbox>` — Photo Lightbox

- **File**: `apps/web/src/app/shared/photo-lightbox/photo-lightbox.component.ts`
- **Purpose**: Full-screen image viewer overlay.
- **Spec**: [`docs/specs/component/media/photo-lightbox.md`](media/photo-lightbox.md)
- **Variant axes**: none
- **Other inputs**: `imageUrl: string` (required)
- **Composed of**: standalone
- **Used in**: `app-media-detail-media-viewer`
- **Gaps**: none

---

## Toast Notifications

### `<ss-toast-container>` — Toast Container

- **File**: `apps/web/src/app/shared/toast/toast-container.component.ts`
- **Purpose**: Fixed-position host that stacks and animates active toast items; driven by `ToastService`.
- **Spec**: @no-spec
- **Variant axes**: none (service-driven)
- **Composed of**: `ss-toast-item`
- **Used in**: `app-authenticated-app-layout` (root outlet)
- **Gaps**: none

---

### `<ss-toast-item>` — Toast Item

- **File**: `apps/web/src/app/shared/toast/toast-item.component.ts`
- **Purpose**: Single toast notification row with icon, message, and enter/exit animation.
- **Spec**: @no-spec
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `item.type` | `string` | `success`, `error`, `warning`, `info` | Icon and background colour |
- **Other inputs**: `item: ToastItem` (required, passed by `ss-toast-container`)
- **Composed of**: standalone
- **Used in**: `ss-toast-container`
- **Gaps**: none

---

## Account

### `<app-account>` — Account Settings

- **File**: `apps/web/src/app/shared/account/account.component.ts`
- **Purpose**: User account management panel (email, password, MFA, session).
- **Spec**: [`docs/specs/component/account/account.md`](account/account.md)
- **Variant axes**: none
- **Composed of**: standalone (uses toast service, auth service)
- **Used in**: `app-account-feature`
- **Gaps**: none

---

## View Toggle

### ~~`<app-projects-view-toggle>`~~ — DEPRECATED (removed)

> **Status:** Component file deleted (only README remains in `shared/view-toggle/`). View mode switching is inline in projects toolbar via `[hlmToggleGroup]`.

- **Replacement**: Inline `[hlmToggleGroup]` in projects toolbar
- **Spec**: [`docs/specs/component/project/projects-view-toggle.md`](project/projects-view-toggle.md) (historical reference only)

---

