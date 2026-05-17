# Phase 7 — Token System Unification

**Status:** In progress (2026-05-17) — **Batch 8:** app SCSS — success/warning UI no longer proxies through **`var(--chart-1|2)`**; uses tweakcn **`var(--success)`** / **`var(--warning)`** (`styles.scss` `:root` + dark mixin). **Batch 7:** `_legacy-design-tokens.scss` — derivative tokens (shadows, borders, interaction, action/menu/field/section/state aliases) now use **tweakcn `var(--primary|destructive|border|…)`** directly instead of **`var(--color-*)` hops**; **`--color-*` bridge definitions** retained for Tailwind `@theme` / downstream until alias removal gate. **Batch 1 (2026-05-16):** cleared **`var(--fp-*)`** from **`panel-trigger`** + **`chip`** → **`var(--spacing-*)`** (`apps/web/tailwind.config.js` spacing scale). **Batch 2:** rewired **`_legacy-design-tokens.scss`** internal chains (**`--fp-sys-spacing-*`**, **`--fp-sys-shape-*`**, **`--fp-alias-sp-*`**, **`--fp-alias-r-*`**) to existing **`--spacing-*`** / **`--radius-*`** (literals kept for 20px + 40px steps with no spacing-N match). **Batch 3:** removed duplicate **`--fp-base-*`** scale from the legacy bridge (no `var(--fp-base-*)` in `apps/web/src`); bridged unambiguous **`--fp-sys-color-*`** roles to tweakcn **`--primary`**, **`--background`**, **`--muted`**, **`--border`**, **`--destructive`**, **`--shadow-color`**, etc.; specs now cite **`var(--spacing-*)`** for former base px. **Batch 3 continuation (same date):** doc-only grep evidence table for deferred MD3 **`--fp-sys-color-*`** rows (no new SCSS mappings — no tweakcn namesake tokens). **Batch 4:** tweakcn dark palette shared mixin + **`@media (prefers-color-scheme: dark)`** on **`:root:not([data-theme])`** (system theme) mirrors **`html[data-theme="dark"]`** — see § Batch 4. **Batch 5:** full-tree grep inventory for **`var(--fp-*)`**, **`--fp-ref-*`**, **`--fp-sys-color`** under **`apps/web/src`** — see § Batch 5. **Batch 5b:** removed **`--fp-ref-*`** `:root` definitions; canonical hex → **`docs/design/tokens.md`** §3.1a — see § Batch 5b. **Batch 6 (2026-05-17):** doc sync — **`docs/migration/phase-0-discovery.md`** token summary (post–5b); **`docs/specs/component/ui-primitives/panel-trigger.md`** Figma metrics cite **`var(--radius-sm)`** / **`var(--spacing-1)`** instead of legacy **`--fp-alias-*`** in prose — see § Batch 6.

**Goal:** Shrink or retire **`apps/web/src/styles/_legacy-design-tokens.scss`** (successor to the removed monolithic `tokens.scss`) so **component** SCSS uses **tweakcn** semantics (`--primary`, `--background`, `--muted`, `--foreground`, `--border`, `--destructive`, **`--spacing-*`**, etc.) — not legacy **`--color-*`**, **`--fp-sys-*`**, or **`--fp-ref-*`** hand-offs where avoidable. **Reference tonal hex** after Batch 5b: **`docs/design/tokens.md`** §3.1a (no **`--fp-ref-*`** on `:root`).

**Prerequisites:**

- Phase 6 acceptance criteria met for templates (no dependency on global `ui-*` class semantics).
- Identify every non–Tailwind utility color usage in SCSS; map to semantic tokens or add **named** custom properties in the tweakcn `:root` / theme blocks (not ad hoc hex in components).

---

## Why this is its own phase

The former monolithic **`tokens.scss`** content now lives in **`_legacy-design-tokens.scss`** (see that file’s header). **`styles.scss`** loads tweakcn, **CDK overlay** (once), Tailwind, then **`@include meta.load-css('styles/legacy-design-tokens')`** as the bridge. Phase 7 is the controlled burn-down of that bridge and any remaining **fp** / **`--color-*`** indirection in SCSS consumers.

