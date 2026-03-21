# Master Spec: Feldpost Design System

Back to index: [README.md](./README.md)

## Purpose

Define one enforceable source for component standardization, variant/state contracts, responsive scale, migration priorities, and governance.

Primary outcome: remove geometry drift (pane widths, min-width scatter, breakpoint drift) across map shell, overlays, and future surfaces.

## Canonical Inputs

Foundational rules:

- `docs/design/constitution.md`
- `docs/design/tokens.md`
- `docs/design/layout.md`
- `docs/design/motion.md`
- `docs/design/components/action-interaction-kernel.md`
- `docs/design/components/action-interaction-standard.md`

Inventory and migration context:

- `docs/design/components/website-building-blocks-catalog.md`
- `docs/element-specs/README.md`
- `apps/web/src/styles.scss`
- `apps/web/src/app/features/map/map-shell/map-shell.component.ts`
- `apps/web/src/app/features/map/map-shell/map-shell.component.scss`
- `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss`

## Documentation Topology

1. [component-inventory.md](./component-inventory.md)
2. [component-variants-matrix.md](./component-variants-matrix.md)
3. [segmented-switch-contract.md](./segmented-switch-contract.md)
4. [dropdown-shell-contract.md](./dropdown-shell-contract.md)
5. [popover-panel-contract.md](./popover-panel-contract.md)
6. [table-primitive-contract.md](./table-primitive-contract.md)
7. [breadcrumbs-contract.md](./breadcrumbs-contract.md)
8. [usage-patterns-use-cases.md](./usage-patterns-use-cases.md)
9. [layout-width-breakpoint-scale.md](./layout-width-breakpoint-scale.md)
10. [governance-adoption.md](./governance-adoption.md)
11. [external-references-by-family.md](./external-references-by-family.md)

## Phase Completion Summary

Phase A (Discovery): complete

- Design source baseline consolidated.
- Runtime evidence sources identified for pane width and responsive logic.

Phase B (Taxonomy): complete

- Canonical families and lifecycle statuses defined.

Phase B.1 (Proto governance): complete

- Stable gate, variant approval authority, and deprecation pathway defined.

Phase C (Variant/state matrix): complete

- Mandatory variant axes and state model standardized.

Phase D (Docs structure): complete

- Master index + five core pages created.

Phase D.1 (MCP probe): complete

- Context7 probe executed for Atlassian, Material, Polaris.
- Result: reachable in this workspace session.
- Fallback path documented in governance doc.

Phase E (Use-case catalog): complete

- Feldpost priority surfaces mapped to allowed component variants.

Phase F (Gap/migration plan): complete

- Critical/High/Medium/Low impact prioritization defined with sequencing.

Phase G (External references): complete

- Family-level external references anchored.

Phase H (Governance finalization): complete

- Review gates, responsibilities, and stable criteria defined.

Phase I (Review/acceptance checklist): complete

- Definition of Done and machine-readable registry decision included.

Phase J (Wave 3 contracts): complete (definition + pilot execution)

- Segmented switch and dropdown shell contracts added.
- Popover panel and table primitive contracts added.
- Breadcrumbs contract added.
- Promotion gate defined in [wave-3-contract-standardization.md](./wave-3-contract-standardization.md).
- Pilot migrations executed with regression + screenshot evidence in [wave-3-pilot-migration-plan.md](./wave-3-pilot-migration-plan.md).

## Implementation Completion Note

The A-J documentation program is complete. Wave 3 pilot implementation evidence is complete for popover, table, and breadcrumbs.

Remaining governance distinction:

- `stable-ready`: achieved by implementation evidence and checklists
- `stable`: requires explicit governance approval per [governance-adoption.md](./governance-adoption.md)

## External Reference Baseline

Validated systems for guidance alignment:

- Atlassian Design System (`/websites/atlassian_design_components`)
- Material Design 3 (`/websites/m3_material_io`)
- Shopify Polaris React (`/websites/polaris-react_shopify`)

Use external systems as input constraints, never as direct copy templates.

## Design System Decision Log

- Standard path confirmed: reuse existing Feldpost design docs as primary source, no parallel rule island.
- Storage location fixed: `docs/design-system/`.
- Scope fixed: include future components/variants, not only current runtime state.
- Impact labels fixed: `Critical`, `High`, `Medium`, `Low` mandatory for migration planning.
- Registry decision required: CSV or JSON format must be approved before rollout waves.
- MCP-first external research path fixed with explicit fallback.

## What This Package Enables

- Predictable component implementation and review
- Reduced responsive regressions
- Faster AI-assisted implementation with atomic context pages
- Clear migration sequence from current to target UI architecture
