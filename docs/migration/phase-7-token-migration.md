# Phase 7 — Token System Unification

**Status:** In progress (2026-05-17) — **Batch 32:** **`_legacy-design-tokens.scss`** — removed **six** `:root` rows after single-consumer **`rg --count-matches`** audit (each had **1** external **`var(--<name>)`** before inlining): **`--z-map`**, **`--content-clamp-text`**, **`--font-weight-regular`**, **`--line-height-relaxed`**, **`--photo-marker-cluster-font-size`**, **`--layout-sidebar-icon-size`** — proof §Batch 32. **Batch 31:** **`_legacy-design-tokens.scss`** — removed **eight** bridge-only / zero–external-consumer custom properties after **`rg --glob '*.{scss,css,ts,html}' --count-matches 'var\\(--<name>\\)' apps/web`** with **`!**/_legacy-design-tokens.scss`** showed **0** for each removed name, then **inlined** internal references so **`--transition-fade-in`**, **`--transition-fade-out`**, **`--animation-skeleton-pulse`**, **`--interactive-focus-ring`**, **`--shadow-focus`** (dark), spacing scale, font-size ladder, and **`--photo-marker-body-size`** stay equivalent: **`--section-border`**, **`--font-size-ratio`**, **`--spacing-unit`**, **`--ui-item-media-size-default`**, **`--shadow-focus-ring`**, **`--motion-ease-in`**, **`--transition-interactive`**, **`--transition-emphasis`**. Sandstone: dropped **`--section-border`** override. **`@mixin dark-theme-overrides`**: **`--interactive-focus-ring`** + composite **`--shadow-focus`** (no **`--shadow-focus-ring`**). Design docs: **`tokens.md`**, **`token-layers.md`**, **`motion.md`**, **`state-visuals.md`**; specs **`media-marker.md`**, **`drag-divider.md`**, **`media-item-quiet-actions.md`**, **`project-item.md`**, **`item-state-frame.md`**. **Deferred (file cap):** **`docs/specs/component/item-grid/item-grid.state-and-fsm.md`**, **`docs/migration/phase-8-global-scss-elimination.md`** (stale **`--shadow-focus-ring`** prose), **`docs/skills/feldpost-component/SKILL.md`** — replace remaining **`var(--transition-emphasis)`** / token-name mentions in a follow-up. Proof: §Batch 31 table. **Batch 30:** **`_legacy-design-tokens.scss`** — removed **zero-consumer** action aliases **`--action-bg-active`**, **`--action-border-default`** from **`:root`** and **`[data-theme='sandstone']`** after **`rg --glob '*.{scss,css,ts,html}' 'var\(--action-(bg-active|border-default)\)' apps/web`** → **0** matches (pre-edit); retained **`--action-bg-default`**, **`--action-bg-hover`**, **`--action-border-active`**, text tokens, **`--menu-*`**, etc. **Batch 28:** **`_legacy-design-tokens.scss`** — removed **dead metric border scale** **`--border-sm`…`--border-xl`** from **`:root`** and **`@mixin dark-theme-overrides`** after **`rg --glob '*.{scss,css,ts,html}' 'var\(--border-(sm|md|lg|xl)\)' apps/web`** → **0** matches; **`--border-hover`** / **`--border-selected`** retained; **`docs/design/tokens.md`** §3.5 + Figma skip-table example updated. **Batch 27:** **`_legacy-design-tokens.scss`** — removed **obsolete layout** (`--tab-radius-*`, `--pane-width-*`, `--layout-workspace-pane-*`, `--layout-map-safe-min-width`, `--layout-sidebar-label-size` + comment), **unused overlay width** rows (`--overlay-width-small-*`, `--overlay-width-medium-max`, `--overlay-width-large-max`), **`--elevation-base`**, duplicate **semantic shadow/border/outline** aliases with **zero** `var(--…)` consumers (`--shadow-hover`, `--shadow-selected`, `--shadow-error`, `--border-default`, `--border-focus`, `--border-error`, `--outline-hover`, `--outline-focus`, `--interactive-shadow-*`); **`--shadow-focus`** + **`--border-hover`** / **`--border-selected`** retained. **Docs:** **`docs/design/tokens.md`** §3.5, **`docs/design/token-layers.md`** elevation list. **Batch 26:** `rg` audit — **0** deprecated **`var(--font-size-<alias>)`** under **`apps/web`** (Batch 19 / §Batch 25 proof table); **`_legacy-design-tokens.scss`** keeps **only** the modular **`--font-size-2xs`…`--font-size-4xl`** primitive ladder (no second **`LEGACY MAPPING`** font block). **Comment:** **`media-detail-view.component.scss`** dropped stale **`--text-h2`** prose for **`docs/design/tokens.md`** §3.1e. **Batch 25:** **`LEGACY MAPPING (DEPRECATED)`** **`--font-size-*`** alias **`:root` block removed** (**11** rows) after all `apps/web` consumers use canonical **`var(--font-size-{2xs,sm,md,lg})`** per **`docs/design/tokens.md`** §3.1e; last straggler **`apps/web/src/app/shared/media-display/media-display.component.scss`** **`var(--font-size-label, …)`** → **`var(--font-size-2xs, …)`**. **Batch 23:** **`--font-size-label-soft`** alias removed — **`apps/web/src/app/shared/workspace-pane/media-detail/media-detail-view.component.scss`** → **`var(--font-size-2xs)`** (canonical **2xs** per **`docs/design/tokens.md`** §3.1e); **`--font-size-label-soft`** row dropped from **`_legacy-design-tokens.scss`** **LEGACY MAPPING** (sole consumer). **Batch 22:** **`--font-size-sm-compact`** alias removed — **`apps/web/src/app/features/upload/upload-panel.component.scss`** → **`var(--font-size-sm)`** (canonical **sm** per **`docs/design/tokens.md`** §3.1e); **`--font-size-sm-compact`** row dropped from **`_legacy-design-tokens.scss`** **LEGACY MAPPING** (sole consumer outside **`map/map-shell/**`**). **Batch 21:** **`--font-size-5xl`** alias removed — **`apps/web/src/app/features/upload/upload-panel.component.scss`** → **`var(--font-size-4xl)`** (canonical **4xl** per **`docs/design/tokens.md`** § typography scale); **`--font-size-5xl`** row dropped from **`_legacy-design-tokens.scss`** **LEGACY MAPPING** (consumer outside **`map/map-shell/**`**). **Batch 20:** **`--font-size-3xs`** alias removed — **`apps/web/src/app/features/map/map-shell/_map-shell-photo-marker-states.scss`** → **`var(--font-size-2xs)`** (canonical **2xs** / dense meta per **`docs/design/tokens.md`** § typography scale); **`--font-size-3xs`** row dropped from **`_legacy-design-tokens.scss`** **LEGACY MAPPING**. **Batch 19:** **doc-only — remaining deprecated `LEGACY MAPPING` `--font-size-*` inventory** (per-alias `var(--…)` line counts under `apps/web`; **no** zero-consumer rows at Batch 19 — **(A)** opened by Batch 20 for **`3xs`** only). **Batch 18:** **`_legacy-design-tokens.scss` — dead deprecated typography aliases removed** (`--font-size-xs-soft`, `--font-size-sm-tight`, `--font-size-lg-emphasis`) — `rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-(xs-soft|sm-tight|lg-emphasis)\)' apps/web` → **0** files before edit; doc audit: no **`--fp-*`** property rows remain (only header comments mention **`--fp-ref-*` / `--fp-sys-*`**); other font aliases then lived under **`LEGACY MAPPING`** until **Batch 25** removed that block after callsite migration. **Batch 17:** **`_legacy-design-tokens.scss` — all remaining non-color `--fp-sys-*` custom properties removed** (`--fp-sys-shape-*`, `--fp-sys-spacing-*`, `--fp-sys-elevation-*`, `--fp-sys-typescale-*`, `--fp-sys-state-*`, `--fp-sys-motion-*`) — per-prefix `rg` under `apps/web` → **0** `var(--fp-sys-<prefix>)` files before edit; MD3 typescale / motion names remain **documentation-only** in **`docs/design/tokens.md`** §3.1e (specs may cite `--fp-sys-typescale-*` as labels — not emitted on `:root`). **Batch 16:** **`_legacy-design-tokens.scss` — all `--fp-sys-color-*` custom properties removed** (light **`:root`** + **`@mixin dark-theme-overrides`**) — pre-edit `rg -l --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-' apps/web` → **0** files; **`docs/design/tokens.md`** §3.1a updated (MD3 role names + hex tables are documentation only). **Batch 15:** **`_legacy-design-tokens.scss` — dead Figma Alias spacing/radius rows removed** — `rg -e '--fp-alias-' apps/web/src` → **0**; `node scripts/sync-tokens.mjs` refreshed **`docs/design/figma-tokens.json`** (no Alias spacing/radius re-exports — use Base **`spacing`** / **`radius`**). Spec tables: **`panel-trigger`**, **`ui-primitives.panel-trigger`**, **`chip`** cite **`var(--radius-sm)`** / **`var(--spacing-*)`** / **`var(--foreground)`**. **Batch 14:** **`_legacy-design-tokens.scss` — Feldpost v1 `--color-*` bridge removed** — `rg 'var\\(--color-' apps/web/src` → **0** before edit; `tailwind.config.js` `extend.colors` already used **`var(--background)`** / **`var(--primary)`** etc. (not `var(--color-bg-*)`); Tailwind v4 **`@theme inline`** in **`styles.scss`** continues to emit shadcn-style **`--color-primary`** keys for utilities. Removed duplicate **`--color-bg-*`**, text, brand, map, **`--color-clay`**, and unused **`--color-skeleton-surface`** from **`:root`**, **`@mixin dark-theme-overrides`**, **`[data-theme='sandstone']`**, and the deprecated mapping block; kept **`--animation-skeleton-pulse`**. **Batch 13:** **Special case §4 — `hlm-toggle-group`** — `apps/web/src/app/shared/ui/toggle-group/hlm-toggle-group.scss` emits **geometry / spacing / radius only** (no **`var(--color-*|--fp-*|--fp-sys-*|--fp-ref-*)`**); hover, focus, on/off, and **`data-attention`** ink live in **`toggle-group-variants.ts`** (CVA + Tailwind + **`var(--warning)`** for attention-off, aligned with Batch 9). **Batch 12:** **`dark:` vs semantic variables** — canonical write-up in **`docs/design/tokens.md`** § **Phase 7 handoff — Tailwind `dark:` vs semantic CSS variables** (points to **`styles.scss`** `@custom-variant` + § **Risks / QA** below). **Batch 11:** **`--media-chrome-{foreground,control-bg,control-bg-hover}`** (fixed light-on-image) + **`--auth-scroll-radial-sheen`** + **`--auth-map-veil-{stop-a|stop-b|stop-c|flat}`** on **`:root`** and **`tweakcn-dark-semantic-palette`** (dark sheen / veil stops use **`--foreground`** / **`--background`**); **`photo-lightbox`** close control, **upload** skeleton shimmer, **auth** scroll fades + map shell + map overlay drop hardcoded **`rgba`/`#fff`** (see §Batch 11). **Batch 10:** semantic **`--overlay-scrim-{30|55|80}`** on **`:root`** + **`tweakcn-dark-semantic-palette`** (`color-mix` from **`var(--shadow-color)`**); legacy **`--fp-sys-elevation-1..5`**, dark **`--shadow-sm|md|lg|xl`**, and **`--photo-marker-drop-shadow`** in **`_legacy-design-tokens.scss`** no longer use raw **`rgba(0,0,0,…)`**; app SCSS (media overlays, footer dimmer, nav/detail primary-press mix, spinners on primary) consume scrims / **`var(--shadow-color)`** / **`var(--primary-foreground)`**. **Batch 9:** remaining **`var(--chart-1|2)`** in **`apps/web/src/app`** (upload/projects/map chrome, project color formatters, toggle attention) → **`var(--success)`** / **`var(--warning)`** / **`var(--map-marker-user)`**; legacy **`--color-uploading`** now **`var(--primary)`** (bridge only, no app consumers). **Batch 8:** app SCSS — success/warning UI no longer proxies through **`var(--chart-1|2)`**; uses tweakcn **`var(--success)`** / **`var(--warning)`** (`styles.scss` `:root` + dark mixin). **Batch 7:** `_legacy-design-tokens.scss` — derivative tokens (shadows, borders, interaction, action/menu/field/section/state aliases) now use **tweakcn `var(--primary|destructive|border|…)`** directly instead of **`var(--color-*)` hops**; **`--color-*` bridge definitions** retained for Tailwind `@theme` / downstream until alias removal gate. **Batch 1 (2026-05-16):** cleared **`var(--fp-*)`** from **`panel-trigger`** + **`chip`** → **`var(--spacing-*)`** (`apps/web/tailwind.config.js` spacing scale). **Batch 2:** rewired **`_legacy-design-tokens.scss`** internal chains (**`--fp-sys-spacing-*`**, **`--fp-sys-shape-*`**, **`--fp-alias-sp-*`**, **`--fp-alias-r-*`**) to existing **`--spacing-*`** / **`--radius-*`** (literals kept for 20px + 40px steps with no spacing-N match). **Batch 3:** removed duplicate **`--fp-base-*`** scale from the legacy bridge (no `var(--fp-base-*)` in `apps/web/src`); bridged unambiguous **`--fp-sys-color-*`** roles to tweakcn **`--primary`**, **`--background`**, **`--muted`**, **`--border`**, **`--destructive`**, **`--shadow-color`**, etc.; specs now cite **`var(--spacing-*)`** for former base px. **Batch 3 continuation (same date):** doc-only grep evidence table for deferred MD3 **`--fp-sys-color-*`** rows (no new SCSS mappings — no tweakcn namesake tokens). **Batch 4:** tweakcn dark palette shared mixin + **`@media (prefers-color-scheme: dark)`** on **`:root:not([data-theme])`** (system theme) mirrors **`html[data-theme="dark"]`** — see § Batch 4. **Batch 5:** full-tree grep inventory for **`var(--fp-*)`**, **`--fp-ref-*`**, **`--fp-sys-color`** under **`apps/web/src`** — see § Batch 5. **Batch 5b:** removed **`--fp-ref-*`** `:root` definitions; canonical hex → **`docs/design/tokens.md`** §3.1a — see § Batch 5b. **Batch 6 (2026-05-17):** doc sync — **`docs/migration/phase-0-discovery.md`** token summary (post–5b); **`docs/specs/component/ui-primitives/panel-trigger.md`** Figma metrics cite **`var(--radius-sm)`** / **`var(--spacing-1)`** instead of legacy **`--fp-alias-*`** in prose — see § Batch 6.

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

