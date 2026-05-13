# Feldpost → spartan/ui Migration Plan

## Status

- **Current phase:** Phase 3 — Component migration (started 2026-05-13)
- **Last updated:** 2026-05-13
- **Phase 3 in progress — atoms + Card + Select + Dialog pilot:** Button ✅, Badge ✅, Input ✅, Label ✅, Card ✅, Select ✅, **Confirm dialog** ✅ (`BrnDialog` + local `HLM_DIALOG_IMPORTS` in `apps/web/src/app/shared/ui/dialog/`; `ui-*` shims where applicable)

---

## Project Setup Summary

- **Angular version:** 21.1.0 (standalone components, signals, new control flow syntax)
- **Tailwind version:** 3.4.19
- **Already installed spartan packages:** `@spartan-ng/brain` (monolith; subpath imports e.g. `@spartan-ng/brain/button`); supporting: `class-variance-authority`, `clsx`, `tailwind-merge`, `luxon` (brain peer)
- **Other UI libraries found:**
  - `@angular/cdk` ^21.2.1 — drag-drop only (`grouping-dropdown.component.ts`); CDK overlay CSS imported globally in `tokens.scss`
  - No Angular Material
  - No PrimeNG
  - No ng-select or ng-zorro
- **Global style notes:**
  - `src/styles.scss` loads: tokens → reset → layout → 8 primitive sheets → 3 pattern sheets → Tailwind directives
  - `@angular/cdk/overlay-prebuilt.css` is imported at the top of `tokens.scss` — this must be kept or replaced when spartan's CDK-backed overlay CSS takes over
  - Feldpost runs a **dual token naming system**: legacy `--color-*` / `--radius-*` / `--spacing-*` (v1, still used by most components) AND a new `--fp-sys-color-*` / `--fp-ref-*` / `--fp-alias-*` tree (MD3-inspired, v2, partially adopted). Both live in `:root` inside `tokens.scss`. Token migration needs to be resolved before or in parallel with spartan theming.
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
| Standard Dropdown | `shared/dropdown-trigger/standard-dropdown.component.ts` | `button` + `DropdownShell` | `BrnMenu` + `HlmMenu` | Most common dropdown pattern — high-priority migration target |
| Sort Dropdown | `shared/dropdown-trigger/sort-dropdown.component.ts` | StandardDropdown | `BrnMenu` + `HlmMenu` | Wraps StandardDropdown |
| Filter Dropdown | `shared/dropdown-trigger/filter-dropdown.component.ts` | StandardDropdown, `input[uiInputControl]` | `BrnMenu` + `HlmMenu` + `HlmInput` | Wraps StandardDropdown + search input |
| Grouping Dropdown | `shared/dropdown-trigger/grouping-dropdown.component.ts` | StandardDropdown, `CdkDrag*` | `BrnMenu` + CDK drag | Keeps CDK drag-drop; menu chrome migrates |
| Segmented Switch | `shared/segmented-switch/segmented-switch.component.ts` | `button[]` | `BrnTabs` + `HlmTabs` | Full ARIA roving tabindex already implemented; BrnTabs provides the semantics |
| Quick Info Chips | `shared/quick-info-chips/quick-info-chips.component.ts` | `app-chip` | `HlmBadge` array | Depends on Chip migration |
| Media Item | `shared/media-item/media-item.component.ts` | custom stacking | none | Domain-specific composition; keep custom |
| Media Item Quiet Actions | `shared/media-item/media-item-quiet-actions.component.ts` | `button[uiIconButtonGhost]` | `HlmButton` variants | Button primitives swap |
| Media Display | `shared/media-display/media-display.component.ts` | `img`, `video` | none | Media renderer; no spartan match |
| Universal Media | `shared/media/universal-media.component.ts` | structural adapter | none | Adapter boundary; keep custom |
| View Toggle | `shared/view-toggle/projects-view-toggle.component.ts` | `button` | `BrnTabs` + `HlmTabs` | Similar to segmented switch |
| Projects View Toggle | same as above | `button` | `BrnTabs` | Merge with view-toggle pattern |
| Item Grid | `shared/item-grid/item-grid.component.ts` | structural grid | none | Layout; keep custom |
| Page Container | `shared/containers/page-container.component.ts` | structural | none | Layout; keep custom |
| Toast Container | `shared/toast/toast-container.component.ts` | `aria-live` region | `HlmToaster` | Drives toast rendering |
| Projects Toolbar | `features/projects/projects-toolbar.component.ts` | `button[uiButton]`, dropdowns | `HlmButton`, `BrnMenu` | Feature toolbar |
| Workspace Toolbar | `shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component.ts` | buttons, dropdowns | `HlmButton`, `BrnMenu` | |
| Projects Dropdown | `shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.ts` | StandardDropdown | `BrnMenu` + `HlmMenu` | |
| Sorting Controls | `shared/workspace-pane/toolbar/sorting-controls.component.ts` | `button[uiButton]` | `HlmButton` | |
| Workspace Pane Toolbar | `shared/workspace-pane/chrome/workspace-pane-toolbar/workspace-pane-toolbar.component.ts` | buttons | `HlmButton` | |
| Pane Header | `shared/workspace-pane/chrome/pane-header.component.ts` | structural | none | Chrome; keep custom |
| Group Tab Bar | `shared/workspace-pane/chrome/group-tab-bar.component.ts` | `button[uiTab]` | `BrnTabs` + `HlmTabs` | |
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
| Text Input Dialog | `shared/text-input-dialog/text-input-dialog.component.ts` | custom backdrop + `input`, `button` | `BrnDialog` + `HlmInput` | Shared app-wide |
| Project Select Dialog | `shared/project-select-dialog/project-select-dialog.component.ts` | custom backdrop | `BrnDialog` + `HlmDialog` | Project picker |
| Share Link Audience Dialog | `shared/share-link-audience-dialog/share-link-audience-dialog.component.ts` | custom backdrop | `BrnDialog` | Share flow |
| Projects Confirm Dialog | `features/projects/projects-confirm-dialog.component.ts` | custom backdrop | `BrnDialog` | Delegate to `ConfirmDialog` |
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
| Login | `features/auth/login/login.component.ts` | `input[uiInputControl]`, `button[uiButton]` | `HlmInput`, `HlmLabel`, `HlmButton`, `HlmFormField` | Auth form |
| Register | `features/auth/register/register.component.ts` | same as login | same | Auth form |
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
| `UI_PRIMITIVE_DIRECTIVES` | `shared/ui-primitives/ui-primitives.directive.ts` | ~60 attribute directives applying CSS class tokens to native elements (button, input, select, span, label) | **Yes — full replacement target.** Each directive group maps to a spartan primitive: `uiButton*` → `HlmButton`, `uiInputControl*` → `HlmInput`, `uiSelectControl*` → `BrnSelect`/`HlmSelect`, `uiTab*` → `HlmTab`, `uiChip*` → `HlmBadge`, `uiToggleSwitch*` → `HlmSwitch`, etc. |
| Button primitive (SCSS) | `styles/primitives/button.scss` | `.ui-button` + `.icon-btn-ghost` CSS class tree: sizes, emphasis variants (primary/secondary/ghost/danger), icon-only, loading spinner | Replace with `HlmButton` hlm variants + Tailwind modifiers. SCSS file removed after all `uiButton` directives replaced. |
| Field primitive (SCSS) | `styles/primitives/field.scss` | `.ui-field-row`, `.ui-field-label`, `.ui-input-control`, `.ui-select-control` CSS tree | Replace with `HlmFormField` + `HlmLabel` + `HlmInput`. SCSS file removed after migration. |
| Tab primitive (SCSS) | `styles/primitives/tab.scss` | `.ui-tab-list`, `.ui-tab` CSS tree | Replace with `HlmTabs`/`HlmTabsList`/`HlmTabsTrigger`. |
| Chip primitive (SCSS) | `styles/primitives/chip.scss` | `.ui-chip` CSS class tree with 10+ color variants | Map to `HlmBadge` variants; custom filetype/status colors need token overrides on badge. |
| Badge primitive (SCSS) | `styles/primitives/badge.scss` | `.ui-status-badge` CSS tree | Merge into `HlmBadge` variants or keep as a spartan-themed custom class. |
| Toggle primitive (SCSS) | `styles/primitives/toggle.scss` | `.ui-toggle-row`, `.ui-toggle-switch` CSS tree | Replace with `BrnSwitch` + `HlmSwitch`. |
| Row Shell primitive (SCSS) | `styles/primitives/row-shell.scss` | `.ui-row-shell` list row layout | No direct spartan match; keep as custom utility. |
| Card Shell primitive (SCSS) | `styles/primitives/card-shell.scss` | `.ui-card-shell` card layout | `HlmCard` or keep as custom structural class. |
| Dropdown pattern (SCSS) | `styles/patterns/dropdown.scss` | `.dropdown-item`, `.dropdown-section` etc. | Merge into `HlmMenu`/`HlmMenuItem` classes. |
| Toolbar pattern (SCSS) | `styles/patterns/toolbar.scss` | `.toolbar-btn` class | Merge into `HlmButton` ghost variant. |
| Form pattern (SCSS) | `styles/patterns/form.scss` | Form layout patterns | Merge into `HlmFormField` layout. |
| `DropdownShellComponent` | `shared/dropdown-trigger/dropdown-shell.component.ts` | Custom `position: fixed` dropdown container with document-click dismiss and Escape handler | **Replace entirely** with `BrnPopover` / `BrnMenu` (CDK OverlayRef manages positioning, stacking, and dismiss) |
| `StandardDropdownComponent` | `shared/dropdown-trigger/standard-dropdown.component.ts` | Trigger button + DropdownShell composition | Replace with `BrnMenu` trigger pattern |
| `SegmentedSwitchComponent` | `shared/segmented-switch/segmented-switch.component.ts` | Fully custom button group with roving tabindex, icon/text/mixed types, allow-deselect | Map to `BrnTabs` + `HlmTabs` (full keyboard nav already present in BrnTabs) |
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
| `@spartan-ng/brain-tabs` + `@spartan-ng/ui-tabs-helm` | Replaces SegmentedSwitch + GroupTabBar + ViewToggle |
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
| `button[uiTab]` inside `[uiTabList]` | `<button hlmTabsTrigger>` inside `<hlm-tabs-list>` | |
| `app-segmented-switch` | `<brn-tabs> + <hlm-tabs>` | Migrate `SegmentedSwitchComponent` callers |
| `app-dropdown-shell` + `app-standard-dropdown` | `<brn-menu> + <hlm-menu>` | |
| `app-confirm-dialog` | `<brn-dialog> + <hlm-dialog>` | |
| `app-text-input-dialog` | `<brn-dialog> + <hlm-input>` | |
| `app-popover` | `<brn-popover> + <hlm-popover>` | |
| `app-panel-trigger` | `<brn-collapsible-trigger> + <hlm-button>` | Keep FSM contract, swap trigger primitive |
| `ss-toast-container` + `app-toast-item` | `<hlm-toaster>` (Sonner) | `ToastService` signals stay; adapter layer needed |
| `[uiChip]` | `<span hlmBadge>` | Multi-variant badge; file-type colors remain custom |
| `[uiStatusBadge]` | `<span hlmBadge variant="…">` | |
| `.ui-card-shell` class | `<div hlmCard>` | |
| `.ui-button--loading::after` spinner | `<hlm-spinner>` | |
| `item-state-frame` skeleton CSS | `<hlm-skeleton>` | |
| `projects-table-view` table HTML | `<table hlmTable>` | |

