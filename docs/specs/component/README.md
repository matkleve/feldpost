# Component Specs

Module index for shared component-level contracts. Specs live in **topic subfolders**; link targets use paths like `component/<topic>/<name>.md`.

## Component registry (reuse gate)

Check before adding net-new shared UI: **[registry.md](registry.md)** (parent index: slice map, actions) and the linked supplement bodies — **[registry.primitives-and-layout.supplement.md](registry.primitives-and-layout.supplement.md)**, **[registry.workspace-pane.supplement.md](registry.workspace-pane.supplement.md)**, **[registry.feature-local.supplement.md](registry.feature-local.supplement.md)** — for selector rows and variant axes.

## Design tokens & floating menus

- **Naming / tweakcn checklist:** [../design/tokens.md](../design/tokens.md)
- **Which bucket owns which CSS concern:** [../design/token-layers.md](../design/token-layers.md)
- **`dd-*` / toolbar anchored shell:** [filters/dropdown-system.md](filters/dropdown-system.md)
- **Runtime emission:** semantic custom properties are defined in **`apps/web/src/styles.scss`**. The legacy bridge file **`apps/web/src/styles/_legacy-design-tokens.scss`** is **absent** from **`apps/web`** (Phase 7 Batch 50); sole late global partial is **`@include meta.load-css('styles/typography-baseline')`** — [phase-7-token-migration.md](../../migration/phase-7-token-migration.md).

## filters/

Filter chips, dropdowns, grouping, sort, and related controls.

- [active-filter-chips](filters/active-filter-chips.md)
- [calendar-dropdown](filters/calendar-dropdown.md) (+ [acceptance criteria](filters/calendar-dropdown.acceptance-criteria.md), [panel](filters/calendar-picker-panel.md), [range mode](filters/calendar-dropdown.range-mode.supplement.md), [range grid](filters/calendar-picker-panel.range-grid.supplement.md), [time field](filters/time-field-control.md) + [time field AC](filters/time-field-control.acceptance-criteria.md))
- [captured-date-editor](filters/captured-date-editor.md) *(legacy — migrating to calendar-dropdown)*
- [chip](filters/chip.md)
- [dropdown-system](filters/dropdown-system.md) (+ [class library supplement](filters/dropdown-system.class-library.supplement.md))
- [filter-dropdown](filters/filter-dropdown.md)
- [grouping-dropdown](filters/grouping-dropdown.md) (+ [drag supplement](filters/grouping-dropdown.drag-and-state-machine.supplement.md))
- [item-grid-filter-operator](filters/item-grid-filter-operator.md)
- [segmented-switch](filters/segmented-switch.md)
- [sort-dropdown](filters/sort-dropdown.md)

## item-grid/

Grid shell, item state frame, and item-grid splits.

- [item-grid](item-grid/item-grid.md) (entry; links to splits below)
- [item-grid.state-and-fsm](item-grid/item-grid.state-and-fsm.md)
- [item-grid.visual-behavior-and-scss](item-grid/item-grid.visual-behavior-and-scss.md)
- [item-grid.migration-acceptance-and-gates](item-grid/item-grid.migration-acceptance-and-gates.md)
- [item-state-frame](item-grid/item-state-frame.md)

## map/

Map chrome, placement, and location affordances.

- [auth-map-background](map/auth-map-background.md)
- [gps-button](map/gps-button.md)
- [map-context-menu](map/map-context-menu.md)
- [map-style-switch](map/map-style-switch.md)
- [map-zone](map/map-zone.md)
- [placement-mode](map/placement-mode.md)
- [radius-selection](map/radius-selection.md)
- [user-location-marker](map/user-location-marker.md)

## media/

Media surfaces, items, toolbar, and file-type UI.

- [photo-lightbox](media/photo-lightbox.md)
- [file-type-chips](media/file-type-chips.md) — **`app-chip`** + `chipVariantForFileType()`; § **Agent entry points** (+ [lookup supplement](media/file-type-chips.lookup-table.supplement.md))
- [media.component](media/media.component.md)
- [media-content](media/media-content.md)
- [media-display](media/media-display.md) (+ [rendering matrix supplement](media/media-display.rendering-matrix.supplement.md))
- [media-item](media/media-item.md)
- [media-item-quiet-actions](media/media-item-quiet-actions.md)
- [media-item-upload-overlay](media/media-item-upload-overlay.md)
- [media-page-header](media/media-page-header.md)
- [media-toolbar](media/media-toolbar.md)

## project/

Project list and details UI.

- [projects-view-toggle](project/projects-view-toggle.md)
- [project-color-picker](project/project-color-picker.md)
- [project-details-view](project/project-details-view.md)
- [project-item](project/project-item.md)
- [projects-dropdown](project/projects-dropdown.md)

## upload/

Upload entry points and upload panel contract splits.

- [upload-button-zone](upload/upload-button-zone.md)
- [upload-panel](upload/upload-panel.md)
- [upload-panel.acceptance-criteria](upload/upload-panel.acceptance-criteria.md)
- [upload-panel.feedback-triage](upload/upload-panel.feedback-triage.md)
- [upload-panel.lane-and-row-actions](upload/upload-panel.lane-and-row-actions.md)
- [upload-panel.layout-and-states](upload/upload-panel.layout-and-states.md)

## workspace/

Workspace chrome adjacent to the map/workspace split.

- [pane-toolbar](workspace/pane-toolbar.md)
- [pane-footer](workspace/pane-footer.md)
- [quick-info-chips](workspace/quick-info-chips.md)
- [snap-size-slider](workspace/snap-size-slider.md)
- [active-selection-view](workspace/active-selection-view.md)
- [drag-divider](workspace/drag-divider.md)
- [group-tab-bar](workspace/group-tab-bar.md)
- [sidebar](workspace/sidebar.md) (+ [collapse supplement](workspace/sidebar.collapse.supplement.md), [acceptance criteria](workspace/sidebar.acceptance-criteria.md))

## account/

- [account (shared)](account/account.md)

## confirm-dialog/

- [confirm-dialog](confirm-dialog/confirm-dialog.md)

## containers/

- [layout containers](containers/containers.md)

## project-select-dialog/

- [project-select-dialog](project-select-dialog/project-select-dialog.md)

## text-input-dialog/

- [text-input-dialog](text-input-dialog/text-input-dialog.md)

## ui-primitives/

- [ui-primitives (parent index)](ui-primitives/ui-primitives.md)
- [badges and chips](ui-primitives/ui-primitives.badges-and-chips.md) (inventory: pill vs toolbar control vs filter operator; canonical chip height)
- [card grid](ui-primitives/ui-primitives.card-grid.md)
- [card variant switch](ui-primitives/ui-primitives.card-variant-switch.md)
- [cycle indicator dots](ui-primitives/cycle-indicator-dots.md)
- [group header](ui-primitives/ui-primitives.group-header.md)
- [panel trigger](ui-primitives/panel-trigger.md) (`app-panel-trigger` — compact toolbar trigger; Figma node `164:2177`)
- [popover](ui-primitives/popover.md) (`app-popover` — chrome-only floating surface shell; `@no-figma`)
- [directives, click-outside, parse-time-input](ui-primitives/ui-primitives.directives-and-utils.md)
