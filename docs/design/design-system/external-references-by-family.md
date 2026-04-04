# External References by Component Family

Back to master: [master-spec.md](./master-spec.md)

## Purpose

Consolidate external reference inputs per component family as required by Phase G.

These references are input constraints only. Feldpost contracts, tokens, and architecture remain authoritative.

## Source Systems

- Atlassian Design System: `/websites/atlassian_design_components`
- Material Design 3: `/websites/m3_material_io`
- Shopify Polaris React: `/websites/polaris-react_shopify`

Probe status and fallback protocol are documented in [governance-adoption.md](./governance-adoption.md).

## Family Mapping

| Family                                   | Atlassian Input                                | Material Input                               | Polaris Input                          | Feldpost Authority                                                             |
| ---------------------------------------- | ---------------------------------------------- | -------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| Primitives                               | spacing rhythm, item/container hierarchy       | baseline shape/state guidance                | action surface consistency             | `component-inventory.md`, `component-variants-matrix.md`                       |
| Inputs and Selection                     | field grouping and control density             | state model (`focused`, `error`, `disabled`) | form-row compactness patterns          | `component-variants-matrix.md`, `usage-patterns-use-cases.md`                  |
| Navigation                               | rail/nav grouping and semantic structure       | tabs/segmented accessibility baselines       | app navigation consistency patterns    | `segmented-switch-contract.md`, `breadcrumbs-contract.md`                      |
| Menus, Overlays, Dialogs                 | menu trigger semantics and disclosure behavior | keyboard/focus behavior for overlays         | popover/dialog interaction consistency | `dropdown-shell-contract.md`, `popover-panel-contract.md`                      |
| Data Display                             | table and list semantics baseline              | data-density and hierarchy guidance          | administrative table/list patterns     | `table-primitive-contract.md`, `usage-patterns-use-cases.md`                   |
| Feedback and System State                | inline/system feedback hierarchy               | state feedback tokens and transitions        | feedback in workflow surfaces          | `component-variants-matrix.md`, `governance-adoption.md`                       |
| Layout and Responsive Surfaces           | panel/rail consistency patterns                | breakpoint and responsive behavior baselines | adaptive layout consistency            | `layout-width-breakpoint-scale.md`, `wave-2-geometry-normalization-backlog.md` |
| Domain-Specific Map and Field Components | non-map interaction consistency only           | generic state/accessibility constraints      | consistency for action controls        | `component-inventory.md`, `usage-patterns-use-cases.md`                        |

## Usage Rule

1. Start with Feldpost docs as authority.
2. Use mapped external systems to sanity-check taxonomy and behavior expectations.
3. Record any adopted pattern in component contracts or migration notes with a Feldpost-specific rationale.
4. Do not copy external implementation details directly.

## Validation

- Every design-system family in [component-inventory.md](./component-inventory.md) has a mapped external input.
- External mappings are linked to a Feldpost authority document.
- Governance fallback remains explicit in [governance-adoption.md](./governance-adoption.md).
