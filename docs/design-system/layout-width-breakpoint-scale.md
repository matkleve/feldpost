# Layout Width and Breakpoint Scale

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define one canonical geometry scale for pane widths, min-widths, and responsive breakpoints to eliminate drift.

## Canonical Breakpoints

Source-aligned with `docs/design/layout.md`:

- mobile: `< 48rem` (<768px)
- tablet: `48rem` to `63.9375rem` (768px to 1023px)
- desktop: `>= 64rem` (>=1024px)

Rule: do not introduce new ad-hoc breakpoint values for panel behavior unless registered in this file and approved by governance.

## Canonical Width Scale

Primary width tokens and values:

- sidebar collapsed: `3rem` (48px)
- sidebar expanded: `15rem` (240px)
- workspace pane default: `22.5rem` (360px)
- workspace pane min: `17.5rem` (280px)
- workspace pane max target: `40rem` (640px)
- filter panel width: `17.5rem` (280px)
- narrow content rail: `25rem` (400px)
- content clamp text: `38rem` (~608px)
- content clamp default: `45rem` (~720px)
- content clamp list: `52rem` (~832px)

## Content Clamp Primitive

Canonical token and utility:

- tokens: `--content-clamp-text`, `--content-clamp-default`, `--content-clamp-list`
- utility: `.content-clamp`

Utility variants:

- `.content-clamp--text`
- `.content-clamp--default`
- `.content-clamp--list`

Definition:

- `.content-clamp`: `max-width: var(--content-clamp-default)`
- `width: 100%`
- `margin-inline: auto`

Required use:

- Apply the semantic clamp variant by surface type: text/form surfaces use `--text`, balanced detail surfaces use `--default`, list/grid surfaces use `--list`.

## Overlay Scale

Standard overlay classes:

- small overlay: 20rem to 25rem
- medium overlay: 25rem to 32rem
- large overlay: 32rem to 40rem

Settings overlay uses large overlay class with internal two-column rail split from tokenized proportions.

## Runtime Evidence of Drift

### Workspace pane width logic

Observed in `apps/web/src/app/features/map/map-shell/map-shell.component.ts`:

- min width fixed at 280px (aligned)
- max width computed from viewport minus 320px, not explicit token max
- default width computed from golden ratio, not fixed design default 360px

Impact:

- Different users receive different default pane widths for same view
- Harder QA baselines and visual test predictability

### Workspace panel style default

Observed in `apps/web/src/app/features/map/map-shell/map-shell.component.scss`:

- desktop default style width set to 22.5rem
- runtime inline width can override to non-tokenized golden-ratio values

### Settings overlay width clamps

Observed in `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss`:

- overlay width defined as `min(54rem, calc(100vw - ...))`
- left and right rails each use independent `clamp(...)`
- tablet/mobile overrides define additional ad-hoc basis values

Impact:

- Overlay geometry can diverge from canonical narrow/medium/large rails
- Hard to maintain cross-feature consistency with map/workspace surfaces

## Standardization Rules

1. Widths are token-first.
2. Runtime width calculations must clamp to documented token targets.
3. Dynamic widths are allowed only when map minimum interaction width must be preserved.
4. Overlay rail splits should use documented rail ratios, not per-feature clamps.
5. Mobile sheet heights should map to documented snap model (min/half/full) where applicable.
6. Core list/form content surfaces must use `.content-clamp` plus the correct semantic variant unless a documented exception exists.

## Migration Targets

Target A (Critical): workspace pane width contract

- Keep min=280
- Keep default=360 unless user-resized memory exists
- Clamp max to min(640, viewport minus map-safe-min)

Target B (High): settings overlay width contract

- Normalize overlay to large class bounds (32rem to 40rem target)
- Move left/right rail split to shared tokenized ratios

Target C (High): mobile panel sheet consistency

- Align mobile pane/sheet heights with standard snap behavior where feature permits

Target D (Medium): audit all panel widths for token registration

- Register any legitimate exceptions in this file with owner and rationale

## Acceptance Checks

- No new unregistered width clamp appears in feature SCSS.
- No new unregistered breakpoint appears in feature SCSS.
- Workspace and settings surfaces pass geometry regression snapshots at mobile/tablet/desktop.

Wave 2 breakpoint audit reference:

- [breakpoint-audit-wave2.md](./breakpoint-audit-wave2.md)
