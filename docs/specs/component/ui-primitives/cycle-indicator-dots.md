# Cycle Indicator Dots

## What It Is

A compact row of dots stacked **below** a primary icon inside a circular (or square) cycle/toggle control. Each dot maps to one option in a small fixed set (2–3 modes). The active dot shows which mode is **currently applied**; the icon shows the **next** or contextual affordance where applicable.

## What It Looks Like

| Token / rule | Value |
| --- | --- |
| Dot size | `0.25rem` square, `border-radius: var(--radius-full)` |
| Dot row gap | `0.2rem` between dots |
| Icon-to-dots gap | `0.18rem` (vertical stack inside hit target) |
| Inactive dot | `color-mix(in srgb, var(--muted-foreground) 35%, transparent)` |
| Active dot (basemap / nav placement) | `var(--interaction-nav-ink)` |
| Active dot (theme cycle) | `var(--primary)` |
| Icon size in stacked control | `var(--font-size-lg)` when dots are present |
| Hit target | Parent button keeps full touch target (`2.75rem` desktop map control; nav row height token on sidebar) |

Dots MUST stay inside the parent hit target — shrink the icon before enlarging the button.

## When To Use

| Pattern | Use when |
| --- | --- |
| **Cycle indicator dots** (this doc) | 2–3 mutually exclusive modes; single button cycles or toggles; user needs at-a-glance “which mode am I in?” |
| [`segmented-switch.md`](../filters/segmented-switch.md) | All options visible at once in a shared track |
| **Workspace toolbar active dot** ([`workspace-toolbar.md`](../../ui/workspace/workspace-toolbar.md)) | Binary “feature engaged” on a ghost toolbar button — **not** a multi-option cycle |

## Where It Lives

| Consumer | Selectors | Options |
| --- | --- | --- |
| Nav theme cycle | `.nav__theme-dots`, `.nav__theme-dot`, `.nav__theme-dot--active` | light / dark / sandstone |
| Map basemap switch | `.map-style-switch__dots`, `.map-style-switch__dot`, `.map-style-switch__dot--active` | street / photo |

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Tap parent cycle button | Active mode changes; matching dot receives `--active` class |
| 2 | Reload page | Dots reflect persisted mode (theme / basemap) |

## Component Hierarchy

```text
CycleButton (plain button or nav row)
└── __media (flex column, center)
    ├── __icon (Material icon)
    └── __dots (flex row)
        └── __dot × N  ← one --active per mode
```

## Acceptance Criteria

- [x] Dot count equals option count (no orphan dots)
- [x] Exactly one dot active per mode value
- [x] Dots and icon fit inside declared hit target without stretching button aspect ratio
- [ ] Shared SCSS partial or documented copy contract if a third consumer ships (today: two feature-local implementations)

## Related

- [`map-style-switch.md`](../map/map-style-switch.md)
- [`sidebar.collapse.supplement.md`](../workspace/sidebar.collapse.supplement.md) (nav theme row)