---

## Phase Checklist

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
- [ ] **Phase 3** — Component Migration (in progress — 2026-05-13)
  - [x] **spartan/ui packages installed** (baseline: `@spartan-ng/brain` + CVA stack; see Gap Analysis correction for full helm set)
  - [ ] **Atoms** (recommended first — maximum leverage for Phase 3)
    - [x] `button[uiButton*]` → `buttonVariants` / `hlmBtn` — **shim:** `UiButtonDirective` now applies `buttonVariants` from DOM attributes; marker directives retained; `.ui-button--loading` kept for SCSS spinner
    - [x] **`hlmBadge` / `badgeVariants`** — generic badge atom (no legacy `uiBadge`; `[uiStatusBadge]` / `[uiChip]` still on SCSS until a dedicated mapping pass)
    - [x] `input[uiInputControl]` + modifiers → `inputVariants` / `hlmInput` — **shim:** `UiInputControlDirective` merges CVA + legacy `ui-input-control--*` SCSS hooks (size / loading / compact); marker directives for modifiers
    - [x] `label[uiFieldLabel]` / `[hlmLabel]` → `labelVariants` — **shim:** `UiFieldLabelDirective` merges CVA + `ui-field-label` SCSS hook; no `BrnLabel` in current `@spartan-ng/brain` pin
    - [ ] `hlm-form-field` composition (wrap label+control+hint) — **molecule / layout**; not started
    - [x] `select[uiSelectControl]` + modifiers → `selectVariants` / `hlmSelect` — **shim:** `UiSelectControlDirective` merges CVA + legacy `ui-select-control` / `ui-select-control--*` SCSS hooks; marker directives for modifiers (native `<select>` only; `BrnSelect` deferred)
    - [ ] `span[uiToggleSwitch]` → `brn-switch`
    - [ ] `[uiChip]` / `[uiStatusBadge]` → map to `hlmBadge` variants + retire `badge.scss` hooks
    - [ ] Skeleton CSS in `item-state-frame` → `hlm-skeleton`
    - [ ] Loading spinner (`::after`) in buttons → `hlm-spinner`
    - [ ] Remove `styles/primitives/button.scss`, `field.scss`, `badge.scss`, `chip.scss`, `toggle.scss` (after all callsites migrated)
  - [ ] **Molecules**
    - [x] **`hlmCard` molecule** — `HLM_CARD_IMPORTS` in `apps/web/src/app/shared/ui/card/` (local CVA; no published `@spartan-ng/ui-card-helm` until Tailwind v4 peers); legacy `[uiCardShell]` / `.ui-card-shell` unchanged until callsite migration
    - [x] **`hlmSelect` molecule (native)** — `HLM_SELECT_IMPORTS` in `apps/web/src/app/shared/ui/select/` (local CVA; overlay `BrnSelect` deferred); legacy `select[uiSelectControl*]` unchanged at callsites
    - [ ] `app-dropdown-shell` + `app-standard-dropdown` → `brn-menu`
    - [ ] `app-popover` → `brn-popover`
    - [ ] `app-segmented-switch` → `brn-tabs`
    - [ ] `button[uiTab]` tabs → `hlm-tabs`
    - [ ] Sort/filter/grouping dropdowns → `brn-menu`
    - [ ] Toast system → `hlm-toaster` (Sonner)
    - [ ] Remove `styles/primitives/tab.scss`, `styles/patterns/dropdown.scss`, `styles/patterns/toolbar.scss`
  - [ ] **Organisms**
    - [x] `app-confirm-dialog` → **`BrnDialog` + `HLM_DIALOG_IMPORTS`** (pilot: CDK dialog under `@spartan-ng/brain/dialog`; focus trap + scroll block via CDK defaults; `text-input-dialog` / `project-select-dialog` reuse the same pattern)
    - [ ] `app-text-input-dialog` → `brn-dialog` (same stack as confirm-dialog)
    - [ ] `app-project-select-dialog` → `brn-dialog` (same stack as confirm-dialog)
    - [ ] `app-share-link-audience-dialog` → `brn-dialog`
    - [ ] `app-photo-lightbox` → `brn-dialog` (fullscreen)
    - [ ] Upload panel → `brn-sheet` (evaluate) or keep custom resizable
    - [ ] Remove `styles/patterns/form.scss` (after form field migration)
    - [ ] Remove `UI_PRIMITIVE_DIRECTIVES` barrel (after all directives replaced)
