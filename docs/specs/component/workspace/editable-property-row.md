# Editable Property Row

> **Parent:** [media-detail-inline-editing.md](../../ui/media-detail/media-detail-inline-editing.md)

## What It Is

Reusable row for a labeled property with inline edit affordance and optional select mode; used in media detail and related surfaces.

## What It Looks Like

Two-column row: label (muted) and value or control; edit icon appears per hover/focus rules shared with metadata rows.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/editable-property-row.component.ts`
- **Parent:** `MediaDetailInlineSectionComponent` and similar hosts

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks edit | Enters edit mode for row | `editRequested` |
| 2 | Selects option | Emits value change | `select` input type |

## Component Hierarchy

```
EditablePropertyRow
├── Label
└── Value / input / select
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Row layout | `.editable-row` / host | `:host` | buttons, inputs | host BEM | content | min-height stable |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Edit mode | row host | edit mode signal | focus ring on input | partial — document in implementation |

## Data

Inputs: `label`, `value`, `displayValue`, `inputType`, `options`, `readonly`.

## State

Supports text, date, and select modes; expose unified visual API (`data-state`) when edit vs read diverges.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/editable-property-row.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/editable-property-row.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/editable-property-row.component.scss` | Styles |

## Wiring

- Consumes i18n for aria labels and placeholders.

## Acceptance Criteria

- [ ] No nested interactive elements (ESLint `feldpost-template/no-nested-interactive`).
- [ ] Copy matches glossary terms for media fields where applicable.
