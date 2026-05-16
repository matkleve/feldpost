# Phase 6 — Template BEM Sweep & Toggle Unification

**Status:** In Progress (2026-05-16 snapshot)

**Goal:** Zero legacy **`ui-*` hyphenated class tokens** in any Angular template (Gate A). Every toggle cluster uses `hlmToggleGroup` / `hlmToggleGroupItem` (no hand-rolled BEM for group chrome). Toolbar actions use `hlmBtn` with explicit variants. **`apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts` — deleted (2026-05-16).** **Gate B:** zero residual **`uiCamelCase`** attribute directives in HTML templates (**2026-05-16** — was `uiDropdownTrigger`; replaced by **`hlmBtn`** + per-toolbar menu-trigger classes in Phase 5 Group D).

**Prerequisites:** Phase 5 callsite migration substantially complete (HLM imports, dialogs, switches). Phase 6 is intentionally **template + directive surface only**; token deletion and global primitive SCSS removal are **Phase 7** and **Phase 8** respectively.

**Out of scope here:** Replacing `var(--color-*)` in component SCSS (Phase 7), deleting `styles/primitives/*.scss` (Phase 8), swapping local spartan shims for published helm packages (Phase 9).

---

## Current global load order (context)

`apps/web/src/styles.scss` (top of file, before Tailwind) — **2026-05-16:**

- `@use './styles/reset'`, `./styles/layout/app`, `./styles/layout/clamp`.
- `@use './app/shared/ui/toggle-group/hlm-toggle-group'` — toggle group shell until CVA + directives own visuals.
- **CDK overlay:** `@import "@angular/cdk/overlay-prebuilt.css"` (inline; not via deleted `tokens.scss`).
- **Tailwind v4** `@import "tailwindcss"` + `@config` bridge.
- **Legacy bridge:** `@include meta.load-css('styles/legacy-design-tokens')` after tweakcn `:root` (Phase 7 replaces this body).

`styles/primitives/` **folder empty (2026-05-16)** after **`dropdown-trigger.scss`** deletion with Group D; the monolithic **`ui-primitives.directive.ts`** shim file is **removed (2026-05-16)**. Chevron / open-state rules for toolbar menu triggers live in **`media.component.scss`**, **`projects-toolbar.component.scss`**, and **`workspace-toolbar.component.scss`**.

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

### Baseline snapshot (2026-05-16, re-scanned)

Re-run before execution; numbers drift.

| Scan | Result |
|------|--------|
| Templates whose `class="…"` value contains substring `ui-` | `rg 'class="[^"]*ui-' apps/web/src/app --glob "*.html" -l` → **0** files |
| Templates with `\bui-` (hyphenated `ui-…`) | `rg '\bui-' apps/web/src/app --glob "*.html" -l` → **2** files: `panel-trigger.component.html`, `popover.component.html` — matches only **`@see docs/specs/component/ui-primitives/...`** comment paths (**no** `class="…ui-…"` markup). |
| `ui-button--active\|ghost\|secondary` in HTML | `rg 'ui-button--active\|ui-button--ghost\|ui-button--secondary' apps/web/src/app --glob "*.html"` → **0** hits |
| Kebab `hlm-toggle-group` token in HTML (class strings) | `rg 'hlm-toggle-group\b' apps/web/src/app --glob "*.html" -l` → **0** files (toggle markup uses **`hlmToggleGroup`** / **`hlmToggleGroupItem`** directives, not `hlm-toggle-group` literals) |
| SCSS `var(--color…)` in `apps/web/src/app` (`*.scss`) | `rg 'var\(--color' apps/web/src/app --glob "*.scss" -l` → **0** files (Phase 7 may still cover other legacy `var(--*` tokens) |
| `hlm-toggle-group__*` / `hlm-pill-toggle__*` in HTML | `rg 'hlm-toggle-group__\|hlm-pill-toggle__' apps/web/src/app --glob "*.html"` → **0** hits |
| Gate B — `uiCamelCase` directives in HTML | `rg '\bui[A-Z][a-zA-Z]*\b' apps/web/src/app --glob "*.html" -l` → **0** files (**2026-05-16**, post–Group D) |

