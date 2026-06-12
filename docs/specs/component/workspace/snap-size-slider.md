# Snap Size Slider

## What It Is

A compact **radiogroup** control for discrete thumbnail-size steps (icons per option). Parents bind `value`, `options`, and `label`; clicking a step selects a value. Intended for workspace toolbar size presets.

## What It Looks Like

Horizontal row of icon buttons with one active state (`--active` class) matching `value() === option.value`. `role="radiogroup"` on the container and `role="radio"` on steps with `aria-checked` driven by selection.

## Where It Lives

- **Code:** `apps/web/src/app/shared/snap-size-slider/` (`snap-size-slider.component.html` + companion `.ts`/`.scss` when present in tree)
- **Consumers:** `workspace-toolbar` and other workspace chrome needing discrete size snaps.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Click a step | `select(option.value)` updates bound value | `(click)` |
| 2   | Parent changes `value` input | Active styling moves | signal/input |
| 3   | Keyboard (delegated) | Radiogroup semantics should match implementation in `.ts` | future parity |

## Component Hierarchy

```text
app-snap-size-slider
└── .snap-size-slider__steps[role=radiogroup]
    └── button.snap-size-slider__step × N
```

## Data

| Input | Type | Purpose |
| ----- | ---- | ------- |
| `options` | list with `value`, `label`, optional `icon` | Step definitions |
| `value` | matches option `value` | Active step |
| `label` | string | `aria-label` on radiogroup |

## State

Selection is the bound `value`; component may keep ephemeral focus state in the TypeScript implementation file. Treat as **programmatic single-select** equivalent to a radio group FSM with states = option values; invalid combinations (`value` not in `options`) should fall back per implementation.

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.html` | Radiogroup markup |
| `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.ts` | Inputs + `select()` (expected) |
| `apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.scss` | Step layout |

## Wiring

- Import from shared into workspace toolbar; bind to workspace view-model size preset.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Step row | `.snap-size-slider__steps` | `:host` | `.snap-size-slider__step` | step buttons | content | exactly one `--active` for current value |
| Active emphasis | step `button` | `value` binding | `.snap-size-slider__step--active` | active class | content | active matches `value()` |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Active step | `button.snap-size-slider__step` | `[class.--active]` expr | same button | ✅ |

## Acceptance Criteria

- [ ] Radiogroup exposes `aria-label` from `label()` and per-step `aria-checked`.
- [ ] Clicking a step selects its `value` and updates active styling.
- [ ] Component does not import from `features/*`.
