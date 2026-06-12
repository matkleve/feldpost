# Dropdown System

> **Action contract:** [action-context-matrix](action-context-matrix.md)

## What It Is

A **layered menu system** for floating panels in Feldpost:

1. **Shell** — `app-dropdown-shell` + `.option-menu-surface` (`floating-panel-shell` mixin in [`_frosted-chrome.scss`](../../../../apps/web/src/styles/_frosted-chrome.scss)).
2. **Menu body** — `app-standard-dropdown` composing **`app-menu-panel-*`** primitives (search row, scroll region, footer action).
3. **Rows** — `hlmMenuItem` → `.option-menu-item` (global list rhythm in [`_option-menu-list.scss`](../../../../apps/web/src/styles/_option-menu-list.scss)).
4. **Domain panels** — sort, grouping, filter, projects (and other callers) project `[dropdown-items]` only; feature SCSS owns exceptions (CDK drag, filter rules, sort direction).

Legacy **`dd-*`** names are **not** defined in `styles.scss`; see [class-library supplement](./dropdown-system.class-library.supplement.md) for mapping.

Shared project-selector and upload-row menus MUST reuse **shell + option-menu** contracts, not feature-local shell chrome.

## Global CSS / token emission

Semantic custom properties ship from **`apps/web/src/styles.scss`** (tweakcn `:root` / theme blocks and app extensions). The legacy bridge path **`apps/web/src/styles/_legacy-design-tokens.scss`** is **not on disk** (Phase 7 Batch 50; verify **`rg 'legacy-design-tokens|_legacy-design-tokens' apps/web`** → **0**). **`@include meta.load-css('styles/typography-baseline')`** remains the only late-loaded global partial, after Tailwind/Preflight, per the header comment in `styles.scss`. Token bucket ownership: [`docs/design/token-layers.md`](../../design/token-layers.md). Naming checklist: [`docs/design/tokens.md`](../../design/tokens.md). Bridge history: [`docs/migration/phase-7-token-migration.md`](../../../migration/phase-7-token-migration.md).

## Toolbar menu panels (anchored UI)