---

## Pre-flight scan (record counts + file list in §Baseline)

From repository root:

```bash
rg 'var\(--color-' apps/web/src/app --glob "*.scss" -l
rg 'var\(--fp-' apps/web/src/app --glob "*.scss" -l
rg 'var\(--fp-sys-|var\(--fp-ref-' apps/web/src/app --glob "*.scss" -l
rg 'var\(--color-|var\(--fp-sys-|var\(--fp-ref-' apps/web/src --glob "*.scss" -l
```

Optional: totals per pattern.

```bash
rg 'var\(--color-' apps/web/src/app --glob "*.scss" -c
rg 'var\(--fp-sys-|var\(--fp-ref-' apps/web/src/app --glob "*.scss" -c
```

### Baseline snapshot (2026-05-14, informational)

| Pattern | Files (`apps/web/src/app`, approx.) |
|---------|--------------------------------------|
| `var(--color-` | **0** files in `apps/web/src/app` (`*.scss`) — legacy **`var(--color-*)`** remains inside **`_legacy-design-tokens.scss`** only |
| `var(--fp-` (base / alias spacing in components) | **2** files (`panel-trigger`, `chip`) — **Batch 1 cleared 2026-05-16** → **0** |

Re-run before execution; archive components under `archive/` may still reference legacy vars — decide **migrate vs exclude** explicitly in §Baseline.

### Batch 1 — `var(--fp-*)` in app component SCSS (2026-05-16)

| Pattern | Before (`apps/web/src/app`, `*.scss`) | After |
|---------|----------------------------------------|-------|
| `var(--fp-` | **2** files, **18** matches (`panel-trigger`, `chip`) | **0** files, **0** matches |

Replaced with **`var(--spacing-1|2|3|4)`** where values match the legacy fp pixel scale (4 / 8 / 12 / 16 px → `spacing-1` … `spacing-4` per `apps/web/tailwind.config.js` §Spacing scale). **`border-radius`** on panel trigger uses **`var(--spacing-1)`** (4px) in place of **`--fp-alias-r-4`**.

**Still out of scope for this batch:** `_legacy-design-tokens.scss` (bridge definitions), `var(--color-*)` inside the legacy bridge file, and any **`--fp-sys-*` / `--fp-ref-*`** remaining inside non–`src/app` SCSS.

