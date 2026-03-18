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

| Primitive block                                 | Canonical contract                                 | Primary implementation files                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Current state | Theme readiness |
| ----------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------------- |
| Global token foundation                         | Global CSS custom properties in one source         | `apps/web/src/styles.scss`, `docs/design/tokens.md`                                                                                                                                                                                                                                                                                                                                                                                                                                             | present       | medium          |
| Dropdown shell/anchoring                        | Shared shell + panel classes                       | `apps/web/src/app/shared/dropdown-shell.component.ts`, `apps/web/src/app/shared/standard-dropdown.component.ts`                                                                                                                                                                                                                                                                                                                                                                                 | present       | medium          |
| Toolbar option dropdowns                        | Shared menu surface + dropdown shell               | `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/workspace-toolbar.component.html`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/sort-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/grouping-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/filter-dropdown.component.ts`, `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/projects-dropdown.component.ts` | present       | medium          |
| Map context menus                               | Option menu surface primitives                     | `apps/web/src/app/features/map/map-shell/map-shell.component.html`, `apps/web/src/app/features/map/map-shell/map-shell.component.scss`                                                                                                                                                                                                                                                                                                                                                          | partial       | low             |
| Detail context menu                             | Option menu surface + contextual actions           | `apps/web/src/app/features/map/workspace-pane/image-detail-view.component.html`, `apps/web/src/app/features/map/workspace-pane/image-detail-view.component.scss`                                                                                                                                                                                                                                                                                                                                | partial       | low             |
| Search suggestions panel (integrated exception) | Integrated search + suggestion panel pattern       | `apps/web/src/app/features/map/workspace-pane/address-search/address-search.component.html`, `apps/web/src/app/features/map/workspace-pane/address-search/address-search.component.scss`                                                                                                                                                                                                                                                                                                        | partial       | medium          |
| Metadata suggestion menu                        | Option menu surface in inline form flow            | `apps/web/src/app/features/map/workspace-pane/metadata-section/metadata-section.component.html`, `apps/web/src/app/features/map/workspace-pane/metadata-section/metadata-section.component.scss`                                                                                                                                                                                                                                                                                                | partial       | medium          |
| Settings form sections                          | Shared settings/form primitives + semantic aliases | `apps/web/src/app/features/settings-overlay/settings-overlay.component.html`, `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                                                                                          | partial       | medium          |
| Segmented switch (icon + inactive state)        | Shared segmented switch component                  | `apps/web/src/app/shared/segmented-switch/segmented-switch.component.ts`, `apps/web/src/app/shared/segmented-switch/segmented-switch.component.html`, `apps/web/src/app/shared/segmented-switch/segmented-switch.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                    | present       | medium          |
| Dialog shell (confirm/input/select)             | Shared modal primitives                            | `apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.ts`, `apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.ts`, `apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.ts`                                                                                                                                                                                                                                                            | present       | medium          |
| Chips and compact selector rows                 | Shared chip behavior + row semantics               | `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.ts`, `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.scss`, `apps/web/src/app/features/projects/projects-view-toggle.component.ts`                                                                                                                                                                                                                                                                    | partial       | medium          |
| Slider control                                  | Shared slider primitive                            | `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.ts`, `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.scss`                                                                                                                                                                                                                                                                                                                                            | present       | medium          |
| Color selector popover                          | Feature-specific option picker                     | `apps/web/src/app/features/projects/project-color-picker.component.ts`                                                                                                                                                                                                                                                                                                                                                                                                                          | partial       | medium          |
| Invite management section                       | Shared settings/form primitives + semantic aliases | `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.html`, `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                                                      | partial       | medium          |
| Captured date inline editor                     | Shared field/menu/action aliases in inline editor  | `apps/web/src/app/features/map/workspace-pane/captured-date-editor.component.scss`, `apps/web/src/styles.scss`                                                                                                                                                                                                                                                                                                                                                                                  | partial       | medium          |

Notes:

- `theme readiness: low` means the primitive still depends on feature-local color/spacing values and needs semantic token aliases.
- Integrated search suggestion behavior is an approved exception to strict dropdown unification, but still follows shared interaction and accessibility rules.

## Theme Contract (Semantic Token Layer)

Canonical source: `docs/design/token-layers.md`.

Catalog-level enforcement summary:

1. New or refactored primitives consume Layer C aliases first.
2. Runtime alias mapping lives in `apps/web/src/styles.scss`.
3. Theme packs override Layer C first; Layer A overrides are reserved for global rebranding.

## Immediate Next Deliverables

1. Migrate remaining low-readiness menu surfaces (map context and detail context edge cases) to strict Layer C role aliases only.
2. Roll out shared settings/form primitives to additional account/invite subflows beyond current section shell.
3. Add minimal UI regression matrix (menus, toolbars, settings, dialogs) plus keyboard/focus smoke checks.
4. Add visual-theme verification pass (light/dark + one new custom theme profile) for all medium-readiness primitives.
