# UI Primitives — Card Variant Switch

## What It Is

`app-card-variant-switch` adapts thumbnail **card variant** selection (`row` | `small` | `medium` | `large`) onto `app-segmented-switch`, including i18n labels and optional icon-only presentation.

## What It Looks Like

Uses segmented-switch visuals; options are computed from `allowed` variants with Material icons per size. ARIA label resolves from `ariaLabel` input or i18n fallback `workspace.toolbar.size.aria`.

## Where It Lives

- **Code:** `apps/web/src/app/shared/ui-primitives/card-variant-switch.component.*`
- **Parent index:** [ui-primitives.md](./ui-primitives.md)
- **Delegated behavior:** [segmented-switch](../filters/segmented-switch.md)

## Actions

| #   | User Action | System Response |
| --- | ----------- | --------------- |
| 1   | Select a segment | `valueChange` emits `CardVariant` when id matches known variant |
| 2   | Parent sets `value` | Active segment updates |

## Component Hierarchy

```text
app-card-variant-switch
└── app-segmented-switch
```

## Data

| Input | Purpose |
| ----- | ------- |
| `value` | Current `CardVariant` |
| `allowed` | Subset of `CARD_VARIANTS` |
| `ariaLabel` | Optional override |
| `iconOnly` | Segment presentation mode |
| `size` | Pass-through sizing for child switch |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/ui-primitives/card-variant-switch.component.ts` | Options + handler |
| `apps/web/src/app/shared/ui-primitives/card-variant-switch.component.html` | Template |
| `apps/web/src/app/shared/ui-primitives/card-variant-switch.component.scss` | Wrapper |

## Wiring

- Bind `value` / `valueChange` from workspace toolbar view-model.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ----- | ----------- |
| Segments | delegated `app-segmented-switch` | child | segment buttons | see segmented-switch spec | content | matches child spec |

### Ownership Triad

Wrapper adds **no** independent geometry; triad ownership is **fully delegated** to `app-segmented-switch`.

## Acceptance Criteria

- [ ] Only canonical `CardVariant` literals propagate through `onValueChange`.
- [ ] Icon-only mode preserves square segments per segmented-switch rules.
- [ ] i18n keys resolve with English fallbacks in TypeScript where used.
