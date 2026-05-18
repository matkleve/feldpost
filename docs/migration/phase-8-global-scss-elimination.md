# Phase 8 — Global SCSS Elimination

**Status:** **Wave P3** ([migration README](./README.md#next-wave-post-recovery-queue--2026-05-18)) — In progress (2026-05-17) — **§6 shipped:** global **`hlm-toggle-group.scss`** retired (**`pillToggleVariants`** + **`[hlmPillToggle]`** / **`HlmPillToggleDirective`**; no toggle-group **`@use`** in **`styles.scss`**). **§7 Path A shipped:** pierced Leaflet map rules in **`_map-shell-leaflet-global.scss`** (**`app-map-shell`** scope). **§7 `styles/` tree inventory closed (2026-05-18)** — **six** top **`@use`** lines + **`meta.load-css('styles/typography-baseline')`** only (**seven** partials on disk under **`apps/web/src/styles/`**; see §7 **Inventory** paragraph). **§8 gates** green on last doc slice (`ng build`, `design-system:check`; no map-shell **`anyComponentStyle`** warning). **Still open:** **`styles`** initial-chunk monitoring + dead-selector hygiene (map-shell SCSS when touched); Phase **10** “global SCSS risk” sign-off (DoD). **`::ng-deep`** in **`apps/web/src/app/**/*.scss`** — **0** matches after **2026-05-18** hygiene slice (was **4** in **3** files; see §Open proof). **`@include meta.load-css('styles/legacy-design-tokens')`** **removed (2026-05-18)** — **`apps/web/src/styles/_legacy-design-tokens.scss` deleted from tree** (Batch 50 zero-emit gate + follow-up removal; verify **`apps/web/src/styles/`** partial list). **`typography-baseline`** still uses **`meta.load-css`** after **`@layer base`** (Sass order constraint unchanged).

**Goal:** `apps/web/src/styles.scss` contains only the **minimal global stack**: Tailwind v4 entry (`@import "tailwindcss"`), **CDK overlay** import (relocated in Phase 7), **tweakcn** `:root` / `[data-theme="dark"]` / `[data-theme="sandstone"]` variable blocks, **`@theme inline`**, **`@layer base`** reset/body rules, **`@layer utilities`** small additions, and **typography baseline** for headings/links as required by project rules. **No** global BEM primitives for removed `ui-*` patterns. **No** global **`hlm-toggle-group.scss`** — segmented pill **row/column shell**, **`--hlm-toggle-item-*`** density, and reduced-motion clamps for the shell live in **`toggle-group-variants.ts`** (`pillToggleVariants`, `toggleGroupVariants`) and **`HlmPillToggleDirective`** (`hlmPillToggle` on caller wrappers); map-shell vertical chrome that pierces **`[hlmToggleGroup*]`** stays in **`_map-shell-style-switch.scss`**.

---

## Preconditions

- Phase 6: zero `ui-*` in templates; `ui-primitives.directive.ts` removed.
- Phase 7: `tokens.scss` deleted; no `var(--color-*|fp-sys|fp-ref)` in component SCSS; legacy alias block in `styles.scss` removed or verified unused.

**Related (anchored toolbar UI)**

- [Anchored UI (toolbar menus)](./README.md#anchored-ui-toolbar-menus) in the migration index — naming (**toolbar menu** / **menu panel** vs informal “dropdown” / library **Popover**), two-layer padding (trigger vs panel), regression checklist.
- [Toolbar menus & naming](../glossary.md#toolbar-menus--naming) in the glossary.

---

## Pre-flight scan (paste into §Baseline)

```bash
rg '\.ui-container|\.ui-item|\.ui-row-shell|\.ui-card-shell' apps/web/src/styles --glob "*.scss"
rg 'hlmPillToggle|hlmToggleGroup' apps/web/src/app --glob "*.html" -l
test ! -d apps/web/src/styles/primitives && echo "primitives: absent (OK)" || ls apps/web/src/styles/primitives/
rg "@use '\./styles/primitives/" apps/web/src/styles.scss
rg "hlm-toggle-group" apps/web/src/styles.scss
```

**`styles/primitives/` (2026-05-16):** **Removed** from disk after last primitive deletion (Group D); acceptance remains **empty or deleted**. ~~Prior inventory (2026-05-14):~~ `container.scss`, `row-shell.scss`, `card-shell.scss`, `dropdown-trigger.scss` — all gone.

**Progress (2026-05-16):** **Deduped** focus/disabled globals against **CVA** (§6). **`hlm-toggle-group.scss`** co-located at **`apps/web/src/app/shared/ui/toggle-group/hlm-toggle-group.scss`**; **`styles.scss`** **`@use './app/shared/ui/toggle-group/hlm-toggle-group'`** (global `@layer components` + reduced-motion unchanged). Removed **`apps/web/src/styles/hlm-toggle-group.scss`**. **`@layer states`** removed from **`hlm-toggle-group.scss`** — **hover** (off segments), **`data-attention`**, and **`motion-reduce`** segment behavior moved to **`toggle-group-variants.ts`** (CVA / Tailwind).

---

## Work items (ordered)

### 1. Confirm Phase 6 complete

Run Phase 6 acceptance `rg` gates. If any `ui-*` remains in templates, **stop** — deleting primitives will break layout.

**Progress (2026-05-16, slice — §1 Phase 6 gates):** From repo root — **`rg 'class="[^"]*ui-' apps/web/src/app --glob "*.html" -l'`** → **0** files (Gate A). **`rg '\bui[A-Z][a-zA-Z]*\b' apps/web/src/app --glob "*.html" -l'`** → **0** files (Gate B). Phase 8 pre-flight: **`styles/primitives/`** absent; **no** `.ui-container|…` in `apps/web/src/styles/**/*.scss`; **`styles.scss`** has **no** `@use './styles/primitives/…'`; segmented toggles use **`hlmPillToggle`** + **`hlmToggleGroup`** on the **seven** known callsites (settings, toolbars, upload, map-shell, media, view-toggle).

### 2. Remove container primitive

**Status (2026-05-16):** **Superseded** — `styles/primitives/` removed with primitive teardown; `container.scss` no longer exists.

1. Delete `@use './styles/primitives/container'` from `styles.scss`.
2. Delete `apps/web/src/styles/primitives/container.scss`.
3. `ng build` + `design-system:check`.

### 3. Remove row-shell primitive

**Status (2026-05-16):** **Superseded** — same as §2; `row-shell.scss` gone.

1. Delete `@use './styles/primitives/row-shell'`.
2. Delete `row-shell.scss`.
3. Gates.

### 4. Remove card-shell primitive

**Status (2026-05-16):** **Superseded** — same as §2; `card-shell.scss` gone.

1. Delete `@use './styles/primitives/card-shell'`.
2. Delete `card-shell.scss`.
3. Gates.

### 5. ~~`dropdown-trigger.scss`~~ **Deleted (2026-05-16)**

- File **removed** with **`UiDropdownTriggerDirective`** (Phase 5 Group D); chevron / open rules moved to **`media.component.scss`**, **`projects-toolbar.component.scss`**, **`workspace-toolbar.component.scss`**. No `@use` remained in `styles.scss`.

### 6. Toggle group global SCSS

1. [x] Confirm **CVA** on `hlmToggleGroup` / `hlmToggleGroupItem` covers selected / hover / focus-visible / disabled.
2. [x] Strip **state** rules from `hlm-toggle-group.scss`; keep only **documented** pill shell / density if still needed.
3. [x] End state: **delete** `apps/web/src/app/shared/ui/toggle-group/hlm-toggle-group.scss` and remove `@use './app/shared/ui/toggle-group/hlm-toggle-group'` from `styles.scss` **if** all visuals live in CVA strings or component `@layer states`.

**Progress (2026-05-16, slice):** Removed **duplicate** global `:focus-visible` and `:disabled` rules for `[hlmToggleGroupItem]` — **CVA** (`toggle-group-variants.ts`) already applies `focus-visible:ring-*` and `disabled:*`.

**Progress (2026-05-16, slice — hover / attention / motion):** Deleted **`@layer states`** from **`hlm-toggle-group.scss`**. **CVA** now carries **`data-[state=off]:hover:*`**, **`data-[attention=true]:data-[state=off]:*`** (chart-2 text + 1px mix ring), and **`motion-reduce:transition-none`** on group + item hosts. Global sheet retains **`@layer components`** (pill shell / density / vertical radii) and the **`prefers-reduced-motion`** block for shell + group + item duration clamp.

**Progress (2026-05-16, slice — co-location):** **`hlm-toggle-group.scss`** source file moved from **`apps/web/src/styles/`** to **`apps/web/src/app/shared/ui/toggle-group/`** (same `@use` from `styles.scss`, new path **`./app/shared/ui/toggle-group/hlm-toggle-group`**). **`styles/hlm-toggle-group.scss`** removed.

**Progress (2026-05-17, slice — §6 shipped):** **Deleted** **`apps/web/src/app/shared/ui/toggle-group/hlm-toggle-group.scss`**. Removed **`@use './app/shared/ui/toggle-group/hlm-toggle-group'`** from **`apps/web/src/styles.scss`**. Added **`pillToggleVariants`** + **`pillToggleSizeStyle`** and **`HlmPillToggleDirective`** (`selector: '[hlmPillToggle]'`); **`HLM_TOGGLE_GROUP_IMPORTS`** includes the pill directive. Templates migrated off **`hlm-pill-toggle*`** classes. Proof: **`rg "hlm-toggle-group" apps/web/src/styles.scss`** → **0**; **`rg "hlm-pill-toggle" apps/web/src/app --glob "*.html"`** → **0**. Map-shell style switch keeps **`_map-shell-style-switch.scss`** pierced rules (no **`[vertical]`** on **`hlmPillToggle`** there — avoids duplicate item-radius utilities).

### 7. Inventory remaining `styles/` tree

**Keep (expected):** `reset.scss`, `map-leaflet-host.scss` (Leaflet map chrome), `_map-shell-keyframes.scss` (hoisted map-shell marker/upload/GPS **`@keyframes`**), **`_map-shell-leaflet-global.scss`** (Leaflet-injected marker / overlay DOM for MapShell — **`app-map-shell { … }`** scope, Path A), `layout/app.scss`, `layout/clamp.scss`, `_typography-baseline.scss` (headings + default anchors after Preflight).

**Review:** any other `@use` from `styles.scss` not listed above — justify or delete. **`meta.load-css`** for **`typography-baseline`** remains; order constraint (**typography** after **`@layer base`**) is documented in the **§7 `load-css` + reset review** progress slice. Legacy bridge **`load-css`** removed **2026-05-18**; **`_legacy-design-tokens.scss`** **removed from tree** (no stub on disk).

**Inventory (2026-05-18):** `apps/web/src/styles.scss` top **`@use`** set is **`./styles/map-leaflet-host`**, **`./styles/reset`**, **`./styles/layout/app`**, **`./styles/layout/clamp`**, **`./styles/map-shell-keyframes`**, **`./styles/map-shell-leaflet-global`** (Path A — pierced Leaflet rules; **`app-map-shell`** scope); **`meta.load-css`** pulls **`styles/typography-baseline`** only (source **`apps/web/src/styles/_typography-baseline.scss`**). **`_legacy-design-tokens.scss`** is **absent** from **`apps/web/src/styles/`** — **not** **`load-css`**. No stray **`primitives/*`**, **`tokens`**, or **`hlm-toggle-group`** `@use`.

**Progress (2026-05-17, slice — `styles.scss` @use / `@import` hygiene):** **No dead lines removed** — each top **`@use`** / required **`@import`** is load-order–critical (see file header comment block). **`apps/web/src/styles/`** holds **seven** partials; each is referenced from **`styles.scss`** via **`@use`** or **`meta.load-css`** only — **no** extra disk files without a **`styles.scss`** hook. **`rg` proof (partial stems + templates):** `rg 'map-leaflet-host|styles/reset|layout/app|layout/clamp|map-shell-keyframes|map-shell-leaflet-global' apps/web/src --glob '*.{scss,ts,html}'` → hits **`styles.scss`**, **`_map-shell-keyframes.scss`**, **`_map-shell-leaflet-global.scss`** only (cross-refs between hoisted keyframes / Path A partial). **`rg 'content-clamp' apps/web/src --glob '*.html'`** → non-zero ( **`layout/clamp`** used). **`rg "router-outlet" apps/web/src/styles/layout/app.scss`** → **`layout/app`** (full-height outlet stack). **`rg 'hlmPillToggle|hlmToggleGroup' apps/web/src/app --glob '*.html' -l`** → **seven** feature/shared templates (segmented pattern live; no global sheet).

**Progress (2026-05-16, slice — typography baseline partial):** **`h1`–`h6`** and default **`a`** rules moved from inline **`styles.scss`** into **`apps/web/src/styles/_typography-baseline.scss`**, included **after** **`@layer base`** via **`@include meta.load-css('styles/typography-baseline')`** so output order stays **Tailwind Preflight → baseline** (same constraint as top-of-file **`@use`** would violate).

**Progress (2026-05-16, slice — map host partial):** Leaflet focus / link overrides moved out of **`reset.scss`** into **`apps/web/src/styles/map-leaflet-host.scss`** (map surface chrome). **`styles.scss`** **`@use './styles/map-leaflet-host'`** before **`reset`** so output order stays Leaflet-first then document reset. **`layout/app.scss`:** removed dead **`@keyframes ui-spin`** (no `animation: ui-spin` callsites).

**Progress (2026-05-16, slice — §7 `load-css` + reset review):** Documented non-`@use` global emits: ~~**`@include meta.load-css('styles/legacy-design-tokens')`**~~ **removed 2026-05-18** — bridge partial **deleted** from tree after Batch **50** zero-emit gate (no **`:root`** from that path). **`@include meta.load-css('styles/typography-baseline')`** → **`apps/web/src/styles/_typography-baseline.scss`** (after **`@layer base`** / Preflight). **`reset.scss`:** **`html, body`** **`font-family`** now uses **`var(--font-sans)`** with system fallbacks (removes hardcoded **Inter** drift from tweakcn **DM Sans**).

**Progress (2026-05-16, slice — §7 inventory / dead-code):** Removed duplicate **`.content-clamp--default`** from **`styles/layout/clamp.scss`** (same **`max-width`** as base **`.content-clamp`**; no template callsites). Removed unused **`--content-clamp-max`** from the legacy bridge when it still existed (**`styles/_legacy-design-tokens.scss`** — file since deleted). **`docs/design/design-system/layout-width-breakpoint-scale.md`:** variants / required-use text aligned with base + **`--text`** / **`--list`** only.

**Progress (2026-05-16, slice — §7 layout/app):** Removed global **`.focus-ring-primary:focus-visible`** from **`styles/layout/app.scss`**; equivalent **`focus-visible:outline-2`**, **`focus-visible:outline-solid`**, **`focus-visible:outline-primary`**, **`focus-visible:outline-offset-2`** on the two callsites (**`captured-date-editor.component.html`**, **`quick-info-chips.component.html`**) so focus chrome stays token-aligned without a global helper class.

**Progress (2026-05-16, slice — `.focus-ring-primary` verification):** **`rg 'focus-ring-primary' apps/web/src`** → **0** matches (no class string, no SCSS selector). **`styles/layout/app.scss`** contains **no** focus-ring helper. Remaining repo **`focus-ring`** strings are **token** names (**`--interactive-focus-ring`** on **`_typography-baseline.scss`** since **Phase 7 Batch 47**, and per-component **`:focus-visible`** **box-shadow**), not the removed global utility. **Phase 7 Batch 31** removed the separate **`--shadow-focus-ring`** bridge row; **Batch 45** removed **`--shadow-focus`** from the legacy bridge; **Batch 47** removed **`--interactive-focus-ring`** from **`_legacy-design-tokens.scss`** entirely. **No template/SCSS edits** this slice.

**Progress (2026-05-16, slice — map-shell SCSS dedup):** Merged duplicate **`:host .map-style-switch [hlmToggleGroupItem]`** blocks in **`map-shell.component.scss`** into one rule (same computed styles; trims bytes toward **`anyComponentStyle`** budget). **Files:** **`apps/web/src/app/features/map/map-shell/map-shell.component.scss`**.

**Progress (2026-05-17, pre–Path A):** Co-located partials (**`gps-placement`**, **`layout`**, etc.), **hoisted `@keyframes`** to **`_map-shell-keyframes.scss`**, **dead `photo-panel` removal**, and **`anyComponentStyle`** trims landed in **`map-shell.component.scss`** + **`styles.scss`**; intermediate pierced-marker splits (**`_map-shell-photo-markers.scss`**, **`_map-shell-photo-marker-states.scss`**, **`_map-shell-radius-location-markers.scss`**) were **superseded** by Path A and those files are **gone from disk**.

**Progress (2026-05-17, Path A — map-shell Leaflet global hoist):** Leaflet pierced rules (**`:host ::ng-deep`** reach) are **centralized** in **`apps/web/src/styles/_map-shell-leaflet-global.scss`** and **`@use`**’d from **`apps/web/src/styles.scss`** immediately after **`map-shell-keyframes`**. Selectors sit under **`app-map-shell { … }`** so scope matches the **`app-map-shell`** host subtree (same intent as prior emulated encapsulation). **`@keyframes`** for marker pulse / spotlight remain in **`_map-shell-keyframes.scss`** (**`@see`** targets in that file point at **`_map-shell-leaflet-global.scss`** and remaining component partials). **Deleted** (rules absorbed globally, not lost): **`apps/web/src/app/features/map/map-shell/_map-shell-photo-markers.scss`**, **`_map-shell-photo-marker-states.scss`**, **`_map-shell-radius-location-markers.scss`**. **Remaining** map-shell component **`@use`** chain: **`map-shell-context-menu`**, **`map-shell-style-switch`**, **`map-shell-upload`**, **`map-shell-gps-placement`**, **`map-shell-layout`** — see **`map-shell.component.scss`**.

**Budget / bundle (2026-05-17, `cd apps/web && npx ng build`, production):** **`anyComponentStyle`** — **no** Angular budget warning (thresholds in **`angular.json`**: **12 kB** warning / **20 kB** error per component stylesheet). Earlier slices in this doc logged MapShell-heavy emitted CSS **~15–18 kB** over the **12 kB** warning before hoists. **Trade-off:** weight moved into the global **`styles`** CSS artifact — build output **`styles-*.css` | styles | 93.01 kB** raw (**~13.14 kB** estimated transfer). *(Not a pure Path A delta:* an archived snapshot lists **`styles-*.css` 54.22 kB** (`docs/archive/audits/route-chunk-audit-2026-03-24.md`, 2026-03-24); many **`styles.scss`** changes landed between snapshots.)

**Global bundle monitoring — `styles` initial chunk (2026-05-17, doc slice):** Production **`ng build`** prints an **Initial chunk files** table; the row whose **Names** column is **`styles`** is the combined global stylesheet emitted from **`angular.json` → `build.options.styles`** (currently **`leaflet.css`** + **`src/styles.scss`**, so Leaflet base + app globals including **`_map-shell-leaflet-global.scss`**). **Path A** specifically grows this row when pierced map rules leave component encapsulation — **`anyComponentStyle`** stays quiet, so this row is the primary regression signal for “hoist absorbed too much / duplicated selectors”.

- **Local / CI — capture the line (raw + estimated transfer):**
  ```bash
  cd apps/web && npx ng build 2>&1 | rg 'styles-[A-Z0-9]+\.css \| styles'
  ```
  Example shape: `styles-XXXXXXXX.css | styles | 92.29 kB | 13.14 kB` (hash and sizes drift with content).

- **Wider context (optional):** `npx ng build 2>&1 | rg -n 'Initial chunk files|styles-[A-Z0-9]+\.css \| styles'` prints the table header line number plus the **`styles`** row.

- **`angular.json` budgets today:** Production **`budgets`** only define **`initial`** (entire initial JS/CSS bundle budget) and **`anyComponentStyle`** (per-component extracted CSS). There is **no** dedicated budget entry that isolates the **`styles`** CSS file alone; until one exists, **log scraping** (command above), occasional manual comparison to this doc’s baseline note, or a small custom CI parser on **`ng build`** stdout are the practical monitors.

- **Repo CI note:** `.github/workflows/design-system-check.yml` runs **`npm run design-system:check`** only — it does **not** run **`ng build`**. Any future workflow that adds **`ng build`** can append the **`rg`** line as a non-gating log artifact or gate on a max **raw** size if the team wants an automated ceiling.

**Budget options (doc-only, `angular.json`):** With Path A clearing **`anyComponentStyle`** pressure for map-shell, prefer **dead-selector audits** and further **hoists** before raising **`maximumWarning`** / **`maximumError`** on **`anyComponentStyle`**.

### 8. Final gates

**Progress (2026-05-16, slice):** **`npm run design-system:check`** (registry + panel MQ audit + visual-behavior guard) and **`cd apps/web && npx ng build`** → **exit 0** (Angular build warnings included **`anyComponentStyle`** on map-shell and CommonJS deps — pre–Path A).

**Progress (2026-05-17, post–Path A gates):** **`npm run design-system:check`** and **`cd apps/web && npx ng build`** → **exit 0**; **`anyComponentStyle`** budget warning **not** emitted (CommonJS-only warnings remain).

**Progress (2026-05-17, slice — §7 global `styles` chunk monitoring doc):** Shipped runbook for reading the **`styles`** initial-chunk row from **`ng build`**, Path A vs **`anyComponentStyle`** regression split, **`angular.json`** budget limits, and CI gap (**`design-system-check`** vs **`ng build`**). **Files:** **`docs/migration/phase-8-global-scss-elimination.md`**.

```bash
cd apps/web && npx ng build
npm run design-system:check
```

---

## Acceptance criteria

| Gate | Condition |
|------|-----------|
| `styles/primitives/` | **Empty** or directory **deleted** |
| `styles.scss` `@use` block | **`map-leaflet-host`** (Leaflet map chrome), **`reset`**, **`layout/app`**, **`layout/clamp`**, **`map-shell-keyframes`** (hoisted map-shell animations), **`map-shell-leaflet-global`** (Path A — pierced Leaflet marker/overlay rules, **`app-map-shell`** scope), **`meta`** for **`load-css`** (**`typography-baseline`** only) — **no** `primitives/*`, **no** `tokens`, **no** `hlm-toggle-group` |
| `hlm-toggle-group.scss` | **Deleted** — pill shell + density + reduced-motion live in **`toggle-group-variants.ts`** + **`HlmPillToggleDirective`**; segment states remain **CVA** on **`hlmToggleGroup`** / **`hlmToggleGroupItem`** |
| Build / DS | `ng build` and `npm run design-system:check` → **0** |

**Acceptance checklist (DoD mirror, 2026-05-17):**

- [x] `styles/primitives/` absent or deleted
- [x] `styles.scss` top `@use` matches table (incl. **`map-shell-leaflet-global`**); no `primitives/*`, `tokens`, or `hlm-toggle-group` `@use`; no **`meta.load-css('styles/legacy-design-tokens')`**
- [x] `hlm-toggle-group.scss` deleted; pill shell + density + motion-safe transitions in **`toggle-group-variants.ts`** + **`[hlmPillToggle]`**
- [x] Build / design-system gates → exit 0 (post–Path A slice in §8)

---

## Definition of done

- [x] Acceptance table + checklist above green.
- [x] §6 toggle-group global SCSS retired (**CVA** + **`[hlmPillToggle]`**; no global sheet).
- [x] §7 Path A: Leaflet pierced rules hoisted to **`_map-shell-leaflet-global.scss`** (**`app-map-shell`** scope).
- [x] **`styles.scss`** without **`@include meta.load-css('styles/legacy-design-tokens')`** — **shipped 2026-05-18** (bridge file later **deleted** from **`apps/web`**; **`typography-baseline`** still requires **`meta.load-css`** after **`@import "tailwindcss"`** + **`@layer base`** — mid-file **`@use`** remains invalid Sass for that slot; see **`phase-7-token-migration.md`** § **Legacy bridge `meta.load-css` — historical constraints** and **`apps/web/src/styles.scss`** header).
- [x] Phase 9 may **plan** in parallel; package upgrade execution still blocked per Phase 9 upstream note.
- [ ] Phase 10 checklist: “global SCSS risk” sign-off (Phase 10).

## Open (remaining weight)

- **Wave P3 hygiene slice (2026-05-18, `::ng-deep` elimination + `rg` proof):** **`rg '::ng-deep' apps/web/src/app --glob '*.scss'`** → **0** matches (post-slice). **Prior state:** **4** matches in **3** files — eliminated without new pierces (Phase 10: **no new** **`::ng-deep`**).

  | Selector / concern | Proof | Change |
  | --- | --- | --- |
  | **`upload-panel-item`** pierce to **`.universal-media__slot` / `__asset`** | **`rg 'class="upload-panel__universal-media"' apps/web/src/app/features/upload/upload-panel-item.component.html`** → host is **`app-universal-media`**; **`rg 'universal-media__slot' apps/web/src/app/shared/media/universal-media.component.html`** → slot defaults already **`width/height: 100%`**, **`overflow: hidden`** in **`universal-media.component.scss`**. | **`::ng-deep`** block removed; host sets **`--universal-media-slot-radius: var(--radius-sm)`** (inherits into child template). |
  | **`media-detail-media-viewer`** pierce to **`.universal-media__asset`** | **`rg 'universal-media__asset' apps/web/src/app/shared/media/universal-media.component.html`** → **`img.universal-media__asset`**; custom properties inherit from **`.detail-image-wrap*`** on ancestor **`<button>`**. | **`::ng-deep`** replaced by **`--universal-media-asset-filter` / `--universal-media-asset-transform`** on **`.detail-image-wrap--thumb-preview`** / **`--static`**; **`universal-media.component.scss`** wires **`filter` / `transform`** (+ existing dimension vars) on **`.universal-media__asset`**. |
  | **`workspace-selected-items-grid`** pierce to **`.map-context-menu .map-context-menu__items`** | **`rg 'map-context-menu' apps/web/src/app/shared/workspace-pane/selected-items/workspace-selected-items-grid.component.html`** → **`app-dropdown-shell`** + inner **`div.map-context-menu__items`** in **same** template; **`DropdownShellComponent`** template is **`<ng-content />`** only — projected nodes keep **parent** encapsulation attributes. | **`:host .map-context-menu .map-context-menu__items`** without **`::ng-deep`**. |
  | **`styles`** initial-chunk row (P3 gate run **2026-05-18**) | **`cd apps/web && npx ng build 2>&1 \| rg 'styles-[A-Z0-9]+\.css \| styles'`** | **`styles-3OGI4DEA.css | styles | 80.87 kB | 11.64 kB`** (raw **−0.57 kB** / transfer **−0.19 kB** vs prior §Open row **`81.44 kB` / `11.83 kB`**; hash drift only). |
  **Dead selectors:** **deferred** this slice — no **`map-shell*.scss`** / global map partial edits; orphan **`rg`** proof stays on the §7 runbook hook when map SCSS is next touched. **`apps/web/src/styles/_map-shell-leaflet-global.scss`** line **1** — comment text **`was :host ::ng-deep`** only (not a pierce).
- **Phase 7 legacy bridge file** — **`apps/web/src/styles/_legacy-design-tokens.scss`** **removed from tree**; inventory + proof live in **`docs/migration/phase-7-token-migration.md`**, **`tokens.md`**, **`token-layers.md`**. **`typography-baseline`** **`load-css`** ordering constraints unchanged (**`phase-7-token-migration.md`** § **Legacy bridge `meta.load-css` — historical constraints**; **`apps/web/src/styles.scss`** header).
- **Phase 10** — unchecked DoD sign-off line above.

### Next levers (suggested sequencing)

- ~~Drop **`@include meta.load-css('styles/legacy-design-tokens')`**~~ **Done (2026-05-18)** — bridge partial **deleted** from **`apps/web`** (no on-disk stub).
- Keep **`styles`** initial-chunk size + dead-selector hygiene under review after hoists (§7 runbook).
- Close Phase 10 “global SCSS risk” sign-off when the team is ready.

