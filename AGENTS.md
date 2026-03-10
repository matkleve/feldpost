# Sitesnap — Project Guidelines

Sitesnap is a geo-temporal image management system for construction companies.
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage).

## Monorepo Structure

```
apps/web/     → Angular SPA (primary UI, Leaflet map, Tailwind + SCSS)
supabase/     → Database migrations, RLS policies, storage config
docs/         → Design docs, element specs, glossary (source of truth)
```

## Universal Invariants

- **RLS is the security boundary** — frontend is untrusted; Row-Level Security enforces all data access
- **Adapter pattern** — never call Leaflet, Supabase, or Nominatim directly from components; use `MapAdapter`, `GeocodingAdapter`, `SupabaseService`
- **Element specs are contracts** — read `docs/element-specs/[element].md` before building any feature
- **Glossary is canonical** — use exact names from `docs/glossary.md`

## Before Implementing a Feature

1. Read the element spec: `docs/element-specs/[element].md`
2. Read the implementation blueprint if it exists: `docs/implementation-blueprints/[element].md`
3. Only read additional design docs (`docs/design/tokens.md`, `docs/design/layout.md`, etc.) if the spec doesn't answer your styling questions

## Design Principles (summary)

Field-first, map-primary, progressive disclosure, warmth, calm confidence.
Non-negotiable rules: `docs/design/constitution.md`
