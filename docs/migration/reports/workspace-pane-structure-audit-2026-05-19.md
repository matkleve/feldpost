# Workspace Pane Structure Audit — 2026-05-19

Audit scope: `apps/web/src/app/shared/workspace-pane/` (all `.ts` / `.html` / `.scss`), plus shell integration in `apps/web/src/app/layout/authenticated-app-layout.component.*` and referenced `app-drag-divider`, `app-pane-toolbar`, `app-pane-footer`, and grid/media child components used at runtime.

**Method:** Template nesting depth counts **element nodes inside each component template** (Angular host tags add +1 per component boundary in the composed tree). Geometry / overflow / stacking are taken from component SCSS (including shared parent stylesheets where a child has no own `.scss`).

---

## Executive summary

| Metric | Value |
| --- | --- |
| Angular components **defined** under `workspace-pane/` | **22** (20 wired in live tree, **2 orphaned**) |
| Typical **runtime** component boundaries (pane open, selected-items tab) | **~28–32** (includes shared grid, media, dropdown, layout chrome) |
| DOM depth **pane shell host → deepest leaf** (thumbnail grid → `img`) | **~13–14** |
| DOM depth **pane shell host → deepest leaf** (media detail → calendar day / universal-media asset) | **~14–16** |
| Nested `overflow: hidden` clip chains | **3** on shell + pane alone (desktop) |
| Pass-through / redundant wrapper components | **≥4** clear merge candidates |

---

## Component tree

### Shell & layout (hosted by `AuthenticatedAppLayoutComponent`)

| Selector | Role |
| --- | --- |
| `app-workspace-pane-shell` | Width-controlled column shell; projects `app-workspace-pane`; mounts `app-drag-divider` when open |
| `app-drag-divider` | 2px flex strip; 44px absolute hit target; resize + keyboard |
| `app-workspace-pane` | Tab state, detail vs grid routing, title/color inputs, projects content upload tab |

### Chrome

| Selector | Role |
| --- | --- |
| `app-workspace-pane-header` | **Pass-through** to `app-pane-header` (no template markup beyond child) |
| `app-pane-header` | Title, color swatch, close; inline template |
| `app-workspace-pane-toolbar` | Wraps `app-pane-toolbar` + `app-workspace-toolbar` |
| `app-pane-toolbar` | 3-slot toolbar shell (`shared/pane-toolbar/`) |
| `app-group-tab-bar` | **Orphan** — not referenced anywhere in app |
| `app-sorting-controls` | **Orphan** — not referenced anywhere in app |

### Selected-items tab

| Selector | Role |
| --- | --- |
| `app-workspace-toolbar` | Filter/group/sort/projects menus + thumbnail size toggle |
| `app-projects-dropdown` | Projects checklist inside `app-standard-dropdown` |
| `app-workspace-selected-items-grid` | Scrollable thumbnail grid, grouping, context menu |
| `app-workspace-pane-footer` | Selection summary + bulk actions via `app-pane-footer` |

### Media detail subtree

| Selector | Role |
| --- | --- |
| `app-media-detail-view` | Coordinator: load/save, actions, layout columns |
| `app-image-detail-header` | Back, title edit, type chip, overflow menu |
| `app-media-detail-media-viewer` | Image / upload / lightbox |
| `app-image-detail-inline-section` | Detail + location field rows, project tag editor |
| `app-captured-date-editor` | Floating calendar popover |
| `app-address-search` | Geocode trigger + results |
| `app-metadata-section` | Metadata list + add row |
| `app-metadata-property-row` | Single metadata key/value row |
| `app-detail-actions` | Footer action list |
| `app-editable-property-row` | **Orphan** — not referenced anywhere in app |

### External components composed at runtime (not in `workspace-pane/` folder)

`app-pane-footer`, `app-dropdown-shell`, `app-grouping-dropdown`, `app-filter-dropdown`, `app-sort-dropdown`, `app-standard-dropdown`, `app-item-grid`, `app-group-header`, `app-media-item`, `app-media-display`, `app-universal-media`, `app-quick-info-chips`, `app-photo-lightbox`, `app-upload-panel` (projected), dialog components in footer/grid.

---

## DOM depth analysis

### Per-component template depth (max element nesting inside template)

