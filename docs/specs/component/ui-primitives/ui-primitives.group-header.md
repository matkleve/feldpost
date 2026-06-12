# UI Primitives — Group Header

## What It Is

`app-group-header` is a single **button** row showing a collapsible chevron, group name, localized photo count, and spacer. Expansion state is **owned by the parent** via the `collapsed` input; clicking emits `toggle` only.

## What It Looks Like

Left-aligned chevron rotates when `collapsed` is true; padding-left scales with `level` input for nested groups. Count suffix uses i18n key `workspace.groupHeader.count.photos`.

## Where It Lives

- **Code:** `apps/web/src/app/shared/ui-primitives/group-header.component.*`
- **Parent index:** [ui-primitives.md](./ui-primitives.md)

## Actions

| #   | User Action | System Response |
| --- | ----------- | --------------- |
| 1   | Click header button | `toggle` emits (single event) |
| 2   | Parent toggles `collapsed` input | Chevron + `aria-expanded` update |

## Component Hierarchy

```text
app-group-header
└── button.group-header
    ├── .group-header__chevron
    ├── .group-header__name
    └── .group-header__count
```

## Data

| Input | Purpose |
| ----- | ------- |
| `heading` | Group title |
| `imageCount` | Numeric count |
| `level` | Nesting depth (padding) |
| `collapsed` | Chevron + `aria-expanded` (`!collapsed`) |

## Outputs

| Output | When |
| ------ | ---- |
| `toggle` | Button clicked |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/ui-primitives/group-header.component.ts` | Inline template component |
| `apps/web/src/app/shared/ui-primitives/group-header.component.scss` | Row visuals |

## Wiring

- Parent listens to `toggle` and updates its own collapsed state bound back into `collapsed`.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ----- | ----------- |
| Row layout | `button.group-header` | `:host` | entire button | `.group-header` | content | one interactive surface |
| Chevron rotation | `.group-header__chevron` | `:host` | n/a (decorative) | `.group-header__chevron--collapsed` | content | rotation matches `collapsed()` |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same? |
| -------- | -------------- | ----------- | ------------ | ----- |
| Chevron | `.group-header__chevron` | `collapsed` input | `.group-header__chevron--collapsed` | ✅ |

## Acceptance Criteria

- [ ] Exactly one `button` element; no nested interactive controls.
- [ ] `aria-expanded` reflects `!collapsed()`.
- [ ] Padding-left respects `level` without breaking hit area.
