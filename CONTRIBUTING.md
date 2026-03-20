# Contributing

## Purpose

This guide defines the minimum local validation flow before opening a pull request.

## Required Before PR

1. Run design system contract checks:

`npm run design-system:check`

2. If your changes touch design-system docs, panel SCSS, or geometry logic, ensure both gates pass:

- `node scripts/validate-design-system-registry.mjs`
- `node scripts/audit-panel-breakpoints.mjs`

3. Verify app build when runtime code changed:

`cd apps/web && ng build`

4. Follow PR checklist:

- `.github/pull_request_template.md`

## Design System Enforcement

- CI workflow: `.github/workflows/design-system-check.yml`
- Combined command in CI: `npm run design-system:check`

## Documentation References

- `docs/design-system/master-spec.md`
- `docs/design-system/layout-width-breakpoint-scale.md`
- `docs/design-system/governance-adoption.md`
- `docs/design-system/geometry-regression-matrix-wave2.md`
- `docs/design-system/wave-3-contract-standardization.md`

## Notes

- Specs are contracts. Update docs first when contract behavior changes.
- Do not introduce new panel breakpoints without documenting and registering exceptions.
