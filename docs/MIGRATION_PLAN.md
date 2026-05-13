# Feldpost → spartan/ui Migration Plan

## Status

- **Migration complete — Phase 4 cleanup done (2026-05-13)**
- **Current phase:** Phase 5 in progress — Group A (partial) + **Groups C, E, F, G done (2026-05-13)** — dialogs cleaned to `HLM_*` imports; badges/chips → `hlmBadge`; selects → `hlmSelect`; settings toggles → `hlmSwitch`
- **Last updated:** 2026-05-13
- **Phase 3 complete — all planned molecules and organisms migrated** (within Phase 3 scope: Button ✅, Badge ✅, Input ✅, Label ✅, Card ✅, Select ✅, **Confirm dialog** ✅, **Text input dialog** ✅, **Project select dialog** ✅, **Share link audience dialog** ✅, **Projects confirm dialog** ✅, **DropdownShell** ✅ — local **`hlmMenuContent`** on host (`shared/ui/menu/`); prior `hlmPopover` on shell superseded for panel chrome; rename to `app-popover-shell` deferred)

---

## Project Setup Summary

- **Angular version:** 21.1.0 (standalone components, signals, new control flow syntax)
- **Tailwind version:** 4.3.x (`tailwindcss` + `@tailwindcss/postcss`)
- **Already installed spartan packages:** `@spartan-ng/brain` (monolith; subpath imports e.g. `@spartan-ng/brain/button`); supporting: `class-variance-authority`, `clsx`, `tailwind-merge`, `luxon` (brain peer)
- **Other UI libraries found:**
  - `@angular/cdk` ^21.2.1 — drag-drop only (`grouping-dropdown.component.ts`); CDK overlay CSS imported globally in `tokens.scss`
  - No Angular Material
  - No PrimeNG
  - No ng-select or ng-zorro
- **Global style notes:**
  - `src/styles.scss` loads: tokens → reset → layout → 8 primitive sheets → 3 pattern sheets → Tailwind directives
  - `@angular/cdk/overlay-prebuilt.css` is imported at the top of `tokens.scss` — this must be kept or replaced when spartan's CDK-backed overlay CSS takes over
  - Feldpost runs a **dual token naming system**: legacy `--color-*` / `--radius-*` / `--spacing-*` (v1, still used by most components) AND a new `--fp-sys-color-*` / `--fp-ref-*` / `--fp-alias-*` tree (MD3-inspired, v2, partially adopted). Legacy `:root` tokens remain in `tokens.scss`; tweakcn/spartan foundation lives in `styles.scss` with backward-compat aliases.
  - Dark-mode is controlled by `[data-theme="dark"]` on `<html>`, with a `@media (prefers-color-scheme: dark)` system-preference fallback. Tailwind `darkMode: ['class', '[data-theme="dark"]']` is already wired.
  - Three theme profiles exist: `light` (default), `dark`, `sandstone`. spartan theming must not break these.
  - A "sandstone" custom theme profile exists as a test. spartan variable overrides need to remain under `[data-theme]` wrappers.

---

## Component Inventory

### Atoms

| Component | Path | Current primitives used | spartan/ui candidate | Notes |
|-----------|------|------------------------|----------------------|-------|
| Chip | `shared/components/chip/chip.component.ts` | `button`, `img`, custom classes | `HlmBadge` | Richer than a plain badge (has icon, avatar, dismiss, 10+ color variants). Wrapper over HlmBadge or keep custom |
| Group Header | `shared/ui-primitives/group-header.component.ts` | `ng-content` | no spartan match | Layout header — keep custom |
| Item State Frame | `shared/item-grid/item-state-frame.component.ts` | `ng-content` | `HlmSkeleton` for loading state | Custom stacking layer; skeleton portion replaceable |
| Media Item Render Surface | `shared/media-item/media-item-render-surface.component.ts` | `img` | none | Domain-specific; no spartan match |
| Media Item Upload Overlay | `shared/media-item/media-item-upload-overlay.component.ts` | `ng-content` | none | Domain state overlay |
| Panel Trigger | `shared/panel-trigger/panel-trigger.component.ts` | `button` (uiButton) | `BrnCollapsible` trigger / `HlmButton` | Disclosure toggle; BrnCollapsible provides accessible trigger contract |
| Popover | `shared/popover/popover.component.ts` | custom shell | `HlmPopover` | Currently chrome-only; parent owns positioning. Replacement requires moving to BrnPopover anchor model |
| Dropdown Shell | `shared/dropdown-trigger/dropdown-shell.component.ts` | `position: fixed` custom | `HlmMenu` / `HlmPopover` | Custom positioning shim; replaceable with CDK-backed spartan overlay |
| Toast Item | `shared/toast/toast-item.component.ts` | custom div | `HlmToast` (Sonner-based) | Integrate with spartan toast provider |
| Pane Toolbar | `shared/pane-toolbar/pane-toolbar.component.ts` | `ng-content` | none | App-specific chrome; keep custom |
| Pane Footer | `shared/pane-footer/pane-footer.component.ts` | `ng-content` | none | App-specific chrome; keep custom |
| Card Variant Switch | `shared/ui-primitives/card-variant-switch.component.ts` | `button` | `HlmButton` (ghost) | View-mode toggle |
| Centered Layout | `shared/containers/centered-layout.component.ts` | structural only | none | Layout; keep custom |
| Max Width Container | `shared/containers/max-width-container.component.ts` | structural only | none | Layout; keep custom |
| Stack | `shared/containers/stack.component.ts` | structural only | none | Layout; keep custom |
| Card Grid | `shared/ui-primitives/card-grid.component.ts` | structural only | none | Layout; keep custom |

### Molecules

