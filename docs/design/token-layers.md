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
- Elevation: `--elevation-base`, `--elevation-subtle`, `--elevation-overlay`, `--elevation-dropdown`, `--elevation-modal`
- Spacing/layout: `--spacing-*`, `--container-*`, `--ui-item-*`

### Layer B: Interaction Aliases

Cross-component aliases for shared interaction behavior.

- `--interactive-border-muted`
- `--interactive-surface-hover`
- `--interactive-focus-ring`
- `--interactive-transition-standard`

### Layer C: Component-Role Aliases

Role-level aliases consumed by reusable UI primitives and feature components.

1. Action controls

- `--action-bg-default`
- `--action-bg-hover`
- `--action-bg-active`
- `--action-border-default`
- `--action-border-active`
- `--action-text-default`
- `--action-text-active`

2. Menu and option surfaces

- `--menu-surface-bg`
- `--menu-surface-border`
- `--menu-item-bg-hover`
- `--menu-item-bg-active`
- `--menu-item-text`
- `--menu-item-text-active`

3. Form controls

- `--field-bg`
- `--field-border`
- `--field-border-focus`
- `--field-placeholder`
- `--field-text`

4. Settings sections and cards

- `--section-bg`
- `--section-border`
- `--section-title`
- `--section-text`

5. Feedback states

- `--state-success-bg`
- `--state-warning-bg`
- `--state-danger-bg`
- `--state-info-bg`

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