**Deferred (hex unchanged until tweakcn adds 1:1 or explicit decision):** `--fp-sys-color-primary-container`, `--on-primary-container`, `--secondary-container`, `--on-secondary-container`, all **`--fp-sys-color-tertiary-*`**, **`--error-container`**, **`--on-error-container`**, **`--outline-variant`**, **`--inverse-*`**. **Update (Batch 16):** these roles are **document-only** in **`docs/design/tokens.md`** §3.1a — **`--fp-sys-color-*`** custom properties were **removed** from **`_legacy-design-tokens.scss`** (no app consumers).

**Batch 3 continuation — deferred MD3 roles (doc-only, grep evidence, 2026-05-16):** No new bridge mappings landed. **Reason:** Phase 7 allows **`--fp-sys-color-*` → `var(--…)`** only when a **namesake tweakcn semantic** exists and usage is **grep-proven 1:1** (same role, no visual drift). **`apps/web/src/styles.scss`** tweakcn blocks expose **`--primary`**, **`--secondary`**, **`--muted`**, **`--accent`**, **`--card`**, **`--destructive`**, **`--border`**, **`--input`**, **`--ring`**, etc. — they do **not** define MD3-only names such as **`--primary-container`**, **`--tertiary`**, **`--error-container`**, **`--outline-variant`**, or **`--inverse-*`**. Rejected without design approval: aliasing container/tertiary/inverse rows to **`--accent`** / **`--card`** / **`--muted`** (Batch **4b**-style) — those pairs are **not** semantic equivalents to the MD3 hex ladder (see § Batch 4).

