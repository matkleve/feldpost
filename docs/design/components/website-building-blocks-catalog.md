# Website Building Blocks Catalog

Status: Draft v1 (2026-03-17)
Scope: Feldpost UI system baseline

## Purpose

A complete checklist of website UI building blocks, grouped by layer, used as a planning and standardization base.

Use this file to:

- decide what should be standardized first
- track what already exists vs what is missing
- avoid building one-off UI patterns

## Legend

- `present`: already implemented and reusable
- `partial`: exists but duplicated/inconsistent
- `missing`: not yet defined as a reusable block

## 1. Foundation Layer

1. Design tokens (color, spacing, radius, elevation, z-index) — `present`
2. Typography scale and text roles (title/body/caption/meta) — `partial`
3. Motion tokens and interaction timing presets — `partial`
4. Focus-ring primitives — `partial`
5. Border policy and stroke hierarchy — `present`
6. State color semantics (success/warning/danger/info) — `present`

## 2. Layout & Structure Layer

1. App shell (sidebar/top area/content) — `present`
2. Page container primitives (inset/max-width/content rail) — `partial`
3. Section container/card primitives — `partial`
4. Split-pane / resizable zones — `present`
5. Sticky regions (toolbars/headers/footers) — `partial`
6. Empty-state layout primitive — `present`

## 3. Navigation Layer

1. Main nav item pattern — `present`
2. Secondary section list pattern — `partial`
3. Tabs / segmented navigation — `partial`
4. Breadcrumbs — `missing`
5. Command palette / quick switcher — `partial`

## 4. Action & Input Layer

1. Button family (primary/secondary/ghost/danger/icon) — `partial`
2. Toolbar action buttons — `present`
3. Text input field primitive — `partial`
4. Select/dropdown trigger primitive — `partial`
5. Segmented control primitive — `partial`
6. Toggle/switch primitive — `partial`
7. Slider/range primitive — `partial`
8. Checkbox/radio primitive — `partial`
9. Chip/tag primitive (actionable + passive) — `partial`
10. Inline edit pattern — `partial`

## 5. Menu, Overlay & Popover Layer

1. Menu surface primitive — `present`
2. Dropdown shell/anchoring primitive — `present`
3. Context menu pattern — `present`
4. Suggestion list/autocomplete surface — `partial`
5. Popover panel primitive — `partial`
6. Dialog/modal shell — `present`
7. Confirm dialog pattern — `present`
8. Input dialog pattern — `present`
9. Lightbox/media overlay — `present`

## 6. Data Display Layer

1. List row item primitive — `partial`
2. Grid card primitive — `partial`
3. Group header / collapsible section row — `present`
4. Key-value metadata row — `partial`
5. Status badge/pill primitive — `partial`
6. Table primitive — `missing`
7. Stats/summary tile primitive — `missing`

## 7. Feedback & System State Layer

1. Toast pattern — `present`
2. Inline validation state pattern — `partial`
3. Loading skeleton pattern — `partial`
4. Busy/disabled interaction state pattern — `partial`
5. Error and retry block pattern — `partial`
6. Progress indicators (linear/circular/queue) — `present`

## 8. Domain-Specific Feldpost Layer

1. Map marker UI primitive set — `present`
2. Map context actions menu pattern — `present`
3. Workspace pane action pattern — `partial`
4. Upload queue item pattern — `present`
5. Project assignment selector pattern — `partial`
6. Settings section card pattern — `partial`

## 9. Cross-Cutting Quality Layer

1. Accessibility baseline per primitive (ARIA, keyboard, target size) — `partial`
2. Mobile behavior rules per primitive — `partial`
3. Dark-theme behavior per primitive — `partial`
4. i18n-safe text/overflow behavior per primitive — `partial`
5. Visual regression checks for critical primitives — `missing`

## Recommended Standardization Order

1. Button family + input/select/toggle/segmented primitives
2. Suggestion/autocomplete and popover surfaces
3. List/card/metadata row display primitives
4. Settings section card and form composition primitives
5. Accessibility + visual-regression checklist per primitive

## UI Primitive Inventory (Mapping)