| Component | Path | Current primitives used | spartan/ui candidate | Notes |
|-----------|------|------------------------|----------------------|-------|
| Standard Dropdown | `shared/dropdown-trigger/standard-dropdown.component.ts` | `button` + `DropdownShell` | `BrnMenu` + `HlmMenu` | **Shim (2026-05-13):** `[hlmMenuItem]` on action row; shell hosts `hlmMenuContent` |
| Sort Dropdown | `shared/dropdown-trigger/sort-dropdown.component.ts` | StandardDropdown | `BrnMenu` + `HlmMenu` | **Shim:** `[hlmMenuItem]` / `[hlmMenuLabel]` / `[hlmMenuSeparator]` on rows |
| Filter Dropdown | `shared/dropdown-trigger/filter-dropdown.component.ts` | StandardDropdown, `input[uiInputControl]` | `BrnMenu` + `HlmMenu` + `HlmInput` | **Shim:** `[hlmMenuItem]` on conjunction toggle; form rows unchanged |
| Grouping Dropdown | `shared/dropdown-trigger/grouping-dropdown.component.ts` | StandardDropdown, `CdkDrag*` | `BrnMenu` + CDK drag | **Shim:** same + **CDK drag-drop preserved** |
| Segmented Switch | `shared/segmented-switch/segmented-switch.component.ts` | **`BrnToggleGroup` + `BrnToggleGroupItem`** + local `HLM_TOGGLE_GROUP_IMPORTS` (`shared/ui/toggle-group/`) | **`BrnToggleGroup`** (not `BrnTabs`) — correct semantic primitive for exclusive toggles without tabpanels; inactive strip + Feldpost SCSS unchanged |
| Quick Info Chips | `shared/quick-info-chips/quick-info-chips.component.ts` | `app-chip` | `HlmBadge` array | Depends on Chip migration |
| Media Item | `shared/media-item/media-item.component.ts` | custom stacking | none | Domain-specific composition; keep custom |
| Media Item Quiet Actions | `shared/media-item/media-item-quiet-actions.component.ts` | `button[uiIconButtonGhost]` | `HlmButton` variants | Button primitives swap |
| Media Display | `shared/media-display/media-display.component.ts` | `img`, `video` | none | Media renderer; no spartan match |
| Universal Media | `shared/media/universal-media.component.ts` | structural adapter | none | Adapter boundary; keep custom |
| View Toggle | `shared/view-toggle/projects-view-toggle.component.ts` | `app-segmented-switch` | **`BrnToggleGroup`** via `SegmentedSwitchComponent` | Same pattern as other segmented callsites |
| Projects View Toggle | same as above | `app-segmented-switch` | **`BrnToggleGroup`** via `SegmentedSwitchComponent` | Merge with view-toggle pattern |
| Item Grid | `shared/item-grid/item-grid.component.ts` | structural grid | none | Layout; keep custom |
| Page Container | `shared/containers/page-container.component.ts` | structural | none | Layout; keep custom |
| Toast Container | `shared/toast/toast-container.component.ts` | `aria-live` region | `HlmToaster` | Drives toast rendering |
| Projects Toolbar | `features/projects/projects-toolbar.component.ts` | `button[uiButton]`, dropdowns | `HlmButton`, `BrnMenu` | Feature toolbar |
| Workspace Toolbar | `shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component.ts` | buttons, dropdowns | `HlmButton`, `BrnMenu` | |
| Projects Dropdown | `shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.ts` | StandardDropdown | `BrnMenu` + `HlmMenu` | **Shim:** `[hlmMenuItem]` on choice rows (2026-05-13) |
| Sorting Controls | `shared/workspace-pane/toolbar/sorting-controls.component.ts` | `button[uiButton]` | `HlmButton` | |
| Workspace Pane Toolbar | `shared/workspace-pane/chrome/workspace-pane-toolbar/workspace-pane-toolbar.component.ts` | buttons | `HlmButton` | |
| Pane Header | `shared/workspace-pane/chrome/pane-header.component.ts` | structural | none | Chrome; keep custom |
| Group Tab Bar | `shared/workspace-pane/chrome/group-tab-bar.component.ts` | `button[uiTab]` | `BrnTabs` + `HlmTabs` | **Migrated (2026-05-13):** `BrnTabsImports` + `HLM_TABS_IMPORTS`; empty `brnTabsContent` panels per tab |
| Editable Property Row | `shared/workspace-pane/media-detail/editable-property-row.component.ts` | `input[uiInputControl]`, `button` | `HlmInput`, `HlmButton` | |
| Metadata Property Row | `shared/workspace-pane/media-detail/metadata-property-row.component.ts` | structural | none | Display-only row |
| Captured Date Editor | `shared/workspace-pane/media-detail/captured-date-editor.component.ts` | `input` | `HlmInput` | Date picker input |
| Address Search | `shared/workspace-pane/media-detail/address-search/address-search.component.ts` | `input[uiInputControl]` | `HlmInput` + `HlmFormField` | |
| Detail Actions | `shared/workspace-pane/media-detail/detail-actions/detail-actions.component.ts` | `button[uiButton]` | `HlmButton` | |
| Search Bar | `features/map/search-bar/search-bar.component.ts` | `input`, `button` | `HlmInput`, `HlmButton` | Map overlay; needs z-index preservation |
| GPS Button | `features/map/gps-button/gps-button.component.ts` | `button` | `HlmButton` (icon) | Map FAB |
| Project Color Picker | `features/projects/project-color-picker.component.ts` | `button[]` | `HlmButton` | Custom color swatch |
| Selected Items Grid | `shared/workspace-pane/selected-items/workspace-selected-items-grid.component.ts` | structural + buttons | `HlmButton` | |
| Account | `shared/account/account.component.ts` | `input`, `button`, `select` | `HlmInput`, `HlmButton`, `BrnSelect` | Settings section |

### Organisms

| Component | Path | Current primitives used | spartan/ui candidate | Notes |
|-----------|------|------------------------|----------------------|-------|
| Confirm Dialog | `shared/confirm-dialog/confirm-dialog.component.ts` | **`BrnDialog` + `HLM_DIALOG_IMPORTS` + `button[uiButton]`** | `BrnDialog` + `HlmDialog` + `HlmButton` | Pilot done (2026-05-13): brain dialog + local hlm CVA; same pattern for other app dialogs |
| Text Input Dialog | `shared/text-input-dialog/text-input-dialog.component.ts` | **`BrnDialog` + `HLM_DIALOG_IMPORTS` + `input`, `button`** | `BrnDialog` + `HlmInput` | Migrated 2026-05-13: same shell pattern as confirm-dialog |
| Project Select Dialog | `shared/project-select-dialog/project-select-dialog.component.ts` | **`BrnDialog` + `HLM_DIALOG_IMPORTS` + list + `button`** | `BrnDialog` + `HlmDialog` | Migrated 2026-05-13: scroll list `overflow-y-auto max-h-64`; confirm closes via `BrnDialog.close()` |
| Share Link Audience Dialog | `shared/share-link-audience-dialog/share-link-audience-dialog.component.ts` | **`BrnDialog` + `HLM_DIALOG_IMPORTS` + `button`** | `BrnDialog` + `HlmDialog` | Migrated 2026-05-13: same shell as confirm-dialog; confirm closes via `BrnDialog.close()` after validation |
| Projects Confirm Dialog | `features/projects/projects-confirm-dialog.component.ts` | **`BrnDialog` + `HLM_DIALOG_IMPORTS` + `button`** | `BrnDialog` + `HlmDialog` | Migrated 2026-05-13: `@if (open())` gate; destructive confirm uses Tailwind `bg-destructive` / `bg-primary` toggle |
| Photo Lightbox | `shared/photo-lightbox/photo-lightbox.component.ts` | custom backdrop + `img` | `BrnDialog` (fullscreen variant) | Image viewer overlay |
| Settings Overlay | `features/settings-overlay/settings-overlay.component.ts` | custom pane + `SegmentedSwitch`, `button`, `input`, `select` | `BrnSheet` (side panel) or keep custom | Large two-column settings panel — spartan Sheet may not fit |
| Upload Panel | `features/upload/upload-panel.component.ts` | custom slide-in pane | `BrnSheet` | File upload side panel |
| Workspace Pane | `shared/workspace-pane/shell/workspace-pane.component.ts` | custom resizable pane | none (keep custom) | Map-adjacent resizable panel; too app-specific for Sheet |
| Media Detail View | `shared/workspace-pane/media-detail/media-detail-view.component.ts` | complex composition | `HlmDialog`, `HlmButton`, `HlmInput` (children) | Orchestrates many primitives |
| Invite Management Section | `features/settings-overlay/sections/invite-management-section.component.ts` | `button`, `input`, table rows | `HlmButton`, `HlmInput`, `HlmTable` | Settings section |
| Map Shell | `features/map/map-shell/map-shell.component.ts` | Leaflet + overlays | none (keep custom) | Main map frame |
| Nav | `features/nav/nav.component.ts` | `a[routerLink]`, `button` | none (keep custom) | App sidebar/bottom-nav |
| Authenticated App Layout | `layout/authenticated-app-layout.component.ts` | structural | none | Root shell |

### Pages / Route Components

| Component | Path | Current primitives used | spartan/ui candidate | Notes |
|-----------|------|------------------------|----------------------|-------|
| Login | `features/auth/login/login.component.ts` | **`hlmInput` / `hlmLabel` / `hlmBtn` / `hlm-form-field`** (2026-05-13) | `HlmInput`, `HlmLabel`, `HlmButton`, `HlmFormField` | Auth form |
| Register | `features/auth/register/register.component.ts` | same | same | Auth form |
| Reset Password | `features/auth/reset-password/reset-password.component.ts` | same | same | Auth form |
| Update Password | `features/auth/update-password/update-password.component.ts` | same | same | Auth form |
| Media Page | `features/media/media.component.ts` | structural + `app-item-grid` | none | Gallery page |
| Media Content | `features/media/media-content.component.ts` | structural | none | |
| Media Page Header | `features/media/media-page-header.component.ts` | `button`, dropdowns | `HlmButton`, `BrnMenu` | |
| Media Empty | `features/media/media-empty.component.ts` | structural | none | Empty state |
| Media Error | `features/media/media-error.component.ts` | `button` | `HlmButton` | Error state |
| Projects Page | `features/projects/projects-page.component.ts` | structural | none | |
| Projects Page Header | `features/projects/projects-page-header.component.ts` | `button` | `HlmButton` | |
| Projects Grid View | `features/projects/projects-grid-view.component.ts` | `app-project-card` | none | |
| Projects Table View | `features/projects/projects-table-view.component.ts` | structural table | `HlmTable` | |
| Project Card | `features/projects/project-card.component.ts` | `button`, `app-chip` | `HlmButton`, `HlmBadge` | |
| Account Feature | `features/account/account-feature.component.ts` | wraps `app-account` | none | |
| Auth Map Layer | `features/auth/auth-map-layer/auth-map-layer.component.ts` | Leaflet map + overlay | none | Auth background map |
| Search Dropdown Item | `features/map/search-bar/search-dropdown-item.component.ts` | structural | `HlmMenuItem` | Search result row |

