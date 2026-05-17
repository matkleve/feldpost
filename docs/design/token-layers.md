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

**Code is canonical.** **`@mixin dark-theme-overrides`** (used by **`[data-theme='dark']`** and **`prefers-color-scheme: dark`**) overrides **`--interactive-focus-ring`** only (**Phase 7 Batch 45** removed bridge **`--shadow-sm` / `--shadow-focus`** — physical **`--shadow-*`** are tweakcn **`styles.scss`**). **`--shadow-md|lg|xl`**, tweakcn semantic colors (**`--primary`**, **`--card`**, …), and MD3 **`--fp-sys-*`** documentation tables are **not** emitted from **`_legacy-design-tokens.scss`**.

#### Typography baseline (`_typography-baseline.scss`)

**`:root`** in **`apps/web/src/styles/_typography-baseline.scss`** (loaded after the legacy bridge and **`styles.scss` `@theme inline`** in **`styles.scss`**) defines **`--font-size-*`**, **`--font-weight-*`**, **`--line-height-{tight,solid,reading,comfortable}`**, **`--motion-duration-fast`** / **`--motion-ease-out`**, **`--spacing-1`…`--spacing-8`**, **`--radius-full`**, and **`--container-radius-control|panel`** — Phase 7 **Batch 41–44** (`docs/migration/phase-7-token-migration.md` §Batch 41 / §Batch 42 / §Batch 44).

| Token |
| --- |
| `--line-height-tight`, `--line-height-solid`, `--line-height-reading`, `--line-height-comfortable` |
| `--font-size-2xs`, `--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl` |
| `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold` |
| `--motion-duration-fast`, `--motion-ease-out` |
| `--spacing-1` … `--spacing-6`, `--spacing-8` (the former **12×4px** step is **`calc(0.25rem * 12)`** at callsites — **Batch 41** removed **`--spacing-7`**) |
| `--radius-full`, `--container-radius-control`, `--container-radius-panel` |

#### Tailwind theme radius (`styles.scss` `@theme inline`)

**After the legacy bridge** — **`--radius-sm`**, **`--radius-md`**, **`--radius-lg`**, **`--radius-xl`** (from tweakcn **`--radius`**). **Batch 44** removed duplicate bridge rows for **`--radius-sm|md|lg`**.

**Layer A (legacy bridge primitives — `_legacy-design-tokens.scss` `:root` only)**

| Note |
| --- |
| **Phase 7 Batch 45:** no physical **`--shadow-*`** rows on the bridge — tweakcn **`styles.scss`** owns the ladder. |

**Phase 7 Batch 43:** product **z-index** uses literals **`200` / `300` / `500`** (plus **`302`** / **`501`** where documented calcs apply) and Tailwind **`z-upload-btn`**, **`z-dropdown`**, **`z-modal`** — **not** **`--z-upload-button`**, **`--z-dropdown`**, or **`--z-modal`** rows on **`_legacy-design-tokens.scss`**.

**Layer B (bridge)**

| Token |
| --- |
| `--interactive-focus-ring` |

**Layer C (bridge)**

| Token |
| --- |
| `--action-bg-hover`, `--action-text-default`, `--action-text-active` |
| `--menu-surface-border`, `--menu-item-bg-hover`, `--menu-item-text` |

**Optional `[data-theme='sandstone']` overrides** (same file): `--action-bg-hover`, `--action-text-default`, `--action-text-active`, `--menu-surface-border`, `--menu-item-bg-hover`, `--menu-item-text` (literal or mix values — not an expanded `:root` contract).

---

### Layer A: Foundation Tokens

Global design primitives that represent raw design values.

- **Color foundations** (tweakcn / theme, not the legacy bridge file): `--foreground`, `--background`, `--primary`, `--muted`, `--border`, … — see `docs/design/tokens.md` §3.1a handoff and shipped theme.
- **Radius / spacing:** **`--radius-sm|md|lg|xl`** from **`styles.scss` `@theme inline`**; **`--radius-full`**, **`--spacing-*`**, **`--container-radius-*`** on **`_typography-baseline.scss`** `:root` (**Batch 44**); **Batch 40** removed **`--container-padding-*`**, **`--container-gap-*`**, and other container metric aliases — use **`var(--spacing-*)`** at callsites. **Typography scale** (**`--font-size-*`**, **`--font-weight-*`**, **`--line-height-*`** shipped as vars, **`--motion-duration-fast`** / **`--motion-ease-out`**) lives on **`_typography-baseline.scss`** `:root` (see subsection above — **Batch 41–42**), not the legacy bridge file.
- **Elevation / depth:** bind **`box-shadow`** to **`var(--shadow-sm|md|lg|xl)`** from **tweakcn `styles.scss`** (**Batch 39** removed duplicate **`md|lg|xl`** bridge rows; **Batch 45** removed bridge **`--shadow-sm` / `--shadow-focus`**). **Batch 37** removed **`--elevation-*`** bridge aliases. **Batch 43:** product **z-index** is literal / Tailwind theme — not **`--z-upload-button|--z-dropdown|--z-modal`** on the bridge (see **`docs/design/tokens.md`** §3.5).
- **Layout class shells** (`.ui-container`, `.ui-item`, …): geometry and padding are expressed with **spacing tokens** and utilities in implementation — there are **no** **`--ui-item-*`** custom properties in the repo; do not document them as CSS vars.

### Layer B: Interaction Aliases

Cross-component aliases for shared interaction behavior.

- **`--interactive-border-muted`** and **`--interactive-surface-hover`** were **removed from `:root`** in **Phase 7 Batch 36** — they are **not** bridge names to bind in new work. Equivalent mixes are **inlined** at the few Layer C / feature callsites (for example **`color-mix(in srgb, var(--border) 72%, transparent)`** on settings **`--settings-border-muted`**, **`color-mix(in srgb, var(--primary) 12%, transparent)`** on **`--settings-hover-focus`**), and internal rows such as **`--action-bg-hover`** / **`--menu-surface-border`** carry the same resolved colors without a **`var(--interactive-*)`** hop — see **`docs/migration/phase-7-token-migration.md`** §Batch 36.
- **`--interactive-focus-ring`** — the only Layer B bridge name today (see inventory table). **Batch 41** removed **`--interactive-transition-standard`** — inline the same multi-property timing (for example **`120ms ease-out`**) or use **`var(--motion-duration-fast) var(--motion-ease-out)`** per **`docs/design/motion.md`** / callsite SCSS.

### Layer C: Component-Role Aliases

Role-level aliases consumed by reusable UI primitives and feature components. **Only** the names in the **Layer C (bridge)** inventory table above are defined on **`:root`** today.

1. Action controls

- **`--action-bg-hover`**, **`--action-text-default`**, **`--action-text-active`**
- **`--action-bg-default`** — **removed Batch 40** — use literal **`transparent`** or omit background at callsites.
- **`--action-border-active`** — **removed Batch 39** — inlined at **`project-card.component.scss`** (default + Sandstone branch).

2. Menu and option surfaces

- **`--menu-surface-bg`** — **removed Batch 39** — use **`var(--popover)`** (or **`var(--card)`**) at callsites.
- **`--menu-surface-border`**, **`--menu-item-bg-hover`**, **`--menu-item-text`**
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

1. New or refactored components consume Layer C aliases first.
2. Layer C aliases resolve to Layer A/B in `apps/web/src/styles.scss`.
3. Avoid binding feature-level styles directly to Layer A where a Layer C alias exists.
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
