# Toolbar menu / anchored UI stack — deep analysis

**Date:** 2026-05-17  
**Repo:** `/home/matthias/Projects/feldpost`  
**Scope:** Shared `apps/web/src/app/shared/dropdown-trigger/*`, workspace + projects toolbar wiring, normative specs.  
**Baseline:** [`dropdown-component-structure-audit-2026-05-17.md`](./dropdown-component-structure-audit-2026-05-17.md) — verified against current code; discrepancies are listed under **Documentation drift**.

**Canonical spec:** [`dropdown-system.md`](../../specs/component/filters/dropdown-system.md) (toolbar menu contract, File Map, interaction table).

---

## Reconciliation (2026-05-17)

This report, the [structure audit](./dropdown-component-structure-audit-2026-05-17.md), and [`dropdown-system.md`](../../specs/component/filters/dropdown-system.md) agree on the **toolbar stack**: `app-dropdown-shell` → feature panel (`app-sort-dropdown` \| `app-grouping-dropdown` \| `app-filter-dropdown` \| `app-projects-dropdown`) → `app-standard-dropdown`; **filter picker flyout** as a sibling positioned surface under `app-filter-dropdown`; **projects list page** toolbar `@switch` **without** a `projects` case; **primary refactor direction**: consolidate duplicate toolbar `@if` / shell / `@switch` wiring (**Strategy C** / **Approach C**) before merging shell + body (**A**) or removing middle `app-*` hosts (**B**).

**Resolved vs earlier drafts:** `dropdown-system.md` **Where It Lives**, **Surface details** paths, and **File Map** now match code (`sort` / `grouping` / `filter` under `apps/web/src/app/shared/dropdown-trigger/`; **projects** under `workspace-toolbar/`). Grouping’s **`[showSearch]="false"`** + **`[reserveProjectedSearchActionSlot]="true"`** is normative in the spec’s search-row and toolbar interaction sections—no conflict with the structure audit’s “no search row” note (hidden search band + reserved trailing slot).

**Open follow-ups** (see compact table below) supersede scattered “open questions” lists for **engineering-owned** work; product-policy questions remain in §9.

| Follow-up | Owner |
| --- | --- |
| Refresh stale **`DropdownShellComponent`** header callsite count; optional dedupe **Escape** (`WorkspaceToolbarComponent` vs shell) | code |
| **Toolbar orchestrator** + shared **`clampToolbarDropdownLeft`** (or equivalent) per Strategy C | code |
| Single-owner **stacking story** for shell host (inline `z-index` vs menu CVA `z-50` / token) — document in spec once behavior is chosen | docs (contract note) **or** code (remove dead semantics) |
| Optional **Mermaid / test-oracle** DOM snapshot in `dropdown-system.md` linking these reports | docs |

