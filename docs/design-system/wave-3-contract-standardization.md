# Wave 3 Contract Standardization

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Define the completion gate for Wave 3 contract work (popover, table, breadcrumbs) and make promotion-to-stable criteria reviewable.

## Scope

Wave 3 target contracts:

- `popover-panel-contract.md`
- `table-primitive-contract.md`
- `breadcrumbs-contract.md`

Wave 3 baseline already available:

- `segmented-switch-contract.md`
- `dropdown-shell-contract.md`

Execution plan:

- `wave-3-pilot-migration-plan.md`

## Contract Maturity Levels

Use these levels before promoting any Wave 3 contract from `draft` to `stable`:

1. draft: contract text exists and is internally consistent
2. pilot: at least one production usage follows the contract
3. stable-ready: usage + regression evidence + checklist complete
4. stable: governance gate approved

## Stable Promotion Criteria

All conditions are mandatory:

1. Variant axes defined and aligned with `component-variants-matrix.md`
2. Mandatory states documented and testable
3. Accessibility semantics and keyboard behavior verified
4. Responsive behavior defined (including narrow/mobile fallbacks)
5. Token-only visual binding (no raw spacing/color/border values)
6. At least one production implementation references the contract
7. Regression evidence included in PR (screenshots/logs/tests)

## Per-Contract Promotion Checklist

### Popover Panel

- [ ] Anchor behavior + drawer/sheet fallback validated
- [ ] Trigger semantics (`aria-expanded`, `aria-haspopup`) validated
- [ ] Escape close and focus return behavior validated

### Table Primitive

- [ ] Semantic table structure validated
- [ ] Sorting semantics and state indicators validated
- [ ] Loading/error/empty states validated with stable geometry

### Breadcrumbs

- [ ] Current page semantics validated
- [ ] Collapse behavior validated on narrow viewports
- [ ] Separator and spacing rhythm validated across themes

## Evidence Requirements

Attach at least one of the following per contract for promotion PRs:

- Before/after screenshots (desktop + mobile where relevant)
- Test evidence for interaction and accessibility behavior
- Short mapping note linking implementation file to contract section

## PR Review Gate

For PRs touching Wave 3 contract implementation:

1. Run `npm run design-system:check`
2. Check contract-specific boxes in `.github/pull_request_template.md`
3. Confirm contract maturity level transition in PR summary

## Exit Criteria (Wave 3)

Wave 3 is complete when:

- Popover, table, and breadcrumbs each reach at least `pilot`
- At least one of these reaches `stable-ready`
- No new feature-local forks are introduced for these families
- Governance reviewers confirm promotion readiness
