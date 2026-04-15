---
name: "Element Specs"
description: "Use when creating or editing element specification documents in docs/specs/."
applyTo: "docs/specs/**"
---

# Element Spec Conventions

Every UI element must have a spec before implementation. Follow the template exactly.

## Required Sections (in order)

1. **Title + "What It Is"** — 1–2 sentences, plain English
2. **What It Looks Like** — 3–5 sentences, reference design tokens
3. **Where It Lives** — route, parent component, trigger condition
4. **Actions & Interactions** — table with every user action and system response
5. **Component Hierarchy** — tree diagram mapping to Angular components
6. **Data Requirements** — Supabase tables, columns, service methods
7. **State** — name, TypeScript type, default value, what it controls
8. **File Map** — every file to create with a 1-phrase purpose
9. **Wiring** — how it connects to parent (routes, imports, injections)
10. **Acceptance Criteria** — checkbox list, each item testable

## Rules

- Specs are the source of truth — code must match spec, not the other way around
- Update specs BEFORE modifying features
- Use canonical names from [glossary](../../docs/glossary.md)
- Keep "What It Is" and "What It Looks Like" short — detail goes in Actions and Hierarchy
- Keep **Component Hierarchy** as an ASCII tree for fast readability.
- Use Mermaid syntax for integration and data-flow clarity.
- Include at least 2 Mermaid diagrams in every spec:
  - A **Wiring** diagram (`sequenceDiagram` or `flowchart`) showing parent/component/service integration
  - A **Data Requirements** diagram (`erDiagram`, `flowchart`, or `sequenceDiagram`) showing schema or query/data flow
- Use `rem` as the primary unit for accessibility-sensitive UI dimensions: touch targets, button heights, interactive sizes, spacing, and layout dimensions. Include px as an annotation when the exact reference size matters.
- Use `em` only for component-internal spacing that should scale with the component's own font size.
- Use `px` only for precision details that should not scale with font size: borders, outlines, shadows, image display sizes, and pixel-resolution thresholds.
- Use `vh` / `vw` only for viewport-relative layout behavior.

## Governance Operations

- Active references from `docs/element-specs/...` must be normalized to `docs/specs/...`.
- Deterministic (single-candidate) legacy targets must be updated directly.
- Multi-target legacy references must follow context routing:
  - `ui/page/component/system` context -> `docs/specs/ui/...`.
  - `service/core` context -> `docs/specs/service/...`.
- No-target legacy references must be marked Deprecated with rationale and proposed direction.
- Traceability changes must be recorded in `docs/specs/GOVERNANCE-TRACEABILITY-REPORT.json`.

## SPEC GAP Handling

- Blocking SPEC GAP: stop only for the affected module and continue unrelated modules.
- Non-blocking SPEC GAP: mark and continue.
- Every SPEC GAP entry must include ambiguity, impacted scope, and proposed resolution direction.

## Governance Artifact Set

- `docs/specs/GOVERNANCE-MATRIX.md`
- `docs/specs/GOVERNANCE-README-COVERAGE.md`
- `docs/specs/GOVERNANCE-DUPLICATION-REPORT.md`
- `docs/specs/GOVERNANCE-VIOLATIONS.md`
- `docs/specs/GOVERNANCE-MODULE-REGISTRY.json`
- `docs/specs/GOVERNANCE-TRACEABILITY-REPORT.json`

Full template: [docs/agent-workflows/element-spec-format.md](../../docs/agent-workflows/element-spec-format.md)
