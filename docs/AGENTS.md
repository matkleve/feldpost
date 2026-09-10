# Documentation — Package Guidelines

## Element Specs

- Every UI element has a spec in `specs/` — this is the **implementation contract**
- Specs are the source of truth: code must match spec, not the other way around
- Update specs **before** modifying features

Normative bodies (do not restate here):

- Folder taxonomy, spec split policy, component spec coverage, feedback-to-spec sync, settings convention: [`specs/README.md`](./specs/README.md)
- Service-module symmetry: [`agent-workflows/service-symmetry-standard.md`](./agent-workflows/service-symmetry-standard.md)
- Spec writing template: [`agent-workflows/element-spec-format.md`](./agent-workflows/element-spec-format.md)

## Glossary

- Canonical UI element names: [`glossary.md`](./glossary.md) (also cited in root `AGENTS.md` § Universal Invariants)

## Design Docs

- `design/constitution.md` — non-negotiable design rules
- `design/tokens.md` — colors, typography, sizing
- `design/layout.md` — breakpoints, panel dimensions
- `design/motion.md` — animation timing
- `design/map-system.md` — map hierarchy, markers, clustering
- `design/components/` — component-specific design rules
- Do **not** load `archive/reference-products.md` in agentic sessions