---

## Shared Design-System Components

| Component | Path | What it does | spartan/ui replacement? |
|-----------|------|--------------|------------------------|
| Legacy `ui*` directives (named exports) | `shared/ui-primitives/ui-primitives.directive.ts` | ~60 standalone directives applying CVAs + optional legacy BEM class hooks on native elements | **`UI_PRIMITIVE_DIRECTIVES` barrel removed (2026-05-14).** Import only the symbols each component uses (or `HLM_*_IMPORTS`). Same spartan mapping applies: `uiButton*` → `HlmButton`, `uiInputControl*` → `HlmInput`, etc. |
| Button primitive (SCSS) | ~~`styles/primitives/button.scss`~~ **deleted (2026-05-14)** | `.ui-button` + `.icon-btn-ghost` CSS class tree (was global) | Replaced by directive `twMerge(buttonVariants(…))` + residual `.ui-button--loading` etc. on hosts until callsites swap to `hlmBtn` only. |
| Field primitive (SCSS) | ~~`styles/primitives/field.scss`~~ **deleted (2026-05-14)** | `.ui-field-row`, `.ui-field-label`, `.ui-input-control`, `.ui-select-control` CSS tree | Replaced by `inputVariants` / `labelVariants` / `selectVariants` in shims + `hlm-form-field` at migrated callsites. |
| Tab primitive (SCSS) | ~~`styles/primitives/tab.scss`~~ **deleted (2026-05-14)** | `.ui-tab-list`, `.ui-tab` CSS tree | `UiTab*` shims merge `tabsListVariants` / `tabsTriggerVariants`; prefer `HLM_TABS_IMPORTS` on `BrnTabs` tree. |
| Chip primitive (SCSS) | ~~`styles/primitives/chip.scss`~~ **deleted (2026-05-14)** | `.ui-chip` CSS class tree with 10+ color variants | `UiChipDirective` shim merges `badgeVariants`; prefer `[hlmBadge]` at callsites. |
| Badge primitive (SCSS) | ~~`styles/primitives/badge.scss`~~ **deleted (2026-05-14)** | `.ui-status-badge` CSS tree | `UiStatusBadgeDirective` shim merges semantic `badgeVariants`. |
| Toggle primitive (SCSS) | ~~`styles/primitives/toggle.scss`~~ **deleted (2026-05-14)** | `.ui-toggle-row`, `.ui-toggle-switch` CSS tree | `UiToggleRowDirective` / `UiToggleSwitchDirective` shims; prefer `HLM_SWITCH_IMPORTS` when templates migrate. |
| Row Shell primitive (SCSS) | `styles/primitives/row-shell.scss` | `.ui-row-shell` list row layout | No direct spartan match; keep as custom utility. |
| Card Shell primitive (SCSS) | `styles/primitives/card-shell.scss` | `.ui-card-shell` card layout | `HlmCard` or keep as custom structural class. |
| Dropdown pattern (SCSS) | ~~`styles/patterns/dropdown.scss`~~ **removed (2026-05-13)** | `.dd-*` classes | Callsites use Tailwind + `[hlmMenuItem]` / `[hlmMenuLabel]` / `[hlmMenuSeparator]`. |
| Toolbar pattern (SCSS) | ~~`styles/patterns/toolbar.scss`~~ **deleted (2026-05-14)** | `.toolbar-btn` class (was global) | `UiToolbarButtonDirective` still applies `toolbar-btn`; migrate callers to `hlmBtn` and drop directive. |
| Form pattern (SCSS) | ~~`styles/patterns/form.scss`~~ **deleted (2026-05-14)** | Form layout patterns (was global) | Layout lives in `hlm-form-field` + Tailwind at migrated callsites. |
| `DropdownShellComponent` | `shared/dropdown-trigger/dropdown-shell.component.ts` | Custom `position: fixed` dropdown container with document-click dismiss and Escape handler | **Replace entirely** with `BrnPopover` / `BrnMenu` (CDK OverlayRef manages positioning, stacking, and dismiss) |
| `StandardDropdownComponent` | `shared/dropdown-trigger/standard-dropdown.component.ts` | Trigger button + DropdownShell composition | Replace with `BrnMenu` trigger pattern |
| `SegmentedSwitchComponent` | `shared/segmented-switch/segmented-switch.component.ts` | **`BrnToggleGroup` + `BrnToggleGroupItem`** + local `hlmToggleGroup` / `hlmToggleGroupItem` | **Migrated (2026-05-13):** brain toggle-group for selection + keyboard nav; `nullable` ↔ `allowDeselect`; `HLM_TABS_IMPORTS` remains for tablist callsites only — **use `BrnToggleGroup`, not `BrnTabs`, for this control** |
| `ConfirmDialogComponent` | `shared/confirm-dialog/confirm-dialog.component.ts` | **`BrnDialog` + `HLM_DIALOG_IMPORTS` + `button[uiButton]`** | Replaced custom backdrop with `BrnDialog` (CDK dialog) + local hlm dialog directives; buttons still `uiButton` shim |
| `TextInputDialogComponent` | `shared/text-input-dialog/text-input-dialog.component.ts` | Dialog with single text input | Replace with `BrnDialog` + `HlmInput` |
| `ToastContainerComponent` | `shared/toast/toast-container.component.ts` | Toast ARIA region, iterates `ToastService.toasts()` | Replace with `HlmToaster` + Sonner integration |
| `PopoverComponent` | `shared/popover/popover.component.ts` | Floating surface chrome (no positioning logic) | Replace with `HlmPopover` panel |

---

## spartan/ui Gap Analysis

### Already installed

`@spartan-ng/brain`, `class-variance-authority`, `clsx`, `tailwind-merge`, `luxon` (see correction note under **Needs to be installed**).

### Needs to be installed

> **2026-05-13 correction:** npm publishes **`@spartan-ng/brain`** as one package (secondary entry points such as `@spartan-ng/brain/button`), not `@spartan-ng/brain-button`. Most **`@spartan-ng/ui-*-helm`** names from early drafts **do not exist** on the registry; only a few helm packages exist (e.g. `@spartan-ng/ui-button-helm`). **`@spartan-ng/ui-core`** still declares a **Tailwind ^3** peer — it conflicts with Feldpost’s **Tailwind v4** unless installed with `--legacy-peer-deps` or until spartan publishes a v4-compatible `ui-core`. Phase 3 started with **brain + local CVA hlm** for the button atom; add `@spartan-ng/ui-button-helm` + `ui-core` when peer policy is resolved.