| Component | Template depth | Geometry owners | `overflow: hidden` / `overflow-y: auto` | Stacking contexts (`position`, `z-index`, `transform`) | Pure / thin wrappers | `:host` `min-height: 0` / `min-width: 0` |
| --- | ---: | --- | --- | --- | --- | --- |
| `app-workspace-pane-shell` | 2 (`section` + projected content) | `.workspace-pane-shell` (flex column, width, height) | **hidden** (desktop `@media min-width 48rem`) | Mobile: **fixed** + **z-index 100**; clip-path animation | Host `display: contents` (no box) | N/A (`display: contents`) |
| `app-drag-divider` | 4 (`hit-zone` → `bar`; `grip` → `span`) | `:host` 2×100%; hit-zone 2.75rem absolute | — | `:host` **relative**, **z-index 1**; hit-zone **transform**; grip **absolute** + **transform** | `bar`, `grip` decorative | **Missing** (fixed 2px strip; `flex-shrink: 0`) |
| `app-workspace-pane` | 3 (`workspace-pane` → tabs → `button`) | `:host` + `.workspace-pane` flex column `height: 100%` | **hidden** on `:host` and `.workspace-pane` | — | — | **Yes** / **Yes** |
| `app-workspace-pane-header` | 1 (child only) | — | — | — | **Entire component is pass-through** | `display: block` only — **missing both** |
| `app-pane-header` | 3 (`pane-header` → controls) | `.pane-header` flex; absolute leading/close | `.pane-header__title` **hidden** (ellipsis) | `.pane-header` **relative**; leading/close **absolute** + **transform** | `pane-header__leading` | **Missing both** |
| `app-workspace-pane-toolbar` | 3 | `.workspace-pane-toolbar` width/padding | — | — | `app-workspace-toolbar` forced `display: contents` | **Missing both** |
| `app-pane-toolbar` | 3 (`pane-toolbar` → slot divs) | `.pane-toolbar` flex; `__left` flex 1 | — | — | Empty center/right slots | **Missing both** |
| `app-workspace-toolbar` | 3 (+ portaled `app-dropdown-shell` sibling) | `.workspace-toolbar` flex | Context menu list **auto** (in grid SCSS, not here) | Fixed-position dropdown via shell | — | `display: contents` — **N/A** |
| `app-projects-dropdown` | 4+ (via `app-standard-dropdown`) | `:host` **min-height** calc; `.projects-list` **height 18rem** | `.projects-list` **overflow-y: auto** | — | — | **Missing** (`display: block`) |
| `app-workspace-selected-items-grid` | 4 (`thumbnail-grid` → `app-item-grid` → wrapper `motion` → `app-media-item`) | `.thumbnail-grid` width; `.thumbnail-grid__cards` grid/flex | `:host` **overflow-y: scroll**; context menu **auto** | — | **Unstyled wrapper `motion`** around each cell | **min-height: 0** only — **missing min-width: 0** |
| `app-workspace-pane-footer` | 3 (+ dialogs) | Summary/actions flex | — | Dialog **fixed**, **z-index 500–501** | `display: contents` on host | N/A (`display: contents`) |
| `app-pane-footer` | 2 | `.pane-footer` sticky flex | — | **sticky** bottom, **z-index 1** | `pane-footer__spacer` | **Missing both** |
| `app-media-detail-view` | 4 (`detail-main-column` → `detail-scroll` → `detail-content` → sections) | `:host` flex column; `.detail-main-column`; `.detail-content` grid | `:host` **hidden**; `.detail-scroll` **auto**; loading column **hidden** | Mobile `:host` **fixed inset 0**, **z-index 500** | `.detail-section` wrappers | **Yes** / **Yes** |
| `app-image-detail-header` | 4 (`detail-header` + menu) | Uses **parent** `.detail-header` in `media-detail-view.component.scss` | — | Context menu fixed via `app-dropdown-shell` | — | No own SCSS (`:host` unset) |
| `app-media-detail-media-viewer` | 4 (`detail-image-container` → wrap → `app-universal-media`) | Duplicated `.detail-image-*` rules in own SCSS + parent | `.detail-image-wrap` **hidden** | `.detail-image-container` **relative**; edit btn **absolute z-index 2**; thumb **transform** | — | `display: block` — **missing both** |
| `app-image-detail-inline-section` | 6+ (rows, tag editor, dropdown) | Parent `.detail-row`, `.detail-tags` | Tag dropdown listbox **auto** | Row actions **absolute** + **transform**; dropdown **z-index 300** | Duplicate copy buttons per row | No own `:host` rules |
| `app-captured-date-editor` | 4 (`editor` → `grid` → `button` day) | `.captured-date-editor` 16rem card | — | Popover card (parent positions with **z-index 300** on row) | — | Token vars only — **missing both** |
| `app-address-search` | 4 | `__input-wrap` flex | — | `:host` **relative**; results **absolute z-index 300** | — | **Missing both** |
| `app-metadata-section` | 4 | `:host` flex column | Suggestions **auto** | Suggestions **absolute z-index 300** | `.metadata-row-wrap` block wrapper | **Missing both** |
| `app-metadata-property-row` | 3 (`meta-row`) | `.meta-row` grid | value **hidden** ellipsis | Actions **absolute** + **transform** | — | No `:host` block |
| `app-detail-actions` | 2 | `:host` flex column, border-top | — | — | — | **Missing both** |
| `app-group-tab-bar` | 4 | `.group-tab-bar` flex | **overflow-x: auto** | — | `.group-tab-bar-root` `display: contents` | Not used |
| `app-sorting-controls` | 2 | flex row | — | — | — | Not used |
| `app-editable-property-row` | 3 | `.prop-row` grid | ellipsis | — | — | Not used |

