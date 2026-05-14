# Phase 6 — Template BEM Sweep & Toggle Unification

**Status:** In Progress (2026-05-14)

**Goal:** Zero `ui-*` class names in any Angular template. Every toggle cluster uses `hlmToggleGroup` / `hlmToggleGroupItem` (no hand-rolled BEM for group chrome). Toolbar actions use `hlmBtn` with explicit variants. `apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts` is removed once nothing binds legacy `ui-*` classes.

**Prerequisites:** Phase 5 callsite migration substantially complete (HLM imports, dialogs, switches). Phase 6 is intentionally **template + directive surface only**; token deletion and global primitive SCSS removal are **Phase 7** and **Phase 8** respectively.

**Out of scope here:** Replacing `var(--color-*)` in component SCSS (Phase 7), deleting `styles/primitives/*.scss` (Phase 8), swapping local spartan shims for published helm packages (Phase 9).

---

## Current global load order (context)

`apps/web/src/styles.scss` (top of file, before Tailwind):

- `@use './styles/tokens'` — legacy palette + **CDK overlay prebuilt** import (must relocate before `tokens.scss` deletion in Phase 7).
- `@use './styles/reset'`, `./styles/layout/app'`, `./styles/layout/clamp'`.
- `@use './styles/primitives/container'`, `row-shell`, `card-shell` — global BEM still backing some `ui-*` templates until this phase finishes.
- `@use './app/shared/ui/toggle-group/hlm-toggle-group'` — pill/toggle group shell until CVA + directives own visuals.

After Phase 6, templates must not depend on `ui-*` directive bindings; Phase 8 then deletes the primitive SCSS that only existed for those classes.

---

## Pre-flight scan (run before first edit; paste results into §Baseline)

Run from repository root. On Windows PowerShell, prefer **single-quoted** patterns so `[]` and `"` do not break parsing.

```bash
rg 'class="[^"]*ui-' apps/web/src/app --glob "*.html" -l
rg 'hlm-toggle-group\b' apps/web/src/app --glob "*.html" -l
rg 'ui-button--active|ui-button--ghost|ui-button--secondary' apps/web/src/app --glob "*.html"
rg '\bui-' apps/web/src/app --glob "*.html" -l
rg 'hlm-toggle-group__|hlm-pill-toggle__' apps/web/src/app --glob "*.html"
```

Optional: count lines for burn-down charts.

```bash
rg '\bui-' apps/web/src/app --glob "*.html" -c
```

### Baseline snapshot (2026-05-14, informational)

Re-run before execution; numbers drift.

| Scan | Result (approx.) |
|------|-------------------|
| Templates with `\bui-` | **24** files under `apps/web/src/app` (includes auth, media, projects, workspace, dropdowns, etc.) |
| `ui-button--active\|ghost\|secondary` in HTML | **2** hits (`projects-page`, `media-empty`) — extend search for `ui-button` without suffix |
| SCSS `var(--color-*)` in `apps/web/src/app` | **51** files — **Phase 7**, not blocking template cleanup except where templates and SCSS must move together |
| `hlm-toggle-group__*` / `hlm-pill-toggle__*` in HTML | Multiple callsites (`upload-panel`, `settings-overlay`, `workspace-toolbar`, `projects-toolbar`, `projects-view-toggle`, `map-shell`, `media`) — remove BEM strings per acceptance criteria |

**`styles/primitives/` inventory (2026-05-14):** `container.scss`, `row-shell.scss`, `card-shell.scss`, `dropdown-trigger.scss` — first three align with `ui-container` / `ui-row-shell` / `ui-card-shell`; `dropdown-trigger.scss` is tracked in Phase 8 for deletion or relocation if unused.

---

## Work items (strict order)

### 1. Toggle groups — directive wiring (7 callsites)

**Callsites (canonical list):** `settings-overlay`, `projects-toolbar`, `workspace-toolbar`, `media`, `upload-panel`, `map-shell`, `projects-view-toggle`.

**Per callsite:**

1. On the **group container** `div`, add **`hlmToggleGroup`** and remove string classes like `hlm-toggle-group`, `hlm-pill-toggle`, unless they are **documented size/layout modifiers** only (no `__element` BEM).
2. On each **segment `button`**, add **`hlmToggleGroupItem`**; remove `hlm-toggle-group__item`, `hlm-pill-toggle__item`, etc.
3. Replace icon/label chrome: prefer **Tailwind utilities** on `span` children or **slots** documented on the directive, not `hlm-toggle-group__icon` / `__label` / `__item--icon-only` strings in templates.
4. For **attention** / **inactive strip** patterns (`upload-panel`, `projects-toolbar`), either:
   - lift styling into **component SCSS** with a single geometry owner + `data-state`, or
   - extend the **toggle-group CVA** with named variants (spec + design-system check required) — avoid reintroducing BEM strings in HTML.