| Check | Command (repo root) | Result |
|-------|---------------------|--------|
| `var(--fp-sys-color*)` consumers | `rg -l -e 'var\(--fp-sys-color' apps/web/src` | **0** files |
| `--fp-sys-color-` text in `_legacy-design-tokens.scss` | `rg -c -e '--fp-sys-color-' apps/web/src/styles/_legacy-design-tokens.scss` | **1** (header comment only; **Batch 16** removed definitions) |
| Namesake tweakcn vars for MD3-only roles | `rg -n -e '^\s*--primary-container\s*:' apps/web/src/styles.scss` (and same pattern for `--tertiary`, `--error-container`, `--outline-variant`, `--inverse-surface`) | **no hits** |

| Deferred `--fp-sys-color-*` (bridge) | Consumer `var(--fp-sys-color-…)` | tweakcn namesake in `styles.scss` | Verdict |
|----------------------------------------|-----------------------------------|-----------------------------------|---------|
| `primary-container`, `on-primary-container` | none | no `--primary-container` / `--on-primary-container` | **Defer** — add tweakcn roles or design-approved alias |
| `secondary-container`, `on-secondary-container` | none | no `--secondary-container` (distinct from `--secondary`) | **Defer** |
| `tertiary`, `on-tertiary`, `tertiary-container`, `on-tertiary-container` | none | no `--tertiary*` tokens | **Defer** |
| `error-container`, `on-error-container` | none | no `--error-container` (distinct from `--destructive`) | **Defer** |
| `outline-variant` | none | no `--outline-variant` (`--border` / `--input` are different roles) | **Defer** |
| `inverse-surface`, `inverse-on-surface`, `inverse-primary` | none | no `--inverse-*` tokens | **Defer** |

**Risks tie-in:** **Batch 16** removed **`--fp-sys-color-*`** from the bridge (no `:root` literals there anymore); MD3 hex authority is **`docs/design/tokens.md`** §3.1a tables. Any **future** reintroduction of `var(--fp-sys-color-…)` must use tweakcn-approved roles and be audited against **§ Risks / QA** (explicit **`data-theme="dark"`** vs **system + OS dark** for **`dark:`** vs CSS variables).

**Spec sync (Figma base px → spacing bridge):** `docs/specs/component/ui-primitives/panel-trigger.md`, `docs/specs/component/ui-primitives/ui-primitives.panel-trigger.md`, `docs/specs/component/filters/chip.md`.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

**Batch 5b resolution:** **`--fp-ref-*`** `:root` definitions **removed** (canonical hex → `docs/design/tokens.md` §3.1a). **Batch 16 resolution:** MD3 **`--fp-sys-color-*`** `:root` definitions **removed** (same doc tables). App SCSS gate **`var(--color-|var(--fp-sys-|var(--fp-ref-`**. (**System OS dark + tweakcn** resolved in **Batch 4** — see below.)

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
| `--fp-sys-color` | **0** (definitions) | **0** in `apps/web/src` SCSS | **Batch 16:** `--fp-sys-color-*` rows removed from `_legacy-design-tokens.scss`; **`--fp-sys-color-*`** strings may still appear in **`docs/design/tokens.md`** (documentation tables). |

**Interpretation:** No **application** SCSS/TS/HTML under `apps/web` references **`var(--fp-*)`**, **`var(--fp-ref-*)`**, or **`var(--fp-sys-*)`**. **`--fp-ref-*` CSS custom properties are no longer defined** on `:root` (see **§ Batch 5b**). **`--fp-sys-color-*`** are no longer defined on `:root` (see **§ Batch 16**). Remaining non-color **`--fp-sys-*`** definitions were removed in **§ Batch 17**.

**Do not map yet** (explicitly tied to **Batch 3** deferred roles — literal hex / no tweakcn 1:1 until product or tweakcn adds named roles; see **Batch 4** policy **4a** vs **4b**):

- **`--fp-sys-color-*` (Batch 16):** **Removed** from **`_legacy-design-tokens.scss`** — MD3 role hex authority: **`docs/design/tokens.md`** §3.1a tables; implementation: tweakcn **`--primary`**, **`--background`**, etc.
- **`--fp-ref-*` (removed from bridge):** MD3 reference ladders + typeface weights are **document-only** in **`docs/design/tokens.md` §3.1a / §3.1e** — use tweakcn / semantic tokens in implementation; Figma **`fp/ref/…`** paths map to stop rows in that doc.

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

**Code:** **`apps/web/src/styles/_legacy-design-tokens.scss`** — deleted all **`--fp-ref-*`** custom property **definitions** (five tonal ladders + five typeface lines). **`--fp-sys-color-*`** definitions were **removed in Batch 16** (no app `var(--fp-sys-color-*)` consumers).

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

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` only — computed / composed properties (shadows, `border-*`, `outline-*`, `--interactive-*`, skeleton animation token, action/menu/field/section/state roles, dark mixin + sandstone overrides) reference **tweakcn-facing names** (`--primary`, `--destructive`, `--border`, `--card`, `--foreground`, `--app-violet-accent`, etc.) per § Token mapping. **At the time:** each **`--color-*: var(--…)`** Feldpost v1 assignment block stayed for downstream; **Batch 14** removed those duplicate **`--color-*`** rows from this file after **`rg 'var(--color-' apps/web/src`** stayed at **0** (Tailwind **`@theme inline`** in **`styles.scss`** supplies shadcn **`--color-*`** for utilities).

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

### Batch 9 — Chart-token stragglers → semantics + map alias (2026-05-17)

**Slice:** No new tweakcn roles — wire remaining **success/warning/map** semantics already defined in **`styles.scss`** (`--success`, `--warning`, `--map-marker-user`). **`chart-*`** remain on **`styles.scss`** for palette roles (file-type accents, `@theme` chart aliases, **`--map-marker-user: var(--chart-1)`** indirection).

| File | Change |
|------|--------|
| `apps/web/src/app/features/map/map-shell/map-shell.component.scss` | User-location marker + halo → **`var(--map-marker-user)`** (single map token; still resolves to chart-1 at `:root`). |
| `apps/web/src/app/features/upload/upload-panel-item.component.scss` | `missing_data` / `awaiting_placement` / `complete` row + status → **`--warning`** / **`--success`**. |
| `apps/web/src/app/features/upload/upload-panel.component.scss` | Inline list status variants → **`--success`** / **`--warning`**. |
| `apps/web/src/app/features/projects/projects-page.component.scss` | `.projects-error` chrome → **`--warning`**. |
| `apps/web/src/app/features/projects/projects-formatters.logic.ts` | `colorTokenFor` success/warning keys → **`var(--success)`** / **`var(--warning)`**. |
| `apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts` | Attention-off chrome → **`var(--warning)`**. |
| `apps/web/src/styles/_legacy-design-tokens.scss` | **`--color-uploading`** → **`var(--primary)`** (aligns with upload in-progress ink elsewhere). |

| Grep (repo root) | After |
|------------------|--------|
| `rg 'var\\(--chart-' apps/web/src/app` | **0** files |

**Verify:** `cd apps/web && npx ng build` → exit **0**; `npm run design-system:check` → exit **0**.

### Batch 10 — Ink scrims + elevation shadows → `--shadow-color` (2026-05-17)

**Slice:** No new Tailwind `dark:` behavior — centralize photo/map **black ink** in tweakcn **`--shadow-color`**-derived scrims; align legacy **MD3 elevation** and dark **legacy shadow** stack with the same ink model; remove **`#fff` / `#000` / `white` / `black`** in touched component SCSS where semantics exist. **Photo lightbox** close control: deferred (still hardcoded light-on-image chrome).

