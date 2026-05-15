# Phase 0 — Discovery & Planning

**Status:** Done

> *Ecosystem — **Figma / Code Connect:** **(deferred — Figma paused)**. This plan has no separate Figma rows; see `.cursor/rules/archive/figma-integration.mdc.archived` and `docs/archive/figma-tokens.json`.*

- [x] **Phase 0** — Discovery & Planning ✅ (complete — this document)

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
