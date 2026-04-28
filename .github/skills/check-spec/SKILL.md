---
name: check-spec
description: "Check an implementation against its element spec. Reports gaps, updates checkboxes, asks questions for ambiguities. Does not write implementation code."
argument-hint: "Element spec name or path (e.g., search-bar)"
---

# Check Implementation Against Spec

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

### 4. Report

Output exactly this structure:

```
## Spec Check: {element name}

### ✅ Matches spec
- [list items that are correctly implemented]

### ❌ Gaps
- [list items that are missing or wrong, with the specific spec section they violate]

### ❓ Questions
- [list anything in the spec that seems ambiguous, contradictory, or possibly wrong — do NOT fix these, just ask]

### Acceptance Criteria
- [x] Item that passes
- [ ] Item that fails — reason
```

Save the updated checkboxes to the spec file.

## Constraints

- DO NOT write or modify implementation code
- DO NOT edit spec prose, diagrams, or tables
- DO NOT suggest improvements beyond what the spec requires
- DO NOT add acceptance criteria — only check existing ones