**`styles/primitives/` inventory (2026-05-16):** **empty directory** — `dropdown-trigger.scss` **deleted** with **`UiDropdownTriggerDirective`** (Group D). No remaining global primitive SCSS under `styles/primitives/`.

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
- **Status (2026-05-16):** `ui-row-shell` / `uiRowShell` **cleared** from templates; global `row-shell.scss` removed. **Redesign backlog (do not lose):** IA/a11y follow-ups in [`docs/archive/design-notes/media-detail-metadata-layout-redesign-2026-05.md`](../archive/design-notes/media-detail-metadata-layout-redesign-2026-05.md).

### 6. `ui-card-shell` → `hlmCard`

**Targets:** `project-card` (and any scan hits).

- Use **`hlmCard`**, `hlmCardHeader`, `hlmCardContent` (or the project’s established card pattern) instead of `ui-card-shell`.

### 7. `ui-chip` → `hlmBadge`

**Targets:** `quick-info-chips` (+ scan).

- Replace `ui-chip` with **`hlmBadge`** + variant/size.

### 8. `ui-input-control` / `uiInputControl*` remnants → `hlmInput`

**Targets:** `filter-dropdown`, `workspace-pane-footer` (zip dialog field), `search-bar`, `upload-panel`, `media-detail-*` — clear any host still carrying **`uiInputControl`** / **`uiInputControlCompact`** in templates (Gate B); **`editable-property-row`** uses **`hlmInput`** / **`hlmSelect`** only.

- Ensure form controls use **`hlmInput`** / **`hlmFormField`** per the [component registry index](../specs/component/registry.md) and linked **`registry.*.supplement.md`** tables; legacy `ui-primitives.directive.ts` **removed** (2026-05-16).

### 9. `ui-spacer` → `flex-1`

**Targets:** `nav` (+ scan).

- Prefer **`flex-1`** (or `grow`) on the flex child that should absorb free space.

### 10. ~~Delete `ui-primitives.directive.ts`~~ **Done (2026-05-16)**

1. **Gate A**, helm-toggle BEM rows → zero (see **Acceptance criteria**).
2. **`ui-primitives.directive.ts`** removed; **`rg "from ['\"].*ui-primitives/ui-primitives\\.directive" apps/web/src -l`** → **0**.
3. `cd apps/web && npx ng build` → **0**
4. From repo root: `npm run design-system:check` → **0**

**Follow-up:** Future **`BrnMenu` / `BrnMenuTrigger`** adoption may replace **`DropdownShellComponent`** positioning — not a template **Gate B** concern.

---

## Molecules Audit

Molecules = app-level components composed from multiple atoms. Every molecule must use `hlm*` atoms internally and Tailwind for layout — no legacy **`ui-*` class strings** in HTML (Gate A). **`ui-primitives.directive.ts` removed (2026-05-16).** **Gate B:** no **`uiCamelCase`** directives remain in templates (**2026-05-16**).

| Molecule | File | Legacy `ui-*` classes / attrs (2026-05-16) | Target |
|---|---|---|---|
| Project card | `features/projects/project-card.component.html` | — | — |
| Search dropdown item | `features/map/search-bar/search-dropdown-item.component.html` | — | — |
| Upload panel item | `features/upload/upload-panel-item.component.html` | — | — |
| Project select dialog | `shared/project-select-dialog/project-select-dialog.component.html` | — | — |
| Filter dropdown | `shared/dropdown-trigger/filter-dropdown.component.html` | — | — |
| Workspace pane footer | `shared/workspace-pane/footer/workspace-pane-footer/workspace-pane-footer.component.html` | — | — |
| Quick-info chips | `shared/quick-info-chips/quick-info-chips.component.html` | — | — |
| Media empty | `features/media/media-empty.component.html` | — | — |
| Projects page | `features/projects/projects-page.component.html` | — | — |

