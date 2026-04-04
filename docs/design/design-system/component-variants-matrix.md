# Component Variants and State Matrix

Back to master: [master-spec.md](./master-spec.md)

## Mandatory Variant Axes

Every reusable component must explicitly define these axes where applicable:

1. orientation: `horizontal` | `vertical`
2. size: `compact` | `default` | `large`
3. emphasis: `primary` | `secondary` | `tertiary` | `danger`
4. density: `field` | `balanced` | `dense`
5. icon-mode: `icon-only` | `icon-leading` | `icon-trailing` | `none`
6. label-mode: `short` | `standard` | `multiline` | `assistive-only`
7. interaction-state: `default` | `hover` | `active` | `focus-visible`
8. availability-state: `enabled` | `disabled` | `read-only`
9. async-state: `idle` | `loading` | `success` | `error`
10. responsive-behavior: `fixed` | `fluid` | `collapse` | `drawer` | `sheet`

If an axis is not applicable, document `not-applicable` with reason.

## Mandatory State Layers

All interactive components must specify:

- Base layer (color, border, text)
- Hover layer
- Focus-visible ring layer
- Active/pressed layer
- Disabled/read-only layer
- Loading/error layer

All layers must use token aliases from `docs/design/tokens.md` and runtime aliases from `apps/web/src/styles.scss`.

## Focus and A11y Rules

- Focus-visible styling is mandatory on keyboard navigable controls.
- Focus is never represented by color change alone.
- Trigger controls that open options must define `aria-expanded`, `aria-haspopup`, and focus return behavior.
- Minimum touch target: desktop 44x44, mobile 48x48.

## Family Matrix

| Family                  | Required Axes                                                                            | Required States                                                 | Notes                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| Button/Icon Button      | size, emphasis, icon-mode, interaction-state, availability-state                         | default, hover, active, focus-visible, disabled, loading        | Filled only for primary action; ghost as default secondary     |
| Dropdown Trigger + Menu | size, density, icon-mode, label-mode, interaction-state, availability-state, async-state | default, hover, active, focus-visible, disabled, loading, error | Must support keyboard open/close and option navigation         |
| Segmented Switch/Tabs   | orientation, size, density, interaction-state, availability-state                        | default, hover, active, focus-visible, disabled                 | Stable geometry across selected/unselected states              |
| Input/Select/Field Rows | size, density, label-mode, interaction-state, availability-state, async-state            | default, focus-visible, disabled, read-only, loading, error     | No per-feature border systems                                  |
| Chips/Badges            | size, emphasis, icon-mode, interaction-state, availability-state                         | default, hover, active, disabled                                | Distinguish actionable vs passive chips                        |
| Panel/Overlay Surfaces  | responsive-behavior, density                                                             | default, focus-visible (when interactive), loading, error       | Do not animate row geometry; only container dimensions/opacity |
| Workspace Pane          | responsive-behavior, density                                                             | default, resize-active, loading, error                          | Width constraints must follow shared layout scale              |
| Settings Overlay        | responsive-behavior, density                                                             | default, focus-visible, loading, error                          | Shared overlay width and section rail rules                    |

## State Naming Contract

Use these names exactly in docs and tests:

- `default`
- `hover`
- `active`
- `focus-visible`
- `disabled`
- `read-only`
- `loading`
- `error`
- `success`

## Validation Checklist Per Component

- Variant axes table present
- State layers documented
- Accessibility behavior documented
- Responsive behavior documented
- Token references documented
- Lifecycle status documented (`planned/draft/stable/deprecated/replaced`)

## AI-Operable Component Page Template

Use this block for every future component page:

1. Component purpose
2. Allowed variants (axis table)
3. State model
4. Responsive behavior
5. Accessibility and keyboard behavior
6. Token bindings
7. Do/Do not examples
8. Migration notes (if replacing legacy)
9. Acceptance checks