- [ ] **Phase 4** — Cleanup & Build Verification
  - [ ] Remove `apps/web/src/styles/primitives/` folder (all sheets replaced)
  - [ ] Remove `apps/web/src/styles/patterns/` folder (all patterns replaced)
  - [ ] Remove `shared/ui-primitives/ui-primitives.directive.ts` (all directives replaced)
  - [ ] Remove `shared/dropdown-trigger/dropdown-shell.component.ts`
  - [ ] Audit all remaining `#hex` / `rgba()` hardcoded values (see table above)
  - [ ] Run `npm run design-system:check`
  - [ ] Run `ng build` — zero errors
  - [ ] Run `npm run lint` — zero warnings

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
| 2026-05-13 | `UI_PRIMITIVE_DIRECTIVES` is the primary migration surface | ~60 attribute directives constitute the entire current design-system API; each directive maps 1-to-1 to a spartan primitive |
| 2026-05-13 | Dual token system (v1 `--color-*` + v2 `--fp-sys-color-*`) must be reconciled before Phase 2 begins | spartan theming requires a single consistent set of `--primary`, `--background`, `--border` etc.; the dual system creates ambiguity |
| 2026-05-13 | Dialog stack: confirm dialog migrated to `BrnDialog` (CDK-backed); remaining custom dialogs follow the same pattern | Confirm pilot done; other overlays still custom until migrated |
| 2026-05-13 | Workspace pane, map shell, and nav remain custom — no spartan primitive covers these patterns | Map-adjacent resizable pane, Leaflet map frame, and app sidebar/bottom-nav are too app-specific |
| 2026-05-13 | **--primary** = `oklch(0.6716 0.1368 48.5130)` (≈ warm orange #cc7a4a) — warm orange wins as single brand primary | Resolves Phase 1 blocker; MD3 gold `--fp-sys-color-primary: #745b0c` is kept as alias only |
| 2026-05-13 | Tailwind v3 → v4 upgraded; single tweakcn CSS variable foundation installed | Phase 2 complete; tweakcn vars drive spartan/ui, legacy aliases keep existing components intact |
| 2026-05-13 | **Phase 3 start:** `@spartan-ng/brain` + CVA (`buttonVariants`) + `UiButtonDirective` shim; published `@spartan-ng/ui-*-helm` names mostly absent or Tailwind3-peered (`ui-core`) | npm reality + Tailwind v4; local `shared/ui/button` until helm install policy is set |
| 2026-05-13 | Normalized hardcoded overlay z-index values and legacy token names to the `--z-*` token scale | Precondition for Brn overlay migration (modals, dialogs, map chrome, dropdowns); intra-component stacking still uses small integer offsets inside parent stacking contexts |
| 2026-05-13 | **Confirm dialog:** `BrnDialog` + local `HLM_DIALOG_IMPORTS` (CVA) | `@spartan-ng/brain/dialog` wraps CDK Dialog (`Dialog.open`) — focus handling and scroll blocking come from CDK defaults; `node -e "require('@spartan-ng/brain/dialog')"` is not viable (Angular partial compilation / linker). |
