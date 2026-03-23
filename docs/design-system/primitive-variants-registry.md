# Primitive Variants Registry

Back to master: [master-spec.md](./master-spec.md)

Purpose:

- One table for all canonical primitives with size/state/layout/icon-text variants.
- This page is the quick reference for implementation and review.

Status key:

- `implemented`: primitive exists in runtime and Angular primitive layer.
- `planned`: defined but not yet wired broadly in runtime.

## Primitive Matrix

| Primitive                                | Status      | Orientation                   | Sizes            | Density         | Icon/Text Modes                                    | Layout Modes  | Required States                                                 |
| ---------------------------------------- | ----------- | ----------------------------- | ---------------- | --------------- | -------------------------------------------------- | ------------- | --------------------------------------------------------------- |
| `ui-container` / `ui-container--compact` | implemented | n/a                           | default, compact | panel, compact  | n/a                                                | block         | default                                                         |
| `ui-item` (+ media/label)                | implemented | horizontal                    | default          | balanced, dense | media+label, label-only                            | row           | default, hover, focus-visible                                   |
| `toolbar-btn`                            | implemented | horizontal                    | compact          | dense           | text+icon-trailing                                 | row           | default, hover, active, focus-visible, disabled                 |
| `ui-button`                              | implemented | horizontal                    | sm, md, lg       | balanced        | icon-only, label-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled, loading        |
| `ui-button--primary`                     | implemented | horizontal                    | sm, md, lg       | balanced        | icon-only, label-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled, loading        |
| `ui-button--secondary`                   | implemented | horizontal                    | sm, md, lg       | balanced        | icon-only, label-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled, loading        |
| `ui-button--ghost`                       | implemented | horizontal                    | sm, md, lg       | balanced        | icon-only, label-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled, loading        |
| `ui-button--danger`                      | implemented | horizontal                    | sm, md, lg       | balanced        | icon-only, label-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled, loading        |
| `icon-btn-ghost`                         | implemented | n/a                           | sm, md, lg       | dense           | icon-only                                          | inline        | default, hover, active, focus-visible, disabled, loading        |
| `ui-input-control`                       | implemented | n/a                           | sm, md, lg       | field           | text, assistive-only label                         | block         | default, focus-visible, disabled, read-only, loading, error     |
| `ui-input-control--compact`              | implemented | n/a                           | sm               | dense-field     | text, assistive-only label                         | block         | default, focus-visible, disabled, read-only, loading, error     |
| `ui-select-control`                      | implemented | n/a                           | sm, md, lg       | field           | text+icon-trailing                                 | block         | default, focus-visible, disabled, loading, error                |
| `ui-select-control--compact`             | implemented | n/a                           | sm               | dense-field     | text+icon-trailing                                 | block         | default, focus-visible, disabled, loading, error                |
| `ui-field-row`                           | implemented | horizontal                    | default          | balanced        | label + control                                    | row           | default                                                         |
| `ui-field-row--stacked`                  | implemented | vertical                      | default          | balanced        | label + control                                    | column        | default                                                         |
| `ui-toggle-row`                          | implemented | horizontal                    | sm, md, lg       | balanced        | label + switch                                     | row           | default, hover, focus-visible, active, disabled, loading, error |
| `ui-toggle-row--compact`                 | implemented | horizontal                    | sm               | dense           | label + switch                                     | row           | default, hover, focus-visible, active, disabled, loading, error |
| `ui-toggle-switch`                       | implemented | horizontal                    | sm, md, lg       | n/a             | switch only                                        | inline        | default, active, disabled                                       |
| `ui-toggle-switch--compact`              | implemented | horizontal                    | sm               | n/a             | switch only                                        | inline        | default, active, disabled                                       |
| `ui-range-control`                       | implemented | horizontal                    | default          | field           | track + thumb                                      | block         | default, active, focus-visible, disabled                        |
| `ui-tab-list`                            | implemented | horizontal                    | sm, md, lg       | balanced        | icon-optional                                      | row           | default                                                         |
| `ui-tab`                                 | implemented | horizontal                    | sm, md, lg       | balanced        | icon-optional, label-only                          | inline        | default, hover, active, focus-visible, disabled                 |
| `app-segmented-switch`                   | implemented | horizontal (vertical planned) | sm, md, lg       | balanced        | icon-only, icon+label, label-only                  | inline, fluid | default, hover, active, focus-visible, disabled                 |
| `app-snap-size-slider`                   | implemented | horizontal                    | compact          | dense           | icon-only                                          | inline        | default, hover, active, focus-visible, disabled                 |
| `ui-status-badge` / `ui-status-pill`     | implemented | horizontal                    | sm, md           | dense           | icon-optional, label-only                          | inline        | default                                                         |
| `ui-row-shell`                           | implemented | horizontal                    | sm, md, lg       | balanced        | leading-slot, label-slot, trailing-slot            | row           | default, hover, active, focus-visible, disabled                 |
| `ui-card-shell`                          | implemented | n/a                           | sm, md, lg       | balanced        | header, body, actions                              | block         | default, hover, active, focus-visible, disabled                 |
| `ui-media-tile`                          | implemented | n/a                           | default          | media           | image-only                                         | tile          | default, hover, selected, focus-visible                         |
| `ui-chip`                                | implemented | horizontal                    | sm, md, lg       | dense           | icon+text, text-only                               | inline-wrap   | default, disabled, loading, error                               |
| `ui-chip--action`                        | implemented | horizontal                    | sm, md, lg       | dense           | icon+text, text-only                               | inline-wrap   | default, hover, active, focus-visible, disabled                 |
| `ui-chip--passive`                       | implemented | horizontal                    | sm, md, lg       | dense           | icon+text, text-only                               | inline-wrap   | default, disabled                                               |
| `ui-chip--selected`                      | implemented | horizontal                    | sm, md, lg       | dense           | icon+text, text-only                               | inline-wrap   | default, hover, disabled                                        |
| `ui-choice-control` (checkbox/radio)     | implemented | n/a                           | default          | field           | native control                                     | inline        | default, focus-visible, checked, disabled                       |
| `ui-choice-row`                          | implemented | horizontal                    | default          | balanced        | control + label                                    | row           | default, hover, focus-visible, disabled                         |
| `ui-inline-edit-row`                     | implemented | horizontal                    | default          | balanced        | field + actions                                    | row           | default, focus-visible                                          |
| `ui-inline-edit-actions`                 | implemented | horizontal                    | compact          | dense           | icon-only, icon+text                               | inline        | default, hover, active, focus-visible, disabled                 |

