# Theme Regression Matrix

This matrix is the baseline smoke check for themeability after primitive standardization.

## Scope

- Theme modes: `light`, `dark`, `sandstone`
- Input methods: mouse, keyboard
- Surfaces: menus, toolbars, settings controls, dialogs

## Matrix

| Surface             | Variant                                      | Light | Dark | Sandstone | Keyboard/Focus |
| ------------------- | -------------------------------------------- | ----- | ---- | --------- | -------------- |
| Option menu surface | `option-menu-surface` + `dd-item`            | TODO  | TODO | TODO      | TODO           |
| Map context menus   | map/radius/marker context menus              | TODO  | TODO | TODO      | TODO           |
| Detail context menu | image detail overflow menu                   | TODO  | TODO | TODO      | TODO           |
| Toolbar controls    | workspace toolbar dropdown triggers          | TODO  | TODO | TODO      | TODO           |
| Segmented controls  | `ui-segmented` (settings + map style switch) | TODO  | TODO | TODO      | TODO           |
| Toggle rows         | `ui-toggle-row` + `ui-toggle-switch`         | TODO  | TODO | TODO      | TODO           |
| Select controls     | `ui-select-control`                          | TODO  | TODO | TODO      | TODO           |
| Dialog shell        | confirm/input/select shared dialogs          | TODO  | TODO | TODO      | TODO           |

## Keyboard Smoke Checks

1. `Tab` can reach each interactive primitive in visible order.
2. Focus ring is visible on every primitive in all three themes.
3. `Enter`/`Space` activates segmented/toggle controls consistently.
4. `Escape` closes context menus and dialogs where expected.

## Notes

- Fill cells with `OK` or `BUG(<short-id>)`.
- Keep this file updated with every primitive migration wave.
- If a check fails only in one theme, add the theme name in the bug note.
