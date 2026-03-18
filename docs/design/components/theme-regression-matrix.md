# Theme Regression Matrix

Status: Working Baseline
Owner: UI Standardization
Role: verification matrix for cross-theme component behavior; not a policy source.

Canonical policy references:

- `docs/design/constitution.md`
- `docs/design/components/action-interaction-kernel.md`
- `docs/design/token-layers.md`

## Scope

- Theme modes: `light`, `dark`, `sandstone`
- Input methods: mouse, keyboard
- Surfaces: menus, toolbars, settings controls, dialogs

## Matrix

| Surface             | Variant                                 | Light | Dark | Sandstone | Keyboard/Focus |
| ------------------- | --------------------------------------- | ----- | ---- | --------- | -------------- |
| Option menu surface | `option-menu-surface` + `dd-item`       | TODO  | TODO | TODO      | TODO           |
| Map context menus   | map/radius/marker context menus         | TODO  | TODO | TODO      | TODO           |
| Detail context menu | image detail overflow menu              | TODO  | TODO | TODO      | TODO           |
| Toolbar controls    | workspace toolbar dropdown triggers     | TODO  | TODO | TODO      | TODO           |
| Segmented controls  | `ui-segmented` + `app-segmented-switch` | TODO  | TODO | TODO      | TODO           |
| Toggle rows         | `ui-toggle-row` + `ui-toggle-switch`    | TODO  | TODO | TODO      | TODO           |
| Select controls     | `ui-select-control`                     | TODO  | TODO | TODO      | TODO           |
| Dialog shell        | confirm/input/select shared dialogs     | TODO  | TODO | TODO      | TODO           |

## Keyboard Smoke Checks

1. `Tab` reaches each interactive primitive in visible order.
2. Focus ring is visible for all tested controls in all three themes.
3. `Enter` and `Space` activate segmented and toggle controls consistently.
4. `Escape` closes context menus and dialogs and restores trigger focus when applicable.
5. Arrow-key navigation inside menu/list popups is consistent (`Up/Down/Home/End`).

## Logging Format

- Use `OK` for pass.
- Use `BUG(<short-id>)` for failures, e.g. `BUG(menu-focus-dark)`.
- Add issue links or file references in a follow-up line under the table when needed.

## Update Rule

Update affected rows in this file in the same change set as any primitive migration.
