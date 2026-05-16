# UI Primitives — Toggle row and switch

## What It Is

Settings-style pairing: **toggle row** (full-width control wrapping label area) and **toggle switch** (pill thumb), replacing stacked toggle directives.

## What It Looks Like

Bordered row with hover/focus; circular thumb sliding inside track; compact and lg variants on switch.

## Where It Lives

- **Styles:** ~~`apps/web/src/styles/primitives/toggle.scss`~~ **deleted** (Phase 5) — **`hlmSwitch`** / Tailwind
- **Integration:** ~~`ui-primitives.directive.ts`~~ **removed (2026-05-16)** — use **`HLM_SWITCH_IMPORTS`** / `hlmSwitch` per Phase 5.

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click toggle row | Parent toggles bound value |
| 2 | Toggle switch visual | `on` / `disabled` classes |

## Component Hierarchy

```text
button.ui-toggle-row
├── projected label region
└── span.ui-toggle-switch
```

## API

**Row:** `size`, `compact`, `loading`, `error`.

**Switch:** `on`, `disabled`, `compact`, `size` (`default` | `lg`).

## FSM

Toggle row SHOULD expose `[attr.data-state]` derived from `loading` / `error` / idle when hosts land.

## Acceptance Criteria

- [ ] Settings overlay layouts unchanged versus prior directive stack.
- [ ] Switch motion uses token timings only.
