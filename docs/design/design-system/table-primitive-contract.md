# Table Primitive Contract

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define one canonical table primitive for data-dense views so future grid-like pages do not reintroduce one-off structures.

Status: draft
Family: Data Display

## Allowed Use Cases

- Multi-column operational lists
- Sortable, scannable records with predictable row structure
- Data views that exceed comfortable card/list layouts

Not allowed:

- Rich media gallery surfaces
- Inline complex form editing by default
- Content where mobile-first card layout is the primary pattern

## Variant Axes

| Axis                | Allowed Values                        | Notes                                           |
| ------------------- | ------------------------------------- | ----------------------------------------------- |
| size                | compact, default, large               | Controls row height and cell padding            |
| density             | balanced, dense                       | Dense only for expert data views                |
| label-mode          | short, standard, multiline            | Header labels should remain short when possible |
| interaction-state   | default, hover, active, focus-visible | For row-level and control-level interactions    |
| availability-state  | enabled, disabled, read-only          | read-only for locked datasets/actions           |
| async-state         | idle, loading, error, success         | Required for server-driven tables               |
| responsive-behavior | fixed, fluid, collapse, drawer, sheet | Collapse/drawer/sheet for constrained viewports |

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
- read-only
- loading
- error
- success

Behavior rules:

- Header, body, and optional footer geometry remain stable across state changes.
- Sorting indicators and selected-row indicators must not change column widths.
- Empty/loading/error states use consistent table container framing.

## Accessibility and Interaction

- Semantic table structure is mandatory.
- Header cells expose sorting state when sortable.
- Keyboard navigation is required for interactive controls inside rows.
- Focus-visible is mandatory for row actions and cell controls.
- Touch targets for inline controls: desktop 44x44, mobile 48x48.

## Token Binding Rules

- Use table surface/border/text tokens from `docs/design/tokens.md`.
- Use shared interactive aliases from `apps/web/src/styles.scss`.
- Use canonical spacing and radius tokens; no raw spacing values.
- Responsive breakpoints must follow `layout-width-breakpoint-scale.md`.

## Do and Do Not

Do:

- Keep column rhythm predictable and data-first.
- Reuse shared action primitives inside cells.
- Provide clear loading/empty/error handling states.

Do not:

- Build feature-local table shells with bespoke spacing systems.
- Use ad-hoc breakpoint cutoffs for table container behavior.
- Hide sort state or interaction affordances.

## Migration Notes

- Start with one internal data-heavy surface as pilot migration.
- Keep card/list fallback for narrow mobile contexts.
- Promote to stable once at least one production table passes regression checks.

## Acceptance Checks

1. Semantic table structure and sorting semantics are documented.
2. State model includes loading/error/success and is testable.
3. Responsive strategy is defined for constrained viewports.
4. Token bindings are complete and raw values are avoided.
5. No one-off table shells are introduced in migrated features.
