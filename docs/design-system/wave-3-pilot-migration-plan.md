# Wave 3 Pilot Migration Plan

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Translate Wave 3 contracts into concrete pilot migrations so contract quality can be validated in real product surfaces.

## Pilot Targets

### Pilot A: Popover Panel

Contract:

- `popover-panel-contract.md`

Primary target surface:

- Map contextual overlays and workspace contextual action groups

Success outcome:

- At least one existing feature-local contextual overlay replaced by canonical popover shell behavior

### Pilot B: Table Primitive

Contract:

- `table-primitive-contract.md`

Primary target surface:

- One internal data-dense management view where list/card mode currently strains readability

Success outcome:

- One production table instance with semantic structure, sorting semantics, and loading/error states

### Pilot C: Breadcrumbs

Contract:

- `breadcrumbs-contract.md`

Primary target surface:

- One deep settings/detail navigation path with clear ancestor hierarchy

Success outcome:

- One production breadcrumb instance with collapse behavior and current-page semantics

## Concrete Target File Map

### Pilot A: Popover Panel (map/workspace context actions)

Primary migration files:

- `apps/web/src/app/features/map/map-shell/map-shell.component.html`
- `apps/web/src/app/features/map/map-shell/map-shell.component.ts`
- `apps/web/src/app/features/map/map-shell/map-shell.component.spec.ts`

Secondary candidate (detail context menu):

- `apps/web/src/app/features/map/workspace-pane/image-detail-header/image-detail-header.component.ts`
- `apps/web/src/app/features/map/workspace-pane/image-detail-header/image-detail-header.component.html`

Implementation note:

- First pilot slice should migrate one context menu shell path end-to-end (markup, positioning/focus behavior, tests), not all menus at once.

### Pilot B: Table Primitive (projects data-dense list)

Primary migration files:

- `apps/web/src/app/features/projects/projects-page.component.ts`
- `apps/web/src/app/features/projects/projects-toolbar.component.ts`

Implementation note:

- Replace one list-mode rendering branch with semantic table structure while preserving card-mode fallback for narrow viewports.

### Pilot C: Breadcrumbs (projects route depth)

Primary migration files:

- `apps/web/src/app/app.routes.ts`
- `apps/web/src/app/features/projects/projects-page.component.ts`

Implementation note:

- Pilot targets `/projects` -> `/projects/:projectId` path semantics with one breadcrumb instance and mobile collapse behavior.

## PR Slice Plan (Execution-Ready)

1. Pilot C (Breadcrumbs): route-aware breadcrumb in projects page + collapse behavior + accessibility semantics.
2. Pilot A (Popover): one map context-menu surface migrated to canonical popover contract + keyboard/focus regression tests.
3. Pilot B (Table): projects list-mode migrated to table primitive + responsive fallback evidence.

## Execution Status (Live)

- [x] Pilot C started and implemented on projects route depth.
- [x] Pilot C focused semantics evidence green (`npx vitest run src/app/features/projects/projects-page.component.spec.ts`).
- [x] Pilot C implementation evidence bundle attached: [wave-3-pilot-evidence-bundle.md](./wave-3-pilot-evidence-bundle.md)
- [x] Pilot C screenshot bundle attached (desktop/mobile): `docs/design-system/evidence/wave-3/pilot-c-breadcrumb-detail-desktop.png`, `docs/design-system/evidence/wave-3/pilot-c-breadcrumb-detail-mobile.png`.
- [x] Pilot A started with map context-menu focus-return hardening.
- [x] Pilot A focused regression evidence green for trigger/open-state semantics + close/focus path (`map-shell.component.spec.ts` targeted run).
- [x] Pilot A full contract checklist complete (anchor->sheet fallback implemented and covered by focused tests).
- [x] Pilot B started with semantic table structure in projects list-mode.
- [x] Pilot B includes semantic table + sort semantics (`aria-sort`) + explicit load error state.
- [x] Pilot B focused regression spec green (`npx vitest run src/app/features/projects/projects-page.component.spec.ts`).
- [x] Pilot B/C implementation evidence bundle attached: [wave-3-pilot-evidence-bundle.md](./wave-3-pilot-evidence-bundle.md) (code-based evidence with test results).
- [x] Pilot B screenshot bundle attached (desktop/mobile): `docs/design-system/evidence/wave-3/pilot-b-projects-list-desktop.png`, `docs/design-system/evidence/wave-3/pilot-b-projects-list-mobile.png`.

Current implementation references:

- `apps/web/src/app/features/projects/projects-page.component.ts` (route-aware breadcrumbs for `/projects/:projectId`)
- `apps/web/src/app/features/map/map-shell/map-shell.component.ts` (context-menu actions route close flow through `onMapMenuCloseRequested()`)
- `apps/web/src/app/features/map/map-shell/map-shell.component.spec.ts` (street-zoom menu-close regression test)
- `apps/web/src/app/features/projects/projects-page.component.ts` (list-mode migrated to semantic table structure)
- `docs/i18n/translation-workbench.csv` (new table/error text keys)
- `supabase/seed_i18n.sql` (regenerated from translation workbench)

For each slice, include:

- contract reference link
- maturity transition (`draft -> pilot`)
- changed-file map
- desktop/mobile evidence
- interaction evidence (keyboard/focus/loading/error as applicable)

## i18n Guardrail for Pilot Implementations

When pilot code introduces or changes visible UI text:

1. use deterministic i18n lookup (`t(key, fallback)`) in component/template code
2. update `docs/i18n/translation-workbench.csv`
3. regenerate SQL via `node scripts/import-i18n-csv-to-sql.mjs`
4. include `supabase/seed_i18n.sql` in the same change

## Execution Order

1. Pilot C (Breadcrumbs): fastest delivery and low interaction complexity
2. Pilot A (Popover): medium risk due to keyboard/focus behavior
3. Pilot B (Table): highest complexity and highest downstream impact

## Implementation Gating

Before starting each pilot:

1. Link the target PR to the relevant contract file
2. Add contract maturity transition in PR summary (`draft -> pilot`)
3. Run `npm run design-system:check`

After implementation:

1. Attach evidence (screenshots/tests/logs)
2. Confirm checklist from `wave-3-contract-standardization.md`
3. Update contract maturity note in PR review comments

## Evidence Mapping Template

Use this section in pilot PR descriptions:

- Contract: `<contract-file>`
- Target surface: `<feature/screen>`
- Files changed: `<path list>`
- Behavior evidence:
  - Desktop screenshot: yes/no
  - Mobile screenshot: yes/no
  - Keyboard flow evidence: yes/no
  - Loading/error state evidence: yes/no
- Maturity transition: `draft -> pilot`

## Risk and Mitigation

### Popover risk

- Risk: focus trap/return regressions
- Mitigation: explicit keyboard scenario checks in pilot PR

### Table risk

- Risk: responsive degradation on narrow screens
- Mitigation: require collapse/drawer strategy evidence in pilot

### Breadcrumbs risk

- Risk: path overflow and visual clutter
- Mitigation: mandatory collapse behavior in mobile screenshots

## Exit Criteria for Pilot Phase

Pilot phase is complete when all three conditions are met:

1. Popover, table, and breadcrumbs each have one accepted `draft -> pilot` migration
2. No feature-local style forks are introduced in those PRs
3. Governance reviewers confirm readiness for `stable-ready` expansion