| File | Change |
|------|--------|
| `apps/web/src/styles.scss` | **`--overlay-scrim-30`**, **`--overlay-scrim-55`**, **`--overlay-scrim-80`** on **`:root`** and in **`@mixin tweakcn-dark-semantic-palette`**. |
| `apps/web/src/styles/_legacy-design-tokens.scss` | **`--fp-sys-elevation-1..5`** used **`color-mix(in srgb, var(--shadow-color) …%)`** until **Batch 17** removed those MD3 elevation vars (zero consumers); dark-block **`--shadow-sm|md|lg|xl`**, **`--photo-marker-drop-shadow`** still use **`var(--shadow-color)`**. |
| `apps/web/src/app/shared/media/universal-media.component.scss` | Upload strip: **`var(--overlay-scrim-55)`**, **`var(--primary-foreground)`**, primary fill mix → **`primary-foreground`**. |
| `apps/web/src/app/shared/media-item/media-item-upload-overlay.component.scss` | Same as universal-media overlay strip. |
| `apps/web/src/app/shared/workspace-pane/footer/workspace-pane-footer/workspace-pane-footer.component.scss` | Footer dimmer → **`var(--overlay-scrim-30)`**. |
| `apps/web/src/app/archive/item-grid-legacy/media-page/media-card.component.scss` | Info gradient → **`var(--overlay-scrim-80)`**; label → **`var(--primary-foreground)`**. |
| `apps/web/src/app/archive/item-grid-legacy/media-page/media-grid.component.scss` | Card hover shadow → **`color-mix`** + **`var(--shadow-color)`**. |
| `apps/web/src/app/features/nav/nav.component.scss` | Active nav pill darken → **`var(--shadow-color)`** instead of **`#000`**. |
| `apps/web/src/app/shared/media-item/media-item.component.scss` | Border mix uses **`var(--primary)`** only (drop unused hex fallback). |
| `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-view.component.scss` | Primary spinners + button hover darken → **`primary-foreground`** / **`shadow-color`**. |
| `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-media-viewer/media-detail-media-viewer.component.scss` | Same spinner / hover treatment. |
| `apps/web/src/app/shared/photo-lightbox/photo-lightbox.component.scss` | **Batch 11** — close chrome uses **`--media-chrome-*`** (fixed light-on-image; same in dark palette). |

| Grep (repo root) | Note |
|------------------|------|
| `rg 'rgba\(0,\s*0,\s*0' apps/web/src/app --glob '*.scss'` | **0** matches (**2026-05-17**); remaining non-black **`rgba(...)`** in app SCSS (if any) are out of scope until a later slice. |

**Verify:** `cd apps/web && npx ng build` → exit **0**; `npm run design-system:check` → exit **0**.

### Batch 11 — Media chrome + auth map/scroll veils (2026-05-17)

**Slice:** No Tailwind `dark:` changes — named globals on **`:root`** + **`@mixin tweakcn-dark-semantic-palette`**; replace remaining **lightbox / upload skeleton / auth** hardcoded **`rgba(255,…)`**, **`#fff`**, and **auth-map** / **auth-scroll** duplicative theme blocks.

| File | Change |
|------|--------|
| `apps/web/src/styles.scss` | **`--media-chrome-foreground`**, **`--media-chrome-control-bg`**, **`--media-chrome-control-bg-hover`** (same in dark mixin); **`--auth-scroll-radial-sheen`** (light: white mix; dark: **`--foreground`** 16%); **`--auth-map-veil-stop-a|b|c`**, **`--auth-map-veil-flat`** (light: **`--card`** mixes; dark: **`--background`** mixes). |
| `apps/web/src/app/shared/photo-lightbox/photo-lightbox.component.scss` | Close control → **`var(--media-chrome-*)`**. |
| `apps/web/src/app/features/upload/upload-panel.component.scss` | Skeleton shimmer → **`color-mix`** + **`var(--foreground)`** (theme-aware). |
| `apps/web/src/app/features/auth/auth.styles.scss` | Scroll-edge stacks → **`transparent`** + **`var(--auth-scroll-radial-sheen)`**; map shell second radial → **`var(--primary)`** mix; remove **`:root.dark` / `[data-theme='dark']`** duplicate (variables track theme). |
| `apps/web/src/app/features/auth/auth-map-layer/auth-map-layer.component.scss` | Overlay → **`var(--auth-map-veil-*)`**; remove duplicate dark selector block. |

| Grep (repo root) | Note |
|------------------|------|
| `rg 'rgba\\(255|#fff' apps/web/src/app --glob '*.scss'` | **0** matches (**2026-05-17**, post–Batch 11) |

**Verify:** `cd apps/web && npx ng build` → exit **0**; `npm run design-system:check` → exit **0**.

### Batch 12 — Design doc: `dark:` vs semantic CSS variables (2026-05-17)

**Slice:** Markdown only — centralizes the **system-theme split** for implementers who read **`docs/design/tokens.md`** first; normative QA matrix stays in § **Risks / QA** below.

| File | Change |
|------|--------|
| `docs/design/tokens.md` | New **§ Phase 7 handoff — Tailwind `dark:` vs semantic CSS variables**: token-driven dark via mixin + `:root:not([data-theme])` vs **`dark:`** keyed only on **`[data-theme="dark"]`**; Sass / Angular build constraint; links to **`styles.scss`** and this file. |

**Verify:** `cd apps/web && npx ng build` → exit **0** (unchanged SCSS). `npm run design-system:check` optional for doc-only batch.

### Batch 13 — Special case §4: `hlm-toggle-group.scss` + CVA audit (2026-05-17)

**Slice:** Confirms **§ Special cases — item 4** is satisfied for Phase 7 token policy: global toggle chrome SCSS does not carry legacy color bridges; CVA owns interactive/state color.

| Artifact | Role |
|----------|------|
| `apps/web/src/app/shared/ui/toggle-group/hlm-toggle-group.scss` | **Layout / size tokens** (`--spacing-*`, `--radius-*`, `--hlm-toggle-item-*` padding vars, reduced-motion). **No** `var(--color-*)` / fp bridge consumers. |
| `apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts` | **`toggleGroupItemVariants`**: `bg-muted`, `data-[state=on]:bg-background`, `ring-ring`, **`var(--warning)`** for `data-[attention=true]` off-state (Batch 9). |

| Grep (repo root) | Expected |
|------------------|----------|
| `rg 'var\\(--color-|var\\(--fp-' apps/web/src/app/shared/ui/toggle-group --glob '*.scss'` | **0** matches |

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 14 — Feldpost v1 `--color-*` rows removed from legacy bridge (2026-05-17)

**Pre-removal grep (repo root):**

| Check | Command | Result |
|-------|---------|--------|
| SCSS/TS/HTML consumers | `rg 'var\\(--color-' apps/web/src` | **0** matches |
| Full `apps/web` tree (excl. archive) | `rg 'var\\(--color-' apps/web` | **0** matches (comments in `tailwind.config.js` only) |
| Archive-only stragglers | `rg 'var\\(--color-' docs/archive` | historical `photos.component.scss` (not built) |

**Removed from `apps/web/src/styles/_legacy-design-tokens.scss`:** all **`--color-bg-base|surface|elevated`**, **`--color-border|border-strong`**, **`--color-text-primary|secondary|disabled`**, **`--color-accent-brand|hover`**, **`--color-primary|primary-hover`**, **`--color-success|warning|danger`**, **`--color-uploading`**, **`--color-accent`**, **`--color-map-user-marker|search-marker`**, **`--color-clay`**, **`--color-skeleton-surface`** (duplicate of light + dark mixin + sandstone + deprecated block where applicable).

**Kept:** **`@theme inline`** mappings in **`styles.scss`**; **`--animation-skeleton-pulse`**; role aliases, shadows, typography scale, motion aliases (`--motion-*`), sandstone hex tweaks. (**`--fp-sys-color-*`** removed **Batch 16**; remaining non-color **`--fp-sys-*`** rows removed **Batch 17**.)

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 15 — Dead `--fp-alias-sp-*` / `--fp-alias-r-*` (2026-05-17)

**Pre-removal grep (repo root):**