| Primitive block | Canonical contract | Primary implementation files | Current state | Theme readiness |
| --- | --- | --- | --- | --- |
| Global token foundation | Global CSS custom properties in one source | `apps/web/src/styles.scss`, `docs/design/tokens.md` | present | medium |
| Dropdown shell/anchoring | Shared shell + panel classes | `apps/web/src/app/shared/dropdown-shell.component.ts`, `apps/web/src/app/shared/standard-dropdown.component.ts` | present | medium |
| Toolbar option dropdowns | Shared menu surface + dropdown shell | `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/workspace-toolbar.component.html`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/sort-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/grouping-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/filter-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/projects-dropdown.component.ts` | present | medium |
| Map context menus | Option menu surface primitives | `apps/web/src/app/features/map/map-shell/map-shell.component.html`, `apps/web/src/app/features/map/map-shell/map-shell.component.scss` | partial | low |
| Detail context menu | Option menu surface + contextual actions | `apps/web/src/app/features/map/workspace-pane/image-detail-view.component.html`, `apps/web/src/app/features/map/workspace-pane/image-detail-view.component.scss` | partial | low |
| Search suggestions panel (integrated exception) | Integrated search + suggestion panel pattern | `apps/web/src/app/features/map/workspace-pane/address-search/address-search.component.html`, `apps/web/src/app/features/map/workspace-pane/address-search/address-search.component.scss` | partial | low |
| Metadata suggestion menu | Option menu surface in inline form flow | `apps/web/src/app/features/map/workspace-pane/metadata-section/metadata-section.component.html`, `apps/web/src/app/features/map/workspace-pane/metadata-section/metadata-section.component.scss` | partial | low |
| Settings form sections | Settings-specific composition, currently feature-local | `apps/web/src/app/features/settings-overlay/settings-overlay.component.html`, `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss` | partial | low |
| Dialog shell (confirm/input/select) | Shared modal primitives | `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.ts`, `apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.ts`, `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.ts` | present | medium |
| Chips and compact selector rows | Shared chip behavior + row semantics | `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.ts`, `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.scss`, `apps/web/src/app/features/projects/projects-view-toggle.component.ts` | partial | medium |
| Slider control | Shared slider primitive | `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.ts`, `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.scss` | present | medium |
| Color selector popover | Feature-specific option picker | `apps/web/src/app/features/projects/project-color-picker.component.ts` | partial | low |

Notes:

- `theme readiness: low` means the primitive still depends on feature-local color/spacing values and needs semantic token aliases.
- Integrated search suggestion behavior is an approved exception to strict dropdown unification, but still follows shared interaction and accessibility rules.

## Theme Contract (Semantic Token Layer)

Goal: allow new themes by remapping semantic aliases, not by editing each component.

### Contract layer A: Foundation tokens (already in use)

- Color: `--color-bg-*`, `--color-border*`, `--color-text-*`, `--color-primary`, `--color-clay`, semantic states
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
- Elevation: `--elevation-base`, `--elevation-subtle`, `--elevation-overlay`, `--elevation-dropdown`, `--elevation-modal`
- Spacing/layout: `--spacing-*`, `--container-*`, `--ui-item-*`

### Contract layer B: Interactive semantic aliases (partially in use)

- `--interactive-border-muted`
- `--interactive-surface-hover`
- `--interactive-focus-ring`
- `--interactive-transition-standard`

### Contract layer C: Component-role aliases (to standardize next)

Introduce and migrate to role aliases so primitives can be themed independently from raw palette tokens:

1. Action controls
- `--action-bg-default`
- `--action-bg-hover`
- `--action-bg-active`
- `--action-border-default`
- `--action-border-active`
- `--action-text-default`
- `--action-text-active`

2. Menu and option surfaces
- `--menu-surface-bg`
- `--menu-surface-border`
- `--menu-item-bg-hover`
- `--menu-item-bg-active`
- `--menu-item-text`
- `--menu-item-text-active`

3. Form controls
- `--field-bg`
- `--field-border`
- `--field-border-focus`
- `--field-placeholder`
- `--field-text`

4. Settings sections and cards
- `--section-bg`
- `--section-border`
- `--section-title`
- `--section-text`

5. Feedback states
- `--state-success-bg`
- `--state-warning-bg`
- `--state-danger-bg`
- `--state-info-bg`

### Migration rule

- New or refactored primitives must consume layer C aliases first.
- Layer C aliases resolve to existing layer A/B tokens in `apps/web/src/styles.scss`.
- Theme packs only override layer C aliases (and optionally layer A for global rebrand).

## Immediate Next Deliverables

1. Implement layer C component-role aliases in `apps/web/src/styles.scss` as non-breaking defaults.
2. Migrate `option-menu-surface` consumers (map shell, image detail, metadata, projects color picker) to layer C aliases.
3. Extract settings section/card primitives and migrate settings overlay to shared contracts.
4. Add minimal UI regression matrix (menus, toolbars, settings, dialogs) plus keyboard/focus smoke checks.