| Package (brain + ui pair) | Reason / used for |
|---------------------------|-------------------|
| `@spartan-ng/brain` (`/button`, …) + local `shared/ui/button` (CVA) or `@spartan-ng/ui-button-helm` when peers allow | Replaces `uiButton*` directives + `.ui-button` SCSS |
| `@spartan-ng/brain-input` + `@spartan-ng/ui-input-helm` | Replaces `uiInputControl*` directives + field SCSS |
| `@spartan-ng/brain-label` + `@spartan-ng/ui-label-helm` | Replaces `uiFieldLabel` directive |
| `@spartan-ng/brain-form-field` + `@spartan-ng/ui-form-field-helm` | Wraps input+label in form layout |
| `@spartan-ng/brain-dialog` + `@spartan-ng/ui-dialog-helm` | Replaces all custom dialog components (confirm, text-input, project-select, share-link, lightbox) |
| `@spartan-ng/brain-menu` + `@spartan-ng/ui-menu-helm` | Replaces DropdownShell + StandardDropdown + all dropdown variants |
| `@spartan-ng/brain-popover` + `@spartan-ng/ui-popover-helm` | Replaces PopoverComponent |
| `@spartan-ng/brain-tabs` + `@spartan-ng/ui-tabs-helm` | Replaces **GroupTabBar** (tablist + tabpanels). **`SegmentedSwitch`** uses **`@spartan-ng/brain/toggle-group`** — `BrnToggleGroup` is the correct semantic primitive for segmented exclusives, not `BrnTabs`. |
| `@spartan-ng/brain/toggle-group` | Backs **`SegmentedSwitchComponent`** + local `apps/web/src/app/shared/ui/toggle-group/` helm CVAs |
| `@spartan-ng/brain-select` + `@spartan-ng/ui-select-helm` | Replaces `uiSelectControl*` directives |
| `@spartan-ng/brain-switch` + `@spartan-ng/ui-switch-helm` | Replaces `uiToggleSwitch*` directives |
| `@spartan-ng/brain-checkbox` + `@spartan-ng/ui-checkbox-helm` | Replaces `uiChoiceControl` (checkbox) |
| `@spartan-ng/brain-radio-group` + `@spartan-ng/ui-radio-helm` | Replaces `uiChoiceControl` (radio) |
| `@spartan-ng/brain-collapsible` + `@spartan-ng/ui-collapsible-helm` | Backs PanelTriggerComponent disclosure |
| `@spartan-ng/brain-sheet` + `@spartan-ng/ui-sheet-helm` | Candidate for UploadPanel side pane |
| `@spartan-ng/brain-toast` + `@spartan-ng/ui-toast-helm` | Replaces ToastContainer + ToastItem |
| `@spartan-ng/ui-badge-helm` | Replaces `.ui-status-badge` + Chip (status variants) |
| `@spartan-ng/ui-card-helm` | Replaces `.ui-card-shell` pattern in project cards |
| `@spartan-ng/ui-skeleton-helm` | Replaces loading skeleton in ItemStateFrame |
| `@spartan-ng/ui-spinner-helm` | Replaces inline `::after` spinner on buttons/icon-buttons |
| `@spartan-ng/ui-separator-helm` | Replaces hard-coded `<hr>` / border dividers |
| `@spartan-ng/ui-table-helm` | Candidate for ProjectsTableView |
| `@spartan-ng/ui-tooltip-helm` | Candidate for icon buttons with `title` attributes |
| `@spartan-ng/brain-textarea` + `@spartan-ng/ui-textarea-helm` | Any multi-line text areas (settings, notes fields) |
| `@spartan-ng/ui-scroll-area-helm` | Candidate for scrollable panel content areas |

---

## Design Token Mapping

### Existing Feldpost tokens → spartan CSS variable overrides needed

spartan/ui uses shadcn-style CSS variables (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, `--radius`, etc.). These must be overridden in `:root` to match Feldpost's warm palette.

| Feldpost token | Light value | spartan variable to override |
|---|---|---|
| `--color-bg-base` | `#f9f7f4` | `--background` |
| `--color-text-primary` | `#1a1714` | `--foreground` |
| `--color-accent-brand` / `--fp-sys-color-primary` | `#cc7a4a` / `#745b0c` | `--primary` |
| `#ffffff` (on primary) | `#ffffff` | `--primary-foreground` |
| `--color-bg-surface` | `#ffffff` | `--card` |
| `--color-text-primary` | `#1a1714` | `--card-foreground` |
| `--color-bg-elevated` | `#ffffff` | `--popover` |
| `--color-text-primary` | `#1a1714` | `--popover-foreground` |
| `--color-bg-base` | `#f9f7f4` | `--secondary` |
| `--color-text-secondary` | `#6b6259` | `--secondary-foreground` |
| `--color-bg-base` | `#f9f7f4` | `--muted` |
| `--color-text-secondary` | `#6b6259` | `--muted-foreground` |
| `--color-accent` | `#7c3aed` | `--accent` |
| `--color-text-primary` | `#1a1714` | `--accent-foreground` |
| `--color-danger` | `#dc2626` | `--destructive` |
| `#ffffff` | `#ffffff` | `--destructive-foreground` |
| `--color-border` | `#e8e4de` | `--border` |
| `--color-border` | `#e8e4de` | `--input` |
| `--color-primary` | `var(--color-accent-brand)` | `--ring` |
| `--radius-md` | `0.5rem` | `--radius` |

> **Decision needed:** Feldpost currently has two competing primary color definitions — the legacy warm orange `--color-accent-brand: #cc7a4a` and the new MD3 gold `--fp-sys-color-primary: #745b0c`. The migration must pick one as the single `--primary` → spartan `--primary` mapping before Phase 2 begins.

### Hardcoded values found (bypass tokens)

| File | Property | Value | Recommendation |
|------|----------|-------|----------------|
| `styles/primitives/button.scss` | `color` on `.ui-button--primary` | `#fff` | → `var(--fp-sys-color-on-primary)` or spartan `--primary-foreground` |
| `styles/primitives/button.scss` | `border-color/background` hover mix | `color-mix(…, #000)` | → use `--fp-sys-color-primary-container` darken tokens |
| `shared/photo-lightbox/photo-lightbox.component.scss` | backdrop `background` | `rgba(0,0,0,0.9)` | → add `--scrim-opacity` token |
| `shared/photo-lightbox/photo-lightbox.component.scss` | close button colors | `rgba(255,255,255,0.1)`, `#fff` | → `--fp-sys-color-inverse-on-surface` |
| `shared/share-link-audience-dialog/share-link-audience-dialog.component.scss` | backdrop | `rgba(0,0,0,0.3)` | → `--scrim-opacity` token |
| `shared/workspace-pane/media-detail/media-detail-view.component.scss` | spinner ring | `rgba(255,255,255,0.3)`, `#fff` | → `HlmSpinner` (eliminates inline CSS) |
| `shared/workspace-pane/media-detail/media-detail-media-viewer/…` | same spinner ring | `rgba(255,255,255,0.3)`, `#fff` | → `HlmSpinner` |
| `shared/workspace-pane/footer/workspace-pane-footer/…` | scrim | `rgba(0,0,0,0.3)` | → `--scrim-opacity` token |
| `shared/workspace-pane/chrome/pane-header.component.scss` | icon color | `#fff` | → `var(--fp-sys-color-on-primary)` |
| `shared/workspace-pane/media-detail/captured-date-editor.component.scss` | date text | `#fff` | → `var(--fp-sys-color-on-primary)` |
| `shared/media-item/media-item.component.scss` | border color-mix fallback | `#000` | → `var(--color-border)` |
| `shared/media/universal-media.component.scss` | gradient overlay | `rgba(0,0,0,0.55)` | → `--media-gradient-overlay` token |
| `shared/media-item/media-item-upload-overlay.component.scss` | gradient overlay | `rgba(0,0,0,0.55)` | → `--media-gradient-overlay` token |
| `features/auth/auth-map-layer/auth-map-layer.component.scss` | gradient frosted glass | `rgba(249,247,244,…)`, `rgba(15,14,12,…)` | → `var(--color-bg-base)` with opacity |
| `features/nav/nav.component.scss` | avatar text / hover | `#fff`, `color-mix(…, #000)` | → `var(--fp-sys-color-on-primary)` |
| `features/upload/upload-panel.component.scss` | shimmer animation | `rgba(255,255,255,0/0.2/0.5/0)` | → named shimmer token |
| `features/map/gps-button/gps-button.component.scss` | active bg fallback | `#e0e0e0` | → `var(--color-border)` fallback; GPS active blue `rgba(0,153,255,0.15)` → `var(--state-info-bg)` |
| `features/projects/projects-confirm-dialog.component.scss` | (check inline) | `rgba(…)` | Audit when migrating to BrnDialog |
| `features/settings-overlay/settings-overlay.component.scss` | (check inline) | various | Audit during settings migration |

