---
agent: spec-writer
tools: [read, search, edit]
description: "Write a new element spec document from a feature description."
---

Write an element spec for the described UI element.

## Instructions

1. Check `docs/glossary.md` — does this element have a canonical name?
2. Read `docs/design/constitution.md` and `docs/design/README.md`
3. Load the relevant task-specific design files from `docs/design/`
4. Read `docs/architecture.md` for layer constraints
5. Review related specs in `docs/specs/` for consistency
6. Check `docs/architecture/database-schema.md` for available data sources
7. Create a new markdown file under the correct `docs/specs/` subtree (`component/`, `ui/`, `service/`, `page/`, or `system/` per `docs/specs/README.md`), named `{element-name}.md`, with ALL 10 sections:
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

8. Include at least 2 Mermaid diagrams:
   - Wiring diagram (`sequenceDiagram` or `flowchart`)
   - Data Requirements diagram (`erDiagram`, `flowchart`, or `sequenceDiagram`)

## Rules

- Use glossary names for all components
- Reference design tokens, not colors or sizes
- Every Action row must be testable
- File Map paths must follow project structure conventions
- If the element needs new data, note it in Data Requirements but don't invent schema
