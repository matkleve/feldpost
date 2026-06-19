# registry.workspace-pane.supplement

> Linked from [`registry.md`](registry.md). Split-out catalog body; excluded from element-spec lint (`.supplement.md`).

## Workspace Pane — Shell

### ~~`<app-workspace-pane-shell>`~~ — DEPRECATED (merged into `app-workspace-pane`)

> **Status:** Merged. Shell logic now lives in `workspace-pane.component.ts`. The `app-drag-divider` is composed directly by `app-workspace-pane`.

- **Replacement**: `app-workspace-pane` (see below)
- **Original file**: removed — logic merged into `apps/web/src/app/shared/workspace-pane/shell/workspace-pane.component.ts`

---

### `<app-workspace-pane>` — Workspace Pane

- **File**: `apps/web/src/app/shared/workspace-pane/shell/workspace-pane.component.ts`
- **Purpose**: Composite workspace pane orchestrator; switches between selected-items grid and media detail based on `activeTab`.
- **Spec**: [`docs/specs/component/workspace/sidebar.md`](workspace/sidebar.md)
- **Variant axes**: none (tab switching is functional, not visual variant)
- **Other inputs**: `title`, `titleEditable`, `titleEditEnabled`, `titleEditValue`, `colorPickerEnabled`, `colorPickerOpen`, `detailAddressSearchRequestId`
- **Composed of**: `app-workspace-pane-header`, `app-workspace-pane-toolbar`, `app-workspace-selected-items-grid`, `app-media-detail-view`, `app-workspace-pane-footer`, `app-group-tab-bar`
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

### `<app-drag-divider>` — Drag Divider

- **File**: `apps/web/src/app/shared/workspace-pane/shell/drag-divider/drag-divider.component.ts`
- **Purpose**: Draggable resize handle that emits width-change events for the workspace pane.
- **Spec**: [`docs/specs/component/workspace/drag-divider.md`](workspace/drag-divider.md)
- **Variant axes**: none
- **Other inputs**: `currentWidth: number` (required)
- **Composed of**: standalone
- **Used in**: `app-workspace-pane`
- **Gaps**: none

---

## Workspace Pane — Chrome

### `<app-pane-header>` — Pane Header

- **File**: `apps/web/src/app/shared/pane-chrome/header/pane-header.component.ts`
- **Purpose**: Workspace pane title row with optional inline edit and colour-picker trigger.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `title`, `editable`, `editEnabled`, `editValue`, `colorPickerEnabled`, `colorPickerOpen`
- **Composed of**: standalone
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