### Batch 2 — Legacy bridge internal chains (`_legacy-design-tokens.scss`, 2026-05-16)

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` only — **`--fp-sys-spacing-*`**, **`--fp-sys-shape-*`**, **`--fp-alias-sp-*`**, **`--fp-alias-r-*`** now reference **`var(--spacing-1..8)`** and **`var(--radius-sm|md|md-plus|lg|lg-plus|xl|full)`** defined later in the same **`:root`** block (CSS forward refs). **`--fp-sys-spacing-5`** (20px) and **`--fp-sys-spacing-10`** (40px) stay **literal `rem`** because **`--spacing-5`** is 24px and there is no **`--spacing-*`** for 40px. **`--fp-alias-sp-40`** uses literal **`2.5rem`**. **`--fp-sys-shape-radius-24`** and **`--fp-alias-r-24`** use **`var(--spacing-5)`** (24px). **`var(--fp-base-*)` indirection** was removed from the alias + sys spacing/shape chains in Batch 2; the **`--fp-base-*`** definition block itself was **removed in Batch 3** (see below).

| Grep (repo root) | Before | After |
|------------------|--------|-------|
| `rg 'var\\(--fp-base-' apps/web/src/styles/_legacy-design-tokens.scss` | **18** matches | **0** |
| `var(--spacing-*\|var(--radius-*)` on **`--fp-sys-spacing-*`**, **`--fp-sys-shape-*`**, **`--fp-alias-sp-*`**, **`--fp-alias-r-*`** rows only (approx.) | **0** (literals / `var(--fp-base-*)`) | **29** (`var(--spacing-1..8)` / `var(--radius-sm\|…\|full)` / `var(--spacing-5)` for 24px radii) |

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

**Still deferred:** full **`--fp-ref-*`** tonal tables; **`--fp-sys-color-*`** rows without a tweakcn 1:1 (container / tertiary / inverse / outline-variant / error-container — see Batch 3 table); and any **`nav` / `authenticated-app-layout`** SCSS if new **`var(--color-*)`** regressions appear. (**Batch 4** aligned tweakcn **`:root`** semantics with OS dark when **`data-theme` is absent**; Tailwind **`dark:`** still keys off **`[data-theme="dark"]`** only.)

### Batch 3 — `--fp-base-*` removal + `--fp-sys-color-*` → tweakcn (2026-05-16)

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` + spec doc references (no app code used `var(--fp-base-*)`).

| Grep (repo root) | Before | After |
|------------------|--------|-------|
| `rg '--fp-base-' apps/web/src` | **17** lines (`_legacy-design-tokens.scss` property definitions) | **0** matches |
| `rg 'var\\(--fp-base-' apps/web/src` | **0** files | **0** files |
| `rg 'var\\(--fp-sys-color' apps/web/src` | **0** files (consumers) | **0** files |

**`--fp-sys-color-*` rewired** (light `:root` + `dark-theme-overrides`): `--primary` / `--primary-foreground`, `--secondary` / `--secondary-foreground`, `--destructive` / `--destructive-foreground`, `--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--shadow-color` (shadow + scrim). **`--fp-sys-color-surface`** aligned with legacy parity as **`var(--background)`** (same role as pre-change shared surface tint).

**Deferred (hex unchanged until tweakcn adds 1:1 or explicit decision):** `--fp-sys-color-primary-container`, `--on-primary-container`, `--secondary-container`, `--on-secondary-container`, all **`--fp-sys-color-tertiary-*`**, **`--error-container`**, **`--on-error-container`**, **`--outline-variant`**, **`--inverse-*`**.

**Batch 3 continuation — deferred MD3 roles (doc-only, grep evidence, 2026-05-16):** No new bridge mappings landed. **Reason:** Phase 7 allows **`--fp-sys-color-*` → `var(--…)`** only when a **namesake tweakcn semantic** exists and usage is **grep-proven 1:1** (same role, no visual drift). **`apps/web/src/styles.scss`** tweakcn blocks expose **`--primary`**, **`--secondary`**, **`--muted`**, **`--accent`**, **`--card`**, **`--destructive`**, **`--border`**, **`--input`**, **`--ring`**, etc. — they do **not** define MD3-only names such as **`--primary-container`**, **`--tertiary`**, **`--error-container`**, **`--outline-variant`**, or **`--inverse-*`**. Rejected without design approval: aliasing container/tertiary/inverse rows to **`--accent`** / **`--card`** / **`--muted`** (Batch **4b**-style) — those pairs are **not** semantic equivalents to the MD3 hex ladder (see § Batch 4).

| Check | Command (repo root) | Result |
|-------|---------------------|--------|
| `var(--fp-sys-color*)` consumers | `rg -l -e 'var\(--fp-sys-color' apps/web/src` | **0** files |
| `--fp-sys-color-` text in tree | `rg -c -e '--fp-sys-color-' apps/web/src/styles/_legacy-design-tokens.scss` | **58** (definitions + comment; informational) |
| Namesake tweakcn vars for MD3-only roles | `rg -n -e '^\s*--primary-container\s*:' apps/web/src/styles.scss` (and same pattern for `--tertiary`, `--error-container`, `--outline-variant`, `--inverse-surface`) | **no hits** |

| Deferred `--fp-sys-color-*` (bridge) | Consumer `var(--fp-sys-color-…)` | tweakcn namesake in `styles.scss` | Verdict |
|----------------------------------------|-----------------------------------|-----------------------------------|---------|
| `primary-container`, `on-primary-container` | none | no `--primary-container` / `--on-primary-container` | **Defer** — add tweakcn roles or design-approved alias |
| `secondary-container`, `on-secondary-container` | none | no `--secondary-container` (distinct from `--secondary`) | **Defer** |
| `tertiary`, `on-tertiary`, `tertiary-container`, `on-tertiary-container` | none | no `--tertiary*` tokens | **Defer** |
| `error-container`, `on-error-container` | none | no `--error-container` (distinct from `--destructive`) | **Defer** |
| `outline-variant` | none | no `--outline-variant` (`--border` / `--input` are different roles) | **Defer** |
| `inverse-surface`, `inverse-on-surface`, `inverse-primary` | none | no `--inverse-*` tokens | **Defer** |

**Risks tie-in:** Deferred rows remain **literal hex** in the bridge; they do **not** affect **`dark:`** Tailwind utilities. Any **future** consumer of `var(--fp-sys-color-…)` must be audited against **§ Risks / QA** (explicit **`data-theme="dark"`** vs **system + OS dark** for **`dark:`** vs CSS variables).

**Spec sync (Figma base px → spacing bridge):** `docs/specs/component/ui-primitives/panel-trigger.md`, `docs/specs/component/ui-primitives/ui-primitives.panel-trigger.md`, `docs/specs/component/filters/chip.md`.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

**Batch 5b resolution:** **`--fp-ref-*`** `:root` definitions **removed** (canonical hex → `docs/design/tokens.md` §3.1a). **Still deferred after Batch 3:** MD3 **container / tertiary / inverse / outline-variant** `--fp-sys-color-*` lines above; app SCSS gate **`var(--color-|var(--fp-sys-|var(--fp-ref-`**. (**System OS dark + tweakcn** resolved in **Batch 4** — see below.)

### Batch 4 — system dark + tweakcn alignment (**4a**, 2026-05-16)

**Policy (4a vs 4b):** Chose **4a**. Product behavior already defines **ThemeService `"system"`** as **`data-theme` removed** on `<html>` and **OS `prefers-color-scheme: dark`** as the dark driver for legacy bridge mixins — see **`docs/specs/ui/settings-overlay/theme-toggle.md`** (system follows OS), **`docs/playbooks/setup-guide.md`** (OS fallback), **`docs/migration/phase-0-discovery.md`**, and **`settings-overlay.component.ts`** (`applyThemeMode` removes attribute for `system`). **4b** (extra **`--fp-sys-color-*` → `--card` / `--accent` / …**) was **not** applied: MD3 container / tertiary / inverse roles have **no grep-proven 1:1** to those tweakcn names in the bridge (mapping table in § Token mapping stays guidance only).

**Code:** **`apps/web/src/styles.scss`** — introduced **`@mixin tweakcn-dark-semantic-palette`** (same declarations as former **`html[data-theme="dark"]`** block), **`html[data-theme="dark"] { @include … }`**, and **`@media (prefers-color-scheme: dark) { :root:not([data-theme]) { @include … } }`**. Selector **`:root:not([data-theme])`** matches **system** only (explicit **light** / **dark** / **sandstone** keep an attribute and do not receive this stack). **Tailwind `@custom-variant dark`** stays the one-line selector **`&:is([data-theme="dark"] *)`** — **`dark:`** utilities still **do not** activate for **system + OS dark** (semantic CSS variables do, via the mixin). Extending **`dark:`** to mirror system dark requires Tailwind’s long-form **`@custom-variant`** with **`@slot`**, which **Angular’s Sass pass rejects** (`Top-level selectors may not contain the parent selector "&"`). Mitigation options: plain **`.css`** entry for Tailwind-only directives (split from `styles.scss`), or JS-driven **`data-theme="dark"`** when system prefers dark (product decision).

| Grep (repo root) | Before | After |
|------------------|--------|-------|
| `rg -e '--fp-sys-color-(primary-container\|on-primary-container\|secondary-container\|on-secondary-container\|tertiary\|error-container\|on-error-container\|outline-variant\|inverse)' apps/web/src/styles/_legacy-design-tokens.scss -c` | **24** | **24** (unchanged — deferred hex / no new 1:1) |
| `rg -e 'var\\(--(card\|popover\|accent\|secondary\|ring\|input)\\)' apps/web/src/styles/_legacy-design-tokens.scss -c` | **8** | **8** (unchanged) |

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

**Follow-ups (not this batch):** **4b**-style mappings when tweakcn adds named roles for MD3 containers; **`dark:`** + system OS alignment via a **non-Sass** Tailwind entry or ThemeService behavior change; legacy **`@media (prefers-color-scheme: dark)`** + **`sandstone`** interaction remains as pre-Batch-4 behavior (narrow if QA flags it).

### Batch 5 — `apps/web/src` grep inventory (documentation only, 2026-05-16)

**Commands** (repository root; counts are **line matches**, not unique variables):

```bash
rg -c -e 'var\(--fp-' apps/web/src
rg -c -e '--fp-ref-' apps/web/src
rg -c -e '--fp-sys-color' apps/web/src
```

**Cross-check** (no `var()` consumer of ref/sys-color anywhere under `apps/web/src` today):

```bash
rg -e 'var\(--fp-ref-' apps/web/src
rg -e 'var\(--fp-sys-color' apps/web/src
```

| Pattern | Total matches (`rg -c`, `apps/web/src`) | Files with hits | Top consumer files (by match count) |
|---------|------------------------------------------|-----------------|-------------------------------------|
| `var(--fp-` | **0** | **0** | — |
| `--fp-ref-` | **0** | **0** | — (**Batch 5b**, 2026-05-16: tonal + typeface **`--fp-ref-*` definitions removed** from `_legacy-design-tokens.scss`; canonical hex → `docs/design/tokens.md` §3.1a / §3.1e) |
| `--fp-sys-color` | **58** | **1** | `apps/web/src/styles/_legacy-design-tokens.scss` (**58**) — `--fp-sys-color-*` **property names** in light/dark `:root` blocks (+ header comment) |

**Interpretation:** No **application** SCSS/TS/HTML under `apps/web/src` references **`var(--fp-*)`**, **`var(--fp-ref-*)`**, or **`var(--fp-sys-color*)`**. **`--fp-sys-color`** *text* in this tree lives in the legacy bridge file (definitions and sys token names). **`--fp-ref-*` CSS custom properties are no longer defined** on `:root` (see **§ Batch 5b**).

**Do not map yet** (explicitly tied to **Batch 3** deferred roles — literal hex / no tweakcn 1:1 until product or tweakcn adds named roles; see **Batch 4** policy **4a** vs **4b**):

- **`--fp-sys-color-*` rows still on literals or without proven tweakcn twins:** `primary-container`, `on-primary-container`, `secondary-container`, `on-secondary-container`, the full **`tertiary`** set (`tertiary`, `on-tertiary`, `tertiary-container`, `on-tertiary-container`), **`error-container`**, **`on-error-container`**, **`outline-variant`**, **`inverse-surface`**, **`inverse-on-surface`**, **`inverse-primary`** (and any adjacent MD3-only rows the bridge keeps on hex for parity).
- **`--fp-ref-*` (removed from bridge):** MD3 reference ladders + typeface weights are **document-only** in **`docs/design/tokens.md` §3.1a / §3.1e** — use tweakcn / **`--fp-sys-color-*`** in implementation; Figma **`fp/ref/…`** paths map to stop rows in that doc.

### Batch 5b — `--fp-ref-*` bridge removal + doc canonical hex (2026-05-16)

**Grep proof (repository root)** — no runtime consumers of reference vars:

```bash
# TS / HTML / SCSS / CSS: zero `var(--fp-ref-*)` call sites
rg --glob '*.{ts,html,scss,css}' 'var\(--fp-ref-' .
# → 0 matches (2026-05-16)

# Markdown / migration text still mentions the *pattern* in migration docs (not CSS consumers)
rg 'var\(--fp-ref-' docs/migration docs/specs --glob '*.md'
# → phase-7-token-migration.md (gate / strategy prose only); chip spec updated same batch to drop `var(--fp-ref-*)`
```

**`--fp-ref-` token *name* references in docs** (Figma alignment / prose — not `:root` exports after this batch): `docs/specs/component/ui-primitives/panel-trigger.md`, `docs/specs/component/ui-primitives/ui-primitives.panel-trigger.md`, `docs/specs/component/ui-primitives/ui-primitives.badges-and-chips.md`, `docs/design/state-visuals.md`, `docs/migration/phase-0-discovery.md`, `docs/migration/README.md`, `docs/migration/phase-7-token-migration.md` — align copy to **`docs/design/tokens.md` §3.1a** hex + Figma path labels in a follow-up if specs still imply live **`--fp-ref-*`** CSS variables. **Update (Batch 6, 2026-05-17):** `phase-0-discovery.md` + `panel-trigger.md` alias prose aligned; badges-and-chips / state-visuals had no remaining **`--fp-ref-*`** consumer language.

**Code:** **`apps/web/src/styles/_legacy-design-tokens.scss`** — deleted all **`--fp-ref-*`** custom property **definitions** (five tonal ladders + five typeface lines). **`--fp-sys-color-*`** literals unchanged (already matched ref hex where applicable).

**Docs:** **`docs/design/tokens.md`** §3.1a / §3.1e — full tonal tables + typeface names as canonical numbers; **`docs/specs/component/filters/chip.md`** — default fill documents **`color-mix`** + Figma stop **95/90** hex pointers.

**Verify:** `cd apps/web && npx ng build` → exit **0**.

### Batch 6 — Doc sync: discovery + panel-trigger alias prose (2026-05-17)

**Slice:** Markdown only — completes part of the Batch 5b follow-up list (§ Batch 5b, “`--fp-ref-` token *name* references in docs”).

| File | Change |
|------|--------|
| `docs/migration/phase-0-discovery.md` | Global style bullet: **`--fp-ref-*`** no longer on `:root`; bridge + **`docs/design/tokens.md`** §3.1a as canonical reference stops. |
| `docs/specs/component/ui-primitives/panel-trigger.md` | Figma metrics: corner radius and **icon-text-action** horizontal padding cite **`var(--radius-sm)`** / **`var(--spacing-1)`** (tweakcn-facing) instead of legacy **`--fp-alias-*`** names in prose. |

**Verify:** `cd apps/web && npx ng build` → exit **0** (unchanged SCSS). `npm run design-system:check` optional for doc-only batch.

### Batch 7 — Bridge derivatives drop `var(--color-*)` indirection (2026-05-17)

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` only — computed / composed properties (shadows, `border-*`, `outline-*`, `--interactive-*`, skeleton, action/menu/field/section/state roles, dark mixin + sandstone overrides) reference **tweakcn-facing names** (`--primary`, `--destructive`, `--border`, `--card`, `--foreground`, `--app-violet-accent`, etc.) per § Token mapping. **Left intact:** each **`--color-*: var(--…)`** assignment block (legacy v1 names still emitted for `@theme` / any remaining consumers).

| Grep (repo root) | After |
|------------------|--------|
| `rg 'var\\(--color-' apps/web/src/styles/_legacy-design-tokens.scss` | **0** (was ~45 on RHS / in `color-mix`) |

**Verify:** `cd apps/web && npx ng build` → exit **0**; `npm run design-system:check` → exit **0**.

### Batch 8 — Success / warning: drop chart-token proxy (2026-05-17)

**Slice:** Component SCSS that used **`var(--chart-1)`** / **`var(--chart-2)`** with **TODO(phase8)** as stand-ins for success and warning — now **`var(--success)`** / **`var(--warning)`** per § Token mapping (`--color-success` / `--warning` in `@theme inline` already map to these).

| File | Role |
|------|------|
| `apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.scss` | `&--success` / `&--warning` chip variants |
| `apps/web/src/app/features/media/media-error.component.scss` | Warning-tinted error card chrome |
| `apps/web/src/app/shared/toast/toast-item.component.scss` | `.success` / `.warning` toast icon chrome |
| `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-view.component.part2.scss` | Primary chip, active row, option color stripe |

| Grep (repo root) | After |
|------------------|--------|
| `rg 'chart-[12].*phase8|TODO\\(phase8\\).*chart' apps/web/src` | **0** matches |

**Verify:** `cd apps/web && npx ng build` → exit **0**; `npm run design-system:check` → exit **0**.

## Risks / QA

**Theming — `dark:` vs semantic dark**

- **`@custom-variant dark`** in **`apps/web/src/styles.scss`** is **`&:is([data-theme="dark"] *)`** only. **`html[data-theme="dark"]`** and **`@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }`** both apply **`@mixin tweakcn-dark-semantic-palette`** to CSS variables, so **token-driven** colors track system dark. **`dark:`** Tailwind utilities (e.g. **`dark:bg-*`**) apply **only** under explicit **`data-theme="dark"`**, not under **system + OS dark**.
- **Attempted fix (2026-05-16):** long-form **`@custom-variant dark { … @slot … }`** with a second branch for **`html:not([data-theme])`** + **`prefers-color-scheme: dark`**. **Reverted:** Angular **`ng build`** fails because Sass compiles **`styles.scss`** first and rejects **top-level `&`** inside that block (`Top-level selectors may not contain the parent selector "&"`). A short comment above **`@custom-variant`** in **`styles.scss`** points here.
- **Manual QA:** (1) Set theme **Dark** — confirm **`dark:`** utilities and variables match. (2) Set theme **Light** on OS dark — confirm light **`dark:`** + light variables. (3) Set theme **System** with OS **dark** — confirm **variables** look dark while noting **`dark:`** utilities may stay on light-class output until variant split or ThemeService change. (4) **Sandstone** + OS dark — confirm **`data-theme="sandstone"`** does not pick up **`@media (prefers-color-scheme: dark)`** variable override on **`:root:not([data-theme])`** (attribute present).

## Token mapping table (extend as you discover variants)

| Legacy / alias | tweakcn / semantic target | Notes |
|----------------|---------------------------|--------|
| `--color-primary` (where used as **ink** on links) | Prefer **`--primary`** or **`--foreground`** depending on context | `styles.scss` link baseline uses **`var(--primary)`** today |
| `--color-bg-base` / `--color-surface` | `--background` | |
| `--color-bg-surface` / `--color-surface-elevated` | `--card` | Surfaces / elevated panels |
| `--color-bg-muted` / `--color-surface-variant` | `--muted` | |
| `--color-text-primary` / `--color-ink` | `--foreground` | |
| `--color-text-secondary` / `--color-ink-muted` / `--color-ink-subtle` | `--muted-foreground` | |
| `--color-border` / outline tokens | `--border` or `--input` | Pick by control vs chrome |
| `--color-danger` / error | `--destructive` | |
| `--color-warning` | **`--warning`** | Add to tweakcn `:root` + dark + sandstone if missing; document in `docs/design/tokens.md` |
| `--color-success` | **`--success`** | Same |
| `--color-clay` / brand emphasis | **`--primary`** | Warm orange brand alignment per Phase 1 decision |
| `--fp-sys-color-primary` (and other `--fp-sys-*`) | Respective tweakcn semantic | Prefer **deleting** fp indirection in app SCSS entirely |
| `--fp-ref-*` | **Never in components** — if encountered, replace with semantic or remove dead code | |

**Tailwind `@theme inline` note:** Utilities like `bg-primary` map through `--color-primary` in `styles.scss` — that is **not** the same as `var(--color-*)` in component SCSS. Phase 7 targets **hand-written `var(--color-…)`** in SCSS files; keep `@theme inline` mapping coherent when adding `--warning` / `--success`.

---

## Special cases

1. **`@import '@angular/cdk/overlay-prebuilt.css'`**  
   - **Done:** loaded from **`styles.scss`** (not from the removed `tokens.scss` graph). Re-verify overlays when changing load order.

2. **`styles.scss` legacy alias block** (`:root { --color-accent-brand: var(--primary); … }` inside the bridge)  
   - Delete **only after** `rg 'var\(--color-'` on component SCSS is zero **and** no remaining TS/SCSS references alias names.  
   - **Link baseline** uses **`var(--primary)`** in `styles.scss` today; keep aligned when removing **`--color-primary`** aliases from the bridge.

3. **Map tokens** (marker colors, cluster halo, selection rings)  
   - If they still use `--color-*` or raw hex, introduce **`--map-*`** (or reuse chart tokens) in tweakcn blocks with three-theme coverage.

4. **`hlm-toggle-group.scss`**  
   - If any **state** color still references legacy vars, migrate in **Phase 7** (or Phase 8 if file deleted later). Coordinate with Phase 6 so directives own layout first.

---

## Work strategy (per file / per feature area)

1. Pick a **feature slice** (e.g. `features/media`, `shared/workspace-pane`) or a **single high-churn file**.
2. Replace each `var(--color-*)` / `var(--fp-sys-*)` / `var(--fp-ref-*)` with the mapped semantic `var(--…)` from tweakcn.
3. Run **`cd apps/web && npx ng build`** on the slice PR; fix contrast regressions before merging.
4. **Commit discipline:** one slice per commit or PR to simplify bisect.

**Order suggestion:** shared layout (`nav`, `authenticated-app-layout`) → map chrome → workspace pane → media → projects → settings → upload → remainder.

---

## Acceptance criteria

| Gate | Condition |
|------|-----------|
| No legacy **`var(--fp-*)`** in app SCSS | `rg 'var\(--fp-' apps/web/src/app --glob "*.scss"` → **zero** (**2026-05-16**, post–Batch 1) |
| No legacy color / fp-sys in app SCSS | `rg 'var\(--color-|var\(--fp-sys-|var\(--fp-ref-' apps/web/src/app --glob "*.scss"` → **zero** (explicit waiver list empty unless archived code deleted) |
| Monolithic `tokens.scss` | **Removed** — payload lives in **`_legacy-design-tokens.scss`** (tracked shrink target) |
| No `@use './styles/tokens'` | `styles.scss` has **no** `@use './styles/tokens'` |
| CDK overlay | Still loaded exactly **once** from `styles.scss` (or documented alternative) |
| Build | `cd apps/web && npx ng build` → exit **0** |

**Optional stretch (if alias block removed):** `rg '--color-' apps/web/src/app --glob "*.scss"'` should also be clean for **non–`@theme`** hand-written references.

---

## Definition of done

- Acceptance table green.
- `docs/migration/open-questions.md` updated if any token decision resolves Q1/Q12-style CDK notes.
- Phase 8 pre-flight re-run; attach to `phase-8-global-scss-elimination.md` §Baseline.

---

## Archive vs delete

- **Archive first:** Historical snapshot optional — canonical bridge today is **`_legacy-design-tokens.scss`** (header notes former `tokens.scss`).
- **Delete / shrink bridge:** Retire **`_legacy-design-tokens.scss`** (or replace with minimal stubs) only after Phase 7 acceptance gates pass and `cd apps/web && npx ng build` is green **without** remaining consumers of its **`--color-*` / `--fp-*`** outputs.
- **Legacy alias block** in `styles.scss` (`:root { --color-* … }`): strip only when `rg 'var\(--color-'` across consuming code is negligible or fully migrated; record the go/no-go in this section or [decisions-log.md](./decisions-log.md) so later agents do not assume the alias block is intentional forever.
