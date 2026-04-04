# Dropdown Shell Contract

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define one canonical dropdown trigger + menu shell contract for Feldpost filtering, selection, and lightweight command lists.

Status: stable
Family: Menus, Overlays, and Dialogs

## Allowed Use Cases

- Filter selection
- Single-choice setting updates
- Lightweight command lists in toolbar and panel contexts

Not allowed:

- Long-form data entry
- Complex multi-step workflows
- Actions that require strong confirmation safeguards

## Variant Axes

| Axis                | Allowed Values                        | Notes                                                          |
| ------------------- | ------------------------------------- | -------------------------------------------------------------- |
| size                | compact, default, large               | Match parent surface density                                   |
| density             | balanced, dense                       | Dense not allowed for touch-first mobile menus                 |
| icon-mode           | none, icon-leading, icon-trailing     | icon-only only for trigger buttons with explicit label context |
| label-mode          | short, standard, multiline            | Multiline only in menu rows, not in compact trigger rows       |
| interaction-state   | default, hover, active, focus-visible | Required for trigger and options                               |
| availability-state  | enabled, disabled                     | read-only is not applicable                                    |
| async-state         | idle, loading, error                  | Loading and error are required when options are remote         |
| responsive-behavior | fixed, fluid, drawer, sheet           | Drawer/sheet for mobile contexts                               |

Not applicable axes:

- orientation
- emphasis

## State Model

Mandatory states:

- default
- hover
- active
- focus-visible
- disabled
- loading
- error

Behavior rules:

- Trigger and menu option states use the same interaction language.
- Menu opening/closing must not shift surrounding layout.
- Disabled options remain visible but non-interactive.

## Accessibility and Interaction

- Trigger must expose aria-expanded and aria-haspopup.
- Keyboard open/close is required.
- Keyboard option navigation is required.
- Focus returns to trigger after close unless flow explicitly moves elsewhere.
- Focus-visible ring is mandatory and never color-only.
- Minimum touch target: desktop 44x44, mobile 48x48.

## Token Binding Rules

Use token aliases only:

- Surface elevation, border, and text tokens from `docs/design/tokens.md`
- Shared interactive aliases from `apps/web/src/styles.scss`
- Motion timing from `docs/design/motion.md`

Geometry rules:

- Trigger height and menu row heights are tokenized.
- Menu width follows overlay scale and layout rules.
- No ad-hoc breakpoint values for panel-like dropdown behavior.

## Do and Do Not

Do:

- Keep option rows aligned with ui-item structure.
- Keep trigger affordance clear with icon and label hierarchy.
- Reuse one shell for search/filter/settings menus.

Do not:

- Create one-off menu shells per feature.
- Mix unrelated visual styles in one dropdown family.
- Hide keyboard focus state.

## Migration Notes

- Replace feature-local dropdown shells with this canonical contract.
- Align search/filter dropdowns first, then settings-context dropdowns.
- Register temporary exceptions in governance docs.

## Acceptance Checks

1. Trigger semantics and keyboard behavior are verified.
2. Option states cover loading and error where needed.
3. Token bindings are documented and applied.
4. Menu geometry does not cause layout shift.
5. Responsive behavior is defined for mobile contexts.
