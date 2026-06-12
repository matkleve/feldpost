# Documentation — Package Guidelines

## Element Specs

- Every UI element has a spec in `specs/` — this is the **implementation contract**
- Every production component has its own dedicated spec file; parent specs reference child specs instead of collapsing multiple component contracts into one document
- Service specs must mirror code modules one-to-one: `docs/specs/service/[service-name]/` matches `apps/web/src/app/core/[service-name]/`

## Spec split and organization

- Canonical contracts live in `docs/specs/`; parents link to children—**no duplicate normative bodies** across `ui/` and `service/` for the same concern (UI may hold a short stub that links to the service spec).
- Split oversized specs when `lint-specs` warns or errors on line count; use adapter mirror (`adapters/*.adapter.md`) for adapter-shaped boundaries, or concern slices (AC, FSM, visual) in the same folder. Full rules: repository root `AGENTS.md` → **Spec split and organization policy**.

## Spec Folder Taxonomy

- `docs/specs/ui/` for feature-level UI contracts
- `docs/specs/component/` for reusable/local component contracts
- `docs/specs/service/` for service-module contracts
- `docs/specs/system/` for cross-cutting behavior systems
- `docs/specs/page/` for route/page-level contracts

Operational rules and governance belong in AGENTS/instructions files; `docs/specs/README.md` should stay focused on indexing and navigation.

- Specs are the source of truth: code must match spec, not the other way around
- Update specs **before** modifying features
- When user feedback changes behavior expectations, update the relevant spec sections immediately in the same session (Actions, Mermaids, Wiring/Data, Acceptance Criteria)
- Follow the template in `agent-workflows/element-spec-format.md`
- Follow service symmetry workflow in `agent-workflows/service-symmetry-standard.md` for service modules/refactors

## Glossary

- `glossary.md` defines canonical UI element names — always use these in code and specs

## Design Docs

- `design/constitution.md` — non-negotiable design rules
- `design/tokens.md` — colors, typography, sizing
- `design/layout.md` — breakpoints, panel dimensions
- `design/motion.md` — animation timing
- `design/map-system.md` — map hierarchy, markers, clustering
- `design/components/` — component-specific design rules
- Do **not** load `archive/reference-products.md` in agentic sessions
