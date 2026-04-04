# Governance and Adoption

Back to master: [master-spec.md](./master-spec.md)

## Governance Model

### Decision Roles

- Design System Owner: final authority for stable promotion and deprecation approval
- Feature Owner: responsible for migration execution in feature scope
- Reviewer Pair: one design reviewer + one implementation reviewer for stable gate

### Mandatory Stable Gate

A component or family can move to `stable` only if all checks pass:

1. Variant axes documented in [component-variants-matrix.md](./component-variants-matrix.md)
2. Accessibility and keyboard checks documented
3. Responsive behavior documented
4. Token bindings documented
5. At least one production use-case mapping documented in [usage-patterns-use-cases.md](./usage-patterns-use-cases.md)
6. Regression checks passed (light/dark/sandstone where relevant)

If any check fails, status remains `draft`.

## Deprecation and Replacement Path

When marking a component `deprecated`, required fields are:

- replacement component/family
- migration owner
- migration deadline
- technical risk note
- removal criteria

`replaced` is allowed only when:

- all known usages are migrated
- lint/search confirms no active usage
- related docs are updated

## Gap and Migration Priority Plan

### Critical

1. Workspace pane width contract drift

- Source: map shell runtime width logic
- Risk: inconsistent desktop geometry and QA drift
- Action: enforce default/min/max contract in design-system runtime tokens

### High

2. Settings overlay width and rail split drift

- Source: settings overlay feature-local clamps
- Risk: inconsistent overlay behavior and duplicated responsive logic
- Action: unify overlay scale and rail ratios through shared tokens

3. Missing generic popover panel primitive

- Risk: repeated one-off overlay shells
- Action: define one canonical popover family
- Progress: contract drafted in [popover-panel-contract.md](./popover-panel-contract.md)

4. Missing table primitive

- Risk: future data-heavy views reintroduce one-off structures
- Action: define table structure/state/a11y contract
- Progress: contract drafted in [table-primitive-contract.md](./table-primitive-contract.md)

### Medium

5. Missing breadcrumbs primitive

- Risk: navigation inconsistency in future deep pages
- Action: define one canonical breadcrumbs contract
- Progress: contract drafted in [breadcrumbs-contract.md](./breadcrumbs-contract.md)

6. Partial field/select/toggle/chip consistency

- Risk: styling drift and test fragility

7. Incomplete regression matrix evidence for some families

- Risk: unstable promotion decisions

### Low

8. Optional dedicated legacy/deprecated catalog page

- Value: easier migration tracking for large future waves

## Rollout Waves

Wave 1: Docs and governance hardening (this package)

- Exit: all pages approved and linked

Wave 2: Token scale and geometry normalization

- Focus: widths, breakpoints, rail splits

Wave 3: Component standardization

- Focus: popover/table/breadcrumbs + remaining draft families
- Promotion gate: [wave-3-contract-standardization.md](./wave-3-contract-standardization.md)
- Pilot execution plan: [wave-3-pilot-migration-plan.md](./wave-3-pilot-migration-plan.md)

Wave 4: Feature rollout and deprecation cleanup

- Focus: migrate production surfaces and retire legacy variants

## CI Enforcement

- GitHub Actions workflow: [../../.github/workflows/design-system-check.yml](../../.github/workflows/design-system-check.yml)
- Mandatory command in CI: `npm run design-system:check`
- Gate outcome: pull requests touching design-system docs, panel SCSS, or design-system scripts must pass registry + breakpoint audits.
- PR checklist template: [../../.github/pull_request_template.md](../../.github/pull_request_template.md)
- Contributor runbook: [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

## MCP and External Reference Protocol

### Probe Status (Phase D.1)

Context7 probe executed successfully for:

- Atlassian: `/websites/atlassian_design_components`
- Material: `/websites/m3_material_io`
- Polaris: `/websites/polaris-react_shopify`

### Usage Rule

External systems are reference inputs for:

- variant/state taxonomy patterns
- accessibility interaction guidance
- documentation structure ideas

Never copy implementation details directly into Feldpost without token/layout/architecture alignment.

### Fallback Protocol (if MCP access fails)

1. Use local Feldpost source docs as authority:

- constitution/tokens/layout/motion/action kernel/catalog

2. Use web fetch to official vendor docs as secondary input.

3. Mark fallback usage in the decision log with date and reason.

## Definition of Done for this Documentation Package

1. All core docs exist and cross-link correctly.
2. Component families are fully classified with lifecycle status.
3. Variant/state matrix is enforceable and reusable.
4. Priority use-cases are mapped to allowed components.
5. Gap list includes width/min-width/breakpoint drift with impact labels.
6. Governance includes stable gate, deprecation path, and role ownership.
7. External reference mechanism and fallback are documented.
8. AI-operable structure is explicit and implementation-ready.

## Machine-Readable Registry Decision (Mandatory)

Before Wave 2 starts, choose and approve one format:

Option A: CSV registry

- Pros: easy manual edits, straightforward audits
- Cons: weaker schema guarantees

Option B: JSON registry

- Pros: strict schema validation, easier automation hooks
- Cons: slightly heavier manual editing

Required decision output:

- selected format
- schema owner
- validation command
- rollout date

No migration wave beyond documentation may start before this decision is recorded.

Decision record: [registry-format-decision.md](./registry-format-decision.md)

Execution backlog: [wave-2-geometry-normalization-backlog.md](./wave-2-geometry-normalization-backlog.md)