**Exit:** `rg 'hlm-toggle-group__|hlm-pill-toggle__' apps/web/src/app --glob "*.html"` → zero hits (wrapper-only `hlm-pill-toggle` / size modifiers allowed if they contain **no** `__` BEM).

### 2. Toolbar buttons — `hlmBtn`

**Files:** `media.component.html`, `workspace-toolbar.component.html`, `projects-toolbar.component.html` (and any other toolbar cluster surfaced by pre-flight).

- Replace `ui-button`, `ui-button--ghost`, `ui-button--sm`, `ui-button--secondary` with **`hlmBtn`** + `variant` / `size` inputs matching local CVA.
- Remove `[class.ui-button--active]`; use **`[attr.data-state]`** on the host or a single visual owner per component spec (no boolean sprawl for visuals).

### 3. `ui-container` → Tailwind layout

**Targets:** `nav`, `account`, auth pages (`login`, `register`, `reset-password`, `update-password`), `workspace-pane` shell wrappers.

- Map each `ui-container` usage to explicit **`flex` / `grid` / `max-w-*` / `gap-*`** utilities (or a **feature-local layout class** in that component’s SCSS if the pattern repeats many nodes — still no global `ui-container`).

### 4. `ui-item` / `ui-item-media` / `ui-item-label` → flex utilities

**Targets:** `nav`, `upload-panel-item`, `project-select-dialog` (+ any others from scan).

- One row = `flex items-center gap-*`; media slot = `shrink-0`; label column = `min-w-0` + truncation as needed.

### 5. `ui-row-shell` → component-local row classes

**Targets:** `media-detail-inline-section`, `metadata-property-row`, `editable-property-row`, `projects-table-view`.

- Define **one row geometry owner** per component (SCSS `@layer components`), not a global primitive.

### 6. `ui-card-shell` → `hlmCard`

**Targets:** `project-card` (and any scan hits).

- Use **`hlmCard`**, `hlmCardHeader`, `hlmCardContent` (or the project’s established card pattern) instead of `ui-card-shell`.

### 7. `ui-chip` → `hlmBadge`

**Targets:** `quick-info-chips` (+ scan).

- Replace `ui-chip` with **`hlmBadge`** + variant/size.

### 8. `ui-input-control` remnants → `hlmInput`

**Targets:** `workspace-pane-footer`, `filter-dropdown`.

- Ensure form controls use **`hlmInput`** / **`hlmFormField`** per registry; no `ui-input-control` class string.

### 9. `ui-spacer` → `flex-1`

**Targets:** `nav` (+ scan).

- Prefer **`flex-1`** (or `grow`) on the flex child that should absorb free space.

### 10. Delete `ui-primitives.directive.ts` and verify build

1. `rg` gates below → zero.
2. Remove **`ui-primitives.directive.ts`** and any **barrel / module** references.
3. `cd apps/web && npx ng build`
4. From repo root: `npm run design-system:check`

---

## Molecules Audit

Molecules = app-level components composed from multiple atoms. Every molecule must use `hlm*` atoms internally and Tailwind for layout — no `ui-*` class names.

| Molecule | File | Uses ui-* | Target |
|---|---|---|---|
| Project card | `features/projects/project-card.component.html` | `ui-card-shell` | `hlmCard` |
| Search dropdown item | `features/map/search-bar/search-dropdown-item.component.html` | `ui-*` | Tailwind + `hlmBadge` |
| Upload panel item | `features/upload/upload-panel-item.component.html` | `ui-item`, `ui-item-media`, `ui-item-label` | component classes + Tailwind |
| Project select dialog item | `shared/project-select-dialog/project-select-dialog.component.html` | `ui-item` | `flex items-center gap-3` |
| Filter dropdown | `shared/dropdown-trigger/filter-dropdown.component.html` | `ui-input-control` | `hlmInput` |
| Workspace pane footer | `shared/workspace-pane/footer/workspace-pane-footer/workspace-pane-footer.component.html` | `ui-input-control` | `hlmInput` |
| Quick-info chips | `shared/quick-info-chips/quick-info-chips.component.html` | `ui-chip` | `hlmBadge` |
| Media empty | `features/media/media-empty.component.html` | `ui-button--secondary` | `hlmBtn variant="outline"` |
| Projects empty / page | `features/projects/projects-page.component.html` | `ui-button--secondary` | `hlmBtn variant="outline"` |

All of the above are covered by Phase 6 work items 4–9. This table is the acceptance checklist — every row must have zero `ui-*` hits before Phase 6 is marked complete.

### shared/ui/ molecules (already correct)
These use CVA + `host: { '[class]' }` — no action needed:
- `hlmCard` / `hlmCardHeader` / `hlmCardContent` / `hlmCardFooter` / `hlmCardTitle` / `hlmCardDescription`
- `hlmFormField` / `hlmFormFieldError` / `hlmFormFieldHint`
- `hlmDialogContent` / `hlmDialogHeader` / `hlmDialogFooter` / `hlmDialogTitle` / `hlmDialogDescription`
- `hlmTabsList` / `hlmTabsTrigger` / `hlmTabsContent`
- `hlmPopover`
- `hlmMenuContent` / `hlmMenuItem` / `hlmMenuSeparator` / `hlmMenuLabel`

