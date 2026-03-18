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

| Surface             | Variant                                 | Light                                 | Dark                                 | Sandstone                                 | Keyboard/Focus                        |
| ------------------- | --------------------------------------- | ------------------------------------- | ------------------------------------ | ----------------------------------------- | ------------------------------------- |
| Option menu surface | `option-menu-surface` + `dd-item`       | BUG(menu-theme-light-unverified)      | BUG(menu-theme-dark-unverified)      | BUG(menu-theme-sandstone-unverified)      | BUG(menu-kbd-spec-failures-open)      |
| Map context menus   | map/radius/marker context menus         | TODO                                  | TODO                                 | TODO                                      | TODO                                  |
| Detail context menu | image detail overflow menu              | TODO                                  | TODO                                 | TODO                                      | TODO                                  |
| Toolbar controls    | workspace toolbar dropdown triggers     | BUG(toolbar-theme-light-unverified)   | BUG(toolbar-theme-dark-unverified)   | BUG(toolbar-theme-sandstone-unverified)   | BUG(toolbar-kbd-unverified)           |
| Segmented controls  | `ui-segmented` + `app-segmented-switch` | BUG(segmented-theme-light-unverified) | BUG(segmented-theme-dark-unverified) | BUG(segmented-theme-sandstone-unverified) | BUG(segmented-kbd-spec-failures-open) |
| Toggle rows         | `ui-toggle-row` + `ui-toggle-switch`    | TODO                                  | TODO                                 | TODO                                      | TODO                                  |
| Select controls     | `ui-select-control`                     | BUG(select-theme-light-unverified)    | BUG(select-theme-dark-unverified)    | BUG(select-theme-sandstone-unverified)    | BUG(select-kbd-unverified)            |
| Dialog shell        | confirm/input/select shared dialogs     | BUG(dialog-theme-light-unverified)    | BUG(dialog-theme-dark-unverified)    | BUG(dialog-theme-sandstone-unverified)    | BUG(dialog-kbd-unverified)            |

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

Verification notes:

- `vitest.config.ts` now sets `jsdom`, and `src/test/vitest.setup.ts` initializes Angular TestBed + resource resolution; the prior Leaflet `window is not defined` and unresolved `templateUrl/styleUrl` blockers are resolved.
- Focused run `npx vitest run src/app/features/map/map-shell/map-shell.component.spec.ts` now executes all 57 tests with `36 passed / 21 failed`.
- Current open failures are now spec-level or fixture-level issues (for example `map.addLayer is not a function`, `NG0303` unknown input bindings on child components, and `NG0950/NG0951` required input/query runtime failures), tracked under `menu-kbd-spec-failures-open` / `segmented-kbd-spec-failures-open` until narrowed to concrete issues.
- `npx ng test --watch=false --include src/app/features/map/map-shell/map-shell.component.spec.ts` is additionally blocked by unrelated workspace spec compile errors (e.g. `nav.component.spec.ts`, `settings-overlay.component.spec.ts`, `upload.service.spec.ts`).
- Button/icon primitive parity pass (code-level) completed across `/projects`, settings overlay, and account surfaces: controls now consistently consume shared `ui-button`, `toolbar-btn`, and `icon-btn-ghost` classes with no remaining feature-local hover/focus overrides in those surfaces.
- Account page cleanup removed redundant wrapper class usage so action buttons are now primitive-first (`ui-button*` only) in template markup.
- Toolbar controls and shared dialog shell rows were promoted from `TODO` to `*-unverified` bug IDs to reflect completed code-level migration with pending manual light/dark/sandstone visual + keyboard smoke verification.
- Settings overlay segmented controls now use shared `app-segmented-switch` for language, density, theme mode, and marker motion; matrix segmented row remains `*-unverified` pending manual multi-theme smoke.
- Select/input control migration is now primitive-first in compact filter contexts (`ui-select-control` + `ui-input-control` with tokenized compact sizing); select row promoted from `TODO` to tracked `*-unverified` pending manual theme and keyboard smoke.
- Dropdown icon search/reset actions now consume shared `icon-btn-ghost` across standard/sort/grouping dropdowns with only dropdown-level size/color overrides left local.
- Theme cells marked `*-unverified` require manual browser smoke pass in `light/dark/sandstone` before promotion to `OK`.

## Update Rule

Update affected rows in this file in the same change set as any primitive migration.
