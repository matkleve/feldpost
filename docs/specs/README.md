# Specs Index

Last updated: 2026-04-28

Authoritative governance source: docs/specs/GOVERNANCE-MATRIX.md.

## Folder Taxonomy

- docs/specs/component/: reusable component contracts.
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

## Governance Artifacts

- docs/specs/GOVERNANCE-MODULE-REGISTRY.json
- docs/specs/GOVERNANCE-VIOLATIONS.md
- docs/specs/GOVERNANCE-README-COVERAGE.md
- docs/specs/GOVERNANCE-DUPLICATION-REPORT.md
- docs/specs/GOVERNANCE-TRACEABILITY-REPORT.json

## Spec split and organization

- One **canonical entry** per module/feature (parent spec); children are linked, not duplicated across `ui/` vs `service/`.
- Line limits and required sections are enforced by `node scripts/lint-specs.mjs` (see `scripts/lint-specs.mjs` for caps).
- **Split strategy:** adapter-shaped → `service/<module>/adapters/*.adapter.md`; AC/FSM/visual tables → concern slices in the same folder (e.g. `.acceptance-criteria.md`). Authoritative rules: root `AGENTS.md` (**Spec split and organization policy**).

## References

- docs/glossary.md
- docs/agent-workflows/element-spec-format.md
