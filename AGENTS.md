# GeoSite — Project Guidelines

GeoSite is a geo-temporal image management system for construction companies.
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage).

## Monorepo Structure

```
apps/web/     → Angular SPA (primary UI, Leaflet map, Tailwind + SCSS)
supabase/     → Database migrations, RLS policies, storage config
docs/         → Design docs, element specs, glossary (source of truth)
```

Each package has its own `AGENTS.md` with package-specific conventions.

## Universal Invariants

- **RLS is the security boundary** — frontend is untrusted; Row-Level Security enforces all data access
- **Adapter pattern for external APIs** — never call Leaflet, Supabase, or Nominatim directly from components; use service abstractions (`MapAdapter`, `GeocodingAdapter`, `SupabaseService`)
- **Element specs are implementation contracts** — read `docs/element-specs/[element].md` before building any feature
- **Glossary is canonical** — use exact UI element names from `docs/glossary.md`

## Before Implementing Any Feature

1. Read the element spec: `docs/element-specs/[element].md`
2. Check the glossary: `docs/glossary.md`
3. Check architecture constraints: `docs/architecture.md`
4. Check design principles: `docs/design.md`
5. Consult Context7 MCP for external library APIs (Angular, Leaflet, Supabase, Tailwind); if Context7 conflicts with project docs, prefer project docs

## Design Principles (summary)

Field-first, map-primary, progressive disclosure, warmth, calm confidence.
See `docs/design.md` for full reference.