## Notes

Implementation update (2026-03-21):

- Button/Icon-Button family now exposes explicit size tiers (`sm`/`md`/`lg`), icon-mode modifiers (`icon-only`, `icon-leading`, `icon-trailing`, `label-only`), and loading states (`ui-button--loading`, `icon-btn-ghost--loading`) via shared primitive styles and standalone directive API modifiers.
- Field/Select/Toggle/Chip family now uses the same size tier language (`sm`/`md`/`lg`) and shared async/error state naming (`loading`, `error`) through primitive modifiers (`--loading`, `--error`, `--disabled`, `--read-only`) aligned with button semantics.
- Primitive container/row layer remains implemented as explicit standalone primitives (`uiContainer`, `uiContainerCompact`, `uiItem`, `uiItemMedia`, `uiItemLabel`, `uiSpacer`) with active consumers in shared dialogs and settings overlay templates.
- Navigation tabs are now standardized as primitives (`ui-tab-list`, `ui-tab` with `sm/md/lg`) and wired into upload lane switching as a real `tablist` consumer.
- Segmented control now supports explicit `sm/md/lg` sizing in `app-segmented-switch` and is actively used for toolbar view-mode switching (`app-projects-view-toggle`).
- Status badge/pill primitive is implemented (`ui-status-badge`/`ui-status-pill`) with semantic variants (`neutral`, `info`, `success`, `warning`, `error`) and is used in projects list status cells.
- Data-display shells are implemented as primitives (`ui-row-shell`, `ui-card-shell` with slot classes for leading/trailing/actions) and are wired into projects list/grid rendering.
- Media tile primitive is implemented as `ui-media-tile` for thumbnail-style square media cards with zero padding/min-height and image-focused hover behavior.
- Foundation family (`toolbar-btn`) now has Angular primitive API via `uiToolbarButton` directive and is migrated in both workspace toolbar and projects toolbar consumers.
- Inputs/Selection family state layers were completed in shared primitives (`ui-input-control`, `ui-select-control`, `ui-toggle-row`, `ui-toggle-switch`, `ui-range-control`, `ui-choice-*`, `ui-inline-edit-*`) and consumers were migrated in `projects-dropdown` (choice primitives) and `editable-property-row` (inline-edit + input/select primitives).
- TODO (`app-segmented-switch` vertical orientation): kept planned because only horizontal geometry is implemented in runtime and introducing vertical flow now would break existing toolbar spacing contracts.

- Segmented switch has horizontal runtime support today; vertical is defined as planned and should be added via a dedicated modifier before broad adoption.
- Primitive usage in Angular templates should prefer primitive directive attributes from the shared primitive directive file over ad-hoc feature-local utility classes.
- If a primitive requires extra state (`loading`, `error`, `success`), add an explicit variant class and update this table in the same change.
