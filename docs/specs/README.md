# Element Specs

Last updated: 2026-04-15

This README is now Directive-First for documentation architecture refactoring.
For the targeted media refactoring pass, the rules in this file override older broad guidance to prevent specification drift and scope bleed.

## Directive Priority (Normative)

- This document defines the active contract for the targeted media refactoring phase.
- During this phase, all contributors MUST prioritize this directive over legacy README content patterns.
- If a requirement is ambiguous, contributors MUST stop and output:
  - ⚠ SPEC GAP: [describe the ambiguity]

## In-Scope Files (Only)

- [page/media-page.md](page/media-page.md)
- [component/media.component.md](component/media.component.md)
- [component/media-content.md](component/media-content.md)
- [component/media-item.md](component/media-item.md)
- [component/media-display.md](component/media-display.md)
- [component/media-item-quiet-actions.md](component/media-item-quiet-actions.md)
- [component/media-item-upload-overlay.md](component/media-item-upload-overlay.md)
- [component/item-grid.md](component/item-grid.md) (media-path constraints only)
- [component/media-page-header.md](component/media-page-header.md)
- [component/media-toolbar.md](component/media-toolbar.md)

## Documentation Phase Boundary

- This pass MUST edit only the in-scope files listed above.
- This pass MUST NOT edit implementation code, migrations, or unrelated specs.
- This pass MUST NOT invent behavior that cannot be traced to an existing parent/child contract.
- Broader markdown cleanup MUST be deferred to later phases.

## Layer Ownership Contract

- Page Layer MUST own orchestration, routing, high-level layout, and page-level state ownership.
- Component Layer MUST own behavior contracts, FSM, and API/service boundaries.
- Item/Domain Layer MUST own tile visuals, local UI states, and atomic data mapping.
- If Page and Component specs conflict at a shared boundary:
  - Component-level spec MUST be authoritative for behavior.
  - Page-level spec MUST be authoritative for composition.

## Core Anti-Drift Law

- Every requirement detail MUST have exactly one owning spec location.
- Non-normative prose MUST be deleted or converted into enforceable requirements.
- Enforceable language MUST use MUST, SHOULD, MAY in all caps.

## Mandatory Preflight (Before Edits)

- The editor MUST provide a 3-5 line understanding statement of:
  - Orchestration Layer
  - Visual Contract Layer
- The editor MUST list first refactor targets in this exact order:
  1. [page/media-page.md](page/media-page.md)
  2. [component/media.component.md](component/media.component.md)
  3. [component/media-content.md](component/media-content.md)
  4. [component/media-item.md](component/media-item.md)
  5. [component/media-display.md](component/media-display.md)
  6. [component/media-item-quiet-actions.md](component/media-item-quiet-actions.md)
  7. [component/media-item-upload-overlay.md](component/media-item-upload-overlay.md)
  8. [component/item-grid.md](component/item-grid.md)
  9. [component/media-page-header.md](component/media-page-header.md)
  10. [component/media-toolbar.md](component/media-toolbar.md)
- If a target file is missing or ownership is unclear, the editor MUST stop and output exactly:
  - ⚠ SPEC GAP: [missing file or ambiguous owner]

## Required Audit and Corrections

### A) Naming and Role Drift

- Canonical toolbar name MUST be MediaToolbar.
- PaneToolbar and ActionToolbar MUST be normalized to MediaToolbar when they represent a toolbar element.
- Distinct header contracts such as MediaPageHeader MUST NOT be renamed unless registry explicitly marks them as aliases.

### B) Child UI Leakage in Page Spec

- [page/media-page.md](page/media-page.md) MUST NOT own child tile-detail visual mappings such as address chip or title/date overlays.
- Child visual mappings MUST be replaced by a normative ownership statement that points to the owning item/domain contract.

### C) State-to-UI Mapping in Shell Spec

- [component/media.component.md](component/media.component.md) MUST include a deterministic State-to-UI Mapping Table.
- The table MUST map shell FSM states, including append-error and revalidating, to MediaContent-facing UI behavior and escalation behavior.
- The table MUST define Escalation Trigger as the child event intent that forces a parent state transition.

### E) Toolbar Ownership Split

- [component/media-toolbar.md](component/media-toolbar.md) MUST be the authoritative visual and intent contract for MediaToolbar.
- [component/media-content.md](component/media-content.md) MUST reference toolbar ownership and MUST NOT duplicate per-control behavior tables.

### D) Deterministic Tab Entry Policy

- On re-entry, the page MUST restore the last active tab unless an explicit URL anchor or intent overrides it.
- Selection context restore behavior MUST be documented as subordinate to that rule.

## Canonical Name Registry Gate

- Every component name used in the edited specs MUST match a canonical glossary or registry entry.
- If a name is missing in the canonical registry, the editor MUST stop and output exactly:
  - ⚠ SPEC GAP: [describe the ambiguity]

## Self-Correction Gate (Before Save)

- If a file describes an element it does not own, that detail MUST move to the owner spec and the source spec MUST keep only a reference.
- If non-canonical component names appear, they MUST be normalized to canonical registry terms.
- If text is descriptive but enforceable, it MUST be rewritten with MUST, SHOULD, or MAY.
- If behavior was inferred without contract traceability, it MUST be removed.

## Required Deliverable Structure

- Section 1: Audit Table per file (Issue, Owner Layer, Severity, Action)
- Section 2: Edited Files Summary with exact headings changed
- Section 3: State-to-UI Mapping Table added in shell spec
- Section 4: Contradictions resolved and final deterministic tab policy statement
- Section 5: Residual gaps listed as SPEC GAP items

Completion condition:

- All edited statements MUST be ownership-consistent.
- All edited statements MUST be canonical-name consistent.
- All edited statements MUST be normative-language compliant.

## Permission To Fail (Mandatory)

- If ownership, naming registry, target-file existence, or authoritative owner is ambiguous, contributors MUST NOT guess.
- Required output in that case:
  - ⚠ SPEC GAP: [describe the ambiguity]

## See Also

- [../glossary.md](../glossary.md)
- [../agent-workflows/element-spec-format.md](../agent-workflows/element-spec-format.md)
