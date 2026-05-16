# Phase 8 — Global SCSS Elimination

**Status:** Planned (**hard-blocked** until Phase 6 template gates and Phase 7 token migration are complete)

**Goal:** `apps/web/src/styles.scss` contains only the **minimal global stack**: Tailwind v4 entry (`@import "tailwindcss"`), **CDK overlay** import (relocated in Phase 7), **tweakcn** `:root` / `[data-theme="dark"]` / `[data-theme="sandstone"]` variable blocks, **`@theme inline`**, **`@layer base`** reset/body rules, **`@layer utilities`** small additions, and **typography baseline** for headings/links as required by project rules. **No** global BEM primitives for removed `ui-*` patterns. Toggle-group global sheet (`hlm-toggle-group.scss`) **co-located** under `app/shared/ui/toggle-group/` and **`@use`’d** from `styles.scss` until **deleted** or reduced to **zero** `@layer states` rules (segment hover / attention / focus / disabled live in **CVA**; global file keeps pill shell geometry, density tokens, and reduced-motion shell overrides).

---

## Preconditions

- Phase 6: zero `ui-*` in templates; `ui-primitives.directive.ts` removed.
- Phase 7: `tokens.scss` deleted; no `var(--color-*|fp-sys|fp-ref)` in component SCSS; legacy alias block in `styles.scss` removed or verified unused.

---

## Pre-flight scan (paste into §Baseline)

