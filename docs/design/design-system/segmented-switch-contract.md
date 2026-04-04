# Segmented Switch Contract

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define one canonical segmented switch contract for Feldpost navigation and view-mode switching.

Status: stable
Family: Inputs and Selection

## Allowed Use Cases

- View mode switching inside map/workspace surfaces
- In-panel scope changes with low action cost
- Filter-mode switching with 2 to 5 mutually exclusive options

Not allowed:

- More than 5 options
- Multi-select behavior
- Destructive or irreversible actions

## Variant Axes

| Axis               | Allowed Values          | Notes                                                        |
| ------------------ | ----------------------- | ------------------------------------------------------------ |
| orientation        | horizontal, vertical    | Horizontal default, vertical only for constrained side rails |
| size               | compact, default, large | Large only when touch-priority dominates                     |
| density            | balanced, dense         | Dense forbidden on mobile touch-critical rows                |
| icon-mode          | none, icon-leading      | Icon-only is not allowed for segmented switch options        |
| label-mode         | short, standard         | Multiline labels are not allowed                             |
| availability-state | enabled, disabled       | read-only is not applicable                                  |

Not applicable axes:

- emphasis
- async-state
- responsive-behavior

## State Model

Mandatory states:

- default
- hover
- active
- focus-visible
- disabled

Selected state behavior:

- Exactly one option is selected at any time.
- Selected state must not change row/container geometry.
- Selected state must remain distinguishable in all themes.

## Accessibility and Interaction

- Must be keyboard navigable with Left/Right or Up/Down according to orientation.
- Focus-visible ring is mandatory on the active keyboard target.
- Use semantic grouping with a single accessible label for the control.
- Each option exposes selected state to assistive technologies.
- Minimum touch target: desktop 44x44, mobile 48x48.

## Token Binding Rules

Use token aliases only (no raw colors, no raw border values):

- Surface/background tokens from `docs/design/tokens.md`
- Interactive border and hover aliases from `apps/web/src/styles.scss`
- Focus ring color from interactive focus token alias
- Radius token for segmented container and options

Geometry rules:

- Option height and internal spacing are token-driven.
- Borders and separators remain stable across states.
- No animated width changes between selected/unselected options.

## Do and Do Not

Do:

- Keep labels short and scannable.
- Keep selected indicator calm and high-contrast.
- Reuse one canonical option structure across features.

Do not:

- Add per-feature custom border systems.
- Use filled primary-button styling inside segmented options.
- Use accent color as decoration without interaction meaning.

## Migration Notes

- Replace feature-local segmented variants that alter option height/spacing.
- Align all map/workspace segmented controls to this contract.
- Document any temporary exception in governance docs with owner and deadline.

## Acceptance Checks

1. Variant axes match this contract.
2. Mandatory states are documented and testable.
3. Keyboard navigation and focus-visible behavior are verified.
4. No geometry shift on selected/unselected transitions.
5. Tokens are used for all visual values.
