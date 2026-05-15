# Component Registry

> Source of truth for reusable Angular components in the Feldpost app.
> Consult before creating any new component. If a required variant is absent, flag it — do not invent.

## How to Use

1. Search this file for the UI pattern you need.
2. If found: use the listed selector and pass the documented variant inputs.
3. If the exact variant is missing: stop, flag it in a comment, and ask before implementing.
4. If no component covers the pattern: propose extraction before writing inline HTML.

---

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
- **Spec**: `docs/migration/README.md` (Phase 3); legacy shim `select[uiSelectControl]` in `ui-primitives.directive.ts`
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

### `<app-segmented-switch>` — Segmented Switch

- **File**: `apps/web/src/app/shared/segmented-switch/segmented-switch.component.ts`
- **Purpose**: Pill-style multi-option control (keyboard-navigable, ARIA `radiogroup`).
- **Spec**: [`docs/specs/component/filters/segmented-switch.md`](filters/segmented-switch.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `size` | `SegmentedSwitchSize` | `sm`, `md`, `lg` | Button height and font size |
- **Other inputs**: `options: SegmentedSwitchOption[]`, `value`, `valueChange`
- **Composed of**: standalone
- **Used in**: `app-card-variant-switch`, `app-projects-toolbar`, `ss-settings-overlay`, `app-workspace-toolbar`
- **Gaps**: none

---

### `<app-card-variant-switch>` — Card Variant Switch

- **File**: `apps/web/src/app/shared/ui-primitives/card-variant-switch.component.ts`
- **Purpose**: Segmented control for choosing the active `CardVariant` (thumbnail size / display density).
- **Spec**: [`docs/specs/component/ui-primitives/ui-primitives.card-variant-switch.md`](ui-primitives/ui-primitives.card-variant-switch.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `size` | `'sm' \| 'md' \| 'lg'` | `sm`, `md`, `lg` | Control size (passed to inner segmented switch) |
- **Other inputs**: `value: CardVariant` (required), `allowed: ReadonlyArray<CardVariant>` (default: all four), `valueChange`
- **Composed of**: `app-segmented-switch`
- **Used in**: `app-workspace-toolbar`, `app-projects-toolbar`, `app-media`
- **Gaps**: none

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
  | `spacing` | `number` | `1–8` (maps to `--spacing-{n}`) | Vertical gap between children |
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
  | `spacing` | `number` | `1–8` (maps to `--spacing-{n}`) | Horizontal gap between children |
- **Composed of**: standalone
- **Used in**: toolbar rows, chip rows, dialog actions
- **Gaps**: none

---

## Dropdown System

### `<app-dropdown-shell>` — Dropdown Shell

- **File**: `apps/web/src/app/shared/dropdown-trigger/dropdown-shell.component.ts`
- **Purpose**: Absolutely-positioned floating container that houses any dropdown panel; parent sets `top`/`left`.
- **Spec**: [`docs/specs/component/filters/dropdown-system.md`](filters/dropdown-system.md)
- **Variant axes**: none (visual geometry is fixed)
- **Other inputs**: `top: number` (required), `left: number` (required), `panelClass: string`, `outsideCloseEnabled: boolean`
- **Composed of**: `app-popover`
- **Used in**: `app-filter-dropdown`, `app-grouping-dropdown`, `app-sort-dropdown`, `app-standard-dropdown`
- **Gaps**: none

---

### `<app-standard-dropdown>` — Standard Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/standard-dropdown.component.ts`
- **Purpose**: Generic searchable list dropdown with optional action button; used wherever a filtered list selection is needed.
- **Spec**: [`docs/specs/component/filters/dropdown-system.md`](filters/dropdown-system.md)
- **Variant axes**: none (behaviour flags only)
- **Other inputs**: `showSearch`, `searchPlaceholder`, `searchTerm`, `showDefaultClearAction`, `clearSearchAriaLabel`, `itemsClass`, `actionIcon`
- **Composed of**: `app-dropdown-shell`
- **Used in**: `app-projects-dropdown`, various filter dropdowns
- **Gaps**: none

---

### `<app-filter-dropdown>` — Filter Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/filter-dropdown.component.ts`
- **Purpose**: Domain-aware filter builder dropdown with property + operator + value selection.
- **Spec**: [`docs/specs/component/filters/filter-dropdown.md`](filters/filter-dropdown.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`, `app-standard-dropdown`
- **Used in**: `app-workspace-toolbar`, `app-projects-toolbar`
- **Gaps**: none

---

### `<app-grouping-dropdown>` — Grouping Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/grouping-dropdown.component.ts`
- **Purpose**: Drag-reorderable grouping property selector dropdown.
- **Spec**: [`docs/specs/component/filters/grouping-dropdown.md`](filters/grouping-dropdown.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`, CDK drag-drop
- **Used in**: `app-workspace-toolbar`, `app-projects-toolbar`
- **Gaps**: none

---

### `<app-sort-dropdown>` — Sort Dropdown

- **File**: `apps/web/src/app/shared/dropdown-trigger/sort-dropdown.component.ts`
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

### `<app-projects-view-toggle>` — Projects View Toggle

- **File**: `apps/web/src/app/shared/view-toggle/projects-view-toggle.component.ts`
- **Purpose**: Segmented control that switches between grid/table view modes for the projects page.
- **Spec**: [`docs/specs/component/project/projects-view-toggle.md`](project/projects-view-toggle.md)
- **Variant axes**: none (driven by `ProjectsViewMode` value from parent)
- **Composed of**: `app-segmented-switch`
- **Used in**: `app-projects-toolbar`
- **Gaps**: none

---

## Workspace Pane — Shell

### `<app-workspace-pane-shell>` — Workspace Pane Shell

- **File**: `apps/web/src/app/shared/workspace-pane/shell/workspace-pane-shell.component.ts`
- **Purpose**: Resizable side-panel shell with drag-divider; manages open/closed state and width constraints.
- **Spec**: [`docs/specs/component/workspace/sidebar.md`](workspace/sidebar.md)
- **Variant axes**: none (all behaviour via inputs)
- **Other inputs**: `open: boolean`, `currentWidth: number`, `minWidth: number`, `maxWidth: number`, `defaultWidth: number`
- **Composed of**: `app-workspace-pane`, `app-drag-divider`
- **Used in**: `app-authenticated-app-layout`
- **Gaps**: none

---

### `<app-workspace-pane>` — Workspace Pane

- **File**: `apps/web/src/app/shared/workspace-pane/shell/workspace-pane.component.ts`
- **Purpose**: Composite workspace pane orchestrator; switches between selected-items grid and media detail based on `activeTab`.
- **Spec**: [`docs/specs/component/workspace/sidebar.md`](workspace/sidebar.md)
- **Variant axes**: none (tab switching is functional, not visual variant)
- **Other inputs**: `title`, `titleEditable`, `titleEditEnabled`, `titleEditValue`, `colorPickerEnabled`, `colorPickerOpen`, `detailAddressSearchRequestId`
- **Composed of**: `app-workspace-pane-header`, `app-workspace-pane-toolbar`, `app-workspace-selected-items-grid`, `app-media-detail-view`, `app-workspace-pane-footer`, `app-group-tab-bar`
- **Used in**: `app-workspace-pane-shell`
- **Gaps**: none

---

### `<app-drag-divider>` — Drag Divider

- **File**: `apps/web/src/app/shared/workspace-pane/shell/drag-divider/drag-divider.component.ts`
- **Purpose**: Draggable resize handle that emits width-change events for the workspace pane.
- **Spec**: [`docs/specs/component/workspace/drag-divider.md`](workspace/drag-divider.md)
- **Variant axes**: none
- **Other inputs**: `currentWidth: number` (required)
- **Composed of**: standalone
- **Used in**: `app-workspace-pane-shell`
- **Gaps**: none

---

## Workspace Pane — Chrome

### `<app-pane-header>` — Pane Header

- **File**: `apps/web/src/app/shared/workspace-pane/chrome/pane-header.component.ts`
- **Purpose**: Workspace pane title row with optional inline edit and colour-picker trigger.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `title`, `editable`, `editEnabled`, `editValue`, `colorPickerEnabled`, `colorPickerOpen`
- **Composed of**: standalone
- **Used in**: `app-workspace-pane-header`
- **Gaps**: none

---

### `<app-workspace-pane-header>` — Workspace Pane Header

- **File**: `apps/web/src/app/shared/workspace-pane/chrome/workspace-pane-header/workspace-pane-header.component.ts`
- **Purpose**: Full chrome header for the workspace pane (wraps `app-pane-header` with close/nav controls).
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `title`, `editable`, `editEnabled`, `editValue`, `colorPickerEnabled`, `colorPickerOpen`
- **Composed of**: `app-pane-header`
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

### `<app-group-tab-bar>` — Group Tab Bar

- **File**: `apps/web/src/app/shared/workspace-pane/chrome/group-tab-bar.component.ts`
- **Purpose**: Horizontal tab bar for switching between workspace pane content areas (e.g. selected items vs. detail).
- **Spec**: [`docs/specs/component/workspace/group-tab-bar.md`](workspace/group-tab-bar.md)
- **Variant axes**: none (tab data driven by parent)
- **Composed of**: standalone
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

### `<app-pane-toolbar>` — Pane Toolbar

- **File**: `apps/web/src/app/shared/pane-toolbar/pane-toolbar.component.ts`
- **Purpose**: Generic toolbar row slot (`ng-content`) for workspace pane chrome.
- **Spec**: [`docs/specs/component/workspace/pane-toolbar.md`](workspace/pane-toolbar.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: workspace pane chrome toolbar
- **Gaps**: none

---

### `<app-workspace-pane-toolbar>` — Workspace Pane Toolbar

- **File**: `apps/web/src/app/shared/workspace-pane/chrome/workspace-pane-toolbar/workspace-pane-toolbar.component.ts`
- **Purpose**: Toolbar chrome wrapper specific to the workspace pane (`ng-content`).
- **Spec**: [`docs/specs/component/workspace/pane-toolbar.md`](workspace/pane-toolbar.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

## Workspace Pane — Footer

### `<app-pane-footer>` — Pane Footer

- **File**: `apps/web/src/app/shared/pane-footer/pane-footer.component.ts`
- **Purpose**: Generic footer row slot for workspace pane chrome.
- **Spec**: [`docs/specs/component/workspace/pane-footer.md`](workspace/pane-footer.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: workspace pane footer area
- **Gaps**: none

---

### `<app-workspace-pane-footer>` — Workspace Pane Footer

- **File**: `apps/web/src/app/shared/workspace-pane/footer/workspace-pane-footer/workspace-pane-footer.component.ts`
- **Purpose**: Footer action bar for the workspace pane; handles export, share, project assignment, and bulk actions for the current scope.
- **Spec**: [`docs/specs/component/workspace/pane-footer.md`](workspace/pane-footer.md)
- **Variant axes**: none
- **Other inputs**: `scopeIds: string[]` (required), `images: WorkspaceImage[]` (required)
- **Composed of**: `app-project-select-dialog`, `app-share-link-audience-dialog`, `app-confirm-dialog`
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

## Workspace Pane — Toolbar

### `<app-sorting-controls>` — Sorting Controls

- **File**: `apps/web/src/app/shared/workspace-pane/toolbar/sorting-controls.component.ts`
- **Purpose**: Sort direction toggle buttons (date-desc, date-asc, distance, name) within the workspace toolbar.
- **Spec**: [`docs/specs/component/workspace/sorting-controls.md`](workspace/sorting-controls.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: `app-workspace-toolbar`
- **Gaps**: none

---

### `<app-workspace-toolbar>` — Workspace Toolbar

- **File**: `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component.ts`
- **Purpose**: Full toolbar for workspace views; orchestrates grouping, filter, sort, project dropdowns, and card-variant switch.
- **Spec**: [`docs/specs/component/media/media-toolbar.md`](media/media-toolbar.md)
- **Variant axes**: none (all state from services)
- **Composed of**: `app-filter-dropdown`, `app-grouping-dropdown`, `app-sort-dropdown`, `app-projects-dropdown`, `app-card-variant-switch`, `app-panel-trigger`, `app-sorting-controls`
- **Used in**: `app-map-shell`, `app-media`
- **Gaps**: none

---

### `<app-projects-dropdown>` — Projects Dropdown

- **File**: `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.ts`
- **Purpose**: Multi-select project filter dropdown inside the workspace toolbar.
- **Spec**: [`docs/specs/component/project/projects-dropdown.md`](project/projects-dropdown.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`
- **Used in**: `app-workspace-toolbar`
- **Gaps**: none

---

## Workspace Pane — Media Detail

### `<app-media-detail-view>` — Media Detail View

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-view.component.ts`
- **Purpose**: Full media detail panel; orchestrates metadata display, inline editing, address search, date editor, and action bar.
- **Spec**: @no-spec (behaviour spread across `docs/specs/component/workspace/`)
- **Variant axes**: none
- **Composed of**: `app-image-detail-header`, `app-image-detail-inline-section`, `app-metadata-section`, `app-detail-actions`, `app-media-detail-media-viewer`, `app-captured-date-editor`, `app-address-search`
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

### `<app-metadata-property-row>` — Metadata Property Row

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/metadata-property-row.component.ts`
- **Purpose**: Read-only key/value row for displaying EXIF and system metadata.
- **Spec**: [`docs/specs/component/workspace/metadata-property-row.md`](workspace/metadata-property-row.md)
- **Variant axes**: none
- **Other inputs**: `key: string` (alias `metaKey`, required), `value: string` (alias `metaValue`, required)
- **Composed of**: standalone
- **Used in**: `app-metadata-section`
- **Gaps**: none

---

### `<app-editable-property-row>` — Editable Property Row

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/editable-property-row.component.ts`
- **Purpose**: Inline-editable key/value row; switches between display and edit mode.
- **Spec**: [`docs/specs/component/workspace/editable-property-row.md`](workspace/editable-property-row.md)
- **Variant axes**:
  | Input | Type | Values | Visual effect |
  |---|---|---|---|
  | `readonly` | `boolean` | `false`, `true` | Hides edit affordance; text only |
- **Other inputs**: `label: string` (required), `value: string` (required)
- **Composed of**: standalone
- **Used in**: `app-image-detail-inline-section`
- **Gaps**: none

---

### `<app-captured-date-editor>` — Captured Date Editor

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/captured-date-editor.component.ts`
- **Purpose**: Inline date+time editor for the image capture timestamp.
- **Spec**: [`docs/specs/component/filters/captured-date-editor.md`](filters/captured-date-editor.md)
- **Variant axes**: none (internal state machine; state not surfaced as input)
- **Composed of**: standalone
- **Used in**: `app-image-detail-inline-section`
- **Gaps**: none

---

### `<app-address-search>` — Address Search

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/address-search/address-search.component.ts`
- **Purpose**: Geocoding search input in the media detail panel; suggests forward-geocoded addresses.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `currentAddress: string`
- **Composed of**: standalone
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-detail-actions>` — Detail Actions

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/detail-actions/detail-actions.component.ts`
- **Purpose**: Action button row in the media detail view (download, delete, etc.).
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-image-detail-header>` — Image Detail Header

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-header/media-detail-header.component.ts`
- **Purpose**: Title row of the media detail panel with inline rename and context menu.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `editingTitle: boolean`, `showContextMenu: boolean`
- **Composed of**: standalone
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-image-detail-inline-section>` — Image Detail Inline Section

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.ts`
- **Purpose**: Inline editing section for date, address, and project assignment in the media detail panel.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `detailViewLabel`, `mediaTypeLabel`, `editDate`, `editTime`, `projectName`, `fullAddress`, `projectSearch`, `projectCanCreate`, `canAssignMultipleProjects`, `isGpsAssignmentLocked`, `isCorrected`, `saving`
- **Composed of**: `app-editable-property-row`, `app-captured-date-editor`, `app-address-search`
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-media-detail-media-viewer>` — Media Detail Media Viewer

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-media-viewer/media-detail-media-viewer.component.ts`
- **Purpose**: Media viewer slot in the detail panel; handles full-res preloading, lightbox trigger, and replace-file upload.
- **Spec**: @no-spec
- **Variant axes**: none (state is functional)
- **Other inputs**: `hasPhoto`, `canOpenLightbox`, `imageReady`, `isImageLoading`, `fullResPreloaded`, `displayTitle`, `replacing`, `acceptTypes`
- **Composed of**: `app-universal-media`, `app-photo-lightbox`
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-metadata-section>` — Metadata Section

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/metadata-section/metadata-section.component.ts`
- **Purpose**: Collapsible EXIF/metadata table in the media detail panel.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: `app-metadata-property-row`
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-workspace-selected-items-grid>` — Workspace Selected Items Grid

- **File**: `apps/web/src/app/shared/workspace-pane/selected-items/workspace-selected-items-grid.component.ts`
- **Purpose**: Grouped grid of selected media items in the workspace pane; supports context menus, hover thumbnails, and bulk actions.
- **Spec**: [`docs/specs/component/workspace/active-selection-view.md`](workspace/active-selection-view.md)
- **Variant axes**: none (layout driven by active `ItemDisplayMode`)
- **Composed of**: `app-item-grid`, `app-media-item`, `app-group-header`, `app-project-select-dialog`, `app-confirm-dialog`
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

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
- **Other inputs**: `items: ImageRecord[]` (required), `projectNameFor` (required)
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

- **File**: `apps/web/src/app/features/projects/project-card.component.ts`
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

- **File**: `apps/web/src/app/features/projects/project-color-picker.component.ts`
- **Purpose**: Colour swatch grid for picking a project accent colour.
- **Spec**: [`docs/specs/component/project/project-color-picker.md`](project/project-color-picker.md)
- **Variant axes**: none
- **Other inputs**: `selectedColor: ProjectColorKey` (required)
- **Composed of**: standalone
- **Gaps**: none

---

#### `<app-projects-grid-view>` — Projects Grid View

- **File**: `apps/web/src/app/features/projects/projects-grid-view.component.ts`
- **Purpose**: Grouped card grid layout for the projects page.
- **Spec**: @no-spec
- **Variant axes**: none (variant passed through to `app-project-card`)
- **Composed of**: `app-card-grid`, `app-project-card`, `app-group-header`
- **Gaps**: `@no-spec`

---

#### `<app-projects-table-view>` — Projects Table View

- **File**: `apps/web/src/app/features/projects/projects-table-view.component.ts`
- **Purpose**: Tabular list layout for the projects page with sortable columns.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: standalone
- **Gaps**: `@no-spec`

---

#### `<app-projects-toolbar>` — Projects Toolbar

- **File**: `apps/web/src/app/features/projects/projects-toolbar.component.ts`
- **Purpose**: Toolbar for the projects page: grouping, filter, sort, view-toggle, card-variant switch.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: `app-filter-dropdown`, `app-grouping-dropdown`, `app-sort-dropdown`, `app-projects-view-toggle`, `app-card-variant-switch`
- **Gaps**: `@no-spec`

---

#### `<app-projects-page-header>` — Projects Page Header

- **File**: `apps/web/src/app/features/projects/projects-page-header.component.ts`
- **Purpose**: Title + action header bar for the `/projects` route.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: standalone
- **Gaps**: `@no-spec`

---

### Upload Feature

#### `<app-upload-panel>` — Upload Panel

- **File**: `apps/web/src/app/features/upload/upload-panel.component.ts`
- **Purpose**: Slide-in panel that lists active upload jobs with per-item controls and a drop-zone.
- **Spec**: [`docs/specs/component/upload/upload-panel.md`](upload/upload-panel.md)
- **Variant axes**: none
- **Composed of**: `app-upload-panel-item`, `app-panel-trigger`
- **Used in**: `app-map-shell`
- **Gaps**: none

---

#### `<app-upload-panel-item>` — Upload Panel Item

- **File**: `apps/web/src/app/features/upload/upload-panel-item.component.ts`
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
