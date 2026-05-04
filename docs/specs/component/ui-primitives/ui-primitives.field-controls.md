# UI Primitives — Field controls

## What It Is

Chrome for native controls (`ui-input-control`, `ui-select-control`, `ui-range-control`, choice row/control) and **label/control rows** (`ui-field-row`). Card-like dense rows use [layout shells](./ui-primitives.layout-shells.md).

## What It Looks Like

Filled controls with token borders; sizes and compact mode; error/loading emphasis without geometry shifts on host.

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/field.scss`; field row/label in `patterns/toolbar.scss`
- **Integration:** `ui-primitives.directive.ts`

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Focus input/select | Focus ring |
| 2 | Invalid/disabled state | Border/opacity per modifier |

## Component Hierarchy

```text
ui-field-row (optional stacked)
├── ui-field-label
└── input | textarea | select | range | choice
```

## Visual Behavior Contract

Error and loading states MUST NOT change layout geometry—token borders/background only.

## API (target hosts)

Consolidated `size`, `loading`, `error`, `compact` on inputs/selects; `stacked` on field rows replaces separate stacked directive.

## Acceptance Criteria

- [ ] ControlValueAccessor optional for presentational parity phase.
- [ ] Field rows distinguish clearly from row-shell metadata rows.