```bash
rg '\.ui-container|\.ui-item|\.ui-row-shell|\.ui-card-shell' apps/web/src/styles --glob "*.scss"
rg 'hlm-toggle-group|hlm-pill-toggle' apps/web/src/app --glob "*.html" -l
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

### 2. Remove container primitive

1. Delete `@use './styles/primitives/container'` from `styles.scss`.
2. Delete `apps/web/src/styles/primitives/container.scss`.
3. `ng build` + `design-system:check`.

### 3. Remove row-shell primitive

1. Delete `@use './styles/primitives/row-shell'`.
2. Delete `row-shell.scss`.
3. Gates.

### 4. Remove card-shell primitive

1. Delete `@use './styles/primitives/card-shell'`.
2. Delete `card-shell.scss`.
3. Gates.

### 5. ~~`dropdown-trigger.scss`~~ **Deleted (2026-05-16)**

- File **removed** with **`UiDropdownTriggerDirective`** (Phase 5 Group D); chevron / open rules moved to **`media.component.scss`**, **`projects-toolbar.component.scss`**, **`workspace-toolbar.component.scss`**. No `@use` remained in `styles.scss`.

### 6. Toggle group global SCSS

1. Confirm **CVA** on `hlmToggleGroup` / `hlmToggleGroupItem` covers selected / hover / focus-visible / disabled.
2. Strip **state** rules from `hlm-toggle-group.scss`; keep only **documented** pill shell / density if still needed.
3. End state: **delete** `apps/web/src/app/shared/ui/toggle-group/hlm-toggle-group.scss` and remove `@use './app/shared/ui/toggle-group/hlm-toggle-group'` from `styles.scss` **if** all visuals live in CVA strings or component `@layer states`.

**Progress (2026-05-16, slice):** Removed **duplicate** global `:focus-visible` and `:disabled` rules for `[hlmToggleGroupItem]` — **CVA** (`toggle-group-variants.ts`) already applies `focus-visible:ring-*` and `disabled:*`.

**Progress (2026-05-16, slice — hover / attention / motion):** Deleted **`@layer states`** from **`hlm-toggle-group.scss`**. **CVA** now carries **`data-[state=off]:hover:*`**, **`data-[attention=true]:data-[state=off]:*`** (chart-2 text + 1px mix ring), and **`motion-reduce:transition-none`** on group + item hosts. Global sheet retains **`@layer components`** (pill shell / density / vertical radii) and the **`prefers-reduced-motion`** block for shell + group + item duration clamp.

**Progress (2026-05-16, slice — co-location):** **`hlm-toggle-group.scss`** source file moved from **`apps/web/src/styles/`** to **`apps/web/src/app/shared/ui/toggle-group/`** (same `@use` from `styles.scss`, new path **`./app/shared/ui/toggle-group/hlm-toggle-group`**). **`styles/hlm-toggle-group.scss`** removed.

### 7. Inventory remaining `styles/` tree

**Keep (expected):** `reset.scss`, `map-leaflet-host.scss` (Leaflet map chrome), `layout/app.scss`, `layout/clamp.scss`, `_typography-baseline.scss` (headings + default anchors after Preflight).

**Review:** any other `@use` from `styles.scss` not listed above — justify or delete. **`meta.load-css`** emits are inventoried below; order constraints (**legacy** after tweakcn **`:root`**, **typography** after **`@layer base`**) are documented in the **§7 `load-css` + reset review** progress slice.

**Inventory (2026-05-16):** `apps/web/src/styles.scss` **`@use`** set is **`./styles/map-leaflet-host`**, **`./styles/reset`**, **`./styles/layout/app`**, **`./styles/layout/clamp`**, **`./app/shared/ui/toggle-group/hlm-toggle-group`**; **`meta.load-css`** pulls **`styles/legacy-design-tokens`** and **`styles/typography-baseline`** (source **`apps/web/src/styles/_typography-baseline.scss`**). No stray **`primitives/*`** or **`tokens`** references.

**Progress (2026-05-16, slice — typography baseline partial):** **`h1`–`h6`** and default **`a`** rules moved from inline **`styles.scss`** into **`apps/web/src/styles/_typography-baseline.scss`**, included **after** **`@layer base`** via **`@include meta.load-css('styles/typography-baseline')`** so output order stays **Tailwind Preflight → baseline** (same constraint as top-of-file **`@use`** would violate).

**Progress (2026-05-16, slice — map host partial):** Leaflet focus / link overrides moved out of **`reset.scss`** into **`apps/web/src/styles/map-leaflet-host.scss`** (map surface chrome). **`styles.scss`** **`@use './styles/map-leaflet-host'`** before **`reset`** so output order stays Leaflet-first then document reset. **`layout/app.scss`:** removed dead **`@keyframes ui-spin`** (no `animation: ui-spin` callsites).

**Progress (2026-05-16, slice — §7 `load-css` + reset review):** Documented non-`@use` global emits: **`@include meta.load-css('styles/legacy-design-tokens')`** → **`apps/web/src/styles/_legacy-design-tokens.scss`** (Phase 7 bridge; must stay **`load-css`** after tweakcn **`:root`** so `--fp-*` / legacy **`--color-*`** aliases resolve over semantic tokens). **`@include meta.load-css('styles/typography-baseline')`** → **`apps/web/src/styles/_typography-baseline.scss`** (after **`@layer base`** / Preflight). **`reset.scss`:** **`html, body`** **`font-family`** now uses **`var(--font-sans)`** with system fallbacks (removes hardcoded **Inter** drift from tweakcn **DM Sans**).

### 8. Final gates

```bash
cd apps/web && npx ng build
npm run design-system:check
```

---

## Acceptance criteria

| Gate | Condition |
|------|-----------|
| `styles/primitives/` | **Empty** or directory **deleted** |
| `styles.scss` `@use` block | **`map-leaflet-host`** (Leaflet map chrome), **`reset`**, **`layout/app`**, **`layout/clamp`** (+ **`hlm-toggle-group`** until deleted), **`meta`** for **`load-css`** ( **`legacy-design-tokens`**, **`typography-baseline`** ) — **no** `primitives/*`, **no** `tokens` |
| `hlm-toggle-group.scss` | **Deleted**, or file exists with **no** `@layer states` / selector-driven segment states (**hover**, **data-attention**, focus, disabled) — those live in **CVA**; **OK** if **`@layer components`** (pill shell) + **`prefers-reduced-motion`** clamp remain |
| Build / DS | `ng build` and `npm run design-system:check` → **0** |

---

## Definition of done

- Acceptance table green.
- Phase 9 can start **planning** in parallel but package upgrade execution remains blocked per Phase 9 upstream note.
- Phase 10 checklist gets a “global SCSS risk” sign-off line.