| Check | Command | Result |
|-------|---------|--------|
| `apps/web/src` property definitions | `rg -e '--fp-alias-' apps/web/src` | **0** matches (post-removal) |

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` — removed **Figma Alias.spacing** and **Alias.radius** duplicate rows (already mapped to **`var(--spacing-*)`** / **`var(--radius-*)`** in Batch 2); two-line comment points to **`docs/design/tokens.md`**.

**Docs:** `docs/specs/component/ui-primitives/panel-trigger.md`, `ui-primitives.panel-trigger.md`, `filters/chip.md` — token tables / geometry prose use tweakcn **`var(--*)`** names (no `--fp-alias-*`).

**Figma bridge:** `node scripts/sync-tokens.mjs` → updates **`docs/design/figma-tokens.json`**.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 16 — `--fp-sys-color-*` bridge removal (2026-05-17)

**Pre-removal grep (repository root):**

| Check | Command | Result |
|-------|---------|--------|
| Any `var(--fp-sys-` under `apps/web` | `rg -l --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-' apps/web` | **0** files |
| `--fp-alias-` stragglers | `rg -e '--fp-alias-' apps/web/src` | **0** (Batch 15) |

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` — deleted **all** **`--fp-sys-color-*`** assignments from light **`:root`** and **`@mixin dark-theme-overrides`** (tweakcn-mapped rows and literal MD3 rows — no `var(--fp-sys-color-*)` call sites in `apps/web`).

**Docs:** `docs/design/tokens.md` §3.1a — two-layer table + handoff bullets state MD3 system roles are **tables / naming only**, not `:root` CSS variables.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 17 — non-color `--fp-sys-*` bridge removal (2026-05-17)

**Pre-removal grep (repository root)** — `var(--fp-sys-<prefix>)` consumers under `apps/web`, globs `*.{scss,css,ts,html}`:

| Prefix | Command | Files | Line matches |
|--------|---------|-------|----------------|
| shape | `rg --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-shape' apps/web` | **0** | **0** |
| spacing | `rg --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-spacing' apps/web` | **0** | **0** |
| elevation | `rg --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-elevation' apps/web` | **0** | **0** |
| typescale | `rg --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-typescale' apps/web` | **0** | **0** |
| state | `rg --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-state' apps/web` | **0** | **0** |
| motion | `rg --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-motion' apps/web` | **0** | **0** |
| any `--fp-sys-` | `rg --glob '*.{scss,css,ts,html}' 'var\(--fp-sys-' apps/web` | **0** | **0** |

**Post-removal (definitions gone):** `rg --glob '*.scss' '--fp-sys-' apps/web/src/styles/_legacy-design-tokens.scss` → header comment + Batch 17 comment block only (no property rows).

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` — deleted all **`--fp-sys-shape-*`**, **`--fp-sys-spacing-*`**, **`--fp-sys-elevation-*`**, **`--fp-sys-typescale-*`**, **`--fp-sys-state-*`**, **`--fp-sys-motion-*`** assignments from light **`:root`**. Semantic shadows / elevation in product code remain **`--shadow-*`**, **`--elevation-*`**, **`--overlay-scrim-*`** (Batch 10); typography **`--font-size-*`** / **`docs/design/tokens.md`** §3.1e; motion **`--motion-*`** in the same file.

**Audit — kept:** none for this slice (every group had zero `var()` consumers).

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 18 — deprecated **LEGACY MAPPING** alias audit + dead rows (2026-05-17)

**Goal:** After Batch 17, **`--fp-*`** custom properties are **not emitted** from this bridge; only comments reference historical **`--fp-sys-*` / `--fp-ref-*`**. Remaining shrink target is the **`/* LEGACY MAPPING (DEPRECATED) */`** `:root` block (typography aliases → canonical **`--font-size-2xs`** … **`--font-size-4xl`**).

**Pre-edit grep (repository root)** — `apps/web`, globs `*.{scss,css,ts,html}`:

| Check | Command | Result |
|-------|---------|--------|
| Any **`--fp-`** substring (incl. comments) | `rg --glob '*.{scss,css,ts,html}' '--fp-' apps/web` | **1** file (`_legacy-design-tokens.scss` only — **comment** lines; no **`--fp-*:`** property definitions) |
| Dead deprecated aliases (zero **`var()`** consumers) | `rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-(xs-soft|sm-tight|lg-emphasis)\)' apps/web` | **0** files, **0** matches |

**Slice:** `apps/web/src/styles/_legacy-design-tokens.scss` — removed **three** unused alias rows from the deprecated block only. **Update (Batch 25):** the remainder of that **`LEGACY MAPPING`** block is **also removed** — see §Batch 25 (historical note: Batch 18 deferred widespread callsite rewires until a single wave).

| Deprecated alias (removed) | Canonical target was | Consumer `var(--…)` |
|----------------------------|------------------------|---------------------|
| `--font-size-xs-soft` | `var(--font-size-xs)` | **0** |
| `--font-size-sm-tight` | `var(--font-size-sm)` | **0** |
| `--font-size-lg-emphasis` | `var(--font-size-lg)` | **0** |

**Deferred (ambiguous / in use):** ~~all other **`--font-size-*`** rows~~ — **resolved Batch 25** (canonical **`var(--font-size-{2xs,sm,md,lg})`** + bridge block deleted).

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 19 — deprecated **`LEGACY MAPPING`** alias inventory (doc-only, 2026-05-17)

**Goal:** After Batch 18, confirm whether another **single-row** removal under **`/* LEGACY MAPPING (DEPRECATED) */`** is safe (zero **`var(--alias)`** under **`apps/web`**). **Result:** no **zero-line** alias at table time — **every** row in the inventory had **≥ 1** `var(--font-size-<alias>)` **line** match; **Batch 20** then completed **(A)** for **`--font-size-3xs`** (**1** line / **1** file → **`var(--font-size-2xs)`**, bridge row removed).

**Scope:** `apps/web` only, globs `*.{scss,css,ts,html}` — count **lines** matching **`var(--font-size-<alias>)`** (not unique files). Canonical “maps to” column matches property RHS in **`_legacy-design-tokens.scss`** at Batch 19.

| Deprecated alias (`:root`) | Maps to (canonical) | `var(--…)` line matches |
|----------------------------|---------------------|-------------------------|
| `--font-size-caption` | `var(--font-size-2xs)` | **2** |
| `--font-size-label` | `var(--font-size-2xs)` | **8** |
| ~~`--font-size-label-soft`~~ | ~~`var(--font-size-2xs)`~~ | **0** — **removed Batch 23** |
| `--font-size-sm-soft` | `var(--font-size-sm)` | **6** |
| `--font-size-sm-strong` | `var(--font-size-sm)` | **3** |
| ~~`--font-size-sm-compact`~~ | ~~`var(--font-size-sm)`~~ | **0** — **removed Batch 22** |
| ~~`--font-size-md-compact`~~ | ~~`var(--font-size-md)`~~ | **0** — **removed Batch 24** |
| `--font-size-md-soft` | `var(--font-size-md)` | **2** |
| `--font-size-md-emphasis` | `var(--font-size-md)` | **4** |
| `--font-size-md-plus` | `var(--font-size-md)` | **7** |
| `--font-size-base` | `var(--font-size-md)` | **16** |
| `--font-size-base-strong` | `var(--font-size-lg)` | **2** |
| `--font-size-base-plus` | `var(--font-size-lg)` | **2** |
| `--font-size-base-emphasis` | `var(--font-size-lg)` | **3** |
| ~~`--font-size-5xl`~~ | ~~`var(--font-size-4xl)`~~ | **0** — **removed Batch 21** |

**Per-alias proof (repository root)** — replace `<alias>` with the kebab segment after **`--font-size-`** (e.g. `md-plus`):

```bash
rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-<alias>\)' apps/web
```

**Batch-count one-liner** (reproduce table totals):

```bash
for name in caption label sm-soft sm-strong md-soft md-emphasis md-plus base base-strong base-plus base-emphasis; do printf '%s\t' "$name"; rg --glob '*.{scss,css,ts,html}' "var\\(--font-size-${name}\\)" apps/web | wc -l; done
```

**Zero-consumer sweep (none found):** if any alias printed **`0`**, it would be a Batch-18-style removal candidate; this loop printed **≥ 1** for all rows above.

**Verify:** doc-only — `npm run design-system:check` / `ng build` optional (unchanged SCSS).

### Batch 20 — **`--font-size-3xs`** → canonical **`--font-size-2xs`** (2026-05-17)

**Slice:** one deprecated alias whose **`LEGACY MAPPING`** RHS was already **`var(--font-size-2xs)`** — replace callsites with the primitive and delete the alias row. **Canonical mapping:** [`docs/design/tokens.md`](../design/tokens.md) § typography scale — **`--font-size-2xs`** (caption / dense meta).