### Composed tree depth (component boundaries + DOM)

**A. Layout host → grid thumbnail `img` (typical selected-items path)**

```
app-workspace-pane-shell (:host display:contents)
  section.workspace-pane-shell
    app-workspace-pane
      div.workspace-pane
        app-workspace-pane-header → app-pane-header → …
        div.workspace-pane__tabs → button
        app-workspace-pane-toolbar → div → app-pane-toolbar → div.pane-toolbar__left → …
        app-workspace-selected-items-grid
          div.thumbnail-grid
            app-item-grid
              div (hover wrapper, no class)
                app-media-item
                  app-media-display
                    div.media-display__viewport
                      div.media-display__layer--content
                        img
```

**Approx. 13–14 DOM element/component steps** from `section.workspace-pane-shell` to `img` (excluding `app-nav` / map). From `app-workspace-pane` host only: **~11** to `img`.

**B. Layout host → media detail deepest UI**

```
… app-workspace-pane → app-media-detail-view
  div.detail-main-column
    div.detail-scroll
      app-image-detail-inline-section
        div.detail-row.detail-row--editing
          app-captured-date-editor
            div.captured-date-editor
              div.captured-date-editor__grid
                button.captured-date-editor__day
```

**~14–15** to calendar day button; **~14–16** through `app-media-detail-media-viewer` → `app-universal-media` internal asset layers.

---

## Problems found

1. **Triple clipping stack (desktop):** `workspace-pane-shell` (`overflow: hidden`) → `app-workspace-pane` `:host` (`overflow: hidden`) → `.workspace-pane` (`overflow: hidden`). Scroll is delegated to children (`thumbnail-grid` host scroll, `detail-scroll`), making overflow ownership hard to reason about and debug.

2. **Redundant header adapter:** `app-workspace-pane-header` only forwards inputs/outputs to `app-pane-header` with `display: block` and no added behavior — extra component boundary and flex child without `min-height/min-width: 0`.

3. **Double toolbar shells:** `app-workspace-pane-toolbar` → `div.workspace-pane-toolbar` → `app-pane-toolbar` → three slot divs → `app-workspace-toolbar` (`display: contents`). Four layers to host one horizontal flex row.

4. **Orphan components in tree folder:** `app-group-tab-bar`, `app-sorting-controls`, `app-editable-property-row` — increase navigation noise; sorting/tab patterns duplicated by workspace tabs + dropdown sort.

5. **Split / duplicated media-detail styling:** `media-detail-view.component.scss` + `part2.scss` (~1,100+ lines) shared by `app-image-detail-header` and `app-image-detail-inline-section` via `styleUrls` pointing at parent files; `media-detail-media-viewer` duplicates `.detail-image-*` blocks. Changes require guessing which file owns a selector.

6. **Intermediate wrapper violations:** Ungstyled `div` wrappers around each thumbnail (`mouseenter`/`contextmenu` only) add a flex/grid child with no documented role; `metadata-row-wrap` wraps `app-metadata-property-row` with only `display: block`.

7. **Stacking context competition:** Mobile detail `z-index: 500` on `app-media-detail-view`; footer dialogs `500–501`; shell sheet `100`; drag-divider `1`; many popovers `300` — no single pane-level layer map.

8. **Multiple scroll owners:** `app-workspace-selected-items-grid` scrolls on `:host`; `detail-scroll` scrolls inside detail; `projects-list` scrolls inside dropdown; context menus scroll — easy to get nested-scroll / wheel trap bugs.

9. **`min-width: 0` gaps on flex children:** `app-workspace-selected-items-grid`, `app-pane-header`, `app-workspace-pane-toolbar`, `app-metadata-section`, `app-pane-footer`, `app-media-detail-media-viewer`, etc. violate flex-child host rule from `AGENTS.md` (only `app-workspace-pane` and `app-media-detail-view` clearly comply).

