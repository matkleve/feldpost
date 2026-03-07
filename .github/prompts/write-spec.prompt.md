---
agent: spec-writer
tools: [read, search, edit]
description: "Write a new element spec document from a feature description."
---

Write an element spec for the described UI element.

## Instructions

1. Check `docs/glossary.md` — does this element have a canonical name?
2. Read `docs/design.md` for visual conventions and tokens
3. Read `docs/architecture.md` for layer constraints
4. Review related specs in `docs/element-specs/` for consistency
5. Check `docs/database-schema.md` for available data sources
6. Create `docs/element-specs/{element-name}.md` with ALL 10 sections:
   - What It Is
   - What It Looks Like
   - Where It Lives
   - Actions & Interactions (table)
   - Component Hierarchy (tree)
   - Data Requirements (table)
   - State (table)
   - File Map (table)
   - Wiring
   - Acceptance Criteria (checklist)

## Rules

- Use glossary names for all components
- Reference design tokens, not colors or sizes
- Every Action row must be testable
- File Map paths must follow project structure conventions
- If the element needs new data, note it in Data Requirements but don't invent schema
