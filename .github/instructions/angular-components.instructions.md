---
name: "Angular Components"
description: "Use when creating or editing Angular components, templates, or component TypeScript files. Covers standalone patterns, signals, naming, and structure."
applyTo: "**/*.component.ts, **/*.component.html"
---

# Angular Component Conventions

- All components must be **standalone** — no NgModules
- Use Angular signals where applicable for reactive state
- Services use `providedIn: 'root'`
- Never call Leaflet or Supabase APIs directly — use service abstractions

## Naming

- File naming: `kebab-case.component.ts`, `kebab-case.component.html`, `kebab-case.component.scss`
- Component class: `PascalCaseComponent` (e.g., `MapShellComponent`, `UploadPanelComponent`)
- Use canonical names from [glossary](../../docs/glossary.md) — e.g., "Search Bar", "Photo Marker", "Workspace Pane"

## Structure

- Feature components live in `src/app/features/{feature}/`
- Core services live in `src/app/core/`
- Each component gets its own directory with `.ts`, `.html`, `.scss`, `.spec.ts`

## Templates

- Match the component hierarchy from the element spec **exactly**
- Implement ALL listed actions from the spec — do not skip any
- Always provide loading, error, and empty states
- Use `@if`, `@for`, `@switch` control flow (not `*ngIf`, `*ngFor`)
