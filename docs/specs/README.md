# Specs Index

## Quick Orientation (Session Context)

- Glossary: [docs/glossary.md](../glossary.md) (source of truth for terminology)
- Spec format: [docs/agent-workflows/element-spec-format.md](../agent-workflows/element-spec-format.md)
- For the area you are touching, read the local README in that subfolder.
- Active specs index is per-area — do not maintain a global flat table.

Last updated: 2026-09-10

Authoritative governance source: docs/specs/GOVERNANCE-MATRIX.md.

## Folder Taxonomy (Mandatory)

Normative. Moved out of root `AGENTS.md` on 2026-09-10 (that file is capped at 150 lines and already named this README as the spec-system authority); the rules are unchanged and `AGENTS.md` § Spec governance points here.

- `ui/` = feature-level UI contracts (for example map/workspace/media-detail systems)
- `component/` = reusable UI building blocks and local component contracts
- `service/` = service-module contracts mirrored to `apps/web/src/app/core/`
- `system/` = cross-cutting behavior systems and orchestration matrices
- `page/` = route/page-level contracts

Per-folder detail:

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
- **Interaction emphasis** (high-attention **brand gold**, passive context cool blue, nav violet): [`docs/design/state-visuals.md`](../design/state-visuals.md) § Interaction emphasis — rollout tracker [`docs/specs/system/interaction-emphasis-rollout.md`](system/interaction-emphasis-rollout.md)

## Governance Artifacts

- docs/specs/GOVERNANCE-MODULE-REGISTRY.json
- docs/specs/GOVERNANCE-VIOLATIONS.md
- docs/specs/GOVERNANCE-README-COVERAGE.md
- docs/specs/GOVERNANCE-DUPLICATION-REPORT.md
- docs/specs/GOVERNANCE-TRACEABILITY-REPORT.json

## Spec split and organization policy

Normative and authoritative (moved here from root `AGENTS.md` on 2026-09-10; rules unchanged).

- **Single entry point:** Each feature or service module has **one** canonical contract parent (`docs/specs/service/<module>/` facade spec, or per-component spec under `component/` / `ui/`). Child files hold detail; the parent summarizes and links (plain Markdown links, no duplicate normative bodies across folders, and no duplication across `ui/` vs `service/`).
- **Lint gate:** Run `node scripts/lint-specs.mjs`. **Parent spec line cap: 180 lines (error), 150 (warn).** Oversized parents must be split into linked children (`*.supplement.md`, `*.acceptance-criteria.md`, or `parent-name.slice.md` — see `scripts/lint-specs.mjs`); normative detail moves to the child, it is not duplicated. Settings and `docs/settings-registry.md` stay in sync when specs expose `## Settings`.
- **Lint scope:** Element-spec rules apply only to contract markdown under `docs/specs/` that passes `shouldIncludeSpecFile()` in `scripts/lint-specs.mjs`. **Excluded from parent cap / element-spec skeleton:** `GOVERNANCE-*.md`, files under `system/security/`, named technical annexes, **split children** (`*.supplement.md`, `*.acceptance-criteria.md`, `parent-name.*.md` slices), and other paths documented in `isSplitChildSpec()` / `shouldIncludeSpecFile()`.
- **When to split (if / then):**
  - **Adapter boundaries** match `apps/web/src/app/core/<module>/adapters/` → add `docs/specs/service/<module>/adapters/<name>.adapter.md` and link from the facade spec (structural mirror).
  - **Bloat is** long acceptance criteria, FSM, transition map, or Visual Behavior / ownership tables → add concern slices in the same folder, e.g. `<name>.acceptance-criteria.md` or `<name>.visual-behavior.md`; do not duplicate checkbox lists in both parent and child.
  - **UI vs service:** Service orchestration and facade contracts belong under `docs/specs/service/`; UI composition stays under `docs/specs/ui/` or `component/`. **Never** paste the full service contract into a UI spec—use a **stub** that links to the service entry (see [`ui/workspace/workspace-view-system.md`](ui/workspace/workspace-view-system.md)).
- **Anti-patterns:** Duplicate filenames with identical contract text in `ui/` and `service/`; flat `docs/specs/service/foo.md` without `docs/specs/service/foo/` when the module is a full service module—use a folder mirroring `core/<name>/` unless the registry documents an explicit thin-module exception.

## Component Spec Coverage (Mandatory)

Normative (moved here from root `AGENTS.md` on 2026-09-10; rules unchanged).

- Every production component must have its own dedicated element spec in `docs/specs/component/` or `docs/specs/ui/`.
- Parent specs may define shared contracts, but domain and shared components still require child specs for their own behavior, state, wiring, and acceptance criteria.
- Do not collapse multiple non-trivial component contracts into one monolithic spec when a child-spec split is possible.
- Before implementing or refactoring a component, create or update that component's dedicated spec first.

## Spec-first (Mandatory)

Normative (moved here from `docs/AGENTS.md` on 2026-09-10; rules unchanged). These state the *direction* of authority, which § Feedback-to-Spec Sync below assumes but does not say.

- Specs are the source of truth: code must match spec, not the other way around.
- Update specs **before** modifying features.

## Feedback-to-Spec Sync (Mandatory)

Normative (moved here from root `AGENTS.md` on 2026-09-10; rules unchanged).

- When user feedback changes expected behavior, update the relevant spec(s) first in the same work session.
- Do not defer spec synchronization when behavior requirements change.
- Keep Acceptance Criteria aligned with the latest user-confirmed behavior before finalizing implementation.

## Settings Overlay Convention

Normative (moved here from root `AGENTS.md` on 2026-09-10; rules unchanged).

For any feature that introduces user-configurable behavior, add an optional `## Settings` section to that feature's element spec. Use concise bullets in the form `- **Section**: what it configures`. The settings inventory is centralized in [`docs/settings-registry.md`](../settings-registry.md) and must stay in sync with all spec `## Settings` sections via `node scripts/lint-specs.mjs`. When adding a new configurable feature, update the spec first and then run the linter (or `--fix`) to refresh/validate the registry.

## References

- docs/glossary.md
- **Global CSS custom properties:** live definitions and emission order in **`apps/web/src/styles.scss`** (tweakcn `:root` / `html[data-theme]` + app extensions). **Legacy bridge:** **`apps/web/src/styles/_legacy-design-tokens.scss`** is **absent** from the shipped tree (Phase 7 Batch 50; verify **`rg 'legacy-design-tokens|_legacy-design-tokens' apps/web`** → **0**). Late global emit: **`@include meta.load-css('styles/typography-baseline')`** only — [phase-7-token-migration.md](../migration/phase-7-token-migration.md). Naming checklist: [docs/design/tokens.md](../design/tokens.md); bucket ownership: [docs/design/token-layers.md](../design/token-layers.md); floating menu / `dd-*` shell: [docs/specs/component/filters/dropdown-system.md](component/filters/dropdown-system.md). Older **`--menu-*` / `--action-*`** bridge names are **not** active product `:root` tokens — do not spec new work against them.
- docs/audits/README.md — historical move/inventory notes (**not** normative contracts)
- docs/agent-workflows/element-spec-format.md
- docs/backlog/workspace-pane-layout-and-spec-priorities.md — target: Workspace Pane on any route (layout host); interim vs canonical notes.
- docs/backlog/workspace-pane-layout-spec-implementation-plan.md — checklist for aligning specs to that target.