10. **Detail layout complexity:** Five-column CSS grid on `.detail-content` with absolutely positioned row actions extending into negative margins — high coupling; mobile breakpoint strips rails but desktop remains fragile.

11. **Duplicate bulk-action dialogs:** Export/project/address/share dialogs implemented in both `workspace-pane-footer` and `workspace-selected-items-grid` — parallel dialog stacks and z-index surfaces.

12. **`display: contents` overuse:** `workspace-pane-shell`, `workspace-toolbar`, `workspace-pane-footer` host — complicates DevTools inspection and obscures which element owns flex participation.

---

## Proposed simplified structure

### Target architecture (fewer boundaries, same behavior)

```text
app-workspace-pane-shell
  app-drag-divider
  section.workspace-pane-shell
    app-workspace-pane                    // merge header + pane-header
      header.pane-header                  // inline, no app-workspace-pane-header
      nav.workspace-pane__tabs
      [detail | grid | upload]
        grid: toolbar.workspace-toolbar   // drop pane-toolbar wrapper; single flex row
               scroll.thumbnail-grid      // scroll on one div, not :host
               footer.pane-footer          // sticky, one dialog owner
        detail: app-media-detail-view      // slim coordinator
               header / scroll / footer    // 3 regions max inside detail
               fields block                // merge inline-section rows + metadata list
               viewer block                // single SCSS owner for image area
```

### Merge / remove candidates

| Action | Saves |
| --- | --- |
| Remove `app-workspace-pane-header`; use `app-pane-header` directly in `workspace-pane` template | 1 component, 1 host |
| Collapse `app-workspace-pane-toolbar` + `app-pane-toolbar`; template: single `motion` toolbar row | 2 components, 2–3 DOM levels |
| Delete orphans: `group-tab-bar`, `sorting-controls`, `editable-property-row` | 3 components |
| Move hover/context handlers to `app-media-item` or `app-item-grid`; drop per-cell wrapper `div` | 1 DOM level × N cells |
| Consolidate `media-detail-view` SCSS into one file; child components own only deltas | Cognitive + duplicate rules |
| Single dialog service/owner for selection export actions (footer OR grid, not both) | Duplicate modal layers |
| One scroll container per tab: `.workspace-pane__body` with `flex:1; min-height:0; overflow-y:auto` | Clearer overflow than triple `hidden` |

### Simplified depth budget

| Path | Current (approx.) | Simplified (approx.) |
| --- | ---: | ---: |
| Shell → thumbnail `img` | 13–14 | **9–10** |
| Shell → detail field control | 14–16 | **10–12** |
| Components under `workspace-pane/` | 22 (20 live) | **14–16** |

---

## Recommendation

### Fix first (highest leverage, lowest risk)

1. **Establish a single scroll + overflow owner** per tab: add `workspace-pane__body` with `flex:1; min-height:0; overflow-y:auto`; remove redundant `overflow:hidden` from one of shell/pane layers.
2. **Remove pass-through header** (`app-workspace-pane-header`) and wire `app-pane-header` in `workspace-pane.component` directly.
3. **Flatten toolbar stack** to `workspace-toolbar` + optional padding wrapper (drop `app-pane-toolbar` unless center/right slots are needed soon).
4. **Delete orphan components** (`group-tab-bar`, `sorting-controls`, `editable-property-row`) after confirming no dynamic import.
5. **Add `min-width: 0`** to flex/grid child hosts called out above (especially `app-workspace-selected-items-grid`).

### Next (structural)

6. **Merge media-detail styles** — one owner file; `image-detail-header` / `inline-section` import a shared partial, not full parent `styleUrls`.
7. **Deduplicate selection dialogs** between footer and grid.
8. **Document z-index layer map** for pane (shell / sticky footer / detail overlay / popovers).

### Defer / spec-first

9. Rewriting detail rows to eliminate 5-column grid + absolute rails (needs visual-behavior spec update).
10. Replacing workspace tabs + toolbar sort with one navigation model (product decision).

---

## Appendix: file inventory (`workspace-pane/`)

| Area | Files read |
| --- | --- |
| Shell | `shell/workspace-pane.*`, `shell/workspace-pane-shell.*`, `shell/drag-divider/*` |
| Chrome | `chrome/pane-header.*`, `chrome/workspace-pane-header/*`, `chrome/workspace-pane-toolbar/*`, `chrome/group-tab-bar.*` |
| Toolbar | `toolbar/workspace-toolbar/*`, `toolbar/sorting-controls.*`, `projects-dropdown.*` |
| Grid / footer | `selected-items/workspace-selected-items-grid.*`, `footer/workspace-pane-footer/*` |
| Media detail | `media-detail/**` (all templates + SCSS; helpers/types noted, not line-audited) |
| Layout host | `layout/authenticated-app-layout.component.html|scss` |

