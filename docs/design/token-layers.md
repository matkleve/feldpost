# Feldpost - Token Layers

Load this file for semantic token layering, alias mapping, and theme override rules.

## Purpose

This file is the canonical source for token-layer architecture.

- `docs/design/tokens.md` defines concrete token values.
- `docs/design/token-layers.md` defines how tokens are organized and consumed.
- `apps/web/src/styles.scss` is the runtime implementation.

If guidance conflicts, this file defines layer ownership; `tokens.md` defines values.

## Layer Ownership

### Legacy bridge inventory (`_legacy-design-tokens.scss`)

**Code is canonical.** **`apps/web/src/styles.scss`** documents in its header that the legacy bridge partial is **comment-only on disk** and **not** `load-css`'d. **Phase 7 Batch 50:** **`apps/web/src/styles/_legacy-design-tokens.scss`** is an **emission-empty stub** (**`//` comments only** — **no** **`:root`**, **no** **`--*`** rows); there is **no** **`meta.load-css('styles/legacy-design-tokens')`** in **`styles.scss`** — **removed 2026-05-18**, zero runtime emit; disk stub kept for migration cross-refs. **`_legacy-design-tokens.scss`** no longer ships a **`@mixin dark-theme-overrides`** block (**Phase 7 Batch 47** moved **`--interactive-focus-ring`** + dark overrides to **`_typography-baseline.scss`**). **`--shadow-md|lg|xl`**, tweakcn semantic colors (**`--primary`**, **`--card`**, …), and MD3 **`--fp-sys-*`** documentation tables are **not** emitted from **`_legacy-design-tokens.scss`**.

#### Typography baseline (`_typography-baseline.scss`)

**`:root`** in **`apps/web/src/styles/_typography-baseline.scss`** (loaded after **`styles.scss` `@theme inline`** via **`meta.load-css('styles/typography-baseline')`**) defines **`--font-size-*`**, **`--font-weight-*`**, **`--line-height-{tight,solid,reading,comfortable}`**, **`--motion-duration-fast`** / **`--motion-ease-out`**, **`--spacing-1`…`--spacing-8`**, **`--radius-full`**, **`--container-radius-control|panel`**, and **`--interactive-focus-ring`** (light) — Phase 7 **Batch 41–44** + **Batch 47** (`docs/migration/phase-7-token-migration.md` §Batch 41 / §Batch 42 / §Batch 44 / §Batch 47). **`[data-theme='dark']`** and **`@media (prefers-color-scheme: dark)`** on **`:root:not([data-theme='light'])`** apply **`@mixin typography-baseline-dark-focus-ring`** so the ring **`color-mix`** tracks dark primary (**Batch 47**).

| Token |
| --- |
| `--line-height-tight`, `--line-height-solid`, `--line-height-reading`, `--line-height-comfortable` |
| `--font-size-2xs`, `--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl` |
| `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` |
| `--motion-duration-fast`, `--motion-ease-out` |
| `--spacing-1` … `--spacing-6`, `--spacing-8` (the former **12×4px** step is **`calc(0.25rem * 12)`** at callsites — **Batch 41** removed **`--spacing-7`**) |
| `--radius-full`, `--container-radius-control`, `--container-radius-panel` |
| **`--interactive-focus-ring`** (light on **`:root`**; dark via **`typography-baseline-dark-focus-ring`**) |

#### Tailwind theme radius (`styles.scss` `@theme inline`)

**In `styles.scss` `@theme inline`** (after tweakcn semantic blocks in that file — **Batch 50:** **`_legacy-design-tokens.scss`** is not in the runtime pipeline) — **`--radius-sm`**, **`--radius-md`**, **`--radius-lg`**, **`--radius-xl`** (from tweakcn **`--radius`**). **Batch 44** removed duplicate bridge rows for **`--radius-sm|md|lg`**.

**Layer A (legacy bridge — Batch 50: no `:root` emission)**

| Note |
| --- |
| **Phase 7 Batch 50:** bridge file emits **no** CSS — use tweakcn `styles.scss` + `_typography-baseline.scss` for primitives. |
| **Phase 7 Batch 45:** no physical **`--shadow-*`** rows on the bridge — tweakcn **`styles.scss`** owns the ladder. |

**Phase 7 Batch 43:** product **z-index** uses literals **`200` / `300` / `500`** (plus **`302`** / **`501`** where documented calcs apply) and Tailwind **`z-upload-btn`**, **`z-dropdown`**, **`z-modal`** — **not** **`--z-upload-button`**, **`--z-dropdown`**, or **`--z-modal`** rows on **`_legacy-design-tokens.scss`**.

**Layer B (bridge):** **none on `_legacy-design-tokens.scss`** after **Batch 47** — **`--interactive-focus-ring`** lives on **`_typography-baseline.scss`** (see subsection above).

