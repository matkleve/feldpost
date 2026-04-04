# Popover Panel Contract

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define one canonical popover panel contract for contextual content and lightweight action groups without introducing feature-local overlay shells.

Status: draft
Family: Menus, Overlays, and Dialogs

## Allowed Use Cases

- Contextual info attached to a trigger
- Lightweight grouped actions
- Inline helper content near a focused control

Not allowed:

- Full-screen workflows
- Critical confirmation flows (use dialog shell)
- Long forms with complex validation

## Variant Axes

| Axis                | Allowed Values                        | Notes                                                   |
| ------------------- | ------------------------------------- | ------------------------------------------------------- |
| size                | compact, default, large               | Size maps to content density and parent surface         |
| density             | balanced, dense                       | Dense only for expert-mode utility popovers             |
| label-mode          | short, standard, multiline            | Multiline allowed only for content rows                 |
| interaction-state   | default, hover, active, focus-visible | Trigger and actionable rows                             |
| availability-state  | enabled, disabled                     | read-only is not applicable                             |
| async-state         | idle, loading, error                  | Required for remote-loaded content                      |
| responsive-behavior | fixed, fluid, drawer, sheet           | Drawer/sheet when viewport cannot host anchored popover |

Not applicable axes:

- orientation
- emphasis
- icon-mode

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

- Open/close animation must not change surrounding layout geometry.
- Anchored positioning should degrade to drawer/sheet on constrained screens.
- Error and loading states keep panel chrome stable.

## Accessibility and Interaction

- Trigger exposes `aria-expanded` and `aria-haspopup`.
- Escape closes the popover.
- Keyboard navigation for actionable rows is required.
- Focus returns to trigger after close unless workflow explicitly moves focus.
- Focus-visible ring is mandatory.
- Minimum touch target: desktop 44x44, mobile 48x48.

## Token Binding Rules

- Use design tokens for surface, border, text, and elevation.
- Use shared interactive aliases from `apps/web/src/styles.scss`.
- Motion timing follows `docs/design/motion.md`.
- Width and breakpoint behavior must align with `layout-width-breakpoint-scale.md`.

## Do and Do Not

Do:

- Reuse one shell for map/workspace/settings contextual overlays.
- Keep spacing and row composition aligned with `ui-item` primitives.
- Use progressive disclosure for secondary details.

Do not:

- Create feature-local overlay chrome variants.
- Use hardcoded clamp values for panel geometry without registration.
- Hide or remove keyboard focus indicators.

## Migration Notes

- Migrate context-style overlays first (map marker menus, workspace contextual tools).
- Promote to stable only after at least two production surfaces use this contract.
- Register exceptions in governance docs with owner and deadline.

## Acceptance Checks

1. Trigger semantics and close behavior are verified.
2. Loading and error states are documented and testable.
3. Responsive fallback strategy (anchor -> drawer/sheet) is defined.
4. Token bindings are complete.
5. No feature-local shell duplication remains in migrated surfaces.