*Report only — no code changes.*

---

## Refactor execution — 2026-05-19

All 4 steps executed in order. Each step was followed by a passing `ng build` before proceeding.

### Step 1 — Deleted orphan/pass-through components ✅

- **Deleted** `chrome/workspace-pane-header/` (both `.ts` + `.scss`) — pure pass-through with no added logic.
- **Replaced** `<app-workspace-pane-header>` in `workspace-pane.component.html` with `<app-pane-header>` directly (identical inputs/outputs).
- **Updated** `workspace-pane.component.ts` import: `WorkspacePaneHeaderComponent` → `PaneHeaderComponent`.
- **Deleted** `chrome/group-tab-bar.component.ts` + `.scss` (orphan — no references outside its own file).
- **Deleted** `toolbar/sorting-controls.component.ts` + `.scss` (orphan — same).
- **Deleted** `media-detail/editable-property-row.component.ts` + `.html` + `.scss` (orphan — same).

**Component count before:** 22 (20 live, 2 orphaned per audit). After step 1: 17 (16 live, 1 dead folder removed).

### Step 2 — Flattened toolbar stack ✅

- **Deleted** `chrome/workspace-pane-toolbar/workspace-pane-toolbar.component.ts` + `.scss`.
- **Replaced** `<app-workspace-pane-toolbar />` in `workspace-pane.component.html` with `<app-workspace-toolbar />` directly.
- **Updated** `workspace-pane.component.ts` import: `WorkspacePaneToolbarComponent` → `WorkspaceToolbarComponent`.
- **Transferred** `.workspace-pane-toolbar` padding/sizing (`width: min(60rem, 100%); margin-inline: auto; padding: var(--spacing-2) var(--spacing-4); flex-shrink: 0`) to `workspace-toolbar.component.scss` `:host`, changing it from `display: contents` to `display: block`.
- **Kept** `shared/pane-toolbar/` unchanged — `app-pane-toolbar` is used by `projects-toolbar` and `media` components outside workspace-pane.

Toolbar depth reduced from 4 layers (workspace-pane-toolbar → pane-toolbar → 3 slot divs → workspace-toolbar) to 1 (workspace-toolbar directly).

### Step 3 — Fixed overflow/scroll ownership ✅

In `workspace-pane.component.scss`:
- `:host { overflow: hidden }` → `overflow: visible`
- `.workspace-pane { overflow: hidden }` → `overflow: visible`

Triple clipping reduced to single clip on `workspace-pane-shell` (intentional, for mobile sheet animation). Each tab's content component remains its own scroll owner (`overflow-y: scroll` on `app-workspace-selected-items-grid` `:host`; `.detail-scroll` inside `app-media-detail-view`).

### Step 4 — Added missing `min-width: 0` / `min-height: 0` ✅

Added to `:host` in 8 flex/grid child components that were missing them per the audit:

| Component | Added |
| --- | --- |
| `app-workspace-selected-items-grid` | `min-width: 0` |
| `app-pane-header` | `min-height: 0; min-width: 0` |
| `app-pane-footer` | `min-height: 0; min-width: 0` |
| `app-media-detail-media-viewer` | `min-height: 0; min-width: 0` |
| `app-metadata-section` | `min-height: 0; min-width: 0` |
| `app-detail-actions` | `min-height: 0; min-width: 0` |
| `app-address-search` | `min-height: 0; min-width: 0` |
| `app-captured-date-editor` | `display: block; min-height: 0; min-width: 0` |

### Final build result

`ng build` passed after every step, and passed clean at the end. Only pre-existing CommonJS ESM warnings present (leaflet, jszip, qrcode, heic2any) — no new warnings or errors.

### Component count summary

| | Before | After |
| --- | ---: | ---: |
| Components defined under `workspace-pane/` | 22 | **15** |
| Pass-through / redundant wrapper boundaries live in tree | ≥4 | **0** |
| Layers from `.workspace-pane` root to `app-workspace-toolbar` | 4 | **1** |
| `overflow: hidden` clip layers (shell + pane) | 3 | **1** |

### Not touched (deferred per plan)

- Media-detail SCSS split / deduplication
- Dialog deduplication (footer vs grid)
- Z-index layer map
- 5-column grid detail rows
- `shared/pane-toolbar/` (kept — used externally)
