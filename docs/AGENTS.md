# Documentation — Package Guidelines

## Element Specs

- Every UI element has a spec in `element-specs/` — this is the **implementation contract**
- Specs are the source of truth: code must match spec, not the other way around
- Update specs **before** asking agents to modify features
- Follow the template in `agent-workflows/element-spec-format.md` exactly

## Glossary

- `glossary.md` defines canonical UI element names (e.g., "Search Bar", "Photo Marker", "Workspace Pane")
- Always use glossary names in code, comments, and specs — no synonyms

## Writing Conventions

- Keep "What It Is" and "What It Looks Like" sections short — detail goes in Actions and Hierarchy
- Every Actions table row must be testable
- Component hierarchies use tree diagrams that map directly to Angular components
