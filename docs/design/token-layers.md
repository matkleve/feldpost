# Feldpost - Token Layers

Load this file for semantic token layering, alias mapping, and theme override rules.

## Purpose

This file is the canonical source for token-layer architecture.

- `docs/design/tokens.md` defines concrete token values.
- `docs/design/token-layers.md` defines how tokens are organized and consumed.
- `apps/web/src/styles.scss` is the runtime implementation.

If guidance conflicts, this file defines layer ownership; `tokens.md` defines values.

## Layer Ownership

### Layer A: Foundation Tokens

Global design primitives that represent raw design values.

- Color foundations: `--color-bg-*`, `--color-border*`, `--color-text-*`, semantic states
- Radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`
- Elevation / depth: bind **`box-shadow`** to **`var(--shadow-sm|md|lg|xl)`**. **Phase 7 Batch 39:** **`--shadow-sm`** (and **`--shadow-focus`**) are defined on **`_legacy-design-tokens.scss`**; **`--shadow-md|lg|xl`** are **tweakcn `:root`** names (legacy bridge duplicate rows removed — dark mixin adjusts **`sm`/`focus` only**). **Batch 37** removed **`--elevation-subtle`**, **`--elevation-overlay`**, and **`--elevation-dropdown`** — do not reintroduce those names (**Batch 35** already removed **`--elevation-modal`**).
- Spacing/layout: `--spacing-*`, **`--container-padding-*` / `--container-gap-*` / `--container-radius-*`** (and other remaining **`--container-*`** rows), **`--ui-item-*`**. **Phase 7 Batch 38** removed **`--container-inset`** / **`--container-inset-mobile`** — use **`var(--spacing-3)`** (or the spacing step your callsite already chose) instead of those names.

### Layer B: Interaction Aliases

Cross-component aliases for shared interaction behavior.

- **`--interactive-border-muted`** and **`--interactive-surface-hover`** were **removed from `:root`** in **Phase 7 Batch 36** — they are **not** bridge names to bind in new work. Equivalent mixes are **inlined** at the few Layer C / feature callsites (for example **`color-mix(in srgb, var(--border) 72%, transparent)`** on settings **`--settings-border-muted`**, **`color-mix(in srgb, var(--primary) 12%, transparent)`** on **`--settings-hover-focus`**), and internal rows such as **`--action-bg-hover`** / **`--menu-surface-border`** carry the same resolved colors without a **`var(--interactive-*)`** hop — see **`docs/migration/phase-7-token-migration.md`** §Batch 36.
- `--interactive-focus-ring`
- `--interactive-transition-standard`

### Layer C: Component-Role Aliases

Role-level aliases consumed by reusable UI primitives and feature components.

1. Action controls

- `--action-bg-default`
- `--action-bg-hover`
- `--action-text-default`
- `--action-text-active`
- **`--action-border-active`** — **removed Batch 39** — inlined at **`project-card.component.scss`** (default + Sandstone branch); do not document as a bridge **`:root`** row.

2. Menu and option surfaces

- **`--menu-surface-bg`** — **removed from bridge Batch 39** — use **`var(--popover)`** (or **`var(--card)`**) at callsites; do not document as a Layer C bridge row.
- `--menu-surface-border`
- `--menu-item-bg-hover`
- **`--menu-item-bg-active`** — **removed Batch 39** — inline **`color-mix(in srgb, var(--primary) 12%, transparent)`** ([**`docs/migration/phase-7-token-migration.md`**](../migration/phase-7-token-migration.md) §Batch 39).
- `--menu-item-text`
- **Active menu item label ink:** **`var(--primary)`** at callsites (**Phase 7 Batch 38** removed **`--menu-item-text-active`** from the bridge — it duplicated **`var(--primary)`**).

3. Form controls

- `--field-bg`
- `--field-border`
- `--field-border-focus`
- `--field-placeholder`
- `--field-text`

4. Settings sections and cards

- **`--section-bg`** — **removed from bridge Batch 39** — use **`var(--card)`** (often inside **`color-mix`**) instead of a Layer C **`--section-bg`** name.
- **`--section-text`** — **still on the bridge** (Feldpost-only section-label ink; Sandstone theme block overrides it). Prefer **`var(--muted-foreground)`** for new work when this alias is not required.

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
