---
name: check-spec
description: "Check an implementation against its element spec. Reports gaps, updates checkboxes, asks questions for ambiguities. Does not write implementation code."
argument-hint: "Element spec name or path (e.g., search-bar)"
---

# Check Implementation Against Spec

> **Role:** Specialist skill. Produces a structured findings report. Does not create GitHub issues. Returns output to `audit-scope-to-issues` for issue creation.

## Rules

1. **Read-only for code.** You check code but do not modify it.
2. **Checkboxes only for specs.** You may update Acceptance Criteria `[ ]` → `[x]` or `[x]` → `[ ]`. You do not edit spec prose, diagrams, or tables.
3. **If something seems wrong in the spec, ask.** Do not silently reinterpret or ignore it.

## Procedure

### 1. Read the spec

1. Read the element spec markdown under `docs/specs/` (exact path from the task, or locate via `docs/specs/README.md`) — all sections
2. Read `docs/specs/service/<module>/` facade specs (index: `docs/specs/service/README.md`) when the element depends on those services.

### 2. Read the implementation

1. Open each file from the spec's **File Map**
2. Open parent/wiring files referenced in the **Wiring** section
3. Check the template (`.component.html`) for visual structure matching the Component Hierarchy

### 3. Compare

For each spec section, check:

| Section                       | What to verify                                      |
| ----------------------------- | --------------------------------------------------- |
| **File Map**                  | All files exist                                     |
| **Component Hierarchy**       | Tag nesting matches the tree                        |
| **Actions**                   | Every row is implemented                            |
| **State**                     | All variables exist with correct types and defaults |
| **Mermaid state machines**    | Code implements the exact states and transitions    |
| **Mermaid sequence diagrams** | Code follows the exact call order                   |
| **Data**                      | Correct queries and service methods used            |
| **Wiring**                    | Parent integration matches                          |
| **Acceptance Criteria**       | Each item is satisfied or not                       |

### 4. Acceptance Criteria

Update existing Acceptance Criteria checkboxes in the spec when evidence is clear:

- `[x]` for passing items.
- `[ ]` for failing, missing, or unverifiable items.
- Do not add new acceptance criteria.

## Output (Report to Orchestrator)

Return findings in this structure — do not create issues:

### Confirmed Findings
| Area/File | Spec | Observation | Suggested priority |
|---|---|---|---|

### Unclear Findings
| Area/File | Suspicion | Evidence | Check needed |
|---|---|---|---|

### Not Examined
| Area/File | Reason |
|---|---|

## Constraints

- DO NOT write or modify implementation code
- DO NOT edit spec prose, diagrams, or tables
- DO NOT suggest improvements beyond what the spec requires
- DO NOT add acceptance criteria — only check existing ones
