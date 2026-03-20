## Summary

Describe what changed and why.

## Scope

- [ ] Docs only
- [ ] UI behavior
- [ ] Data/model changes
- [ ] Infrastructure/CI

## Validation

- [ ] `npm run design-system:check` (required for design-system, panel SCSS, and geometry-related changes)
- [ ] Additional local checks were run

## Design System Contract (required when applicable)

- [ ] Registry is still valid (`node scripts/validate-design-system-registry.mjs`)
- [ ] Panel breakpoint audit is still valid (`node scripts/audit-panel-breakpoints.mjs`)
- [ ] If an exception was introduced, it is documented in `docs/design-system/breakpoint-audit-wave2.md`

## Wave 3 Contract Promotion (required when applicable)

- [ ] Relevant contract is referenced (`popover-panel-contract.md`, `table-primitive-contract.md`, `breadcrumbs-contract.md`)
- [ ] Promotion checklist from `docs/design-system/wave-3-contract-standardization.md` is addressed
- [ ] Evidence attached (screenshots/tests/logs) for contract-level behavior

## Screenshots / Evidence

Attach screenshots, logs, or links to evidence when UI behavior changed.

## Notes for Reviewers

List high-risk areas, known limitations, or follow-up tasks.
