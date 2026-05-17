# Popover Panel Contract

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define one canonical popover panel contract for contextual content and lightweight action groups without introducing feature-local overlay shells.

**Toolbar menu panels:** Product-facing **anchored toolbar menus** (Filter / Sort / Grouping / Projects) use `app-dropdown-shell` + `app-standard-dropdown`; the **normative interaction inventory** (search, reset, footer, scrollbar gutter, shared min-width floor) lives in **[dropdown-system.md — Toolbar menu panels (anchored UI)](../../specs/component/filters/dropdown-system.md#toolbar-menu-panels-anchored-ui)** — extend that file instead of duplicating tables here. **Ownership** (width floor vs body, `left` clamp, Escape, stacking / z-index, dual `document:click` for filter flyout, map vs toolbar shells): **[dropdown-system.md — Ownership matrix (normative)](../../specs/component/filters/dropdown-system.md#ownership-matrix-normative)**.

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

- Use design tokens for surface, border, text, and elevation (`docs/design/tokens.md`).
- Follow `docs/design/token-layers.md` for what still emits from `_legacy-design-tokens.scss` vs per-component **`:host`** custom properties (removed global menu/action bridge names).
- Menu-like option surfaces should stay aligned with `docs/specs/component/filters/dropdown-system.md` where behavior overlaps the dropdown family.
- Use shared interactive patterns from `apps/web/src/styles.scss` where a global alias still exists.
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