**Canonical naming:** Prefer **toolbar menu** / **menu panel** (product vocabulary). **`app-dropdown-shell`** is the anchored floating shell (fixed `top`/`left`); informal “dropdown” and library **Popover** naming are covered in [migration README — Anchored UI](../../migration/README.md#anchored-ui-toolbar-menus) and [glossary — Toolbar menus & naming](../../../glossary.md#toolbar-menus--naming).

**Width policy (toolbar shell):** Workspace/media/projects toolbars bind **`[panelClass]="toolbarDropdownPanelClass(activeDropdown())"`** (`toolbar-menu-panel-layout.ts`) so the shell always includes **`toolbar-dropdown option-menu-surface`**, and **appends `toolbar-dropdown--filter`** when the open panel is **Filter**. **`DropdownShellComponent`** SCSS mirrors the floors below; **horizontal `left` clamping** in toolbar TS must use **`toolbarDropdownPositionWidthPx(activeId)`** so the reserved width matches the active panel.

| Panel group | CSS `min-width` (viewport clamp) | TS / positioning px (aligned to **16px** rem grid per [`docs/design/tokens.md`](../../../design/tokens.md)) |
| --- | --- | --- |
| Sort, grouping, projects | `min(18rem, calc(100vw - 2rem))` on `:host.toolbar-dropdown` | **`TOOLBAR_MENU_PANEL_MIN_PX`** / **`TOOLBAR_MENU_SHELL_MIN_PX`** = **288** |
| Filter | `min(32rem, calc(100vw - 2rem))` floor, `max(40rem, …)` cap on `:host.toolbar-dropdown.toolbar-dropdown--filter` | **`TOOLBAR_MENU_FILTER_PANEL_MIN_PX`** = **512**; clamp uses **`TOOLBAR_MENU_FILTER_PANEL_MAX_PX`** = **640** |

Keep **`rem`**, **`min(..., calc(100vw - 2rem))`**, **`toolbar-menu-panel-layout.ts`**, and this section aligned. Px constants are for **JS layout math** only; CSS **`rem`** is authoritative for rendering.

**Height / open stability (predetermined size):** Toolbar **`app-standard-dropdown`** uses **`min-height: var(--std-dropdown-min-height)`** with **`:host { --std-dropdown-min-height: 8rem }`** in `standard-dropdown.component.scss` so short lists do not collapse the panel. **Filter** sets **`[style.--std-dropdown-min-height]="'7rem'"`** on its `app-standard-dropdown` host so the empty filter surface stays **wider-than-tall** at open beside the **32rem** width floor. **Projects:** `.projects-list` uses a **fixed `height: 18rem`** capped by **`max-height: min(18rem, 50vh)`** with **`overflow-y: auto`** so the checklist band stays one size at open through load and search (**short filters keep empty space below rows**). **Filter rules:** **`standard-dropdown__items--filter-rules-band`** caps the items host with **`max-height: min(18rem, 50vh)`** so scroll + **`scrollbar-gutter: stable`** live on **one** element (avoids nested gutter with `.filter-rules`). **`max-height`** for the overall shell remains owned by menu chrome / inner scroll regions unless a spec calls for a shell-level cap.

**Search row (toolbar `app-standard-dropdown`):** The search row uses a **CSS grid** (`field` + trailing cluster). Optional controls (**default clear** and **`[dropdown-search-action]`**) sit in **fixed icon slots** matching `hlmBtn` **`size="icon"`** geometry (`2.5rem`); when a control is absent, an **`aria-hidden`** spacer preserves width so the text field does not jump. Callers with a **conditionally projected** search action (e.g. sort reset) set **`[reserveProjectedSearchActionSlot]="true"`** and mark projected controls with **`dropdown-search-action`** (via `DropdownSearchActionAnchorDirective` on the consumer template).

**Row chrome:** List rows use **`hlmMenuItem`** (+ `hlmMenuLabel` / `hlmMenuSeparator` where applicable) with variants from `menu-variants.ts` until brain `BrnMenu` ships.

**Menu body (toolbar `app-standard-dropdown`):** The **component host** sets **`width: 100%`**, **`padding: 0`**, and **`min-height: var(--std-dropdown-min-height)`** (default **8rem**, filter **7rem** via host style override). **Shell inset** (`var(--spacing-2)`) lives on **`.option-menu-surface`** only — do not duplicate on the body host or feature panels. Layout uses **`host.class`** flex utilities (`flex flex-1 flex-col min-h-0 gap-y-2`). **Vertical rhythm:** **`gap-y-2`** separates search row, scroll region, and footer. **Search row** internal tap rhythm: **`py-2`** on `.standard-dropdown__search` only. **`.standard-dropdown__items`** uses **`padding: 0`**; list gap **2px** from `_option-menu-surface.scss`. See [Padding ownership](#padding-ownership-normative).

**Scroll modes (`scrollMode` input):** `host` (default) | `delegate` (inner list scrolls) | `split` (pinned header + inner scroll) | `none` (capped band, outer host does not scroll). Maps to `standard-dropdown__items--*` modifiers; prefer `scrollMode` over raw `itemsClass` strings.

### Toolbar menu interaction inventory

| Panel | `app-standard-dropdown` | Search row | Reset / clear affordance | Footer action (`actionLabel`) | Scroll gutter on scroll list | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| **Sort** | Yes | Yes | Search slot: clear term **or** reset sort defaults (restart icon); motion uses token **`--motion-duration-slow`** for active icon tilt | No | `scrollbar-gutter: stable` on `.standard-dropdown__items` | Grouped-by block toggles with grouping state |
| **Grouping** | Yes | Yes | Search clear + header **restart_alt** clears active groupings when any exist | No | `scroll-split`; gutter on inner `.grouping-dropdown__scroll` | CDK drag rows; pinned “Grouped by” band |
| **Filter** | Yes | No | No “reset all” control in-panel | Yes (`filter-dropdown` wires add-rule) | **`scrollbar-gutter: stable`** on **`.standard-dropdown__items`** via **`standard-dropdown__items--filter-rules-band`** (`max-height` cap only; no nested rule-stack gutter) | **32rem** shell floor (`toolbar-dropdown--filter`); **`7rem`** content min-height; rules band **`max-height: min(18rem, 50vh)`** on items host |
| **Projects** | Yes | Yes | Search row only clears text (`showDefaultClearAction`); selection via checkboxes + “All” | Yes (**New project**) | `scrollMode: delegate`; gutter on `.projects-list` | **18rem** shell floor; `.projects-list` **`height: 18rem`** + **`max-height: min(18rem, 50vh)`** |

**Non-toolbar `app-dropdown-shell` callers** (map context, upload row, detail tags, etc.) pass explicit **`[minWidth]`** / **`panelClass`** as needed; they are **not** covered by the `toolbar-dropdown` width floor unless those classes are reused.

### Ownership matrix (normative)

Implicit ownership caused “edit the wrong layer, no visible change.” The table below is the **single contract** for the anchored stack (toolbar + shared body + feature panels + filter flyout). **Test oracles** in the last column.

| Concern | Owner | Forbidden elsewhere | Test oracle |
| --- | --- | --- | --- |
| **Toolbar panel width floor** (18rem / 32rem, `100vw - 2rem`) | `DropdownShellComponent` SCSS (`:host.toolbar-dropdown`, `.toolbar-dropdown--filter`) + `panelClass` from **`toolbarDropdownPanelClass`** | Feature panel SCSS must not redefine the shell width floor as “the menu width” | Widen filter → change **shell SCSS** + **`toolbarDropdownPositionWidthPx`** only |
| **Map / context shell width** | `DropdownShellComponent` **`[minWidth]`** / **`[maxWidth]`** / `panelClass` per callsite (e.g. map context menu) | Do not assume toolbar `rem` floors apply — map uses **px inputs** when needed | Map menu width → callsite bindings + map shell SCSS, not `toolbar-menu-panel-layout.ts` |
| **Horizontal `left` clamp** | Toolbar TS: **`clampToolbarDropdownLeft`** + **`toolbarDropdownPositionWidthPx(activeId)`** in `toolbar-menu-panel-layout.ts` | `app-standard-dropdown` and feature panels must not compute viewport `left` | Clamp matches active panel width (288 vs 640) |
| **Shell padding (inset)** | `.option-menu-surface` via **`floating-panel-shell`** (`padding: var(--spacing-2)`) | Body host, `.standard-dropdown__items`, feature panels must not add shell-level inset | Bottom padding visible when list scrolls |
| **Inner fill** | `StandardDropdownComponent` (`width: 100%`, `padding: 0`, host CSS vars) | Shell must not duplicate body padding | Body fills shell content box |
| **Max height / scroll band (toolbar body)** | `standard-dropdown.component.scss` (e.g. `.workspace-toolbar-menu-panel`, `standard-dropdown__items--filter-rules-band`) | Shell `:host` stays generic flex/overflow only | Filter rules: one scroll host owns `scrollbar-gutter` per inventory table above |
| **Outside-close + Escape for mounted shell** | **`DropdownShellComponent` only** (`document:click` with `contains`, `document:keydown.escape` → `closeRequested`) | Parents that wrap `app-dropdown-shell` must **not** duplicate Escape — see [Escape (keyboard)](#escape-keyboard) | Escape closes menu once; no duplicate listeners on workspace toolbar |
| **Stacking for shell host** | Inline **`z-index: 300`** on `DropdownShellComponent` host — **authoritative** — see [Stacking (z-index)](#stacking-z-index) | Do not remove inline `z-index` thinking CVA handles elevation | Shell stacks above map/workspace layers per [`docs/design/tokens.md`](../../../design/tokens.md) §3.5 |
| **Filter inline picker flyout** | `FilterDropdownComponent` (fixed geom, flyout-only `document:click`, **`z-index: 302`**) | Shell must not branch on picker fields | Two `document:click` scopes are intentional — see [document:click (shell vs filter flyout)](#documentclick-shell-vs-filter-flyout) |
| **CDK drag vs shell close** | Toolbar: **`[outsideCloseEnabled]="!isDragging()"`**; grouping emits drag start/end | Shell stays generic | Drag does not close shell until drag end + timeout |
| **Domain rows / rules** | Sort, grouping, filter, projects feature components | Shared body does not own domain row markup | — |

### Typeahead list keyboard (media detail address surfaces)

**Not** the toolbar `dd-item` inventory above — applies to **`option-menu-list`** panels mounted by **`app-dropdown-shell`** when the user is searching addresses:

| Surface | Spec | Keys (when results exist) |
| --- | --- | --- |
| Whole-address bar | [address-search.md](../../ui/media-detail/address-search.md#keyboard-navigation-results-listbox) | Tab / ↓ enter list & next row; Shift+Tab / ↑ previous (first row → input); Enter applies first row from input or highlighted row from list |
| Per-field combobox | [address-field-editing.md](../../ui/media-detail/address-field-editing.md) | Arrow ↑/↓ + Enter (Tab not used — see combobox spec) |

Implementations must keep highlight class, `aria-activedescendant`, and scroll-into-view for the active option in sync.

### Escape (keyboard)

**Owner:** **`DropdownShellComponent`** — host listens for **`document:keydown.escape`** and emits **`closeRequested`**.

**Rationale:** The shell’s lifecycle matches the **panel DOM** (`@if` mounts the shell when open). Escape means “dismiss the anchored surface currently in the tree.” Parents such as **`WorkspaceToolbarComponent`** own **which** panel id is open and trigger geometry; they must **not** also own global Escape for that surface — that couples the parent to presentation (shell vs future CDK overlay) and duplicates handlers.

**Normative rule:** Do **not** register **`document:keydown.escape`** on toolbar hosts (or any parent) that wrap **`app-dropdown-shell`**. Close the menu by handling **`(closeRequested)`** from the shell only.

### Stacking (z-index)

#### Open-time stacking owner (normative)

**Single owner:** While a toolbar (or other) menu is open, **stacking for the anchored surface** is owned **only** by the **`DropdownShellComponent` host** — [`apps/web/src/app/shared/dropdown-trigger/shell/dropdown-shell.component.ts`](../../../../apps/web/src/app/shared/dropdown-trigger/shell/dropdown-shell.component.ts) + **`.scss`** — via the host’s inline **`z-index: 300`** binding. No other element in the shell subtree is a co-owner of product elevation for that surface.

**`hlmMenu` / `HlmMenuContentDirective` CVA (`z-50` in [`menu-variants.ts`](../../../../apps/web/src/app/shared/ui/menu/menu-variants.ts)):** May apply on the same host; it does **not** establish a parallel stacking contract. On **`app-dropdown-shell`**, the **inline `z-index: 300` wins** for `z-index`; CVA `z-50` is **subordinate** (see cascade below).

**Parents must not:** Put **`z-index`**, **`isolation`**, or **`transform`** (or other properties that create a **new stacking context**) on layout wrappers around **`app-dropdown-shell`** to chase overlap bugs; do **not** duplicate **`300`** on ancestors “for insurance.” Fix ordering in **shell** / **map–chrome** contracts — not parent duplication.

**Authoritative value:** `DropdownShellComponent` sets **`[style.z-index]="'300'"`** on its host. This is the **intended** product elevation for floating shells (toolbar menus, map menus, upload, etc.) — see **`docs/design/tokens.md`** §3.5.

**Same host also applies `HlmMenuContentDirective`:** `menuContentVariants` in [`apps/web/src/app/shared/ui/menu/menu-variants.ts`](../../../../apps/web/src/app/shared/ui/menu/menu-variants.ts) includes Tailwind **`z-50`**. That CVA is shared with **non-shell** menu surfaces.

**Cascade:** Inline **`z-index`** wins over the CVA class-based **`z`** for that property on the shell host. On **`app-dropdown-shell`**, the **literal `300` on the host is the stacking owner**; CVA `z-50` is **subordinate** and must not be treated as redundant noise safe to delete in isolation.

**Do not remove** the inline **`300`** **`z-index`** binding assuming “menu CVA already sets z-index” — removal can regress ordering against map markers, workspace chrome, or other layers depending on paint order.

**Optional code follow-up (separate PR / QA):** Strip or branch CVA `z-50` for shell-only hosts so the source matches one owner; not required if this spec + shell file comments stay current.

### document:click (shell vs filter flyout)

Feldpost accumulated **two** document-level click paths when toolbar menus and filter pickers evolved in parallel. Both are **intentional** and **orthogonal scopes**:

1. **`DropdownShellComponent`:** `document:click` → if `event.target` is not contained in the shell element → **`closeRequested`** (dismiss **entire** anchored menu).
2. **`FilterDropdownComponent`:** when a property/operator flyout is open, `document:click` → if target is not inside **`[data-filter-picker-flyout]`** and not a **`[data-filter-picker]`** trigger → **close flyout only** (menu stays open).

The filter flyout remains **inside** the shell DOM so shell **`contains()`** still treats clicks on the flyout as inside the shell (no accidental whole-menu close from flyout interaction). Filter’s listener only shrinks the **picker** state.

### Shell width variants (non-exhaustive)

| Variant | CSS / binding | Typical callers |
| --- | --- | --- |
| Toolbar standard | `:host.toolbar-dropdown` **18rem** | Sort, grouping, projects (workspace / projects / media toolbars) |
| Toolbar filter | `.toolbar-dropdown--filter` **32rem** min, **40rem** max | Filter panel |
| Media-detail projects | `.media-detail-projects-panel` max **20rem** | `media-detail-inline-section` |
| Arbitrary px floor | `[minWidth]` on `app-dropdown-shell` | Address search, comboboxes, context menu (**176**), location row (**220**), map shells, upload row menu |
| Content-sized | No `toolbar-dropdown` class; `option-menu-surface` only | Metadata picker, add-metadata suggestions |

### Padding ownership (normative)

| Property | Owner file | Selector / component |
| --- | --- | --- |
| Shell inset (all edges) | `_frosted-chrome.scss` | `@mixin floating-panel-shell` on `.option-menu-surface` |
| Body host padding | `standard-dropdown.component.scss` | `:host { padding: 0 }` |
| Items host padding | `_option-menu-list.scss` | `.option-menu-surface .standard-dropdown__items { padding: 0 }` |
| Row padding | `_option-menu-list.scss` | `.option-menu-item` |
| Search row internal padding | `standard-dropdown.component.scss` / `menu-panel-search-row` | `.standard-dropdown__search` `py-2`; field `px-2 py-1` |
| Section label padding | `_option-menu-list.scss` | `.option-menu-label` |
| Filter rules band (vertical only) | `filter-dropdown.component.scss` | `.filter-dropdown-host` `padding-block` only |

### Row interaction states

| State | Visual | Owner |
| --- | --- | --- |
| Menu row hover / focus | Primary fill + text | [`_option-menu-item-states.scss`](../../../../apps/web/src/styles/_option-menu-item-states.scss) |
| Active sort row | Selected-ink background/text; direction chip primary on hover | `sort-dropdown.component.scss` |
| Grouping multi-select | Selected-ink border/fill | `grouping-dropdown.component.scss` `.grouping-row--selected` |
| Destructive row | Destructive token | `.option-menu-item.text-destructive` |

See [`docs/design/state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis.

## What It Looks Like

Floating menus share **frosted panel chrome** (upload-resolver-tray reference) and **option-menu row geometry**. Default row hover uses **primary**; persistent sort selection uses **interaction-selected-ink**.

### Container shell (canonical)

Applied via **`.option-menu-surface`** → `@include floating-panel-shell`:

```
padding:       var(--spacing-2)
border-radius: var(--container-radius-panel)
background:    color-mix(card 85%, transparent) + backdrop blur
border:        1px solid color-mix(border 80%, transparent)
box-shadow:    var(--shadow-md)
```

**Authors:** [`docs/design/tokens.md`](../../../design/tokens.md), [`upload-resolver-tray.md`](../upload/upload-resolver-tray.md). Legacy `dd-*` mapping: **[dropdown-system.class-library.supplement.md](./dropdown-system.class-library.supplement.md)**.

**Map / Leaflet pierced DOM:** CSS for Leaflet-injected marker and overlay nodes is **not** part of the **`dd-*`** class library in `styles.scss`. It ships from **`apps/web/src/styles/_map-shell-leaflet-global.scss`** under **`app-map-shell { … }`** (`@use` from `styles.scss`, Phase 8 Path A). See [`phase-10-visual-qa.md`](../../../migration/phase-10-visual-qa.md#stacking-sanity) and [`media-marker.md`](../../ui/media-marker/media-marker.md) file map.

## Where It Lives

- **Shell chrome**: `apps/web/src/styles/_frosted-chrome.scss`, `apps/web/src/styles/_option-menu-surface.scss`
- **List + row rhythm**: `apps/web/src/styles/_option-menu-list.scss`, `apps/web/src/styles/_option-menu-item-states.scss`
- **Menu panel primitives**: `apps/web/src/app/shared/menu-panel/`
- **Anchored shell + toolbar panels**: `apps/web/src/app/shared/dropdown-trigger/`
- **Map / Leaflet pierced CSS:** `apps/web/src/styles/_map-shell-leaflet-global.scss`
- **Sort / grouping / filter (feature panels)**: `apps/web/src/app/shared/dropdown-trigger/` — `sort-dropdown`, `grouping-dropdown`, `filter-dropdown` (`.ts` + `.html` + `.scss` as applicable)
- **Projects (workspace toolbar only)**: `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.ts` + `.scss` (inline template)
- **Context menu**: `apps/web/src/app/shared/workspace-pane/media-detail-view.component.html` + `.scss`
- **Analysis (non-normative):** [`dropdown-component-structure-audit-2026-05-17.md`](../../../migration/reports/dropdown-component-structure-audit-2026-05-17.md), [`dropdown-deep-analysis-2026-05-17.md`](../../../migration/reports/dropdown-deep-analysis-2026-05-17.md) — DOM/stacking notes reconciled with this spec (2026-05-17).

## Actions

| #   | Trigger                         | System Response                                             | Surface                          |
| --- | ------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| 1   | Opens any toolbar dropdown      | Container shell renders with shared elevated surface tokens | Sort, Grouping, Projects, Filter |
| 2   | Hovers an actionable row        | Primary hover on `.option-menu-item` (no geometry shift)    | Toolbar + context menus          |
| 3   | Navigates item list via pointer | Icon/label/trailing align per `menu-variants` / option-menu-list | `hlmMenuItem` consumers     |
| 4   | Opens dropdown with search      | `app-menu-panel-search-row` / `app-standard-dropdown`       | Sort, grouping, projects         |
| 5   | Dropdown has no rows            | Empty copy in feature template                              | Sort, filter                     |
| 6   | Renders destructive menu action | `.option-menu-item.text-destructive`                      | Media detail context menu        |

## Dropdown Inventory

Toolbar **behavior** (search, reset, footer, gutter, width policy) is normative in [Toolbar menu panels (anchored UI)](#toolbar-menu-panels-anchored-ui).

| #   | Surface                       | Search | Items | Section labels | Dividers | Drag | Footer action | Empty | Component-specific                                 |
| --- | ----------------------------- | ------ | ----- | -------------- | -------- | ---- | ------------- | ----- | -------------------------------------------------- |
| 1   | **Sort Dropdown**             | ✅     | ✅    | ✅             | ✅       | —    | —             | ✅    | Direction toggle; scroll-split when grouped sorts  |
| 2   | **Grouping Dropdown**         | ✅     | ✅    | ✅             | ✅       | ✅   | —             | —     | CDK drag; scroll-split; pinned “Grouped by”      |
| 3   | **Projects Dropdown**         | ✅     | ✅    | —              | —        | —    | ✅         | —     | Checkbox column, count trailing, "All" separator   |
| 4   | **Filter Dropdown**           | —      | —     | —              | —        | —    | ✅         | ✅    | Notion-style filter rules (form rows)              |
| 5   | **Media Detail Context Menu** | —      | ✅    | —              | —        | —    | —          | —     | Danger item, positioning                           |
| 6   | **Search Bar Dropdown**       | —      | —     | —              | —        | —    | —          | —     | Separate system (`.ui-item` grid, taller rows)     |
| 7   | **Metadata Key Suggestion**   | —      | ✅    | —              | —        | —    | —          | —     | Type badge trailing, create action (future)        |

### Surface details

**Sort / grouping / projects / filter** — `app-standard-dropdown` + `app-menu-panel-*`; domain markup in `sort-dropdown`, `grouping-dropdown`, `filter-dropdown`, `projects-dropdown`. Filter rules remain form-specific (exception).

**Media detail context menu** — `option-menu-list` + `hlmMenuItem` inside `app-dropdown-shell`.

**Map search bar** — separate `.ui-item` system; not option-menu.

## Component Hierarchy

```
app-dropdown-shell (option-menu-surface)
└── [domain panel] e.g. app-sort-dropdown
    └── app-standard-dropdown
        ├── app-menu-panel-search-row (optional)
        ├── app-menu-panel-scroll-region
        │     └── [dropdown-items] projected content
        └── app-menu-panel-footer-action (optional)
```

Toolbar wiring may use **`app-toolbar-dropdown-stack`** (shell + `@switch`) — see `toolbar-dropdown-stack.component.ts`.

## Data

Not applicable - visual style system only. No direct domain data model or Supabase query is defined in this spec.

## State

Not applicable - state is owned by consuming dropdown components (sort/grouping/projects/filter/media-detail), not by the shared menu shell contract.

## File Map

| File                                                                                              | Purpose                                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `docs/specs/component/filters/dropdown-system.md`                                                         | Shared dropdown visual + **toolbar menu panel** contract |
| `apps/web/src/styles/_frosted-chrome.scss`, `_option-menu-surface.scss`, `_option-menu-list.scss` | Shell chrome + list/row rhythm |
| `apps/web/src/app/shared/menu-panel/`                                                             | Search row, scroll region, footer action primitives |
| `apps/web/src/app/shared/dropdown-trigger/shell/dropdown-shell.component.ts` / `.scss`                  | Anchored shell; toolbar width floors |
| `apps/web/src/app/shared/dropdown-trigger/standard/standard-dropdown.component.ts` / `.html` / `.scss`       | Menu body composer |
| `apps/web/src/app/shared/dropdown-trigger/toolbar/toolbar-menu-panel-layout.ts`                           | **288** / **512** / **640** px constants, **`clampToolbarDropdownLeft`**, panel class helpers |
| `apps/web/src/app/shared/dropdown-trigger/toolbar/toolbar-dropdown-stack.component.ts`                    | Shared toolbar shell + panel switch |
| `apps/web/src/app/shared/dropdown-trigger/sort/sort-dropdown.component.ts` / `.html`                       | Sort panel feature wiring |
| `apps/web/src/app/shared/dropdown-trigger/grouping/grouping-dropdown.component.ts` / `.html`                   | Grouping panel + CDK drag |
| `apps/web/src/app/shared/dropdown-trigger/filter/filter-dropdown.component.ts` / `.html`                     | Filter rules + picker flyout |
| `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.ts`     | Projects checklist panel |
| `apps/web/src/app/shared/dropdown-trigger/shell/dropdown-search-action-anchor.directive.ts`                  | Attribute hook for `[dropdown-search-action]` (search-row slot detection) |
| `apps/web/src/app/shared/dropdown-trigger/sort/sort-dropdown.component.scss`     | Sort-specific styling exceptions                          |
| `apps/web/src/app/shared/dropdown-trigger/grouping/grouping-dropdown.component.scss` | Grouping-specific drag/drop and selected-state exceptions |
| `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.scss` | Project-specific checkbox/count exceptions                |
| `apps/web/src/app/shared/dropdown-trigger/filter/filter-dropdown.component.scss`   | Filter-rule form-specific exceptions                      |
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

- [x] Toolbar shells use **`floating-panel-shell`** inset on `.option-menu-surface` only (no double padding on body)
- [x] Toolbar standard width **18rem**; filter **32rem** floor; TS clamp matches **`toolbarDropdownPositionWidthPx`**
- [x] List rows use **`hlmMenuItem`** / `.option-menu-item` geometry from `_option-menu-list.scss`
- [x] Sort/grouping/projects compose **`app-standard-dropdown`** + menu-panel primitives
- [x] Sort active rows use **`interaction-selected-ink`**; hover uses primary (including direction chip on hover)
- [x] Filter form rules stay component-specific; footer uses menu-panel footer action
- [x] Media detail context menu uses option-menu list + destructive variant
- [x] Shared project-selector flows reuse menu-panel search/footer primitives (media-detail inline section partial)
- [ ] Metadata key suggestion fully on option-menu primitives (future)
