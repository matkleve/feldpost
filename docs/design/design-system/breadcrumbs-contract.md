# Breadcrumbs Contract

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define one canonical breadcrumbs contract for deep navigation paths so future detail pages do not introduce inconsistent navigation affordances.

Status: draft
Family: Navigation

## Allowed Use Cases

- Multi-level navigation paths in deep pages
- Context restoration for detail and settings sub-pages
- Lightweight backtracking where browser back alone is insufficient

Not allowed:

- Primary app navigation replacement
- Action menus or segmented controls disguised as breadcrumbs
- Overly long, uncollapsed path rows on mobile

## Variant Axes

| Axis                | Allowed Values                        | Notes                                    |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| size                | compact, default                      | Large is not applicable                  |
| density             | balanced, dense                       | Dense only in constrained utility bars   |
| icon-mode           | none, icon-leading                    | Leading icon optional for root crumb     |
| label-mode          | short, standard                       | Multiline labels are not allowed         |
| interaction-state   | default, hover, active, focus-visible | Applies to clickable crumbs              |
| availability-state  | enabled, disabled                     | Disabled used for inaccessible ancestors |
| responsive-behavior | fixed, fluid, collapse                | Collapse required for narrow viewports   |

Not applicable axes:

- orientation
- emphasis
- async-state

## State Model

Mandatory states:

- default
- hover
- active
- focus-visible
- disabled

Behavior rules:

- Current page crumb is non-clickable and clearly distinguished.
- Separator visuals do not change layout metrics between states.
- Collapse behavior keeps first and current crumb visible.

## Accessibility and Interaction

- Navigation landmark labeling is required.
- Current crumb exposes current-page semantics.
- Keyboard navigation supports tabbing through clickable crumbs.
- Focus-visible is mandatory on keyboard focus.
- Minimum touch target for clickable crumbs: desktop 44x44, mobile 48x48.

## Token Binding Rules

- Use text, border, and muted tokens from docs/design/tokens.md.
- Use shared interactive aliases from apps/web/src/styles.scss.
- Use canonical spacing and radius tokens only.
- Responsive collapse thresholds follow layout-width-breakpoint-scale.md.

## Do and Do Not

Do:

- Keep crumb labels concise and meaningful.
- Preserve stable spacing and separator rhythm.
- Reuse one breadcrumb structure across features.

Do not:

- Use ad-hoc per-feature separator styles.
- Encode state solely through color changes without focus cues.
- Show full long paths on narrow mobile widths without collapse.

## Migration Notes

- Introduce breadcrumbs first in one deep settings/detail surface.
- Align existing path-like headers to this contract.
- Promote to stable after at least one production usage with regression evidence.

## Acceptance Checks

1. Variant axes and collapse behavior are documented.
2. Current page semantics and keyboard focus are verified.
3. Token bindings are complete and raw values are avoided.
4. Mobile collapse behavior is implemented for narrow viewports.
5. No feature-local breadcrumb style forks remain in migrated pages.