- **File**: `apps/web/src/app/shared/pane-chrome/toolbar/pane-toolbar.component.ts`
- **Purpose**: Generic toolbar row slot (`ng-content`) for workspace pane chrome.
- **Spec**: [`docs/specs/component/workspace/pane-toolbar.md`](workspace/pane-toolbar.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: workspace pane chrome toolbar
- **Gaps**: none

---

### `<app-workspace-toolbar>` — Workspace Toolbar

- **File**: `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component.ts`
- **Purpose**: Domain toolbar (sort, filter, grouping) inside the workspace pane.
- **Spec**: @no-spec
- **Variant axes**: none
- **Composed of**: `app-toolbar-dropdown-stack`, filter/grouping/sort dropdowns
- **Used in**: `app-workspace-pane`
- **Gaps**: `@no-spec`

---

## Workspace Pane — Footer

### `<app-pane-footer>` — Pane Footer

- **File**: `apps/web/src/app/shared/pane-chrome/footer/pane-footer.component.ts`
- **Purpose**: Generic footer row slot for workspace pane chrome.
- **Spec**: [`docs/specs/component/workspace/pane-footer.md`](workspace/pane-footer.md)
- **Variant axes**: none
- **Composed of**: standalone
- **Used in**: workspace pane footer area
- **Gaps**: none

---

### `<app-workspace-pane-footer>` — Workspace Pane Footer

- **File**: `apps/web/src/app/shared/workspace-pane/footer/workspace-pane-footer/workspace-pane-footer.component.ts`
- **Purpose**: Footer action bar for the workspace pane; compact toolbar for selection, export/share, bulk location delete, and bulk media delete.
- **Spec**: [`docs/specs/component/workspace/workspace-pane-footer.md`](workspace/workspace-pane-footer.md)
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
- **Composed of**: `app-filter-dropdown`, `app-grouping-dropdown`, `app-sort-dropdown`, `app-projects-dropdown`, inline `[hlmToggleGroup]` card variant, `app-panel-trigger`, `app-sorting-controls`
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
- **Composed of**: `app-media-detail-header`, `app-media-detail-inline-section`, `app-metadata-section`, `app-detail-actions`, `app-media-detail-media-viewer`, `app-captured-date-editor`, `app-address-search`
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
- **Used in**: `app-media-detail-inline-section`
- **Gaps**: none

---

### `<app-calendar-dropdown>` — Calendar Dropdown

- **File**: `apps/web/src/app/shared/calendar-dropdown/calendar-dropdown.component.ts` *(planned)*
- **Purpose**: Locale-aware date/time field + body-portaled calendar popover; shared across Timespace and Media Detail.
- **Spec**: [`docs/specs/component/filters/calendar-dropdown.md`](filters/calendar-dropdown.md)
- **Variant axes**: `timeMode` (`dateOnly` \| `optionalTime` \| `requiredTime`), `minDate`, `maxDate`, `nullable`
- **Composed of**: `app-calendar-picker-panel` (portal)
- **Used in**: `app-timespace-dropdown`, `app-media-detail-inline-section` *(after migration)*
- **Gaps**: not implemented — replaces `app-compact-date-field`, `app-captured-date-editor`

---

### `<app-captured-date-editor>` — Captured Date Editor *(legacy)*

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/captured-date-editor.component.ts`
- **Purpose**: Inline date+time editor for the image capture timestamp.
- **Spec**: [`docs/specs/component/filters/captured-date-editor.md`](filters/captured-date-editor.md) — **superseded by** [`calendar-dropdown.md`](filters/calendar-dropdown.md)
- **Variant axes**: `dateOnly` input only
- **Composed of**: standalone
- **Used in**: `app-media-detail-inline-section`, `app-compact-date-field`
- **Gaps**: migrate to `app-calendar-dropdown`; then delete

---

### `<app-location-picker-row>` — Location Picker Row

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/location-picker-row/location-picker-row.component.ts`
- **Purpose**: Shared two-line format D content (icon + primary + optional secondary) inside location add/search dropdown option buttons.
- **Spec**: [`docs/specs/ui/media-detail/media-detail-location-section.md`](../../ui/media-detail/media-detail-location-section.md)
- **Variant axes**: none
- **Other inputs**: `primary`, `secondary`, `icon` (Material ligature)
- **Composed of**: standalone
- **Used in**: `app-media-location-add-search`
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

### `<app-media-detail-header>` — Media Detail Header

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-header/media-detail-header.component.ts`
- **Purpose**: Title row of the media detail panel with inline rename and context menu.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `editingTitle: boolean`, `showContextMenu: boolean`
- **Composed of**: standalone
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-media-detail-inline-section>` — Media Detail Inline Section

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.ts`
- **Purpose**: Inline editing section for date, address, and project assignment in the media detail panel.
- **Spec**: @no-spec
- **Variant axes**: none
- **Other inputs**: `detailViewLabel`, `mediaTypeLabel`, `editDate`, `editTime`, `projectName`, `fullAddress`, `projectSearch`, `projectCanCreate`, `canAssignMultipleProjects`, `isGpsAssignmentLocked`, `isCorrected`, `saving`
- **Composed of**: `app-editable-property-row`, `app-calendar-dropdown` *(target)*, `app-address-search`
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-address-field-combobox>` — Address Field Combobox

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/address-field-combobox/address-field-combobox.component.ts`
- **Purpose**: Per-field combobox that provides hierarchically-constrained address suggestions (country/city/district/street) when editing individual address rows in the media detail location section. Assistive — free-text always allowed.
- **Spec**: [`docs/specs/component/address-field-combobox/address-field-combobox.md`](../address-field-combobox/address-field-combobox.md)
- **Variant axes**: `field` (`country` | `city` | `district` | `street`), `verificationState` (`verified` | `unverified` | `unknown`)
- **Outputs**: `valueChange`, `suggestionSelected`, `resolveRequested`
- **Composed of**: `app-dropdown-shell`
- **Used in**: `app-media-detail-location-section`
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
- **Purpose**: Notion-style custom metadata list and compose add-row in media detail.
- **Spec**: [`docs/specs/ui/media-detail/metadata-section.md`](../ui/media-detail/metadata-section.md)
- **Variant axes**: none
- **Composed of**: `app-metadata-property-row`, `app-metadata-type-picker`, `app-metadata-property-picker`, `app-metadata-value-editor`
- **Used in**: `app-media-detail-view`
- **Gaps**: none

---

### `<app-metadata-type-picker>` — Metadata Type Picker

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/metadata/metadata-type-picker.component.ts`
- **Purpose**: Icon-only outline type trigger (text / number / date) for metadata compose.
- **Spec**: [`docs/specs/ui/media-detail/metadata-type-picker.md`](../ui/media-detail/metadata-type-picker.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`, Spartan menu
- **Used in**: `app-metadata-section`
- **Gaps**: none

---

### `<app-metadata-property-picker>` — Metadata Property Picker

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/metadata/metadata-property-picker.component.ts`
- **Purpose**: Searchable property name picker with type icon + name chips (Projects-dropdown pattern).
- **Spec**: [`docs/specs/ui/media-detail/metadata-property-picker.md`](../ui/media-detail/metadata-property-picker.md)
- **Variant axes**: none
- **Composed of**: `app-dropdown-shell`, `app-standard-dropdown`
- **Used in**: `app-metadata-section`
- **Gaps**: none

---

### `<app-metadata-value-editor>` — Metadata Value Editor

- **File**: `apps/web/src/app/shared/workspace-pane/media-detail/metadata/metadata-value-editor.component.ts`
- **Purpose**: Type-aware value input (`text` / `number` / `date`); emits raw strings only.
- **Spec**: @no-spec (covered by metadata-section compose contract)
- **Variant axes**: `valueType`
- **Composed of**: standalone
- **Used in**: `app-metadata-section`, `app-metadata-property-row`
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

