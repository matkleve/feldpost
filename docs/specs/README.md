# Specs Index

## Quick Orientation (Session Context)

- Glossary: [docs/glossary.md](../glossary.md) (source of truth for terminology)
- Spec format: [docs/agent-workflows/element-spec-format.md](../agent-workflows/element-spec-format.md)
- For the area you are touching, read the local README in that subfolder.
- Active specs index is per-area — do not maintain a global flat table.

Last updated: 2026-04-28

Authoritative governance source: docs/specs/GOVERNANCE-MATRIX.md.

## Folder Taxonomy

- docs/specs/component/: reusable component contracts, grouped in topic subfolders (`filters/`, `item-grid/`, `map/`, `media/`, `project/`, `upload/`, `workspace/`). Index: docs/specs/component/README.md. **Component reuse catalog:** docs/specs/component/registry.md (index) + docs/specs/component/registry.*.supplement.md (tables).
- docs/specs/page/: route/page-level contracts.
- docs/specs/service/: service facade and adapter contracts.
- docs/specs/system/: cross-cutting orchestration contracts.
- docs/specs/ui/: feature UI system contracts.

## Navigation

- docs/specs/component/README.md
- docs/specs/page/README.md
- docs/specs/service/README.md
- docs/specs/system/README.md
- docs/specs/ui/README.md

## Cross-cutting UI contracts

- **Product colors:** Specs describe **token names** (`var(--primary)`, tonal **stop** numbers, Figma roles)—not hex literals. Canonical values: [`docs/design/tokens.md`](../design/tokens.md) and `apps/web/src/styles.scss`. Architecture and service specs do not define palette.
- **Interaction emphasis** (hover primary, selected cool ink): [`docs/design/state-visuals.md`](../design/state-visuals.md) § Interaction emphasis — rollout tracker [`docs/specs/system/interaction-emphasis-rollout.md`](system/interaction-emphasis-rollout.md)

## Governance Artifacts

- docs/specs/GOVERNANCE-MODULE-REGISTRY.json
- docs/specs/GOVERNANCE-VIOLATIONS.md
- docs/specs/GOVERNANCE-README-COVERAGE.md
- docs/specs/GOVERNANCE-DUPLICATION-REPORT.md
- docs/specs/GOVERNANCE-TRACEABILITY-REPORT.json

## Spec split and organization

- One **canonical entry** per module/feature (parent spec); children are linked, not duplicated across `ui/` vs `service/`.
- Line limits and required sections are enforced by `node scripts/lint-specs.mjs` (see `scripts/lint-specs.mjs` for caps).
- **Parent spec line cap:** **180** lines (error), **150** (warn). Parents over the cap must be split; normative detail moves to child files with plain Markdown links (no duplicate bodies).
- **Lint scope:** Element-spec rules apply only to contract markdown under `docs/specs/` that pass `shouldIncludeSpecFile()` in `scripts/lint-specs.mjs`. **Excluded from parent cap / element-spec skeleton:** `GOVERNANCE-*.md`, files under `system/security/`, named technical annexes, **split children** (`*.supplement.md`, `*.acceptance-criteria.md`, `parent-name.*.md` slices), and other paths documented in `isSplitChildSpec()` / `shouldIncludeSpecFile()` in `scripts/lint-specs.mjs`.
- **Split strategy:** adapter-shaped → `service/<module>/adapters/*.adapter.md`; AC/FSM/visual tables → concern slices in the same folder (e.g. `.acceptance-criteria.md`). Authoritative rules: root `AGENTS.md` (**Spec split and organization policy**).

## References

- docs/glossary.md
- **Global CSS custom properties:** live definitions and emission order in **`apps/web/src/styles.scss`** (tweakcn `:root` / `html[data-theme]` + app extensions). **Legacy bridge:** **`apps/web/src/styles/_legacy-design-tokens.scss`** is **absent** from the shipped tree (Phase 7 Batch 50; verify **`rg 'legacy-design-tokens|_legacy-design-tokens' apps/web`** → **0**). Late global emit: **`@include meta.load-css('styles/typography-baseline')`** only — [phase-7-token-migration.md](../migration/phase-7-token-migration.md). Naming checklist: [docs/design/tokens.md](../design/tokens.md); bucket ownership: [docs/design/token-layers.md](../design/token-layers.md); floating menu / `dd-*` shell: [docs/specs/component/filters/dropdown-system.md](component/filters/dropdown-system.md). Older **`--menu-*` / `--action-*`** bridge names are **not** active product `:root` tokens — do not spec new work against them.
- docs/audits/README.md — historical move/inventory notes (**not** normative contracts)
- docs/agent-workflows/element-spec-format.md
- docs/backlog/workspace-pane-layout-and-spec-priorities.md — target: Workspace Pane on any route (layout host); interim vs canonical notes.
- docs/backlog/workspace-pane-layout-spec-implementation-plan.md — checklist for aligning specs to that target.