| Step | Detail |
|------|--------|
| Consumer | `apps/web/src/app/features/map/map-shell/_map-shell-photo-marker-states.scss` — **`var(--font-size-3xs)`** → **`var(--font-size-2xs)`** |
| Bridge | `apps/web/src/styles/_legacy-design-tokens.scss` — remove **`--font-size-3xs: var(--font-size-2xs);`** from **`/* LEGACY MAPPING (DEPRECATED) */`** |

**Proof (zero residual):**

```bash
rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-3xs\)' apps/web
rg -n '--font-size-3xs' apps/web/src/styles/_legacy-design-tokens.scss
```

→ **0** matches.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 21 — **`--font-size-5xl`** → canonical **`--font-size-4xl`** (2026-05-17)

**Slice:** one deprecated **`LEGACY MAPPING`** alias whose RHS was already **`var(--font-size-4xl)`** — replace the sole callsite with the primitive and delete the alias row. **Excluded `map/map-shell/**`** from batch scope (parallel stream); alias **`--font-size-5xl`** had **no** consumers under that path.

| Step | Detail |
|------|--------|
| Consumer | `apps/web/src/app/features/upload/upload-panel.component.scss` — **`var(--font-size-5xl)`** → **`var(--font-size-4xl)`** (dropzone icon scale) |
| Bridge | `apps/web/src/styles/_legacy-design-tokens.scss` — remove **`--font-size-5xl: var(--font-size-4xl);`** from **`/* LEGACY MAPPING (DEPRECATED) */`** |

**Proof (zero residual):**

```bash
rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-5xl\)' apps/web
rg -n '--font-size-5xl' apps/web/src/styles/_legacy-design-tokens.scss
```

→ **0** matches.

### Batch 22 — **`--font-size-sm-compact`** → canonical **`--font-size-sm`** (2026-05-17)

**Slice:** one deprecated **`LEGACY MAPPING`** alias whose RHS was already **`var(--font-size-sm)`** — replace the sole callsite with the primitive and delete the alias row. **Excluded `map/map-shell/**`** from batch scope (parallel stream); alias **`--font-size-sm-compact`** had **no** consumers under that path.

| Step | Detail |
|------|--------|
| Consumer | `apps/web/src/app/features/upload/upload-panel.component.scss` — **`&__file-status`** **`var(--font-size-sm-compact)`** → **`var(--font-size-sm)`** |
| Bridge | `apps/web/src/styles/_legacy-design-tokens.scss` — remove **`--font-size-sm-compact: var(--font-size-sm);`** from **`/* LEGACY MAPPING (DEPRECATED) */`** |

**Proof (zero residual):**

```bash
rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-sm-compact\)' apps/web
rg -n '--font-size-sm-compact' apps/web/src/styles/_legacy-design-tokens.scss
```

→ **0** matches.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 23 — **`--font-size-label-soft`** → canonical **`--font-size-2xs`** (2026-05-17)

**Slice:** one deprecated **`LEGACY MAPPING`** alias whose RHS was already **`var(--font-size-2xs)`** — replace the sole callsite with the primitive and delete the alias row. **Canonical mapping:** [`docs/design/tokens.md`](../design/tokens.md) §3.1e — **`--font-size-2xs`** (caption / dense meta).

| Step | Detail |
|------|--------|
| Consumer | `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-view.component.scss` — **`.detail-kind-chip`** **`var(--font-size-label-soft)`** → **`var(--font-size-2xs)`** |
| Bridge | `apps/web/src/styles/_legacy-design-tokens.scss` — remove **`--font-size-label-soft: var(--font-size-2xs);`** from **`/* LEGACY MAPPING (DEPRECATED) */`** |

**Proof (zero residual):**

```bash
rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-label-soft\)' apps/web
rg -n '--font-size-label-soft' apps/web/src/styles/_legacy-design-tokens.scss
```

→ **0** matches.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 24 — **`--font-size-md-compact`** → canonical **`--font-size-md`** (2026-05-17)

**Slice:** one deprecated **`LEGACY MAPPING`** alias whose RHS was already **`var(--font-size-md)`** — replace the sole callsite with the primitive and delete the alias row. **Canonical mapping:** [`docs/design/tokens.md`](../design/tokens.md) §3.1e — **`--font-size-md`** (default reading / body emphasis on the modular scale).

| Step | Detail |
|------|--------|
| Consumer | `apps/web/src/app/shared/account/account.component.scss` — **`.account-card__identity-copy p`** **`var(--font-size-md-compact)`** → **`var(--font-size-md)`** |
| Bridge | `apps/web/src/styles/_legacy-design-tokens.scss` — remove **`--font-size-md-compact: var(--font-size-md);`** from **`/* LEGACY MAPPING (DEPRECATED) */`** |

**Proof (zero residual):**

```bash
rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-md-compact\)' apps/web
rg -n '--font-size-md-compact' apps/web/src/styles/_legacy-design-tokens.scss
```

→ **0** matches.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 25 — **`LEGACY MAPPING`** **`--font-size-*`** aliases → canonical scale (**wave**, 2026-05-17)

**Goal:** One coherent migration wave — delete the entire deprecated **`/* LEGACY MAPPING (DEPRECATED) */`** **`:root`** block after **every** downstream **`var(--font-size-<alias>)`** (including **`var(--font-size-label, <fallback>)`**) uses the primitive modular scale. **Canonical authority:** [`docs/design/tokens.md`](../design/tokens.md) §3.1e.

| Deprecated alias (`:root`, removed) | Canonical replacement | Unique consumer files (`rg -l` on `var(--font-size-<alias>)` / comma form, pre-removal) |
|-------------------------------------|-------------------------|----------------------------------------------------------------------------------------|
| `--font-size-caption` | `var(--font-size-2xs)` | **2** |
| `--font-size-label` | `var(--font-size-2xs)` | **5** (includes **`media-display`** two-arg `var`) |
| `--font-size-sm-soft` | `var(--font-size-sm)` | **1** |
| `--font-size-sm-strong` | `var(--font-size-sm)` | **1** |
| `--font-size-md-soft` | `var(--font-size-md)` | **2** |
| `--font-size-md-emphasis` | `var(--font-size-md)` | **3** |
| `--font-size-md-plus` | `var(--font-size-md)` | **3** |
| `--font-size-base` | `var(--font-size-md)` | **13** |
| `--font-size-base-strong` | `var(--font-size-lg)` | **2** |
| `--font-size-base-plus` | `var(--font-size-lg)` | **1** |
| `--font-size-base-emphasis` | `var(--font-size-lg)` | **3** |

**Slice:** **`apps/web/src/**/*.scss`** (**22** unique consumer files in this wave, including **`features/map/map-shell/**`**) + **`apps/web/src/styles/_legacy-design-tokens.scss`** — remove the **second** **`:root`** block under **`LEGACY MAPPING`** only (primary **`:root`** primitives **`--font-size-2xs` … `--font-size-4xl`** unchanged).

**Deferred:** none (Batch 19 RHS mappings are **1:1** to the modular scale).

**Proof (zero residual):**

```bash
rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-(caption|label|sm-soft|sm-strong|md-soft|md-emphasis|md-plus|base|base-strong|base-plus|base-emphasis)\)' apps/web
rg -n 'LEGACY MAPPING \(DEPRECATED\)|--font-size-caption:|--font-size-label:' apps/web/src/styles/_legacy-design-tokens.scss
```

→ **0** matches.

**Ordered migration plan — `LEGACY MAPPING` font-size aliases:** **complete (Batch 25).** The per-alias **`grep -v map-shell`** ordering loop from earlier batches is **obsolete** — no deprecated font-size alias rows remain on **`:root`**. Remaining Phase 7 shrink targets are **non–font-size** bridge content in **`_legacy-design-tokens.scss`** and **`docs/design/tokens.md`** alignment.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 27 — dead layout + duplicate semantic aliases (2026-05-17)

**Goal:** Shrink **`_legacy-design-tokens.scss`** after **`rg --glob '*.{scss,css,ts,html}'`** proves **zero** `var(--…)` consumers per removed name under **`apps/web`** (definitions-only rows + unused **`--interactive-shadow-*`** chain). **No** font **`LEGACY MAPPING`** block touched.

**Slice:** **`apps/web/src/styles/_legacy-design-tokens.scss`**, **`docs/design/tokens.md`** §3.5, **`docs/design/token-layers.md`**, **`docs/migration/README.md`**, this doc.