**Layer C (roles — not on `_legacy-design-tokens.scss` after Batch 48–50)**

| Note |
| --- |
| **Phase 7 Batch 49:** no **`--action-*`** rows on the bridge file — primary-hover / default action ink live on component **`:host`** / **`:host-context([data-theme='sandstone'])`** (or **`--settings-action-bg-hover`** on settings) — see **`docs/migration/phase-7-token-migration.md`** §Batch 49. |

Optional **`[data-theme='sandstone']`** overrides for former Layer C **action** names are **not** global on the bridge after **Batch 49**; Sandstone-specific mixes mirror the pre-removal **`_legacy-design-tokens.scss`** values on the same per-component hosts. **Phase 7 Batch 48** removed **`--menu-*`** bridge rows; menu surfaces bind **`color-mix(in srgb, var(--border) …)`**, **`color-mix(in srgb, var(--primary) …)`**, and **`var(--foreground)`** on component **`:host`** (sandstone literals preserved via **`:host-context([data-theme='sandstone'])`** — see **`docs/migration/phase-7-token-migration.md`** §Batch 48). Dropdown shell and menu surface contracts: [`docs/specs/component/filters/dropdown-system.md`](../specs/component/filters/dropdown-system.md).

### Layer A: Foundation Tokens

Global design primitives that represent raw design values.

- **Color foundations** (tweakcn / theme, not the legacy bridge file): `--foreground`, `--background`, `--primary`, `--muted`, `--border`, … — see `docs/design/tokens.md` §3.1a handoff and shipped theme.
- **Radius / spacing:** **`--radius-sm|md|lg|xl`** from **`styles.scss` `@theme inline`**; **`--radius-full`**, **`--spacing-*`**, **`--container-radius-*`** on **`_typography-baseline.scss`** `:root` (**Batch 44**); **Batch 40** removed **`--container-padding-*`**, **`--container-gap-*`**, and other container metric aliases — use **`var(--spacing-*)`** at callsites. **Typography scale** (**`--font-size-*`**, **`--font-weight-*`**, **`--line-height-*`** shipped as vars, **`--motion-duration-fast`** / **`--motion-ease-out`**) lives on **`_typography-baseline.scss`** `:root` (see subsection above — **Batch 41–42**), not the legacy bridge file.
- **Elevation / depth:** bind **`box-shadow`** to **`var(--shadow-sm|md|lg|xl)`** from **tweakcn `styles.scss`** (**Batch 39** removed duplicate **`md|lg|xl`** bridge rows; **Batch 45** removed bridge **`--shadow-sm` / `--shadow-focus`**). **Batch 37** removed **`--elevation-*`** bridge aliases. **Batch 43:** product **z-index** is literal / Tailwind theme — not **`--z-upload-button|--z-dropdown|--z-modal`** on the bridge (see **`docs/design/tokens.md`** §3.5).
- **Layout class shells** (`.ui-container`, `.ui-item`, …): geometry and padding are expressed with **spacing tokens** and utilities in implementation — there are **no** **`--ui-item-*`** custom properties in the repo; do not document them as CSS vars.

### Layer B: Interaction Aliases

Cross-component aliases for shared interaction behavior.

- **`--interactive-border-muted`** and **`--interactive-surface-hover`** were **removed from `:root`** in **Phase 7 Batch 36** — they are **not** bridge names to bind in new work. Equivalent mixes are **inlined** at the few Layer C / feature callsites (for example **`color-mix(in srgb, var(--border) 72%, transparent)`** on settings **`--settings-border-muted`**, **`color-mix(in srgb, var(--primary) 12%, transparent)`** on **`--settings-hover-focus`** / **`--settings-action-bg-hover`**) — see **`docs/migration/phase-7-token-migration.md`** §Batch 36 / §Batch 49.
- **`--interactive-focus-ring`** — **Batch 47** moved this name to **`_typography-baseline.scss`** (not the legacy bridge file). **Batch 41** removed **`--interactive-transition-standard`** — inline the same multi-property timing (for example **`120ms ease-out`**) or use **`var(--motion-duration-fast) var(--motion-ease-out)`** per **`docs/design/motion.md`** / callsite SCSS.

### Layer C: Component-Role Aliases

