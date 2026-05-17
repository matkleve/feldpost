# Dropdown System

> **Action contract:** [action-context-matrix](action-context-matrix.md)

## What It Is

A composable CSS class system (`dd-*`) for all floating dropdown/menu surfaces in Feldpost. Every dropdown picks the pieces it needs — search, items, drag handles, section labels, action rows — from a shared global class library in `styles.scss`. Component SCSS only contains what's truly unique to that dropdown.
Shared project-selector and upload-row menus MUST reuse this primitive system instead of feature-local dropdown variants.

## Toolbar menu panels (anchored UI)

**Canonical naming:** Prefer **toolbar menu** / **menu panel** (product vocabulary). **`app-dropdown-shell`** is the anchored floating shell (fixed `top`/`left`); informal “dropdown” and library **Popover** naming are covered in [migration README — Anchored UI](../../migration/README.md#anchored-ui-toolbar-menus) and [glossary — Toolbar menus & naming](../../../glossary.md#toolbar-menus--naming).

**Width policy (toolbar shell):** Workspace/media/projects toolbars bind **`[panelClass]="toolbarDropdownPanelClass(activeDropdown())"`** (`toolbar-menu-panel-layout.ts`) so the shell always includes **`toolbar-dropdown option-menu-surface`**, and **appends `toolbar-dropdown--filter`** when the open panel is **Filter**. **`DropdownShellComponent`** SCSS mirrors the floors below; **horizontal `left` clamping** in toolbar TS must use **`toolbarDropdownPositionWidthPx(activeId)`** so the reserved width matches the active panel.

| Panel group | CSS `min-width` (viewport clamp) | TS / positioning px (16px/rem bridge) |
| --- | --- | --- |
| Sort, grouping, projects | `min(26rem, calc(100vw - 2rem))` on `:host.toolbar-dropdown` | **`TOOLBAR_MENU_PANEL_MIN_PX`** / **`TOOLBAR_MENU_SHELL_MIN_PX`** = **416** |
| Filter | `min(32rem, calc(100vw - 2rem))` on `:host.toolbar-dropdown.toolbar-dropdown--filter` | **`TOOLBAR_MENU_FILTER_PANEL_MIN_PX`** = **512**; **`TOOLBAR_MENU_FILTER_CLAMP_PX`** aliases **512** (legacy name) |

Keep **`rem`**, **`min(..., calc(100vw - 2rem))`**, **`toolbar-menu-panel-layout.ts`**, and this section aligned. Px constants are for **JS layout math** only; CSS **`rem`** is authoritative for rendering.

**Height / open stability (predetermined size):** Toolbar **`app-standard-dropdown`** uses **`min-height: var(--std-dropdown-min-height)`** with **`:host { --std-dropdown-min-height: 8rem }`** in `standard-dropdown.component.scss` so short lists do not collapse the panel. **Filter** sets **`[style.--std-dropdown-min-height]="'7rem'"`** on its `app-standard-dropdown` host so the empty filter surface stays **wider-than-tall** at open beside the **32rem** width floor. **Projects:** `.projects-list` uses a **fixed `height: 18rem`** capped by **`max-height: min(18rem, 50vh)`** with **`overflow-y: auto`** so the checklist band stays one size at open through load and search (**short filters keep empty space below rows**). **Filter rules:** **`standard-dropdown__items--filter-rules-band`** caps the items host with **`max-height: min(18rem, 50vh)`** so scroll + **`scrollbar-gutter: stable`** live on **one** element (avoids nested gutter with `.filter-rules`). **`max-height`** for the overall shell remains owned by menu chrome / inner scroll regions unless a spec calls for a shell-level cap.

**Search row (toolbar `app-standard-dropdown`):** The search row uses a **CSS grid** (`field` + trailing cluster). Optional controls (**default clear** and **`[dropdown-search-action]`**) sit in **fixed icon slots** matching `hlmBtn` **`size="icon"`** geometry (`2.5rem`); when a control is absent, an **`aria-hidden`** spacer preserves width so the text field does not jump. Callers with a **conditionally projected** search action (e.g. sort reset) set **`[reserveProjectedSearchActionSlot]="true"`** and mark projected controls with **`dropdown-search-action`** (via `DropdownSearchActionAnchorDirective` on the consumer template).

**Row chrome:** List rows use **`hlmMenuItem`** (+ `hlmMenuLabel` / `hlmMenuSeparator` where applicable) with variants from `menu-variants.ts` until brain `BrnMenu` ships.

**Menu body (toolbar `app-standard-dropdown`):** `.standard-dropdown` sets **`width: 100%`** (fills the shell floor) and **`min-height: var(--std-dropdown-min-height)`** (default **8rem**, filter **7rem**); **`max-height`** remains owned by menu chrome / scroll regions.

### Toolbar menu interaction inventory

| Panel | `app-standard-dropdown` | Search row | Reset / clear affordance | Footer action (`actionLabel`) | Scroll gutter on scroll list | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Sort** | Yes | Yes | Search slot: clear term **or** reset sort defaults (restart icon); motion uses token **`--motion-duration-slow`** for active icon tilt | No | `scrollbar-gutter: stable` on `.standard-dropdown__items` | Grouped-by block toggles with grouping state |
| **Grouping** | Yes | No | Header **restart_alt** clears active groupings when any exist; same slow active motion | No | `scrollbar-gutter: stable` | CDK drag rows |
| **Filter** | Yes | No | No “reset all” control in-panel | Yes (`filter-dropdown` wires add-rule) | **`scrollbar-gutter: stable`** on **`.standard-dropdown__items`** via **`standard-dropdown__items--filter-rules-band`** (`max-height` cap only; no nested rule-stack gutter) | **32rem** shell floor (`toolbar-dropdown--filter`); **`7rem`** content min-height; rules band **`max-height: min(18rem, 50vh)`** on items host |
| **Projects** | Yes | Yes | **No** sort/grouping-style reset — search row only clears text (`showDefaultClearAction`); selection via checkboxes + “All” | Yes (**New project**) | `scrollbar-gutter: stable` | **26rem** floor; `.projects-list` **`height: 18rem`** + **`max-height: min(18rem, 50vh)`** stable band (load + search) |

**Non-toolbar `app-dropdown-shell` callers** (map context, upload row, detail tags, etc.) pass explicit **`[minWidth]`** / **`panelClass`** as needed; they are **not** covered by the `toolbar-dropdown` width floor unless those classes are reused.

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

Composable class table, hover token, and item geometry: **[dropdown-system.class-library.supplement.md](./dropdown-system.class-library.supplement.md)**.

## Where It Lives

- **Global classes**: `apps/web/src/styles.scss` — the `dd-*` block after `.ui-spacer`
- **Sort**: `workspace-toolbar/sort-dropdown.component.ts` + `.scss`
- **Grouping**: `workspace-toolbar/grouping-dropdown.component.ts` + `.scss`
- **Projects**: `workspace-toolbar/projects-dropdown.component.ts` + `.scss`
- **Filter**: `workspace-toolbar/filter-dropdown.component.ts` + `.scss`
- **Context menu**: `apps/web/src/app/shared/workspace-pane/media-detail-view.component.html` + `.scss`

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

Toolbar **behavior** (search, reset, footer, gutter, width policy) is normative in [Toolbar menu panels (anchored UI)](#toolbar-menu-panels-anchored-ui). The table below remains the **`dd-*` primitive composition** index.

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
Component-specific: Notion-style compound filter rules (form rows with **`hlmBtn` + fixed flyout lists** + inputs — justified exception; **no** native `<select>` in-panel).

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
| `docs/specs/component/filters/dropdown-system.md`                                                         | Shared dropdown visual + **toolbar menu panel** contract |
| `apps/web/src/styles.scss`                                                                        | Global `dd-*` primitive class definitions                 |
| `apps/web/src/app/shared/dropdown-trigger/dropdown-shell.component.scss`                              | Toolbar shell `min-width` floor (`.toolbar-dropdown`)     |
| `apps/web/src/app/shared/dropdown-trigger/toolbar-menu-panel-layout.ts`                               | **`TOOLBAR_MENU_PANEL_MIN_PX` (416)**, **`TOOLBAR_MENU_FILTER_PANEL_MIN_PX` (512)**, **`toolbarDropdownPanelClass`**, **`toolbarDropdownPositionWidthPx`** |
| `apps/web/src/app/shared/dropdown-trigger/dropdown-search-action-anchor.directive.ts`                  | Attribute hook for `[dropdown-search-action]` (search-row slot detection) |
| `apps/web/src/app/shared/dropdown-trigger/sort-dropdown.component.scss`     | Sort-specific styling exceptions                          |
| `apps/web/src/app/shared/dropdown-trigger/grouping-dropdown.component.scss` | Grouping-specific drag/drop and selected-state exceptions |
| `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.scss` | Project-specific checkbox/count exceptions                |
| `apps/web/src/app/shared/dropdown-trigger/filter-dropdown.component.scss`   | Filter-rule form-specific exceptions                      |
| `apps/web/src/app/shared/workspace-pane/media-detail-view.component.scss`                   | Media detail context-menu positioning/ownership           |

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
- [ ] Shared project-selector flows reuse the same `dd-*` action-row and search primitives as toolbar dropdowns
- [ ] Metadata Key Suggestion dropdown uses `dd-item` + type badge (future)