| Removed group / token names | Command (repo root) | Pre-edit `rg` result |
| --- | --- | --- |
| Tab radii `--tab-radius-*` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--tab-radius-' apps/web` | **0** lines |
| Pane / workspace / map min `--pane-width-*`, `--layout-workspace-pane-*`, `--layout-map-safe-min-width` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--(pane-width-|layout-workspace-pane-|layout-map-safe-min-width)' apps/web` | **0** lines |
| Sidebar label `--layout-sidebar-label-size` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--layout-sidebar-label-size\\)' apps/web` | **0** lines |
| Overlay width dead rows | `rg --glob '*.{scss,css,ts,html}' 'var\\(--overlay-width-(small-(min|max)|medium-max|large-max)\\)' apps/web` | **0** lines |
| `--elevation-base` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--elevation-base\\)' apps/web` | **0** lines |
| State shadows `--shadow-hover`, `--shadow-selected`, `--shadow-error` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--shadow-(hover|selected|error)\\)' apps/web` | **0** lines |
| Borders / outlines `--border-default`, `--border-focus`, `--border-error`, `--outline-hover`, `--outline-focus` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--(border-default|border-focus|border-error|outline-hover|outline-focus)\\)' apps/web` | **0** lines |
| `--interactive-shadow-hover`, `focus`, `selected`, `error` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--interactive-shadow-' apps/web` | **0** lines |

**Retained (still consumed):** **`--overlay-width-medium-min`**, **`--overlay-width-large-min`** (`settings-overlay.component.scss`); **`--shadow-focus`**, **`--border-hover`**, **`--border-selected`**, all **`--motion-*`** / transition aliases, modular **`--font-size-*`**.

**Deferred:** Motion ladder removal (**many** `var(--motion-*)` call sites); **`--line-height-*`** / **`--font-weight-*`** (wide `var()` use); **`--content-clamp-*`**, **`--overlay-rail-*`**, remaining sidebar geometry.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 28 — dead metric `--border-sm`…`--border-xl` (2026-05-17)

**Goal:** Remove a **Batch 27 §Deferred-adjacent** cluster: the **metric border width** rows mirrored the shadow scale naming but had **no** `var()` call sites (distinct from semantic **`--border-default`** / focus rows removed in Batch 27).

**Slice:** **`apps/web/src/styles/_legacy-design-tokens.scss`**, **`docs/design/tokens.md`** §3.5, this doc, **`docs/migration/README.md`**.

| Removed token names | Command (repo root) | Pre-edit `rg` result |
| --- | --- | --- |
| `--border-sm`, `--border-md`, `--border-lg`, `--border-xl` | `rg --glob '*.{scss,css,ts,html}' 'var\\(--border-(sm|md|lg|xl)\\)' apps/web` | **0** lines |

**Retained:** **`--border-hover`**, **`--border-selected`**, **`--field-border: var(--border-strong)`** (tweakcn **`--border-strong`** in **`styles.scss`**).

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 29 — dead **`--action-*`** aliases (**`bg-active`**, **`border-default`**) (2026-05-17)

**Goal:** Shrink **`:root`** / theme blocks using **`rg --glob '*.{scss,css,ts,html}'`** — **Batch 27 §Deferred-adjacent** (semantic **`--action-*`** row inventory): remove definitions with **no** `var(--…)` call sites anywhere under **`apps/web`**.

**Slice:** **`apps/web/src/styles/_legacy-design-tokens.scss`** only (no **`@mixin dark-theme-overrides`** rows existed for these names).

| Removed token names | Command (repo root) | Pre-edit `rg` result |
| --- | --- | --- |
| `--action-bg-active`, `--action-border-default` | `rg --glob '*.{scss,css,ts,html}' 'var\(--action-(bg-active|border-default)\)' apps/web` | **0** lines |

**Post-edit:** same `var(--…)` pattern → **0**; `rg -n -e '--action-(bg-active|border-default)' apps/web/src/styles/_legacy-design-tokens.scss` → **0** lines.

**Retained (still consumed):** **`--action-bg-default`**, **`--action-bg-hover`**, **`--action-border-active`**, **`--action-text-default`**, **`--action-text-active`**.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 30 — zero-consumer typography / radius / motion / container / Layer C rows (2026-05-17)

**Goal:** Remove **`apps/web/src/styles/_legacy-design-tokens.scss`** definitions whose names have **no** `var(--…)` call sites under **`apps/web`** (`rg --glob '*.{scss,css,ts,html}'` from repo root).

**Slice:** **`apps/web/src/styles/_legacy-design-tokens.scss`**, **`docs/design/tokens.md`**, **`docs/design/token-layers.md`**, **`docs/design/motion.md`**, this doc, **`docs/migration/README.md`**.

| Token / cluster | Command (repo root) | Pre-edit `rg --count-matches` |
| --- | --- | --- |
| `--line-height-dense` | `rg --glob '*.{scss,css,ts,html}' --count-matches 'var\\(--line-height-dense\\)' apps/web` | **0** |
| `--radius-md-plus`, `--radius-lg-plus` | `rg --glob '*.{scss,css,ts,html}' --count-matches 'var\\(--radius-(md-plus|lg-plus)\\)' apps/web` | **0** |
| `--transition-panel` | `rg --glob '*.{scss,css,ts,html}' --count-matches 'var\\(--transition-panel\\)' apps/web` | **0** |
| `--container-radius-pill` | `rg --glob '*.{scss,css,ts,html}' --count-matches 'var\\(--container-radius-pill\\)' apps/web` | **0** |
| `--state-success-bg`, `--state-info-bg` | `rg --glob '*.{scss,css,ts,html}' --count-matches 'var\\(--state-(success|info)-bg\\)' apps/web` | **0** |
| `--section-title` | `rg --glob '*.{scss,css,ts,html}' --count-matches 'var\\(--section-title\\)' apps/web` | **0** |

**Retained (still consumed):** remaining **`--line-height-*`**, **`--radius-sm|md|lg|xl|full`**, **`--transition-fade-*`**, **`--container-radius-control|panel`**, **`--section-bg`**, **`--section-text`**, **`--state-warning-bg`**, **`--state-danger-bg`**.

**Panel-level motion:** Use **`var(--motion-duration-base) var(--motion-ease-standard)`** (or Tailwind duration/easing utilities) where panel choreography needs the former **`--transition-panel`** value — see **`docs/design/motion.md`**.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 31 — bridge-only indirection + unused Layer C (**`--section-border`**) (2026-05-17)

**Goal:** Remove **≥6** custom properties proven **dead** for **component** `var(--…)` usage (grep **excluding** **`_legacy-design-tokens.scss`**) by **inlining** remaining internal references so light/dark focus rings and transition aliases stay behavior-identical.

**Pre-edit audit:** for each removed **`--<name>`**, `rg --glob '*.{scss,css,ts,html}' --glob '!**/_legacy-design-tokens.scss' --count-matches 'var\\(--<name>\\)' apps/web` summed to **0** (no component / non-bridge consumers).

| Removed `--<name>` | Post-edit: `var(--<name>)` anywhere under `apps/web` |
| --- | --- |
| `--section-border` | **0** (also removed **`[data-theme='sandstone']`** override) |
| `--font-size-ratio` | **0** (typography ladder uses literal **1.13** factors) |
| `--spacing-unit` | **0** (`--spacing-1`…`--spacing-8` use **`calc(0.25rem * N)`**) |
| `--ui-item-media-size-default` | **0** (`--photo-marker-body-size: calc(var(--spacing-6) * 1.25)`) |
| `--shadow-focus-ring` | **0** (ring values live on **`--interactive-focus-ring`** + dark **`--shadow-focus`**) |
| `--motion-ease-in` | **0** (**`--transition-fade-out`** inlines **`cubic-bezier(0.4, 0, 1, 1)`**) |
| `--transition-interactive` | **0** (**`--transition-fade-in`** inlines **`var(--motion-duration-fast) var(--motion-ease-out)`**) |
| `--transition-emphasis` | **0** (**`--animation-skeleton-pulse`** uses **`var(--motion-duration-base)`**) |

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

