# UI Primitives — Chip (`app-chip`)

## What It Is

Semantic **chip** component for dismissible labels, file-type colors, and rich variants—**not** the global `.ui-chip` toolbar primitive (that stays in [badges and chips](./ui-primitives.badges-and-chips.md)).

## What It Looks Like

Rounded chip with optional icon, text, dismiss control, and variant-driven color tokens per canonical chip spec.

## Where It Lives

- **Code:** `apps/web/src/app/shared/components/chip/`
- **Canonical contract:** [chip.md](../filters/chip.md) (normative behavior, FSM, acceptance criteria)

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Render chip | Shows icon/text per inputs |
| 2 | Dismiss (when enabled) | `chipDismissed` emits; parent removes data |

## Component Hierarchy

```text
app-chip
├── optional icon / text
└── optional dismiss control
```

## Data

| Source | Role |
| ------ | ---- |
| Parent | Supplies `text`, `variant`, `dismissible`, etc. |
| [chip.md](../filters/chip.md) | Full API and visual contract |

## Wiring

Import `ChipComponent` from `shared/components/chip`; do not duplicate `.ui-chip` filter styling unless bridging specs explicitly allow.

## Geometry note

Product contract: **one canonical chip height** and **pill vs rounded-control** shape rules live in [badges and chips](./ui-primitives.badges-and-chips.md) (do not fork here).

## Acceptance Criteria

- [ ] Implementations match [chip.md](../filters/chip.md); this file does not fork normative behavior.
- [ ] Call sites choosing between `app-chip` and `.ui-chip*` follow [badges and chips](./ui-primitives.badges-and-chips.md) **Primitive reference — when to use which** and **Where each pill / chip is used and why**.