All of the above are covered by Phase 6 work items 4–9. **Gate A** must be zero for completion of the template BEM sweep; **§10** shim file deletion **done (2026-05-16)**. **Gate B** satisfied (**2026-05-16**) after Phase 5 **Group D** cleared toolbar **`uiDropdownTrigger`**.

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
| **Gate A — Legacy `ui-*` class substrings** in templates (hyphenated tokens in markup: `ui-item`, `ui-input-control`, `ui-button`, …). Does **not** match **`uiCamelCase`** attribute directives (`uiInputControl`, `uiDropdownTrigger`, `[uiInlineEditRow]`, …). | `rg 'ui-item|ui-container|ui-row-shell|ui-card-shell|ui-chip|ui-button|ui-spacer|ui-badge|ui-input-control' apps/web/src/app --glob "*.html"` → **zero** hits |
| **Gate B — Residual `uiCamelCase` in HTML templates** | `rg '\bui[A-Z][a-zA-Z]*\b' apps/web/src/app --glob "*.html" -l \| wc -l` → **0** (**2026-05-16**). Prior residual was **`uiDropdownTrigger`** only — cleared via **`hlmBtn`** + `*__menu-trigger` classes (**Phase 5 Group D**). |
| No BEM leakage for helm toggle in HTML | `rg 'hlm-toggle-group__|hlm-pill-toggle__' apps/web/src/app --glob "*.html"` → **zero** hits |
| Build | `cd apps/web && npx ng build` → exit **0** |
| Design system | `npm run design-system:check` → exit **0** |

**Closure:** **Gate A** + helm-toggle BEM + **Gate B** + build + design-system = Phase 6 **template BEM sweep** acceptance rows. **`ui-primitives.directive.ts`** deletion (**§10**) **complete (2026-05-16)**. **`uiDropdownTrigger` / `UiDropdownTriggerDirective`** removed **2026-05-16** (Group D).

---

## Definition of done

- Gate A, helm-toggle BEM leakage, build, and design-system rows above are green.
- **`ui-primitives.directive.ts`** removed (**§10**, **2026-05-16**).
- **Gate B** → **zero** residual **`uiCamelCase`** in templates (**2026-05-16**, Group D). Flip Phase 6 **Done** in `docs/migration/README.md` when remaining narrative checklist (post-patches, optional QA) is intentionally closed.
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
| Form rows | Search radius + cache retention use `<input type="range" hlmInput>` (`UiRangeControlDirective` removed). | Any remaining work is track/thumb sizing and token alignment — Phase 7 tokens + Phase 10 visual QA. | 7 / 10 |
| Switch rows | Row `<button>` lacks explicit `aria-pressed` / `role="switch"` while `hlmSwitch` is decorative | Add ARIA semantics on row | 10 |
| Tokens | `var(--color-*)` throughout `settings-overlay.component.scss` and `invite-management-section.component.scss` | Phase 7 mapping to tweakcn | 7 |
| Invite | `bg-card` utility overridden by SCSS `var(--color-bg-elevated)` — mixed token eras | Single surface owner after token migration | 7 / 10 |
| Invite | `invite-section__select` may double-style `hlmSelect` (local chrome + directive) | Consolidate to one owner | 6-patch / 10 |
| Invite | Spinner `800ms` hardcoded animation duration | Map to motion token or document waiver | 10 |

**Phase 10 Visual QA (settings overlay):** lead divider visibility; pane/close padding; account card parity; three-theme check for rail, segmented controls, switches, invite QR/link; mobile field + invite layouts; a11y for switch rows; range sliders (`hlmInput` + `type="range"`) track/thumb and value readout across themes.
