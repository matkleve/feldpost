# Breakpoint Audit: Wave 2 (Panel Surfaces)

Back to master: [master-spec.md](./master-spec.md)

## Scope

Panel-related responsive styles in:

- `apps/web/src/app/features/map/**`
- `apps/web/src/app/features/settings-overlay/**`
- `apps/web/src/app/features/upload/**`

Audit date: 2026-03-20

## Canonical Contract

From [layout-width-breakpoint-scale.md](./layout-width-breakpoint-scale.md):

- mobile: `max-width: 47.9375rem`
- tablet start: `min-width: 48rem`
- desktop start: `min-width: 64rem`
- tablet upper bound: `max-width: 63.9375rem`

## Findings and Actions

### Normalized in this wave

1. `apps/web/src/app/features/map/map-shell/map-shell.component.scss`

- `max-width: 767px` -> `max-width: 47.9375rem`
- `min-width: 768px` -> `min-width: 48rem`

2. `apps/web/src/app/features/map/workspace-pane/media-detail-view.component.scss`

- all `max-width: 767px` breakpoints -> `max-width: 47.9375rem`

3. `apps/web/src/app/features/map/workspace-pane/drag-divider/drag-divider.component.scss`

- `max-width: 767px` -> `max-width: 47.9375rem`

### Already canonical (no action required)

1. `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss`

- `max-width: 63.9375rem`
- `max-width: 47.9375rem`

2. `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.scss`

- `max-width: 47.9375rem`

3. `apps/web/src/app/features/map/search-bar/search-bar.component.scss`

- `max-width: 47.9375rem`

4. `apps/web/src/app/features/map/workspace-pane/workspace-export-bar.component.scss`

- `max-width: 48rem`

## Registered Exceptions (Component-Specific)

These breakpoints are intentionally not part of panel shell geometry and remain as micro-layout thresholds:

1. `apps/web/src/app/features/map/gps-button/gps-button.component.scss`

- `max-width: 600px`
- Reason: floating control touch ergonomics and viewport occlusion behavior.

2. `apps/web/src/app/features/map/workspace-pane/thumbnail-card.component.scss`

- `max-width: 520px`
- Reason: content-density collapse for card internals, not panel boundary behavior.

## Current Status

- Panel shell breakpoints in map workspace/settings surfaces are aligned to canonical rem-based thresholds.
- Remaining non-canonical values are registered exceptions with explicit reason.

Automation gate:

- `node scripts/audit-panel-breakpoints.mjs`

## Next Checkpoint

During Wave 3 component migration, re-evaluate exceptions and convert to tokenized breakpoint aliases if shared reuse emerges.