---

## spartan/ui Mapping

| Current pattern | Replace with | Notes |
|-----------------|-------------|-------|
| `button[uiButton] + uiButtonPrimary` | `<button hlm hlmBtn variant="default">` | Primary CTA; map token `--primary` to brand color |
| `button[uiButton] + uiButtonSecondary` | `<button hlm hlmBtn variant="outline">` | |
| `button[uiButton] + uiButtonGhost` | `<button hlm hlmBtn variant="ghost">` | |
| `button[uiButton] + uiButtonDanger` | `<button hlm hlmBtn variant="destructive">` | |
| `button[uiIconButtonGhost]` | `<button hlm hlmBtn variant="ghost" size="icon">` | |
| `input[uiInputControl]` | `<input hlmInput>` | Wrap with `<hlm-form-field>` |
| `label[uiFieldLabel]` | `<label hlmLabel>` | |
| `select[uiSelectControl]` | `<brn-select> / <hlm-select>` | Replaces native `<select>` |
| `input[type="checkbox"][uiChoiceControl]` | `<brn-checkbox> / <hlm-checkbox>` | |
| `input[type="radio"][uiChoiceControl]` | `<brn-radio-group> / <hlm-radio-group>` | |
| `span[uiToggleSwitch]` + `button[uiToggleRow]` | `<brn-switch> / <hlm-switch>` | |
| `button[uiTab]` inside `[uiTabList]` | `<button hlmTabsTrigger>` inside `<hlm-tabs-list>` | **Done (2026-05-13):** `UiTab*` shims merge `tabsListVariants` / `tabsTriggerVariants`; `app-group-tab-bar` uses brain + `HLM_TABS_IMPORTS` |
| `app-segmented-switch` | **`[brnToggleGroup]` + `button[brnToggleGroupItem]`** + `HLM_TOGGLE_GROUP_IMPORTS` | **Done (2026-05-13):** `BrnToggleGroup` / `nullable` for `allowDeselect`; inactive strip still custom; not `BrnTabs` |
| `app-dropdown-shell` + `app-standard-dropdown` | `<brn-menu> + <hlm-menu>` | |
| `app-confirm-dialog` | `<brn-dialog> + <hlm-dialog>` | |
| `app-text-input-dialog` | `<brn-dialog> + <hlm-input>` | |
| `app-popover` | `<brn-popover> + <hlm-popover>` | |
| `app-panel-trigger` | `<brn-collapsible-trigger> + <hlm-button>` | Keep FSM contract, swap trigger primitive |
| `ss-toast-container` + `app-toast-item` | `<hlm-toaster>` (Sonner) | `ToastService` signals stay; adapter layer needed |
| `[uiChip]` | `<span hlmBadge>` | Multi-variant badge; file-type colors remain custom |
| `[uiStatusBadge]` | `<span hlmBadge variant="…">` | |
| `.ui-card-shell` class | `<div hlmCard>` | |
| `.ui-button--loading::after` spinner | `<hlm-spinner>` | **Atom:** `HLM_SPINNER_IMPORTS`; `::after` kept until `HlmButtonDirective` migration |
| `item-state-frame` skeleton CSS | `[hlmSkeleton]` | **Done:** `HLM_SKELETON_IMPORTS` + geometry in `item-state-frame` SCSS |
| `projects-table-view` table HTML | `<table hlmTable>` | |

---

## Phase Checklist

> *Ecosystem — **Figma / Code Connect:** **(deferred — Figma paused)**. This plan has no separate Figma rows; see `.cursor/rules/archive/figma-integration.mdc.archived` and `docs/archive/figma-tokens.json`.*

- [ ] **Phase 0** — Discovery & Planning ✅ (complete — this document)
- [ ] **Phase 1** — Spec Cleanup
  - [ ] Resolve primary color decision: `--color-accent-brand` (warm orange) vs `--fp-sys-color-primary` (MD3 gold) as the single brand primary
  - [ ] Write spartan token-override spec: what goes in `:root` to wire Feldpost palette into spartan variables
  - [ ] Update `docs/design/tokens.md` with spartan variable mapping section
  - [ ] Decide: migrate `--fp-sys-color-*` tokens fully OR keep dual system with spartan as an overlay
  - [ ] Decide: CDK overlay CSS stays or is replaced by spartan's CDK usage
  - [ ] Identify if any component specs need the spartan primitive contract (dialog FSM, popover, tabs) before migration