Role-level aliases consumed by reusable UI primitives and feature components. **`_legacy-design-tokens.scss`** (**Batch 50** stub — **no** **`:root`**) defines **no** Layer C **action** or **menu** names after **Batch 48–49** (**`--interactive-focus-ring`** is **not** on the bridge — **Batch 47**). **Batch 49** removed **`--action-bg-hover`**, **`--action-text-default`**, **`--action-text-active`** (and the sandstone **`[data-theme='sandstone']`** mirror) from the bridge; callsites use **`var(--primary)`**, per-component **`:host`** custom properties (ex-bridge values), or **`--settings-action-bg-hover`** — **`docs/migration/phase-7-token-migration.md`** §Batch 49. **Batch 48** removed **`--menu-*`** from the bridge; menu surfaces use tweakcn **`var(--border|primary|foreground)`** in **`color-mix`** / per-component **`:host`** custom properties (see subsection above + **`docs/migration/phase-7-token-migration.md`** §Batch 48 + [`docs/specs/component/filters/dropdown-system.md`](../specs/component/filters/dropdown-system.md)).

1. Action controls

- **`--action-bg-hover`**, **`--action-text-default`**, **`--action-text-active`** — **removed Batch 49** — use **`var(--primary)`** where the bridge aliased **`--action-text-active`**, and per-component **`:host`** / **`:host-context([data-theme='sandstone'])`** custom properties for the former **`color-mix(in srgb, var(--primary) 12%, transparent)`** / **`#c59f63` sandstone** hover wash and **`var(--muted-foreground)`** / **`#6b5a47`** default ink (see **`metadata-section`**, **`captured-date-editor`**, **`media-detail-view.component.part2`**, **`project-card`**) or **`--settings-action-bg-hover`** on **`settings-overlay`** — **`docs/migration/phase-7-token-migration.md`** §Batch 49.
- **`--action-bg-default`** — **removed Batch 40** — use literal **`transparent`** or omit background at callsites.
- **`--action-border-active`** — **removed Batch 39** — inlined at **`project-card.component.scss`** (default + Sandstone branch).

2. Menu and option surfaces

- **`--menu-surface-bg`** — **removed Batch 39** — use **`var(--popover)`** (or **`var(--card)`**) at callsites.
- **`--menu-surface-border`**, **`--menu-item-bg-hover`**, **`--menu-item-text`** — **removed from bridge Batch 48** — use **`color-mix(in srgb, var(--border) 72%, transparent)`**, **`color-mix(in srgb, var(--primary) 8%, transparent)`**, **`var(--foreground)`** (and per-component **`:host`** + sandstone **`:host-context`** where the old **`[data-theme='sandstone']`** bridge differed) — **`docs/migration/phase-7-token-migration.md`** §Batch 48.
- **`--menu-item-bg-active`** — **removed Batch 39** — inline **`color-mix(in srgb, var(--primary) 12%, transparent)`** ([**`docs/migration/phase-7-token-migration.md`**](../migration/phase-7-token-migration.md) §Batch 39).
- **Active menu item label ink:** **`var(--primary)`** at callsites (**Batch 38** removed **`--menu-item-text-active`**).

3. Form controls

- **`--field-*`** — **removed Batch 46** — bind inputs to **`var(--card)`**, **`var(--border-strong)`**, **`var(--primary)`**, **`var(--text-disabled)`**, **`var(--foreground)`** per **`docs/migration/phase-7-token-migration.md`** §Batch 46.

4. Settings sections and cards

- **`--section-bg`** — **removed Batch 39** — use **`var(--card)`** (often inside **`color-mix`**) at callsites.
- **`--section-text`** — **removed Batch 40** — use **`var(--muted-foreground)`** (or theme-specific literals where Sandstone required) at callsites.

5. Feedback states

- **`--state-warning-bg`** / **`--state-danger-bg`** — **removed Batch 39** — use **`color-mix(in srgb, var(--warning|destructive) 12%, transparent)`** at callsites ([**`docs/migration/phase-7-token-migration.md`**](../migration/phase-7-token-migration.md) §Batch 39); do not prescribe these names as **`:root`** bridge tokens.

## Consumption Rules

1. New or refactored components consume Layer C **role bindings** first (per-component **`:host`** / feature-local custom properties where those names are not global).
2. Layer C roles resolve to Layer A/B via **tweakcn + `@theme inline` in `apps/web/src/styles.scss`**, **`_typography-baseline.scss`** (via **`meta.load-css('styles/typography-baseline')`**), and **`:host`** SCSS — **not** via **`_legacy-design-tokens.scss`** (**Batch 50** stub).
3. Avoid binding feature-level styles directly to Layer A where a stable Layer C-style alias or documented **`color-mix`** pattern exists.
4. Theme packs override Layer C first, Layer A only for global rebranding.

## Theme Override Strategy

1. Foundation theme packs may redefine Layer A for broad visual identity shifts.
2. Product themes should prefer Layer C overrides to preserve component contracts.
3. Any Layer C override must preserve contrast and focus visibility requirements.

## Verification Checklist

1. Updated components do not introduce new hardcoded colors/spacing.
2. Focus states still use visible focus ring aliases.
3. Active/hover/disabled states remain semantically clear in light and dark themes.
4. Build and visual regression checks pass for affected primitives.
