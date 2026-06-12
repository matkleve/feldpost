---
name: spec-audit
description: Audits component spec files (markdown) for unclear responsibility boundaries, ownership conflicts, and internal inconsistencies. Use this skill whenever the user wants to review or audit component specs, check for unclear task distribution between components, find ownership conflicts, validate FSM consistency, check input/output completeness, or identify layer/z-index conflicts. Trigger on phrases like "check the spec", "audit these components", "who owns what", "is this consistent", "find inconsistencies in the spec".
---

# Spec Audit Skill

> **Role:** Specialist skill. Produces a structured findings report. Does not create GitHub issues. Returns output to `audit-scope-to-issues` for issue creation.

## Mode

**Standalone** (invoked directly by user):
Run the full audit, then behave like `audit-scope-to-issues`: present findings checkpoint, wait for confirmation, create issues.

**Orchestrated** (invoked by `audit-scope-to-issues`):
Run the audit, return the structured findings report only. Do not create issues. Do not checkpoint with the user.

Detect mode by context: if the user invoked this skill directly, use Standalone. If called as part of an orchestrated audit, use Orchestrated.

Analyzes one or more component spec files (`.md`) and produces a structured audit report identifying unclear responsibility boundaries, ownership conflicts, and internal inconsistencies — with concrete fix proposals for each finding.

---

## Audit Dimensions

Run all four dimensions on every audit. Never skip a dimension without noting it explicitly.

### 1. Ownership (Who owns what)

Look for:

- **Duplicate ownership**: same concern (geometry, state, visual, interaction) claimed by more than one component
- **Missing ownership**: a concern is mentioned but no owner is declared
- **Leaked knowledge**: Component A makes decisions that belong to Component B (e.g. a layout component knowing about media delivery states)
- **Ownership Triad violations**: Geometry Owner, State Owner, and Visual Owner must be the same element. Flag any row where they diverge without an explicit documented exception.
- **Cross-layer state reads**: a parent reading child CSS variables to compute its own geometry, or vice versa

Key question per component: _"Could this component be replaced without touching any other component's logic?"_ If not — flag it.

### 2. FSM Consistency

Look for:

- **Undeclared states**: states mentioned in prose, tables, or mermaid diagrams that do not appear in the State Enum
- **Missing transitions**: a state can be reached in prose but has no entry in the Transition Map
- **Forbidden shortcuts**: transitions that the Transition Guard Contract explicitly forbids but are implied elsewhere
- **Parallel FSMs on same concern**: two components both defining states for the same lifecycle (e.g. both ItemGrid and MediaDisplay defining "loading")
- **State scope bleed**: states from one FSM appearing in another component's state enum or template bindings

### 3. Input/Output Completeness

Look for:

- **Fields in Data Requirements table but missing from Public Inputs table** (or vice versa)
- **Outputs emitted in prose/mermaid but not declared in Outputs section**
- **Boolean visual-state inputs that should be enum states** (migration smell)
- **Inputs forwarded to child components that the child does not accept** (e.g. forwarding `mode` to a component whose acceptance criteria says it has exactly N inputs)
- **Missing upload/download state separation**: upload state and download/render state must never share the same input field or enum

### 4. Layer / Z-Index Conflicts

Look for:

- **Numeric z-index values that differ between specs for the same layer**
- **Pseudo-CSS Contract values that contradict the Layer Order table** within the same spec
- **Overlay components anchored to a parent that is not a stacking context**
- **Missing stacking context declaration**: a component uses `z-index` but its host is not declared as a stacking context owner

---

## Audit Protocol

### Step 1 — Read all provided specs fully before writing anything

Do not start the audit table until all specs are read. If related specs are referenced but not provided, note them as "not audited — not provided" in the report header.

### Step 2 — Build the Audit Table

One row per finding. Format:

| #   | Dimension | File | Section | Finding | Severity | Fix Proposal |
| --- | --------- | ---- | ------- | ------- | -------- | ------------ |

**Severity levels:**

- `BLOCKER` — spec is self-contradictory; implementation will be broken or ambiguous
- `INCONSISTENCY` — two specs disagree; one must be made authoritative
- `GAP` — something is undeclared; agent will have to guess
- `SMELL` — not technically wrong but likely to cause drift or confusion

### Step 3 — Group findings by component

After the table, produce one section per affected component listing its findings by number. This makes it easier to generate targeted fix prompts later.

### Step 4 — Fix Proposals

For every finding provide a concrete fix proposal. Fix proposals must:

- State which file and section to change
- Show Before / After (short excerpts, not full spec rewrites)
- Not introduce new rules or extend scope — only resolve the identified conflict

### Step 5 — Summary

End with:

- Total findings by severity
- Which specs are internally consistent (no findings)
- Recommended fix order (BLOCKERs first, then INCONSISTENCYs, then GAPs, then SMELLs)

---

## Output (Report to Orchestrator)

In Orchestrated mode, return findings in this structure — do not create issues:

### Confirmed Findings
| Area/File | Spec | Observation | Suggested priority |
|---|---|---|---|

### Unclear Findings
| Area/File | Suspicion | Evidence | Check needed |
|---|---|---|---|

### Not Examined
| Area/File | Reason |
|---|---|

---

## Anti-Patterns to Avoid

- **Do not rewrite spec content** beyond the minimum needed to resolve the finding
- **Do not add new architectural rules** — only surface what is already contradicted or missing
- **Do not flag style preferences** as findings — only structural ambiguities and contradictions
- **Do not merge FSM states** from different components into one finding unless they genuinely conflict on the same concern
- **Do not skip the audit table** and jump straight to fixes — the table is the deliverable, fixes are secondary

---

## Feldpost-Specific Context

When auditing Feldpost specs, apply these additional checks:

- **Upload vs. Download separation**: `UploadManagerService` and `MediaDownloadService` are orthogonal. Any component that mixes upload state and download/render state in the same enum or input is a BLOCKER.
- **No RxJS**: signal/effect/computed/async-await only. Flag any spec that implies Observable subscriptions in new components.
- **Ownership Triad**: Geometry, State, Visual must be the same element. Documented exceptions must be explicit in the spec with a reason.
- **Flat HTML**: max 3 nesting levels. Flag any component hierarchy that implies deeper nesting.
- **Boolean visual-state inputs**: any `loading: boolean`, `error: boolean`, `selected: boolean` on a component that has a State Enum is a SMELL — should be migrated to enum state.
- **`mode` forwarding**: check that forwarded inputs are actually accepted by the receiving component's declared input contract.
