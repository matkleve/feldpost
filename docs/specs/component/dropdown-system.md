# Dropdown System

> **Action contract:** [action-context-matrix](action-context-matrix.md)

## What It Is

A composable CSS class system (`dd-*`) for all floating dropdown/menu surfaces in Feldpost. Every dropdown picks the pieces it needs — search, items, drag handles, section labels, action rows — from a shared global class library in `styles.scss`. Component SCSS only contains what's truly unique to that dropdown.

## What It Looks Like

All dropdowns share a warm, clay-tinted hover and the same item geometry. The grouping dropdown is the reference for hover color and item height.

### Container Shell

Set by the host component (or toolbar wrapper). Not part of `dd-*` — each dropdown positions itself.

```
background:    --color-bg-elevated
border:        1px solid --color-border
border-radius: --radius-lg  (8px)
box-shadow:    --elevation-dropdown
```

### Composable Class Library

| Class                | Purpose                            | Key tokens                                                                      |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `.dd-search`         | Search input row                   | `padding: spacing-1 spacing-3`, `border-bottom: 1px solid color-border`         |
| `.dd-search__input`  | Text input inside search           | `0.8125rem`, no border, transparent bg                                          |
| `.dd-search__action` | Trailing icon button (clear, etc.) | `1.25rem` square, clay hover                                                    |
| `.dd-items`          | Items area wrapper                 | `padding: spacing-2`                                                            |
| `.dd-item`           | Base actionable row                | flex, `gap: spacing-2`, `padding: spacing-1 spacing-2`, `radius-sm`, clay hover |
| `.dd-item--active`   | Active/selected state              | `color: --color-clay`                                                           |
| `.dd-item--muted`    | Available/secondary row            | `color: --color-text-secondary`, primary on hover                               |
| `.dd-item--danger`   | Destructive action                 | `color: --color-danger` on label + icon                                         |
| `.dd-item__icon`     | Leading icon                       | `1rem`, `color-text-secondary`                                                  |
| `.dd-item__label`    | Label text                         | `flex: 1`, `text-align: left`                                                   |
| `.dd-item__trailing` | Trailing element                   | `margin-left: auto`                                                             |
| `.dd-section-label`  | Section header                     | `0.6875rem`, uppercase, `600` weight, `color-text-disabled`                     |
| `.dd-divider`        | Separator line                     | `1px`, `margin-block: spacing-1`, `color-border`                                |
| `.dd-empty`          | Empty state message                | centered, `spacing-3` padding, `color-text-disabled`                            |
| `.dd-action-row`     | Ghost "add" button                 | `margin: spacing-1 spacing-2`, clay hover                                       |
| `.dd-drag-handle`    | Drag handle icon                   | hidden, shows on `.dd-item:hover`                                               |

### Hover Color (canonical)

```scss
color-mix(in srgb, var(--color-clay) 8%, transparent)
```

This warm clay tint is used on **all** hover states — items, action rows, search clear buttons. No grey hover anywhere.

### Item Geometry

| Token          | Value                      |
| -------------- | -------------------------- |
| Padding-block  | `--spacing-1` (4px)        |
| Padding-inline | `--spacing-2` (8px)        |
| Gap            | `--spacing-2` (8px)        |
| Border-radius  | `--radius-sm` (4px)        |
| Font-size      | `0.8125rem` (13px)         |
| Icon size      | `1rem` (16px)              |
| Transition     | `background 80ms ease-out` |

## Where It Lives

- **Global classes**: `apps/web/src/styles.scss` — the `dd-*` block after `.ui-spacer`
- **Sort**: `workspace-toolbar/sort-dropdown.component.ts` + `.scss`
- **Grouping**: `workspace-toolbar/grouping-dropdown.component.ts` + `.scss`
- **Projects**: `workspace-toolbar/projects-dropdown.component.ts` + `.scss`
- **Filter**: `workspace-toolbar/filter-dropdown.component.ts` + `.scss`
- **Context menu**: `workspace-pane/media-detail-view.component.html` + `.scss`

## Actions

| #   | Trigger                         | System Response                                             | Surface                          |
| --- | ------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| 1   | Opens any toolbar dropdown      | Container shell renders with shared elevated surface tokens | Sort, Grouping, Projects, Filter |
| 2   | Hovers an actionable row        | Warm clay hover tint appears with no geometry shift         | Any `dd-item` consumer           |
| 3   | Navigates item list via pointer | Label/icon/trailing align to `dd-item` layout contract      | Any `dd-item` consumer           |
| 4   | Opens dropdown with search      | Search row uses `dd-search` and input/action primitives     | Sort, Projects                   |
| 5   | Dropdown has no rows            | Empty state uses `dd-empty` style primitive                 | Sort, Filter, future consumers   |
| 6   | Renders destructive menu action | Row uses `dd-item--danger` styling on icon and label        | Media detail context menu        |

## Dropdown Inventory

Every floating menu surface in Feldpost and which `dd-*` pieces it uses:

| #   | Surface                       | Search | Items | Section labels | Dividers | Drag | Action row | Empty | Component-specific                                 |
| --- | ----------------------------- | ------ | ----- | -------------- | -------- | ---- | ---------- | ----- | -------------------------------------------------- |
| 1   | **Sort Dropdown**             | ✅     | ✅    | ✅             | ✅       | —    | —          | ✅    | Direction toggle                                   |
| 2   | **Grouping Dropdown**         | —      | ✅    | ✅             | ✅       | ✅   | —          | —     | Drop zones, selected state, CDK drag, clear button |
| 3   | **Projects Dropdown**         | ✅     | ✅    | —              | —        | —    | ✅         | —     | Checkbox column, count trailing, "All" separator   |
| 4   | **Filter Dropdown**           | —      | —     | —              | —        | —    | ✅         | ✅    | Notion-style filter rules (form rows)              |
| 5   | **Media Detail Context Menu** | —      | ✅    | —              | —        | —    | —          | —     | Danger item, positioning                           |
| 6   | **Search Bar Dropdown**       | —      | —     | —              | —        | —    | —          | —     | Separate system (`.ui-item` grid, taller rows)     |
| 7   | **Metadata Key Suggestion**   | —      | ✅    | —              | —        | —    | —          | —     | Type badge trailing, create action (future)        |

### Surface details

**Sort Dropdown** — `sort-dropdown.component.ts`
Uses: `dd-search`, `dd-search__input`, `dd-search__action`, `dd-items`, `dd-item`, `dd-item--active`, `dd-item__icon`, `dd-item__label`, `dd-section-label`, `dd-divider`, `dd-empty`.
Component-specific: `.sort-direction` toggle (tri-state asc/desc/none).

**Grouping Dropdown** — `grouping-dropdown.component.ts`
Uses: `dd-item`, `dd-item--active`, `dd-item--muted`, `dd-item__icon`, `dd-item__label`, `dd-drag-handle`, `dd-section-label`, `dd-divider`.
Component-specific: CDK drop zones, selected state (multi-select), clear button, empty drop slot.

**Projects Dropdown** — `projects-dropdown.component.ts`
Uses: `dd-search`, `dd-search__input`, `dd-search__action`, `dd-items`, `dd-item`, `dd-item__label`, `dd-item__trailing`, `dd-action-row`.
Component-specific: Checkbox column, count badge, "All projects" separator row.

**Filter Dropdown** — `filter-dropdown.component.ts`
Uses: `dd-empty`, `dd-action-row`.
Component-specific: Notion-style compound filter rules (form rows with selects/inputs — justified exception).

**Media Detail Context Menu** — `media-detail-view.component.html`
Uses: `dd-items`, `dd-item`, `dd-item--danger`, `dd-item__icon`, `dd-item__label`.
Component-specific: Absolute positioning, click-outside overlay.

**Search Bar Dropdown** — Separate system. Uses `.ui-item` grid with taller rows (`3rem`) and larger font (`0.9375rem`). Not a menu surface — not required to use `dd-*`.

## Component Hierarchy

No new components. The `dd-*` classes are a shared CSS layer consumed by existing components.

```
Global dd-* classes (styles.scss)
├── sort-dropdown          ← search, items, section labels, dividers, empty
├── grouping-dropdown      ← items with drag handles, section labels, dividers
├── projects-dropdown      ← search, items with checkboxes, action row
├── filter-dropdown        ← empty state, action row (rules are form-specific)
├── media-detail context   ← items container, danger item
└── [future] any new menu  ← pick and compose from dd-* classes
```

## Data

Not applicable - visual style system only. No direct domain data model or Supabase query is defined in this spec.

## State

Not applicable - state is owned by consuming dropdown components (sort/grouping/projects/filter/media-detail), not by the shared `dd-*` class contract itself.

## File Map

| File                                                                                              | Purpose                                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `docs/element-specs/component/dropdown-system.md`                                                 | Shared dropdown visual contract                           |
| `apps/web/src/styles.scss`                                                                        | Global `dd-*` primitive class definitions                 |
| `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/sort-dropdown.component.scss`     | Sort-specific styling exceptions                          |
| `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/grouping-dropdown.component.scss` | Grouping-specific drag/drop and selected-state exceptions |
| `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/projects-dropdown.component.scss` | Project-specific checkbox/count exceptions                |
| `apps/web/src/app/features/map/workspace-pane/workspace-toolbar/filter-dropdown.component.scss`   | Filter-rule form-specific exceptions                      |
| `apps/web/src/app/features/map/workspace-pane/media-detail-view.component.scss`                   | Media detail context-menu positioning/ownership           |

## Wiring

### Injected Services

None - this spec defines CSS primitives and integration conventions.

### Inputs / Outputs

None at the system-spec level; inputs/outputs are defined by each consumer component.

### Subscriptions

None at the system-spec level.

### Supabase Calls

None - delegated to consumer feature services.

## Acceptance Criteria

- [x] All item hover states use `color-mix(in srgb, var(--color-clay) 8%, transparent)` — no grey hover
- [x] All items use `0.8125rem` font, `--spacing-1`/`--spacing-2` padding, `--radius-sm`
- [x] Sort dropdown uses global `dd-*` classes, SCSS only has direction toggle
- [x] Grouping dropdown uses global `dd-*` classes, SCSS only has drop zones + CDK + selected
- [x] Projects dropdown uses global `dd-*` classes, SCSS only has checkbox + count + "All" separator
- [x] Filter dropdown uses `dd-empty` and `dd-action-row`, form rules stay component-specific
- [x] Media detail context menu uses `dd-items` and `dd-item`/`dd-item--danger`
- [x] Danger items preserve `--color-danger` on both label and icon
- [ ] Metadata Key Suggestion dropdown uses `dd-item` + type badge (future)