- [x] **Phase 2** — spartan/ui Installation & Foundation ✅ (2026-05-13)
  - [x] Upgrade Tailwind v3 → v4 (`tailwindcss@4.3.0`, `@tailwindcss/postcss@4.3.0`)
  - [x] Wire tweakcn CSS variables as single token foundation in `styles.scss`
  - [x] `[data-theme="dark"]` dark mode wired via `@custom-variant dark`
  - [x] `[data-theme="sandstone"]` sandstone theme preserved with tweakcn variable overrides
  - [x] Legacy aliases block in `styles.scss` preserves backward compat for all existing components
  - [x] `postcss.config.json` created for Angular builder compatibility (Angular's `@angular/build` only reads JSON postcss configs)
  - [x] Run `ng build` — green baseline ✅ (exit 0, 61s)
- [x] **Phase 3** — Component Migration (complete for planned Phase 3 dialog + shim scope — 2026-05-13; SCSS removal / primitive barrel teardown blocked pending callsite-by-callsite migration — see checklist)
  - [x] **spartan/ui packages installed** (baseline: `@spartan-ng/brain` + CVA stack; see Gap Analysis correction for full helm set)
  - [ ] **Atoms** (recommended first — maximum leverage for Phase 3)
    - [x] `button[uiButton*]` → `buttonVariants` / `hlmBtn` — **shim:** `UiButtonDirective` now applies `buttonVariants` from DOM attributes; marker directives retained; `.ui-button--loading` kept for SCSS spinner
    - [x] **`hlmBadge` / `badgeVariants`** — generic badge atom (no legacy `uiBadge`; `[uiStatusBadge]` / `[uiChip]` **shim** merges `badgeVariants` + legacy `.ui-status-badge*` / `.ui-chip*` SCSS hooks — 2026-05-13)
    - [x] `input[uiInputControl]` + modifiers → `inputVariants` / `hlmInput` — **shim:** `UiInputControlDirective` merges CVA + legacy `ui-input-control--*` SCSS hooks (size / loading / compact); marker directives for modifiers
    - [x] `label[uiFieldLabel]` / `[hlmLabel]` → `labelVariants` — **shim:** `UiFieldLabelDirective` merges CVA + `ui-field-label` SCSS hook; no `BrnLabel` in current `@spartan-ng/brain` pin
    - [x] `hlm-form-field` composition (wrap label+control+hint) — **molecule / layout**; `apps/web/src/app/shared/ui/form-field/`
    - [x] `select[uiSelectControl]` + modifiers → `selectVariants` / `hlmSelect` — **shim:** `UiSelectControlDirective` merges CVA + legacy `ui-select-control` / `ui-select-control--*` SCSS hooks; marker directives for modifiers (native `<select>` only; `BrnSelect` deferred)
    - [x] **`hlmSwitch` / `HLM_SWITCH_IMPORTS`** — local CVA (`switchVariants` + `switchThumbVariants`) in `apps/web/src/app/shared/ui/switch/`; **shim:** `UiToggleSwitchDirective` / `UiToggleRowDirective` merge CVA + legacy `.ui-toggle-*` hooks (`BrnSwitch` not in current `@spartan-ng/brain` pin) — 2026-05-13
    - [x] `[uiChip]` / `[uiStatusBadge]` → **`badgeVariants` shim** (semantic `info` / `success` / `warning` / `neutral` + `muted` default); retire `badge.scss` / `chip.scss` hooks deferred until callsites use `[hlmBadge]` only — 2026-05-13
    - [x] Skeleton CSS in `item-state-frame` → **`[hlmSkeleton]`** — `HLM_SKELETON_IMPORTS` in `apps/web/src/app/shared/ui/skeleton/` (2026-05-13)
    - [x] Loading spinner (`::after`) in buttons → **`hlm-spinner` atom** — `HLM_SPINNER_IMPORTS` in `apps/web/src/app/shared/ui/spinner/`; `.ui-button--loading::after` retained until `HlmButtonDirective` callsite migration (2026-05-13)
    - [x] Remove `styles/primitives/button.scss`, `field.scss`, `badge.scss`, `chip.scss`, `toggle.scss` — **done in Phase 5 (2026-05-14)**; see Phase 5 checklist
  - [ ] **Molecules**
    - [x] **`hlmCard` molecule** — `HLM_CARD_IMPORTS` in `apps/web/src/app/shared/ui/card/` (local CVA; no published `@spartan-ng/ui-card-helm` until Tailwind v4 peers); legacy `[uiCardShell]` / `.ui-card-shell` unchanged until callsite migration
    - [x] **`hlmSelect` molecule (native)** — `HLM_SELECT_IMPORTS` in `apps/web/src/app/shared/ui/select/` (local CVA; overlay `BrnSelect` deferred); legacy `select[uiSelectControl*]` unchanged at callsites
    - [x] **`app-dropdown-shell` (DropdownShell)** — local **`hlmMenuContent`** / `HlmMenuContentDirective` on host (`shared/ui/menu/`); manual `top`/`left` + document dismiss unchanged; **`hlmPopover` removed from shell** (popover CVA remains for `app-popover` and other surfaces). Rename to `app-popover-shell` + CDK Overlay deferred (2026-05-13)
    - [x] `app-dropdown-shell` + `app-standard-dropdown` → **`brn-menu`** — **blocked / shim (2026-05-13):** `@spartan-ng/brain` alpha.691 has **no** `./menu` export (`BrnMenu` unavailable); **`HLM_MENU_IMPORTS`** + `[hlmMenuItem]` / `[hlmMenuLabel]` / `[hlmMenuSeparator]` at callsites. Full `BrnMenu` + CDK anchor migration remains.
    - [x] **`app-popover` → `brn-popover`** — `BrnPopoverContent` + `hlmPopover` on panel; `BrnPopover` / `BrnPopoverTrigger` wiring deferred until callsites adopt the brain popover tree (2026-05-13)
    - [x] `app-segmented-switch` → **`BrnToggleGroup`** — **done (2026-05-13):** `apps/web/src/app/shared/ui/toggle-group/` (`HLM_TOGGLE_GROUP_IMPORTS`) + `BrnToggleGroupImports`; roving tabindex / manual keydown removed (brain handles keyboard nav)
    - [x] `button[uiTab]` tabs → `hlm-tabs` — **shim (2026-05-13):** `UiTabListDirective` / `UiTabDirective` merge CVA + `.ui-tab*` hooks; `app-group-tab-bar` fully on `BrnTabs` + `HLM_TABS_IMPORTS`
    - [x] Sort/filter/grouping dropdowns → **`brn-menu`** — **shim only (2026-05-13):** inherit `hlmMenuContent` via shell + `[hlmMenuItem]` on rows; **`app-grouping-dropdown`** keeps **`CdkDragDrop`** + `outsideCloseEnabled` / drag lifecycle unchanged
    - [x] Toast system → **partial (2026-05-13):** local **`hlmToast`** / `toastVariants` / `HLM_TOAST_IMPORTS` in `apps/web/src/app/shared/ui/toast/`; **`ToastService`** (`items()` signal API) + **`ss-toast-container`** unchanged. **`@spartan-ng/brain` has no `./toast` export**; **`sonner` / `ng-sonner` not installed** — Sonner imperative bridge deferred.
    - [x] Remove `styles/primitives/tab.scss`, `styles/patterns/toolbar.scss` — **done in Phase 5 (2026-05-14)**; `styles/patterns/dropdown.scss` removed earlier — see Phase 5 checklist
  - [ ] **Organisms**
    - [x] `app-confirm-dialog` → **`BrnDialog` + `HLM_DIALOG_IMPORTS`** (pilot: CDK dialog under `@spartan-ng/brain/dialog`; focus trap + scroll block via CDK defaults; `text-input-dialog` / `project-select-dialog` reuse the same pattern)
    - [x] `app-text-input-dialog` → **`BrnDialog`** (same stack as confirm-dialog)
    - [x] `app-project-select-dialog` → **`BrnDialog`** (same stack as confirm-dialog)
    - [x] `app-share-link-audience-dialog` → **`BrnDialog`**
    - [x] `app-projects-confirm-dialog` → **`BrnDialog`**
    - [x] `app-photo-lightbox` → **`BrnDialog`** (fullscreen)
    - [~] Upload panel → brn-sheet — **deferred** (dual-mode component conflicts with CDK overlay semantics; TODO(brn-sheet) in component; re-evaluate with map zone redesign)
    - [x] Remove `styles/patterns/form.scss` — **done in Phase 5 (2026-05-14)**; see Phase 5 checklist
    - [x] Remove `UI_PRIMITIVE_DIRECTIVES` barrel — **done in Phase 5 (2026-05-14)**; see Phase 5 checklist
- [x] **Phase 4** — Cleanup & Build Verification ✅ (2026-05-13) — hygiene + token pass; **folder/barrel removals deferred** (still blocked on callsite migration; unchanged from Phase 3)
  - [ ] Remove `apps/web/src/styles/primitives/` folder (all sheets replaced) — **deferred:** shims still reference legacy classes
  - [ ] Remove `apps/web/src/styles/patterns/` folder (all patterns replaced) — **deferred:** same
  - [ ] Remove `shared/ui-primitives/ui-primitives.directive.ts` (all directives replaced) — **deferred:** shims route through legacy directives
  - [ ] Remove `shared/dropdown-trigger/dropdown-shell.component.ts` — **deferred**
  - [x] Partial audit: `#fff` on primary/clay surfaces → `var(--primary-foreground)` in `button.scss`, `pane-header`, `captured-date-editor`, `nav`; full `#hex` / `rgba()` table sweep **deferred** (gradients / map overlays / domain scrims)
  - [x] Run `npm run design-system:check` (2026-05-13)
  - [x] Run `ng build` — zero errors (pre-existing CommonJS + component-style budget warnings acceptable)
  - [x] Run `npm run lint` in `apps/web` — **exit 1:** ESLint reports existing issues (e.g. missing rule definition, `consistent-type-imports`, `no-unused-vars`, plus many `max-warnings`-failing warnings); **no new issues** in files touched only for Phase 4 (`angular.json`, `index.html`, `tokens.scss`, `styles.scss`, `button.scss`, pane/nav SCSS). `ng lint` has **no** architect target in this workspace — use `npm run lint`.
  - [x] Remove duplicate `apps/web/postcss.config.js` (Angular reads `postcss.config.json` only)
  - [x] Sass: `stylePreprocessorOptions.sass.silenceDeprecations: ["import"]` for Tailwind v4 `@import "tailwindcss"` in `styles.scss`
  - [x] Google Fonts: moved from `tokens.scss` to `<link>` in `index.html` (fixes invalid `@import` after inlined CDK overlay CSS)
- [~] **Phase 5** — Callsite Migration & Legacy Removal — **SCSS cleanup + `UI_PRIMITIVE_DIRECTIVES` barrel removed (2026-05-14);** Group D (dropdown shell callers), shim directive file deletion, legacy alias removal, and `design-system:check` green remain open
  - [x] **Pre-flight** (do before ANY callsite changes)
    - [x] Audit which components import `UI_PRIMITIVE_DIRECTIVES` barrel vs individual directives — **done (2026-05-14):** `apps/web/src` had **zero** barrel imports after `filter-dropdown` narrowed; barrel export deleted
    - [ ] Map each directive to its callsites (how many templates use `[uiButton]`, `[uiInputControl]`, etc.) — **optional housekeeping**
    - [x] Confirm `ng build` is green before starting — **verified (2026-05-14)**
  - [ ] **Callsite migration order** (migrate in this sequence — each group must be done together)
    - [x] Group A — Form fields (always migrate label + input + field-row together per component)
      - [x] Auth pages: login, register, reset-password, update-password (2026-05-13 — `HLM_*_IMPORTS`; `[error]` on inputs)
      - [x] Account settings section (`app-account` — `hlm-form-field`, `hlmInput`, `hlmLabel`, `hlmBtn`; no select on account)
      - [x] Settings overlay form sections (`settings-overlay`, `invite-management-section` — `hlm-form-field` / `hlmLabel` / `hlmSelect` / `hlmBtn`)
      - [x] Address search, editable property row, captured date editor (`hlmInput`; `hlmLabel` on editable row key)
    - [x] Group B — Buttons (standalone, no form dependency) (2026-05-13 — `hlmBtn` / `HLM_BUTTON_IMPORTS`; map search-bar & GPS had no `uiButton`; media-page-header, projects-toolbar, detail-actions, workspace-pane-toolbar, nav, card-variant-switch had none; sorting-controls: `uiToolbarButton` → `hlmBtn`)
      - [x] Map chrome: search bar, GPS button, toolbar buttons (verified: search-bar/GPS no `uiButton`; toolbar dropdown triggers unchanged)
      - [x] Media detail actions, quiet actions (`detail-actions` plain buttons; `media-item-quiet-actions` → `hlmBtn`)
      - [x] Projects page header, media page header (`projects-page-header` migrated; `media-page-header` had no buttons; `media-error` retry migrated)
      - [x] Nav buttons (verified: no `uiButton` on nav)
    - [x] Group C — Dialogs (already use BrnDialog; clean up UI_PRIMITIVE_DIRECTIVES from imports) — **done (2026-05-13):** `HLM_BUTTON_IMPORTS` + `HLM_INPUT_IMPORTS` where needed; `project-select-dialog` keeps `UiItemDirective` only
      - [x] confirm-dialog, text-input-dialog, project-select-dialog
      - [x] share-link-audience-dialog, projects-confirm-dialog
    - [ ] Group D — Dropdowns (migrate StandardDropdown + callers when BrnMenu ships)
      - [ ] Toolbar dropdowns, sort/filter/grouping (blocked on BrnMenu — defer)
    - [x] Group E — Badges/chips — **done (2026-05-13):** `HLM_BADGE_IMPORTS` from `shared/ui/badge/` (barrel exports `HLM_BADGE_IMPORTS`); status → `variant` mapping where needed
      - [x] `[uiStatusBadge]` / `[uiStatusPill]` → `[hlmBadge]` (projects table, invite header, media detail, account)
      - [x] `[uiChip]` → `[hlmBadge]` (`quick-info-chips`; interactive rows keep `cursor-pointer` + existing chip SCSS hooks)
    - [x] Group F — Select controls — **done (2026-05-13):** `select[hlmSelect]` + `HLM_SELECT_IMPORTS`; compact rows use `size="sm"`
      - [x] Invite role select, settings search-bias select, filter-dropdown rule selects, editable-property-row select
    - [x] Group G — Toggle switches — **done (2026-05-13):** `HLM_SWITCH_IMPORTS` — `[hlmSwitch]` + `[hlmSwitchThumb]` with `[checked]`; settings-overlay notification/map/data toggles (row chrome classes retained for layout)
      - [x] Remaining `[uiToggleSwitch]` / `[uiToggleRow]` callsites cleared in `settings-overlay`
  - [x] **SCSS removal** (global `@use` for migrated primitive/pattern sheets — **deleted 2026-05-14**; shim directives may still emit legacy BEM class names for component-local SCSS)
    - [x] Delete `apps/web/src/styles/primitives/button.scss` — **done (2026-05-14)**; `@use` removed from `styles.scss`
    - [x] Delete `apps/web/src/styles/primitives/field.scss` — **done (2026-05-14)**
    - [x] Delete `apps/web/src/styles/primitives/badge.scss` — **done (2026-05-14)**
    - [x] Delete `apps/web/src/styles/primitives/chip.scss` — **done (2026-05-14)**
    - [x] Delete `apps/web/src/styles/primitives/toggle.scss` — **done (2026-05-14)**
    - [x] Delete `apps/web/src/styles/primitives/tab.scss` — **done (2026-05-14)**
    - [x] Delete `apps/web/src/styles/patterns/dropdown.scss` — **done (2026-05-13):** all `dd-*` template hooks migrated to Tailwind + `[hlmMenuItem]` / `[hlmMenuLabel]` / `[hlmMenuSeparator]`; `map-context-menu__items` for map/thumbnail overflow; `styles.scss` `@use` removed.
    - [x] Delete `apps/web/src/styles/patterns/toolbar.scss` — **done (2026-05-14)**
    - [x] Delete `apps/web/src/styles/patterns/form.scss` — **done (2026-05-14)**
  - [~] **Barrel removal**
    - [x] Remove `UI_PRIMITIVE_DIRECTIVES` export from `ui-primitives.directive.ts` — **done (2026-05-14)** (last callsite was `filter-dropdown`; Group D unchanged)
    - [ ] Delete `ui-primitives.directive.ts` entirely (verify no remaining imports) — **deferred:** many components still import named `Ui*` shims
    - [ ] Remove legacy alias block from `apps/web/src/styles.scss` (verify no remaining `--color-*` / `--fp-sys-*` references) — **deferred:** `rg "var\\(--color-" apps/web/src` still matches widespread component SCSS + `styles.scss` link baseline (`var(--color-primary)` on `a`)
    - [ ] Delete `apps/web/src/styles/tokens.scss` (after alias block removed and CDK overlay import moved)
  - [~] **Final verification**
    - [x] `ng build` — **green (2026-05-14)** — zero errors; pre-existing map-shell style budget + CommonJS warnings unchanged
    - [ ] `npm run design-system:check` — **fails (2026-05-14):** `scripts/guard-visual-behavior.mjs` reports root `AGENTS.md` missing Ownership Matrix table columns (**not introduced** by Phase 5 SCSS edits)
    - [ ] Visual QA: open app, verify light/dark/sandstone themes, verify all interactive states
    - [x] Update `docs/MIGRATION_PLAN.md` — **this pass (2026-05-14)**

---

## Phase 5 — Wiring Risks

Callsite migration is not a simple find-and-replace. Each component that uses `UI_PRIMITIVE_DIRECTIVES` needs coordinated changes across template, TypeScript imports, and SCSS. Key risks:

### Risk 1: Barrel import coupling
The `UI_PRIMITIVE_DIRECTIVES` spread barrel is **removed (2026-05-14)**. Remaining risk: importing unused `Ui*` symbols bloats bundles — prefer `HLM_*_IMPORTS` or the minimal `Ui*` set per template.

**Mitigation:** Per component, list only the `Ui*` / `Hlm*` directives referenced in that template's standalone `imports` array.

### Risk 2: Form field triplets
`[uiFieldLabel]` + `[uiInputControl]` + `[uiFieldRow]` must be migrated together within a component. Migrating only the input without the label/row leaves broken layout because `formFieldVariants` and `inputVariants` are designed as a system.

**Mitigation:** Group A migration rule — always migrate all three within one component at a time.

### Risk 3: CSS specificity war
Until a SCSS primitive file is deleted, its rules can override Tailwind CVA classes (`.ui-button` has `!important` fallbacks in some rules, SCSS class selectors outweigh Tailwind's component classes). Expect visual glitches on partially migrated components.

**Mitigation:** Delete the SCSS file immediately after the last callsite in that group is migrated — never leave a half-empty SCSS file.

### Risk 4: Dialog hybrid state
Shared dialogs use `BrnDialogImports` + `HLM_DIALOG_IMPORTS` with **named** `Ui*` shims only where templates still use `uiButton` / `uiInputControl` markers — **no** `UI_PRIMITIVE_DIRECTIVES` barrel (removed 2026-05-14).

### Risk 5: BrnMenu blocked
Group D (dropdowns) depends on `BrnMenu` which is not in `@spartan-ng/brain@0.0.1-alpha.691`. Do not attempt dropdown callsite migration until BrnMenu ships. All dropdown SCSS removal is blocked on this.

### Recommended approach
Run Phase 5 as parallel agents, one per Group (A–G), each owning its full group: template changes + imports update + SCSS deletion + `ng build` verification. Never merge two groups in one agent run.

---

## Open Questions / Blockers

1. ~~**Primary color decision (Phase 1 blocker):**~~ **RESOLVED (2026-05-13)**: `--primary = oklch(0.6716 0.1368 48.5130)` ≈ warm orange `#cc7a4a`. MD3 gold `#745b0c` kept only as `--fp-sys-color-primary` alias.

2. **spartan version pin:** spartan is under active development. Phase 3 pins `@spartan-ng/brain` to `^0.0.1-alpha.691` (verify Angular 21 + Tailwind v4 on each bump).

3. **Gap analysis vs npm (2026-05-13):** Table package names `brain-*` / `ui-*-helm` pairs are largely outdated; use `@spartan-ng/brain` subpaths. **`@spartan-ng/ui-core` ↔ Tailwind v4** peer conflict blocks installing published `@spartan-ng/ui-button-helm` without `--legacy-peer-deps` or upstream fix.

4. **Button atom shim vs icon sizing:** `buttonVariants` `size="icon"` is fixed `h-10 w-10`; legacy `uiButtonSizeSm` + `uiButtonIconOnly` had smaller hit targets — revisit when migrating map/toolbar icon-only clusters.

5. **CDK dependency overlap:** `@angular/cdk` is already installed for drag-drop. spartan uses CDK internally for overlay, focus-trap, and dialog. Both will coexist on the same CDK version — confirm no version mismatch issues.

6. **`tailwindcss-animate` dependency:** spartan requires this Tailwind plugin for component animations. Currently absent from `tailwind.config.js`. Will `npm run design-system:check` / stylelint rules need updating?

7. **`DropdownShell` vs `BrnMenu` positioning model:** The current `DropdownShell` computes `top/left` in pixels from trigger `getBoundingClientRect()`. `BrnMenu` uses CDK `FlexibleConnectedPositionStrategy`. Any component that manually calculates dropdown position must be refactored to use anchor-based positioning.

8. **Upload panel / Settings overlay as Sheet:** `BrnSheet` slides in from a side edge. The settings overlay is a two-column app-shell-level pane, and the upload panel is a slide-in panel. Evaluate whether `BrnSheet` provides enough layout flexibility or if these panels should remain custom.

9. **Toast / Sonner integration:** `ToastService` exposes a signals-based API (`toasts()` signal). spartan's Sonner-backed toast uses an imperative API (`toast.message(…)`). An adapter layer is needed to bridge the signal-based store to Sonner calls — or `ToastService` needs a refactor.

10. **Archive components:** `apps/web/src/app/archive/` contains 3 legacy components (`media-card`, `media-grid`, `media-loading`). These are not actively used. Confirm: migrate in Phase 3 or delete before migration starts?

11. **Workspace pane resizable divider:** `shared/workspace-pane/shell/drag-divider/drag-divider.component.ts` uses raw pointer events and CSS custom properties for resizing. spartan has no `ResizablePanels` primitive. Keep as custom.

12. **`@angular/cdk/overlay-prebuilt.css` import:** Currently imported at the top of `tokens.scss`. Once spartan's CDK overlay is the system overlay, verify whether this import is still needed or is now provided by spartan.

13. **Molecules (Card, Dialog, Popover, Select):** Published `@spartan-ng/ui-*-helm` packages remain Tailwind **^3**–peered — continue **local CVA + `@spartan-ng/brain`** until spartan ships v4-compatible helm. **Select:** confirm `BrnSelect` + overlay stacking with map/workspace panes. **Popover / Menu:** `DropdownShell` pixel positioning vs CDK `FlexibleConnectedPositionStrategy` (see Q7) blocks drop-in. **Dialog:** five custom dialogs need `BrnDialog` contract + focus trap parity audit before swap.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-13 | No Angular Material, PrimeNG, or any third-party UI library currently installed | Confirmed via package.json and full import scan — clean slate migration, zero library removal debt |
| 2026-05-13 | CDK is the only third-party UI runtime in the current app | Only `@angular/cdk/drag-drop` is imported (one component); CDK overlay CSS loaded globally but no components use it directly |
| 2026-05-13 | `UI_PRIMITIVE_DIRECTIVES` was the primary migration surface | ~60 attribute directives constituted the design-system API; each directive maps 1-to-1 to a spartan primitive |
| 2026-05-14 | **`UI_PRIMITIVE_DIRECTIVES` barrel deleted** | Last spread import was `filter-dropdown`; all components now import named `Ui*` shims and/or `HLM_*_IMPORTS` only; global SCSS for button/field/badge/chip/toggle/tab + toolbar/form patterns removed from `styles.scss` `@use` list |
| 2026-05-13 | Dual token system (v1 `--color-*` + v2 `--fp-sys-color-*`) must be reconciled before Phase 2 begins | spartan theming requires a single consistent set of `--primary`, `--background`, `--border` etc.; the dual system creates ambiguity |
| 2026-05-13 | Dialog stack: confirm dialog migrated to `BrnDialog` (CDK-backed); remaining custom dialogs follow the same pattern | Confirm pilot done; other overlays still custom until migrated |
| 2026-05-13 | Workspace pane, map shell, and nav remain custom — no spartan primitive covers these patterns | Map-adjacent resizable pane, Leaflet map frame, and app sidebar/bottom-nav are too app-specific |
| 2026-05-13 | **--primary** = `oklch(0.6716 0.1368 48.5130)` (≈ warm orange #cc7a4a) — warm orange wins as single brand primary | Resolves Phase 1 blocker; MD3 gold `--fp-sys-color-primary: #745b0c` is kept as alias only |
| 2026-05-13 | Tailwind v3 → v4 upgraded; single tweakcn CSS variable foundation installed | Phase 2 complete; tweakcn vars drive spartan/ui, legacy aliases keep existing components intact |
| 2026-05-13 | **Phase 3 start:** `@spartan-ng/brain` + CVA (`buttonVariants`) + `UiButtonDirective` shim; published `@spartan-ng/ui-*-helm` names mostly absent or Tailwind3-peered (`ui-core`) | npm reality + Tailwind v4; local `shared/ui/button` until helm install policy is set |
| 2026-05-13 | Normalized hardcoded overlay z-index values and legacy token names to the `--z-*` token scale | Precondition for Brn overlay migration (modals, dialogs, map chrome, dropdowns); intra-component stacking still uses small integer offsets inside parent stacking contexts |
| 2026-05-13 | **Confirm dialog:** `BrnDialog` + local `HLM_DIALOG_IMPORTS` (CVA) | `@spartan-ng/brain/dialog` wraps CDK Dialog (`Dialog.open`) — focus handling and scroll blocking come from CDK defaults; `node -e "require('@spartan-ng/brain/dialog')"` is not viable (Angular partial compilation / linker). |
| 2026-05-13 | **DropdownShell** uses **`hlmMenuContent`** (`shared/ui/menu/`) for floating panel Tailwind chrome; **`BrnMenu` absent** from `@spartan-ng/brain` alpha.691 (no `./menu` export — use `navigation-menu` / `command` / `popover` only). Sort / filter / grouping / projects dropdowns use **`[hlmMenuItem]`** etc.; **grouping** retains **CDK drag-drop** unchanged. | Menu styling migration without brain menu primitive; `BrnMenu` blocked until spartan ships `@spartan-ng/brain/menu`. |
| 2026-05-13 | **`app-popover`:** Panel hosts `brnPopoverContent` + `HlmPopoverDirective` (`@spartan-ng/brain/popover` + local CVA). Feature callsites still need `brn-popover` + `BrnPopoverTrigger` when they migrate; component remains unused today. |
| 2026-05-13 | Upload panel BrnSheet migration deferred — dual rendering modes (map float + workspace embedded) conflict with CDK overlay semantics | Evaluated BrnSheet API (extends BrnDialog, CDK Dialog under the hood); both modes need different semantics; defer to map zone redesign |