**Documentation drift (Batch 31 follow-up):** closed — **`item-grid.state-and-fsm.md`** choreography uses motion tokens; phase-8 §7 slice prose matches **`--interactive-focus-ring`** / **`--shadow-focus`**; **`docs/skills/feldpost-component/SKILL.md`** lists current emphasis timing (no **`--transition-emphasis`**).

### Batch 32 — single-consumer inlining (**six** `:root` rows) (2026-05-17)

**Goal:** Shrink **`_legacy-design-tokens.scss`** by removing custom properties that had **exactly one** external **`var(--<name>)`** callsite under **`apps/web`** (per-token **`rg --glob '*.{scss,css,ts,html}' --glob '!**/_legacy-design-tokens.scss' --count-matches`**, summed across files = **1** before edit). Each callsite was inlined with the **same computed value** (or **`var(--font-size-md)`** for the former cluster label size); then the **`--<name>`** row was deleted from **`:root`**.

| Removed `--<name>` | Pre-edit consumer sum (excludes bridge) | Inlined at |
| --- | --- | --- |
| `--z-map` | **1** | **`apps/web/src/app/features/map/map-shell/_map-shell-layout.scss`** → **`z-index: 0`** |
| `--content-clamp-text` | **1** | **`apps/web/src/styles/layout/clamp.scss`** → **`max-width: 38rem`** on **`.content-clamp--text`** |
| `--font-weight-regular` | **1** | **`apps/web/src/app/shared/ui-primitives/group-header.component.scss`** → **`font-weight: 400`** |
| `--line-height-relaxed` | **1** | **`apps/web/src/app/features/auth/auth.styles.scss`** → **`line-height: 1.6`** |
| `--photo-marker-cluster-font-size` | **1** | **`apps/web/src/styles/_map-shell-leaflet-global.scss`** → **`font-size: var(--font-size-md)`** |
| `--layout-sidebar-icon-size` | **1** | **`apps/web/src/app/features/nav/nav.component.scss`** → **`--sidebar-icon-size: 1.25rem`** |

**Post-edit proof (each name → 0 external `var()`):**  
`rg --glob '*.{scss,css,ts,html}' --glob '!**/_legacy-design-tokens.scss' --count-matches 'var\\(--(z-map|content-clamp-text|font-weight-regular|line-height-relaxed|photo-marker-cluster-font-size|layout-sidebar-icon-size)\\)' apps/web` → **no output** (sum **0**).

**Docs:** **`docs/design/tokens.md`** (z-index table + Figma naming table), **`docs/design/design-system/page-layout-framework.md`**, **`docs/design/design-system/layout-width-breakpoint-scale.md`**.

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0**.

### Batch 26 — post–**`LEGACY MAPPING`** font block audit (2026-05-17)

**Goal:** Confirm no **`apps/web`** regressions to removed deprecated **`var(--font-size-<alias>)`** names (Batch 19 inventory / §Batch 25 proof); align docs with **post–second-`:root`-block** bridge reality.

| Check | Command (repo root) | Result |
|-------|---------------------|--------|
| Deprecated alias **`var()`** consumers | `rg --glob '*.{scss,css,ts,html}' 'var\(--font-size-(caption|label|sm-soft|sm-strong|md-soft|md-emphasis|md-plus|base|base-strong|base-plus|base-emphasis)\)' apps/web` | **0** lines |
| **`LEGACY MAPPING`** string in shipped web tree | `rg 'LEGACY MAPPING' apps/web` | **0** files |
| Canonical modular scale (expected many hits) | `rg 'var\(--font-size-(2xs|xs|sm|md|lg|xl|2xl|3xl|4xl)\)' apps/web` | unchanged — **not** stragglers |

**What still lives in `_legacy-design-tokens.scss` after Batch 25:** tweakcn-facing **semantic** rows (shadows, borders, elevation, **`--motion-*`** / transition aliases, z-index ladder, **`--spacing-*`**, **`--radius-*`**, layout / overlay / marker geometry tokens, **`--action-*` / `--menu-*` / `--field-*` / `--section-*` / `--state-*`**, skeleton **`--animation-skeleton-pulse`**, dark mixin overrides) — **not** a second deprecated font alias map.

**Slice:** **`docs/migration/phase-7-token-migration.md`**, **`docs/migration/README.md`**, **`apps/web/src/app/shared/workspace-pane/media-detail/media-detail-view.component.scss`** (stale **`--text-h2`** comment only).

**Verify:** `npm run design-system:check` → exit **0**; `cd apps/web && npx ng build` → exit **0** (SCSS touched).

## Risks / QA

**Theming — `dark:` vs semantic dark**

- **Design doc mirror (Batch 12):** [`docs/design/tokens.md`](../design/tokens.md) § **Phase 7 handoff — Tailwind `dark:` vs semantic CSS variables**.
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
| `--fp-sys-color-*` (logical MD3 names in `tokens.md` §3.1a) | Respective tweakcn semantic when a 1:1 exists; else hex from design tables | **`--fp-sys-color-*` not on `:root` after Batch 16** — add tweakcn named roles or use literals via approved design tokens only |
| `--fp-ref-*` | **Never in components** — if encountered, replace with semantic or remove dead code | |
| Photo/map bottom scrims, raw **`rgba(0,0,0,…)`** on media chrome | **`--overlay-scrim-30`**, **`--overlay-scrim-55`**, **`--overlay-scrim-80`** (`color-mix` + **`var(--shadow-color)`**) | **Batch 10** | Utilities like `bg-primary` map through `--color-primary` in `styles.scss` — that is **not** the same as `var(--color-*)` in component SCSS. Phase 7 targets **hand-written `var(--color-…)`** in SCSS files; keep `@theme inline` mapping coherent when adding `--warning` / `--success`. |
| Light-on-image controls, auth map/scroll veils (hardcoded warm ink) | **`--media-chrome-*`**, **`--auth-scroll-radial-sheen`**, **`--auth-map-veil-*`** | **Batch 11** | **`--media-chrome-foreground`** stays fixed **oklch(1 0 0)** in both palettes; auth veils use **`--card`** (light) / **`--background`** (dark). |

---

## Special cases

1. **`@import '@angular/cdk/overlay-prebuilt.css'`**  
   - **Done:** loaded from **`styles.scss`** (not from the removed `tokens.scss` graph). Re-verify overlays when changing load order.

2. **Feldpost v1 `--color-*` on `:root` (legacy bridge file)**  
   - **Done (Batch 14, 2026-05-17):** removed duplicate **`--color-*`** assignments from **`_legacy-design-tokens.scss`** after **`rg 'var\(--color-' apps/web/src`** stayed at **0**; Tailwind **`extend.colors`** and **`@theme inline`** already point at **`var(--background)`** / **`var(--primary)`** / shadcn **`--color-*`** keys in **`styles.scss`**.  
   - **Link baseline** uses **`var(--primary)`** in `styles.scss` today — unchanged.

3. **Map tokens** (marker colors, cluster halo, selection rings)  
   - If they still use `--color-*` or raw hex, introduce **`--map-*`** (or reuse chart tokens) in tweakcn blocks with three-theme coverage.

4. **`hlm-toggle-group.scss`** (**Batch 13, 2026-05-17**)  
   - **Audited:** `hlm-toggle-group.scss` has **no** legacy **`var(--color-*|--fp-*)`** — geometry + spacing + motion only. **State / hover / focus / attention** colors live in **`toggle-group-variants.ts`** (CVA + Tailwind + **`var(--warning)`** for attention-off). Phase 8 may still **drop** this `@use` from `styles.scss` per global-SCSS plan; no token migration blocker here.

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
- **Delete / shrink bridge:** Retire **`_legacy-design-tokens.scss`** (or replace with minimal stubs) only after Phase 7 acceptance gates pass and `cd apps/web && npx ng build` is green **without** remaining consumers of its **`--fp-*`** outputs and other bridge-only contracts. **Batch 14** removed Feldpost v1 **`--color-*`** duplicates from this file ( **`@theme inline`** in **`styles.scss`** owns shadcn **`--color-*`** for utilities).
- **`@theme inline` in `styles.scss`** (shadcn-style **`--color-primary`**, etc.): not the same as removed Feldpost v1 **`--color-bg-*`** names; keep coherent when adding semantic tokens.
