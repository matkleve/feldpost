# Quick Info Chips

## What It Is

A read-only horizontal strip of compact chips (icon + text) for summarizing metadata on detail surfaces. Emits an index when a chip is activated for drill-down or tooltips owned by the parent.

## What It Looks Like

Zero or more chips in a row with consistent spacing; variants (`default`, `filled`, `success`, `warning`) tint backgrounds per design tokens. Chips truncate gracefully on narrow widths.

## Where It Lives

- **Code:** `apps/web/src/app/shared/quick-info-chips/`
- **Consumers:** Detail headers and side panes that need scannable fact chips.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | View surface | Chips render from `chips` input | initial bind |
| 2   | Click a chip | `chipClicked` emits chip index | parent handles navigation or overlay |
| 3   | Parent updates `chips` input | List re-renders | signal/input change |

## Component Hierarchy

```text
app-quick-info-chips
└── button.quick-info-chips__chip (per chip, optional)
```

## Data

| Source | Contract | Operation |
| ------ | -------- | --------- |
| Parent | `ChipDef[]` (`icon`, `text`, optional `variant`, `title`) | Read |
| Component | `chipClicked: Output<number>` | Emit on user activation |

## State

| Name | Type | Default | Controls |
| ---- | ---- | ------- | -------- |
| `chips` | `input<ChipDef[]>` | `[]` | Which chips render |

Selection and hover emphasis for drill-down are owned by parent or global chip styles; this component does not track a multi-step FSM beyond input-driven render.

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.ts` | Inputs/outputs |
| `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.html` | Chip row markup |
| `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.scss` | Row + chip visuals |

## Wiring

- Import `QuickInfoChipsComponent`; pass `chips` from a parent view-model.
- Subscribe to `chipClicked` in parent for contextual actions.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Chip row | `:host` | `:host` | `.quick-info-chips__chip` | `.quick-info-chips` | content | chips stay on one row with token gap |
| Variant tint | chip button | `:host` | same chip | `.quick-info-chips__chip--*` | content | variant matches `ChipDef.variant` |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Chip appearance | `.quick-info-chips__chip` | class from `variant` input | `.quick-info-chips__chip` | ✅ |

## Acceptance Criteria

- [ ] Empty `chips` input renders no interactive traps and does not reserve misleading height beyond design tokens.
- [ ] `chipClicked` fires with the correct zero-based index for the activated chip.
- [ ] Chip labels use i18n at the parent boundary; this component displays provided strings only.