**Map-shell `anyComponentStyle` budget:** Multiple anchored shells on the map surface (for example the four `<app-dropdown-shell>` blocks called out in §1) sit alongside heavy Leaflet `::ng-deep` and marker/panel SCSS; **emitted component-style size** and **co-located partial splits / dedupe** toward the Angular budget are tracked under [Phase 8 §7 — inventory (`styles/` tree)](../phase-8-global-scss-elimination.md#7-inventory-remaining-styles-tree) and summarized as open build weight in [Phase 8 — Open (remaining weight)](../phase-8-global-scss-elimination.md#open-remaining-weight), not duplicated here.

---

## 1. Executive findings

1. **Architecture:** Toolbar menus are a **three-layer `app-*` sandwich** under an `@if` gate: `app-dropdown-shell` → feature panel (`app-sort-dropdown` | `app-grouping-dropdown` | `app-filter-dropdown` | `app-projects-dropdown`) → `app-standard-dropdown`. That matches the baseline audit and [`dropdown-system.md`](../../specs/component/filters/dropdown-system.md#toolbar-menu-panels-anchored-ui).

2. **Change detection:** None of the dropdown-trigger leaf components declare `changeDetection: ChangeDetectionStrategy.OnPush`; they rely on **default** change detection. Signals are used heavily for state, but **each `app-*` host remains a full CD boundary** in the default strategy unless ancestors opt out.

3. **`::ng-deep`:** Grep over `apps/web/src/app/shared/dropdown-trigger/**` found **no** `::ng-deep` / `:host ::ng-deep` usage in this subtree.

4. **Stacking:** `DropdownShellComponent` applies **`[style.z-index]="'var(--z-dropdown)'"`** on the same host that receives **`HlmMenuContentDirective`** (via `hostDirectives`), whose CVA includes Tailwind **`z-50`** (`menuContentVariants` in `menu-variants.ts`). **Inline `z-index` wins** over class-based stacking; the `z-50` is effectively dead for the shell host but still **confusing for future refactors**.

5. **Escape handling duplication:** `WorkspaceToolbarComponent` registers **`@HostListener('document:keydown.escape')`** *and* each open `app-dropdown-shell` listens for **`(document:keydown.escape)`**. Both paths call close logic; behavior is redundant but **projects toolbar does not** duplicate the host listener (only the shell). Inconsistent pattern.

6. **Shell callsite inventory vs code comment:** `DropdownShellComponent`’s header comment claims a specific callsite count; **current templates exceed that** (e.g. `map-shell.component.html` alone contains **four** `<app-dropdown-shell>` blocks for different menus). Treat the comment as stale.

---

## 2. Component graph (trigger → overlay root → innermost list)

Legend: **Trigger** = native `button` in toolbar template (not an `app-*` host). **Overlay root** = first host under `@if (activeDropdown())`. **Innermost list** = the scrollable / primary row container you would target for “the list.”

### 2.1 Sort (`app-sort-dropdown`)

| Order | Host / node | Why it exists |
| --- | --- | --- |
| 0 | `app-workspace-toolbar` **or** `app-projects-toolbar` (toolbar only) | Owns `activeDropdown`, `dropdownTop` / `dropdownLeft`, `toolbarDropdownPanelClass`, `toolbarDropdownPositionWidthPx` clamp math, `isDragging` / `outsideCloseEnabled` wiring for grouping drag. |
| 0b | `app-pane-toolbar` (**projects page only**) | Layout shell for slots (`slot="left"` / `right`); not inside the overlay but wraps triggers. |
| 1 | `app-dropdown-shell` | **Manual popover:** `position: fixed`, `top`/`left` inputs, `document:click` outside-close with `ElementRef.contains`, Escape → `closeRequested`, `(click).stopPropagation()` so bubbled clicks do not confuse outer handlers; `hostDirectives: HlmMenuContentDirective` maps `panelClass` → menu surface CVA (`option-menu-surface` + `toolbar-dropdown` / `--filter`). |
| 2 | `app-sort-dropdown` | **Feature boundary:** metadata-driven options, `computed` grouped vs ungrouped lists, search term signal, tri-state sort direction UX, `effect` syncing `activeSorts` from `WorkspaceViewService` or parent inputs (projects). |
| 3 | `app-standard-dropdown` | **Reusable menu body:** optional search grid (`showSearch`), `contentChildren(DropdownSearchActionAnchorDirective)` for reserved search-action slot, scroll host with `itemsScroll` (unused for sort), optional footer (unused). |
| 4 | `div.standard-dropdown` (no `app-*`) | Flex column; `width: 100%`, `min-height: var(--std-dropdown-min-height)` per `standard-dropdown.component.scss`. |
| 5 | `div.standard-dropdown__items` | Scroll region; `scrollbar-gutter: stable`; receives projected **`[dropdown-items]`**. |
| 6 | **`div[dropdown-items]`** (innermost list root) | Row container; holds `@for` `hlmMenuItem` buttons and section labels / separators. |

**Projects toolbar variant:** Same `app-dropdown-shell` → `app-sort-dropdown` → `app-standard-dropdown`; parent passes `[optionsInput]`, `[groupingIdsInput]`, `[activeSortsInput]`, `[defaultSorts]` instead of wiring only from `WorkspaceViewService`.

### 2.2 Grouping (`app-grouping-dropdown`)

| Order | Host / node | Why it exists |
| --- | --- | --- |
| 0–1 | Same toolbar + `app-dropdown-shell` as §2.1 | Positioning + outside click + menu chrome. |
| 2 | `app-grouping-dropdown` | **CDK drag-drop orchestration:** `CdkDropListGroup` / two `CdkDropList` / `CdkDrag` + `CdkDragHandle`, multi-select (`Ctrl`+click), `dragStarted` / `dragEnded` → parent flips `outsideCloseEnabled` on shell. |
| 3 | `app-standard-dropdown` | Shared layout; **`[showSearch]="false"`** but **`[reserveProjectedSearchActionSlot]="true"`** (header reset lives in projected grouping UI, not search row — note `searchTerm` signal is still wired but search UI hidden). |
| 4–5 | Same `div.standard-dropdown` / `div.standard-dropdown__items` | Geometry + scroll. |
| 6 | **`div[dropdown-items][cdkDropListGroup]`** | **Innermost list root** connecting both drop lists; contains sections, separators, rows. |

### 2.3 Filter (`app-filter-dropdown`)

| Order | Host / node | Why it exists |
| --- | --- | --- |
| 0–1 | Toolbar + `app-dropdown-shell` | Same anchored shell contract. |
| 2 | `app-filter-dropdown` | **Rule stack + second-layer picker:** `FilterService` rules, `@HostListener('document:click')` for flyout dismiss, `window:resize` closes flyout, `itemsScroll` closes flyout; **`computeFilterPickerFlyoutGeom`** (`filter-dropdown-picker-geometry.ts`) for fixed flyout box. |
| 3 | `div.filter-dropdown-host` (no `app-*`) | Width / `min-w-0` constraint under shell (`filter-dropdown.component.scss`). |
| 4 | `app-standard-dropdown` | Rules band: **`[itemsClass]="'standard-dropdown__items--filter-rules-band'"`**, **`[style.--std-dropdown-min-height]="'7rem'"`**, footer **`[actionLabel]`** → `filterService.addRule()`. |
| 5 | `div.standard-dropdown__items` | Scroll + **`max-height: min(18rem, 50vh)`** when `--filter-rules-band` modifier present (single scroll owner + gutter per spec). |
| 6 | **`div[dropdown-items]`** → **`div.filter-rules`** | **Innermost “list”** is the vertical stack of **`div.filter-rule`** form rows (not a classic menu list). |
| 7 | **`div.filter-rule__picker-flyout`** (sibling under `app-filter-dropdown`, `@if (openRulePicker())`) | **Secondary surface:** `position: fixed`, `z-index: calc(var(--z-dropdown) + 2)`, `role="listbox"`; **not** a separate Angular component — avoids nesting a second scroll list inside the rules stack. |

### 2.4 Projects (`app-projects-dropdown`)

| Order | Host / node | Why it exists |
| --- | --- | --- |
| 0–1 | **`app-workspace-toolbar` only** (workspace has Projects menu; **projects toolbar `@switch` omits `projects`**) | Same shell; projects page toolbar has no projects dropdown case (`ProjectsToolbarDropdown = 'grouping' \| 'filter' \| 'sort' \| null`). |
| 2 | `app-projects-dropdown` | **Data + selection:** `ProjectsService.loadProjects()` async, checkbox selection set, `projectsChanged` output; inline template only. |
| 3 | `app-standard-dropdown` | Search + footer “New project”; host **`[style.--std-dropdown-min-height]="'calc(18rem + 3rem + 3.5rem)'"`** reserves chrome height. |
| 4–5 | `div.standard-dropdown` / `div.standard-dropdown__items` | Same shared body. |
| 6 | **`div[dropdown-items].projects-list`** | **Innermost list:** fixed **`height: 18rem`** + **`max-height: min(18rem, 50vh)`**, **`overflow-y: auto`**, **`scrollbar-gutter: stable`** (`projects-dropdown.component.scss`) — stabilizes height across async load + search filter. |

---

## 3. DOM / change-detection cost

### 3.1 `app-*` custom element count (open panel path)

Count **only the stacked Angular component hosts** from overlay root through `app-standard-dropdown` (excludes page layout like `app-pane-toolbar`):

| Panel | `app-dropdown-shell` | Feature | `app-standard-dropdown` | **Total `app-*` hosts** |
| --- | ---: | --- | ---: | ---: |
| Sort | 1 | `app-sort-dropdown` | 1 | **3** |
| Grouping | 1 | `app-grouping-dropdown` | 1 | **3** |
| Filter | 1 | `app-filter-dropdown` | 1 | **3** |
| Projects | 1 | `app-projects-dropdown` | 1 | **3** |

**Additional boundaries (not `app-*`):** `HlmMenuItemDirective`, `HlmMenuLabelDirective`, `HlmMenuSeparatorDirective`, `hlmBtn`, CDK directives on native/`div` hosts — they participate in DI and DOM but do not add `app-*` tags.

### 3.2 Redundant adjacent responsibility

- **`app-standard-dropdown` vs inner `div.standard-dropdown`:** The outer host owns `:host` CSS variables and `display: block`; the inner flex column owns **`width: 100%`** and **`min-height`**. This is a deliberate **host vs inner geometry split** (spec: menu body width fills shell floor), not a duplicate *feature* boundary.
- **`WorkspaceToolbarComponent` vs `DropdownShellComponent` on Escape:** **Same concern twice** on workspace only — redundant listeners (§1 point 5).
- **Filter:** `FilterDropdownComponent`’s **`document:click`** is **orthogonal** to shell outside-close (flyout lifetime); not redundant, but **two document-level listeners** are active while filter + flyout open (shell + filter).

### 3.3 `contentChildren` / CDK

- **`StandardDropdownComponent.projectedSearchActions`** — `contentChildren(DropdownSearchActionAnchorDirective)`; query list updates when projected search actions change (sort uses conditional `@if` around the anchor button).
- **CDK drag-drop:** Preview / placeholder DOM during drag; **`outsideCloseEnabled`** gated by **`!isDragging()`** in `workspace-toolbar.component.html` / `projects-toolbar.component.html` — matches baseline audit.

---

## 4. Layout / “jump” analysis

Each row ties **source of geometry change** → **file + mechanism**.

| Source | Mechanism | File / selector or `@Input` |
| --- | --- | --- |
| **Shell width floor (26rem / 32rem)** | CSS `min-width` / `width` / `max-width` on `:host.toolbar-dropdown` and `:host.toolbar-dropdown.toolbar-dropdown--filter` | `dropdown-shell.component.scss` (`:host.toolbar-dropdown`, `.toolbar-dropdown--filter`) |
| **Horizontal clamp at open** | TS: `toolbarDropdownPositionWidthPx(id)` — **416** vs **512** px | `toolbar-menu-panel-layout.ts` (`TOOLBAR_MENU_SHELL_MIN_PX`, `TOOLBAR_MENU_FILTER_PANEL_MIN_PX`); used in `WorkspaceToolbarComponent.toggleDropdown`, `ProjectsToolbarComponent.toggleDropdown` |
| **Shell flex + overflow** | `:host { display: flex; flex-direction: column; overflow: auto; }` | `dropdown-shell.component.scss` |
| **Menu body min height (default)** | `:host { --std-dropdown-min-height: 8rem }` on **`app-standard-dropdown`** | `standard-dropdown.component.scss` |
| **Filter shorter floor** | **`[style.--std-dropdown-min-height]="'7rem'"`** | `filter-dropdown.component.html` → `app-standard-dropdown` |
| **Toolbar panel max height** | **`.workspace-toolbar-menu-panel`** → `max-height: 24rem` | `standard-dropdown.component.scss` (class applied on sort/grouping `app-standard-dropdown`) |
| **Projects total min height** | **`[style.--std-dropdown-min-height]="'calc(18rem + 3rem + 3.5rem)'"`** + `:host { min-height: calc(18rem + 3rem + 3.5rem) }` | `projects-dropdown.component.ts` inline template + `projects-dropdown.component.scss` |
| **Projects list viewport** | **`.projects-list`** `height: 18rem`, `max-height: min(18rem, 50vh)`, `overflow-y: auto` | `projects-dropdown.component.scss` |
| **Filter rules band cap** | **`itemsClass`** adds **`standard-dropdown__items--filter-rules-band`** → `max-height: min(18rem, 50vh)` on items host | `standard-dropdown.component.scss`; bound in `filter-dropdown.component.html` **`[itemsClass]`** |
| **Scrollbar gutter** | **`scrollbar-gutter: stable`** on `.standard-dropdown__items`; projects also on `.projects-list` | `standard-dropdown.component.scss`, `projects-dropdown.component.scss` |
| **Search row stability** | Fixed icon slots + **`standard-dropdown__search-slot-spacer`**; **`reserveProjectedSearchActionSlot`** | `standard-dropdown.component.html` / `.scss`; sort `sort-dropdown.component.html` |
| **Sort conditional trailing control** | `@if (searchTerm() \|\| hasCustomSort())` wraps **`[dropdown-search-action]`** button | `sort-dropdown.component.html` — when false, reserved slot still holds spacer via `StandardDropdownComponent` logic |
| **Async row count** | Rules / projects list length — **vertical jump mitigated** by min-heights + fixed list viewport (projects) / capped band (filter) | `FilterService.rules()`, `ProjectsDropdownComponent.loadProjects()` |
| **Filter flyout** | Fixed `top` / `left` / `width` / `maxHeight` from **`computeFilterPickerFlyoutGeom`** | `filter-dropdown.component.html` bindings; `filter-dropdown-picker-geometry.ts` |

**Width jump when switching panels:** `toolbarDropdownPanelClass(activeDropdown())` appends **`toolbar-dropdown--filter`** for filter; shell CSS jumps **26rem → 32rem** floor — paired with **`toolbarDropdownPositionWidthPx`** in the same `toggleDropdown` call so **open position** matches **active width** (spec requirement).

---

## 5. Interaction / correctness risks

### 5.1 Outside click

| Layer | Behavior | Code |
| --- | --- | --- |
| **Shell** | `document:click` → if target **not contained** in shell host → `requestClose()`; skipped when **`outsideCloseEnabled`** false | `DropdownShellComponent.onDocumentClick` |
| **Shell inner click** | `(click)="$event.stopPropagation()"` on shell host | `DropdownShellComponent` `host` metadata |
| **Filter flyout** | Separate **`@HostListener('document:click')`**; closes picker unless target matches **`[data-filter-picker-flyout]`** or **`[data-filter-picker="ruleId-field"]`** | `FilterDropdownComponent.onDocumentClick` |
| **Scroll dismisses picker** | **`(itemsScroll)`** on `app-standard-dropdown` → `onRulesScroll()` | `filter-dropdown.component.html` |

**If overlay content moves to CDK `OverlayRef` (portal to `body`):**

- Shell **`contains()`** still works **if** the shell’s `ElementRef` is the overlay pane root the content attaches to. If developers port only *inner* content while the shell host stays in toolbar DOM, **`contains` breaks** → spurious outside-close.
- **Filter flyout** uses **`getBoundingClientRect()`** on the trigger — remains valid for `position: fixed` as long as triggers stay in viewport; if triggers scroll inside a clipped ancestor without reposition, **flyout can desync** (today flyout closes on **`window:resize`** only, not scroll).

### 5.2 Stacking

- Shell: **`z-index: var(--z-dropdown)`** (inline).
- Flyout: **`z-index: calc(var(--z-dropdown) + 2)`** (`filter-dropdown.component.scss`).
- **CVA `z-50`** on same shell host (§1) — maintainers may think Tailwind controls stacking; **inline wins**.

### 5.3 Drag vs close

- **`onDragEnded`** in toolbars uses **`setTimeout(() => isDragging.set(false))`** to avoid treating synthetic **mouseup** as outside click — documented pattern in `WorkspaceToolbarComponent` / `ProjectsToolbarComponent`.

### 5.4 Escape

- **Shell:** `(document:keydown.escape)='onEscape()'` → `closeRequested`.
- **Workspace toolbar:** duplicate `@HostListener('document:keydown.escape')` → `closeDropdown()`.

### 5.5 Popover contract cross-reference

[`popover-panel-contract.md`](../../design/design-system/popover-panel-contract.md) defers normative toolbar behavior to **`dropdown-system.md`** — code matches that split. Contract’s “anchor → drawer/sheet” degradation is **not implemented** in toolbar TS (manual clamp only).

---

## 6. Documentation drift (prefer code; audit/spec corrections)

| Item | Baseline / spec | Code truth |
| --- | --- | --- |
| **`dropdown-system.md` paths** | ~~Legacy `workspace-toolbar/` rows for sort/grouping/filter~~ | **Reconciled (2026-05-17):** spec **Where It Lives**, **Surface details**, and **File Map** list `dropdown-trigger/` + workspace-toolbar **projects**. |
| **`DropdownShellComponent` callsite comment** | “9 instances in 7 templates” | **More shells today** — e.g. **`map-shell.component.html`** has **four** `<app-dropdown-shell>` blocks; additional surfaces: `media.component.html`, `upload-panel-item`, `workspace-selected-items-grid`, `media-detail-header`, `media-detail-inline-section`, etc. |
| **Grouping search row** | ASCII “no search row” only | Code: **`[showSearch]="false"`** + **`[reserveProjectedSearchActionSlot]="true"`** — matches [`dropdown-system.md`](../../specs/component/filters/dropdown-system.md) search-row contract (reserved slot / header actions). |
| **Projects on projects page** | Audit notes projects toolbar omits projects case | Still true: **`projects-toolbar.component.html`** `@switch` has **no `@case ('projects')`**. |

---

## 7. Three refactor strategies (detail)

### Strategy A — **Merge shell + standard menu body for toolbar-only (“fat shell”)**

**Goal:** One `app-*` host combines **`DropdownShellComponent`** positioning/outside-click/Escape with **`StandardDropdownComponent`** layout (search / items / footer), eliminating the middle **`app-standard-dropdown`** host on toolbar paths only.

**Steps (high level):**

1. Introduce e.g. `ToolbarAnchoredMenuComponent` that inlines `standard-dropdown` template + TS API (inputs/outputs) into a shell-like host, or subclass compositionally via copy-paste then dedupe.
2. Migrate **sort → grouping → projects → filter** one panel at a time behind the new host.
3. Keep **non-toolbar** `app-dropdown-shell` callers on the existing lean shell.

**Risks:**

- **Forked behavior:** Toolbar vs map/media shells diverge (`minWidth`, `panelClass`, no `itemsScroll` on map).
- **Regression hotspot:** `document:click` / `stopPropagation` / drag **`outsideCloseEnabled`** interaction.
- **Filter flyout** still needs a feature parent for picker state — may **still** require `app-filter-dropdown` under the fat shell.

**Rollback:** Revert single feature branch; keep old `app-standard-dropdown` import path until all panels migrated.

**Blast radius:** **Order of magnitude ~15–40 files** if all toolbar consumers + SCSS move; **single-panel pilot ~5–10 files**.

**What NOT to merge in one PR:** **Shell behavior + standard layout + filter flyout** together — split: (1) mechanical template merge, (2) interaction tests, (3) filter.

---

### Strategy B — **Reduce middle hosts via directives / single feature root (no new visual)**

**Goal:** Keep **`app-dropdown-shell`** as the sole overlay host; collapse **`app-sort-dropdown`**-style wrappers into **fewer components** by moving row templates into **parent `ng-template`** or by merging sort logic into a generic `ToolbarMenuPanelComponent` with **typed context** — without deleting the **`[dropdown-items]`** projection contract until consumers are updated.

**Steps:**

1. Identify panels where **`app-standard-dropdown` adds no unique behavior** beyond what a directive could attach to a `ng-template` (high risk for grouping due to CDK).
2. Prefer **one feature component per panel** that **does not** nest another `app-*` for pure layout; use **direct structural HTML** inside shell for the 80% case.
3. Retire **`contentChildren`** for panels that drop the search-action slot pattern.

**Risks:**

- **Projection mistakes** (`dropdown-items` missing) go from “empty panel” to “layout broken” with less obvious structure.
- **SCSS ownership** violations if geometry is split between directive host and child without a spec update.

**Rollback:** Git revert per panel; keep `StandardDropdownComponent` exported for rollback.

**Blast radius:** **~8–25 files** depending on how many panels abandon `app-standard-dropdown`.

**What NOT to merge:** **Grouping CDK refactor + projection API change** in one PR.

---

### Strategy C — **Shared toolbar orchestrator (`@if` + shell + `@switch`) — DRY wiring first**

**Goal:** Extract the **duplicated** block from `workspace-toolbar.component.html` and `projects-toolbar.component.html` (`@if (activeDropdown())` → `app-dropdown-shell` → `@switch`) into **one** standalone component (e.g. `app-toolbar-dropdown-stack`) that accepts **either** content children per case **or** a small set of `ng-template` inputs. **Centralize** `toolbarDropdownPanelClass`, `toolbarDropdownPositionWidthPx`, drag flags — optionally **extract shared `toggleDropdown` math** into `toolbar-menu-panel-layout.ts` (pure function).

**Steps:**

1. Create orchestrator with **identical DOM** to current templates (no depth reduction initially).
2. Wire workspace + projects toolbars to use it; pass through `outputs` / `inputs` for each case (projects page passes filter options, etc.).
3. Add harness test or e2e checklist (§9).
4. Optionally remove **duplicate Escape** from `WorkspaceToolbarComponent` when shell is always parent.

**Risks:**

- **Input plumbing explosion** if API is poorly factored.
- **Readability:** reviewers may dislike a “god” switch component — mitigate with **thin** orchestrator + **unchanged** leaf components.

**Rollback:** Restore inline `@if` blocks in two templates.

**Blast radius:** **~5–12 files** for orchestrator + two toolbars + barrel/tests.

**What NOT to merge:** **Orchestrator + CDK overlay migration** — shell migration is a separate program.

---

## 8. Recommendation

### Primary path

**Strategy C first** — **DRY toolbar orchestration** + **shared anchor math** in `toolbar-menu-panel-layout.ts` (or adjacent `toolbar-dropdown-anchor.ts`), **without** removing `app-standard-dropdown`. Rationale: the **`dropdown-system.md`** contract is **encoded in `StandardDropdownComponent`** (search slots, items class hook, `itemsScroll`, footer); flattening (A) or aggressive host removal (B) **raises regression cost** before **`BrnMenu` / CDK Overlay`** land (explicit TODOs in `DropdownShellComponent` and `menu-variants.ts`).

### Fallback

If orchestrator API becomes unwieldy, **fallback to Strategy B** scoped to **sort only** (simplest panel): inline standard layout into `SortDropdownComponent` **only after** overlay migration clarifies whether the shell host or overlay pane owns padding/chrome.

### First PR (≤ 5 files) + QA

**Suggested PR (low risk, ≤5 files):**

1. `apps/web/src/app/shared/dropdown-trigger/toolbar-menu-panel-layout.ts` — add **`clampToolbarDropdownLeft(args)`** (or similar) deduplicating `WorkspaceToolbarComponent.toggleDropdown` and `ProjectsToolbarComponent.toggleDropdown` rect math.
2. `workspace-toolbar.component.ts` — call helper.
3. `projects-toolbar.component.ts` — call helper.
4. `docs/specs/component/filters/dropdown-system.md` — ~~**fix File Map paths**~~ **done** (2026-05-17 reconciliation); any further edits are optional (e.g. DOM test oracle).
5. Optional same PR: remove **duplicate Escape** from `workspace-toolbar.component.ts` (**4 files** if optional skipped).

**Manual QA checklist**

- [ ] Open **sort / grouping / filter / projects** from workspace toolbar; verify **no horizontal clip** at viewport edge (padding **16px**).
- [ ] Switch **filter** vs **sort**: width floor changes (**32rem** vs **26rem**) and **left** clamp still aligns with visible shell.
- [ ] **Grouping:** start drag → release; panel **must not** close mid-drag; **must** close on outside click after drag end.
- [ ] **Filter:** open property picker → click inside flyout → shell stays open; click outside → flyout closes; **scroll rules** → flyout closes.
- [ ] **Escape:** closes panel (**once**, no double-flick needed).
- [ ] **Projects:** list height stable after async load; search filters rows without collapsing panel height.

**Automated tests (incremental):** Unit-test **`clampToolbarDropdownLeft`** with mocked `innerWidth` / `getBoundingClientRect`; optional **TestBed** smoke for shell `onDocumentClick` with `contains`.

---

## 9. Open questions for product owner (max 5)

1. **Responsive policy:** Should toolbar menus **ever** degrade to **drawer/sheet** on narrow viewports (`popover-panel-contract.md`), or is **horizontal clamp + scroll** the permanent product answer?

2. **Projects entry points:** Should **`app-projects-dropdown`** exist on the **projects list page** toolbar as well, or is **workspace-only** project selection intentional forever?

3. **Filter flyout vs accessibility:** Is **manual focus order** between rule row and flyout acceptable short-term, or is **focus trap / roving tabindex** a release blocker for the filter picker?

4. **Overlay migration priority:** When **`BrnMenu` / CDK Overlay`** arrive, is **map context menu** or **workspace toolbar** the **first** migration pilot (affects risk ordering)?

5. **Telemetry / analytics:** Do we need **instrumented events** (open/close/panel id) for dropdowns to validate refactors in production, or is **manual QA + unit math tests** sufficient?

---

## 10. Reference index (symbols)

| Symbol | Path |
| --- | --- |
| `DropdownShellComponent` | `apps/web/src/app/shared/dropdown-trigger/dropdown-shell.component.ts` |
| `StandardDropdownComponent` | `apps/web/src/app/shared/dropdown-trigger/standard-dropdown.component.ts` |
| `SortDropdownComponent` | `apps/web/src/app/shared/dropdown-trigger/sort-dropdown.component.ts` |
| `GroupingDropdownComponent` | `apps/web/src/app/shared/dropdown-trigger/grouping-dropdown.component.ts` |
| `FilterDropdownComponent` | `apps/web/src/app/shared/dropdown-trigger/filter-dropdown.component.ts` |
| `ProjectsDropdownComponent` | `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/projects-dropdown.component.ts` |
| `toolbarDropdownPanelClass`, `toolbarDropdownPositionWidthPx` | `apps/web/src/app/shared/dropdown-trigger/toolbar-menu-panel-layout.ts` |
| `computeFilterPickerFlyoutGeom` | `apps/web/src/app/shared/dropdown-trigger/filter-dropdown-picker-geometry.ts` |
| `menuContentVariants` | `apps/web/src/app/shared/ui/menu/menu-variants.ts` |
| Workspace / projects wiring | `workspace-toolbar.component.html` / `.ts`, `projects-toolbar.component.html` / `.ts` |

---

*End of report.*
