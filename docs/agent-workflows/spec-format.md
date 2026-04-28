# Spec Format (deprecated alias)

**Use [`element-spec-format.md`](element-spec-format.md)** for all new and updated element specs. This file remains only so older links keep resolving; do not duplicate edits—change **`element-spec-format.md`** instead.

---

Practical writing and refactoring template for specs in docs/specs/.
This file is guidance. Governance and mandatory policy are owned by docs/specs/README.md.

## Source Of Truth Hierarchy

- docs/specs/README.md is authoritative for scope, ownership, naming, and enforcement gates.
- This file MUST follow docs/specs/README.md and MUST NOT redefine conflicting rules.
- If this template conflicts with docs/specs/README.md, docs/specs/README.md MUST win.

## Directive-First Mode (Required For Active Refactor Phases)

- Before editing any spec, read docs/specs/README.md and apply the active directive scope and boundaries.
- In directive-first phases, contributors MUST use enforceable RFC 2119 language (MUST, SHOULD, MAY).
- In directive-first phases, contributors MUST remove or convert non-normative prose.
- If ownership, naming registry, or scope is ambiguous, contributors MUST stop and output exactly:
  - ⚠ SPEC GAP: [describe the ambiguity]

## Mandatory Preflight (Before Any Edits)

- Provide a 3-5 line understanding statement for Orchestration Layer vs Visual Contract Layer.
- List first target files in the exact order defined by docs/specs/README.md for the active phase.
- Confirm no out-of-scope file will be edited.
- If a required target is missing or owner is ambiguous, stop with:
  - ⚠ SPEC GAP: [missing file or ambiguous owner]

## Mandatory Gates (Before Save)

- Single Source of Truth: each requirement detail MUST have exactly one owning spec location.
- Layer ownership MUST be explicit:
  - Page layer for orchestration/composition and page-level state ownership.
  - Component layer for behavior contracts, FSM, and API/service boundaries.
  - Item/domain layer for tile visuals, local UI states, and atomic data mapping.
- Canonical naming MUST match glossary/registry entries.
- If a name is not canonical, stop with:
  - ⚠ SPEC GAP: [describe the ambiguity]
- Inferred behavior without traceable parent/child contract MUST be removed.

## Required Deliverable Structure (Directive Passes)

For directive-governed refactors, output MUST use this exact section order:

1. Audit Table per file (Issue, Owner Layer, Severity, Action)
2. Edited Files Summary with exact headings changed
3. State-to-UI Mapping Table added in shell spec (when required by active directive)
4. Contradictions resolved and final deterministic policy statement (for the active contradiction scope)
5. Residual gaps listed as SPEC GAP items

Completion condition:

- Ownership-consistent
- Canonical-name consistent
- Normative-language compliant

## Default Spec Template (Non-Directive Work)

Use this structure when no stricter phase directive overrides it in docs/specs/README.md.

### 1. Title + What It Is

Plain English summary in 1-2 sentences.

### 2. What It Looks Like

Visual appearance summary in 3-5 sentences.

### 3. Where It Lives

Route, parent component, and trigger condition.

### 4. Actions & Interactions (table)

| #   | User Action | System Response | Triggers        |
| --- | ----------- | --------------- | --------------- |
| 1   | Clicks X    | Y happens       | navigates to /z |

### 5. Component Hierarchy (tree diagram)

- Show structure as an ASCII tree.
- Include conditional visibility in [brackets].
- Keep hierarchy structural, not copy-paste HTML.
- Include any Mermaid diagram that docs/specs/README.md requires.

### 6. Data (table)

Sources, tables, fields, and service methods.

### 7. State (table)

State name, type, default, and visual/behavioral effect.

### 8. File Map (table)

Files to create/change and purpose.

### 9. Wiring

Parent integration, imports, injections, and cross-component wiring.

### 10. Acceptance Criteria (checklist)

Each criterion is testable.

---

## Writing Notes

- Keep early sections short; move behavioral detail into actions, hierarchy, state, and wiring.
- Prefer shared layout primitives before introducing bespoke geometry.
- Use rem as primary unit for accessibility-sensitive dimensions.
- Use px only for precision details that should not scale with font size.
- Use vh/vw only for viewport-relative behavior.
