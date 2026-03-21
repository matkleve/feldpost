# Primitive Variants Registry

Back to master: [master-spec.md](./master-spec.md)

Purpose:

- One table for all canonical primitives with size/state/layout/icon-text variants.
- This page is the quick reference for implementation and review.

Status key:

- `implemented`: primitive exists in runtime and Angular primitive layer.
- `planned`: defined but not yet wired broadly in runtime.

## Primitive Matrix

| Primitive                                | Status      | Orientation                   | Sizes            | Density         | Icon/Text Modes                        | Layout Modes  | Required States                                 |
| ---------------------------------------- | ----------- | ----------------------------- | ---------------- | --------------- | -------------------------------------- | ------------- | ----------------------------------------------- |
| `ui-container` / `ui-container--compact` | implemented | n/a                           | default, compact | panel, compact  | n/a                                    | block         | default                                         |
| `ui-item` (+ media/label)                | implemented | horizontal                    | default          | balanced, dense | media+label, label-only                | row           | default, hover, focus-visible                   |
| `toolbar-btn`                            | implemented | horizontal                    | compact          | dense           | text+icon-trailing                     | row           | default, hover, active, focus-visible, disabled |
| `ui-button`                              | implemented | horizontal                    | default          | balanced        | text-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled |
| `ui-button--primary`                     | implemented | horizontal                    | default          | balanced        | text-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled |
| `ui-button--secondary`                   | implemented | horizontal                    | default          | balanced        | text-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled |
| `ui-button--ghost`                       | implemented | horizontal                    | default          | balanced        | text-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled |
| `ui-button--danger`                      | implemented | horizontal                    | default          | balanced        | text-only, icon-leading, icon-trailing | row           | default, hover, active, focus-visible, disabled |
| `icon-btn-ghost`                         | implemented | n/a                           | compact          | dense           | icon-only                              | inline        | default, hover, active, focus-visible, disabled |
| `ui-input-control`                       | implemented | n/a                           | default          | field           | text, assistive-only label             | block         | default, focus-visible, disabled, read-only     |
| `ui-input-control--compact`              | implemented | n/a                           | compact          | dense-field     | text, assistive-only label             | block         | default, focus-visible, disabled, read-only     |
| `ui-select-control`                      | implemented | n/a                           | default          | field           | text+icon-trailing                     | block         | default, focus-visible, disabled                |
| `ui-select-control--compact`             | implemented | n/a                           | compact          | dense-field     | text+icon-trailing                     | block         | default, focus-visible, disabled                |
| `ui-field-row`                           | implemented | horizontal                    | default          | balanced        | label + control                        | row           | default                                         |
| `ui-field-row--stacked`                  | implemented | vertical                      | default          | balanced        | label + control                        | column        | default                                         |
| `ui-toggle-row`                          | implemented | horizontal                    | default          | balanced        | label + switch                         | row           | default, hover, focus-visible, active, disabled |
| `ui-toggle-row--compact`                 | implemented | horizontal                    | compact          | dense           | label + switch                         | row           | default, hover, focus-visible, active, disabled |
| `ui-toggle-switch`                       | implemented | horizontal                    | default          | n/a             | switch only                            | inline        | default, active, disabled                       |
| `ui-toggle-switch--compact`              | implemented | horizontal                    | compact          | n/a             | switch only                            | inline        | default, active, disabled                       |
| `ui-range-control`                       | implemented | horizontal                    | default          | field           | track + thumb                          | block         | default, active, focus-visible, disabled        |
| `app-segmented-switch`                   | implemented | horizontal (vertical planned) | compact, default | balanced        | icon-only, icon+label, label-only      | inline, fluid | default, hover, active, focus-visible, disabled |
| `app-snap-size-slider`                   | implemented | horizontal                    | compact          | dense           | icon-only                              | inline        | default, hover, active, focus-visible, disabled |
| `ui-chip`                                | implemented | horizontal                    | compact          | dense           | icon+text, text-only                   | inline-wrap   | default                                         |
| `ui-chip--action`                        | implemented | horizontal                    | compact          | dense           | icon+text, text-only                   | inline-wrap   | default, hover, active, focus-visible, disabled |
| `ui-chip--passive`                       | implemented | horizontal                    | compact          | dense           | icon+text, text-only                   | inline-wrap   | default                                         |
| `ui-chip--selected`                      | implemented | horizontal                    | compact          | dense           | icon+text, text-only                   | inline-wrap   | default, hover                                  |
| `ui-choice-control` (checkbox/radio)     | implemented | n/a                           | default          | field           | native control                         | inline        | default, focus-visible, checked, disabled       |
| `ui-choice-row`                          | implemented | horizontal                    | default          | balanced        | control + label                        | row           | default, hover, focus-visible, disabled         |
| `ui-inline-edit-row`                     | implemented | horizontal                    | default          | balanced        | field + actions                        | row           | default, focus-visible                          |
| `ui-inline-edit-actions`                 | implemented | horizontal                    | compact          | dense           | icon-only, icon+text                   | inline        | default, hover, active, focus-visible, disabled |

## Notes

- Segmented switch has horizontal runtime support today; vertical is defined as planned and should be added via a dedicated modifier before broad adoption.
- Primitive usage in Angular templates should prefer primitive directive attributes from the shared primitive directive file over ad-hoc feature-local utility classes.
- If a primitive requires extra state (`loading`, `error`, `success`), add an explicit variant class and update this table in the same change.
