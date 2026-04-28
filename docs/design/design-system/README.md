# Feldpost Design System

This directory is the canonical documentation package for Feldpost UI standardization.

It consolidates component taxonomy, variants/states, responsive layout scale, governance, migration priorities, and external reference alignment.

## Read Order

1. [master-spec.md](./master-spec.md)
2. [component-inventory.md](./component-inventory.md)
3. [component-variants-matrix.md](./component-variants-matrix.md)
4. [segmented-switch-contract.md](./segmented-switch-contract.md)
5. [dropdown-shell-contract.md](./dropdown-shell-contract.md)
6. [popover-panel-contract.md](./popover-panel-contract.md)
7. [table-primitive-contract.md](./table-primitive-contract.md)
8. [breadcrumbs-contract.md](./breadcrumbs-contract.md)
9. [usage-patterns-use-cases.md](./usage-patterns-use-cases.md)
10. [page-composition-map.md](./page-composition-map.md)
11. [layout-width-breakpoint-scale.md](./layout-width-breakpoint-scale.md)
12. [governance-adoption.md](./governance-adoption.md)
13. [external-references-by-family.md](./external-references-by-family.md)
14. [registry-format-decision.md](./registry-format-decision.md)
15. [wave-2-geometry-normalization-backlog.md](./wave-2-geometry-normalization-backlog.md)
16. [wave-3-contract-standardization.md](./wave-3-contract-standardization.md)
17. [wave-3-pilot-migration-plan.md](./wave-3-pilot-migration-plan.md)
18. [registry.json](./registry.json)
19. [registry.schema.json](./registry.schema.json)
20. [breakpoint-audit-wave2.md](./breakpoint-audit-wave2.md)
21. [geometry-regression-matrix-wave2.md](./geometry-regression-matrix-wave2.md)

## Source Contracts

- `docs/design/constitution.md`
- `docs/design/tokens.md`
- `docs/design/layout.md`
- `docs/design/motion.md`
- `docs/design/components/action-interaction-kernel.md`
- `docs/design/components/action-interaction-standard.md`
- `docs/design/components/website-building-blocks-catalog.md`
- `docs/specs/README.md`
- `docs/agent-workflows/implementation-checklist.md`
- `apps/web/src/styles.scss`

## Scope

In scope:

- Full future scope for currently implemented and planned components
- Stable documentation contract for variants/states/use-cases
- Governance and migration sequencing
- AI-operable structure for implementation sessions

Out of scope:

- Runtime code refactors in Angular/SCSS
- Token renaming in production styles
- Visual redesign implementation

## Authority Model

- Element specs (`docs/specs/`) are the feature behavior source of truth.
- Design-system docs (`docs/design-system/`) are the reusable UI primitive, variant, and composition source of truth.
- Composition docs in this folder must map to element-spec contracts and not redefine feature behavior.
- If divergence appears, align design-system docs to the element spec contract.

## Status Model

Every component in this package must use one status value:

- `planned`
- `draft`
- `stable`
- `deprecated`
- `replaced`
