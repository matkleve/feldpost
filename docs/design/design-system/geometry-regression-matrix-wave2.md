# Geometry Regression Matrix: Wave 2

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Provide repeatable geometry checks for core responsive surfaces so width and breakpoint regressions are visible during review.

## Target Surfaces

1. Workspace pane in map shell
2. Settings overlay

## Viewport Matrix

| Viewport | Width x Height | Breakpoint Bucket |
| -------- | -------------- | ----------------- |
| Mobile S | 375 x 812      | mobile            |
| Mobile L | 430 x 932      | mobile            |
| Tablet   | 834 x 1112     | tablet            |
| Desktop  | 1440 x 900     | desktop           |

## Baseline Rules

### Workspace Pane

- Default width: 360px when no stored user preference exists.
- Minimum width: 280px.
- Maximum width: min(640px, viewport width - 320px).
- Mobile bucket: desktop width logic is overridden by mobile panel behavior.

### Settings Overlay

- Large overlay bounds: 32rem to 40rem.
- Tablet overlay bounds: 25rem to 40rem.
- Left rail width based on shared rail ratio variables.
- Mobile left rail width fallback: 11.5rem.

## Tolerance Rules

- Width values: strict equality for tokenized constants.
- Computed clamp results: tolerance +/- 1px due to sub-pixel rounding.
- Breakpoint transitions: no overlap and no gap at 47.9375rem / 48rem.

## Automated Gates

0. Combined gate:

- `npm run design-system:check`

CI workflow:

- [../../.github/workflows/design-system-check.yml](../../.github/workflows/design-system-check.yml)

PR checklist:

- [../../.github/pull_request_template.md](../../.github/pull_request_template.md)

1. Registry contract:

- `node scripts/validate-design-system-registry.mjs`

2. Panel breakpoint contract:

- `node scripts/audit-panel-breakpoints.mjs`

## Review Checklist

1. Run both automation scripts before merge.
2. Validate workspace pane open/resize behavior in desktop bucket.
3. Validate settings overlay rail balance in tablet bucket.
4. Validate mobile panel behavior at 375px and 430px widths.

## Current Status

- Matrix defined.
- Contract gates in place.
- Ready for optional screenshot-based visual snapshot extension in Wave 3.