---

## Risk notes

- **Toggle inactive / “fake” items** (`projects-toolbar`): ensure **no nested interactive** elements and **keyboard** parity when moving markup from BEM divs to directives + plain layout.
- **Map / media toolbars:** icon-only hit targets must stay **≥ 44px** where the spec requires it; `hlmBtn` `size="icon"` may differ from legacy — track against `open-questions.md` item on icon sizing.
- **i18n:** any **visible** label change (not just CSS) requires translation pipeline updates per project rules.

---

## Acceptance criteria

| Gate | Command / condition |
|------|---------------------|
| No legacy `ui-*` classes in templates | `rg 'ui-item|ui-container|ui-row-shell|ui-card-shell|ui-chip|ui-button|ui-spacer|ui-badge|ui-input-control' apps/web/src/app --glob "*.html"` → **zero** hits |
| No BEM leakage for helm toggle in HTML | `rg 'hlm-toggle-group__|hlm-pill-toggle__' apps/web/src/app --glob "*.html"` → **zero** hits |
| Build | `cd apps/web && npx ng build` → exit **0** |
| Design system | `npm run design-system:check` → exit **0** |

---

## Definition of done

- All acceptance criteria green.
- `docs/MIGRATION_PLAN.md` status for Phase 6 flipped to **Done** with date.
- Phase 7 pre-flight token scan re-run and attached to `phase-7-token-migration.md` §Baseline.

## Phase 6 Post-patches

These structural fixes were identified after Phase 6 acceptance gates passed.

### Settings overlay nav item layout (2026-05-14)
- **Problem:** Section nav items (General, Appearance, etc.) show icon + title + subtitle mixed horizontally instead of stacking label area vertically.
- **Fix:** Added `flex flex-col min-w-0 flex-1` to label wrapper in `settings-overlay.component.html`; `.settings-overlay__section-item` SCSS confirmed `flex items-center gap-3`.
- **Status:** [ ] Fixed

### Settings overlay toggle groups (tracked in Phase 7)
- **Problem:** Language/density/theme toggles look broken — `--muted` token resolves incorrectly until Phase 7 token migration completes.
- **Fix:** Will resolve automatically after Phase 7 `var(--color-*)` → tweakcn migration.
- **Status:** [ ] Blocked on Phase 7

### Settings overlay shell padding (tracked in Phase 10)
- **Problem:** No consistent inner padding on overlay surface; no proper card shell wrapping sections.
- **Fix:** Full settings overlay visual pass in Phase 10 Visual QA after tokens are clean.
- **Status:** [ ] Planned for Phase 10

### Settings overlay full audit (2026-05-14)

| Area | Issue | Fix | Phase |
|------|--------|-----|-------|
| Shell | `settings-overlay__lead-divider` has no stretch height and sits outside the flex shell — hairline does not render | Restructure overlay layout or remove the node | 6-patch / 10 |
| Shell | Overlay root uses `padding: 0` while migration called out inconsistent inner padding | Define uniform inset or document column-only padding | 10 |
| Shell | `app-account` has no `settings-overlay__detail-card` wrapper unlike other sections | Match other sections or document exception | 6-patch / 10 |
| Rail | Active state uses legacy `var(--color-clay)` mixes | Phase 7 token migration + Phase 10 theme QA | 7 / 10 |
| Toggle groups | Directive wiring OK; visual issues are token-related (`--muted` not resolving) | Phase 7 then Phase 10 matrix | 7 / 10 |
| Toggle groups | `data-i18n-skip` only on language segmented wrapper, not density/theme/marker | Align across all clusters | 6-patch |
| Form rows | `uiRangeControl` on search radius + cache retention range inputs (legacy primitive) | Replace with supported range pattern; unblocks primitive deletion | 6-patch / 8 |
| Switch rows | Row `<button>` lacks explicit `aria-pressed` / `role="switch"` while `hlmSwitch` is decorative | Add ARIA semantics on row | 10 |
| Tokens | `var(--color-*)` throughout `settings-overlay.component.scss` and `invite-management-section.component.scss` | Phase 7 mapping to tweakcn | 7 |
| Invite | `bg-card` utility overridden by SCSS `var(--color-bg-elevated)` — mixed token eras | Single surface owner after token migration | 7 / 10 |
| Invite | `invite-section__select` may double-style `hlmSelect` (local chrome + directive) | Consolidate to one owner | 6-patch / 10 |
| Invite | Spinner `800ms` hardcoded animation duration | Map to motion token or document waiver | 10 |

**Phase 10 Visual QA (settings overlay):** lead divider visibility; pane/close padding; account card parity; three-theme check for rail, segmented controls, switches, invite QR/link; mobile field + invite layouts; a11y for switch rows; confirm `uiRangeControl` gone.
