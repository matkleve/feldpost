# UI Primitives — Card Grid

## What It Is

`app-card-grid` wraps projected card content in a responsive CSS grid with configurable minimum column width, gap, semantic tag (`div` vs `ul`), optional ARIA `role`, and **card variant** token that sizes child card templates.

## What It Looks Like

Auto-fit grid: columns grow from `minColumnWidth` input (default `16rem`) with `gap` from design tokens. Variant (`row` | `small` | `medium` | `large`) maps to host classes consumed by slotted card templates.

## Where It Lives

- **Code:** `apps/web/src/app/shared/ui-primitives/card-grid.component.*`
- **Parent index:** [ui-primitives.md](./ui-primitives.md)

## Actions

| #   | User Action | System Response |
| --- | ----------- | --------------- |
| 1   | Parent changes `minColumnWidth` / `gap` | Grid reflows |
| 2   | Parent sets `variant` | Host class updates for slotted cards |
| 3   | Project content | Children fill grid cells |

## Component Hierarchy

```text
app-card-grid (host tag from `tag` input)
└── ng-content
```

## Data

| Input | Default | Purpose |
| ----- | ------- | ------- |
| `tag` | `'div'` | Host element kind |
| `variant` | `'medium'` | Card size token |
| `minColumnWidth` | `'16rem'` | `grid-template-columns: repeat(auto-fit, minmax(...))` |
| `gap` | `var(--spacing-3)` | Grid gap |
| `role` | `null` | Optional ARIA role on host |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/ui-primitives/card-grid.component.ts` | API |
| `apps/web/src/app/shared/ui-primitives/card-grid.component.html` | Projection |
| `apps/web/src/app/shared/ui-primitives/card-grid.component.scss` | Grid geometry |

## Wiring

- Place `app-card-grid` as layout owner; card components are projected children.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ----- | ----------- |
| Grid track | `:host` | `:host` | slotted cards | `:host` | content | column count responds to viewport |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same? |
| -------- | -------------- | ----------- | ------------ | ----- |
| Grid layout | `:host` | `variant`/`minColumnWidth` inputs | `:host` classes | ✅ |

## Acceptance Criteria

- [ ] `tag` switches host between `div` and `ul` without invalid children from parent.
- [ ] Grid gap and min column use tokens; no magic pixel literals in spec-owned contracts.
- [ ] Slotted cards receive variant context via host/class contract documented in workspace specs.
