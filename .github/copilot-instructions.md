# Copilot Instructions — GeoSite

## Project Summary

GeoSite is a geo-temporal image management system for construction companies.
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage).
Users upload site photos, view them on a map, search by address/project/metadata, and organize them into groups.

## Tech Stack

- **Framework**: Angular (standalone components, signals where applicable)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + SCSS for component-scoped styles
- **Map**: Leaflet via MapAdapter abstraction (never call Leaflet directly)
- **Database**: Supabase PostgreSQL + PostGIS, Row-Level Security enforced
- **Auth**: Supabase Auth (email/password, JWT)
- **Storage**: Supabase Storage (private `images/` bucket, signed URLs)
- **Geocoding**: Nominatim via GeocodingAdapter abstraction

## Project Structure

```
apps/web/src/app/
  core/           → singleton services (auth, upload, search, supabase)
  features/       → route-level feature components
    map/map-shell/  → main map page (the primary screen)
    nav/            → sidebar navigation
    upload/         → upload panel
    auth/           → login, register, reset-password
    photos/         → photo gallery page
    groups/         → groups management page
    settings/       → settings page
    account/        → account management page
  environments/   → environment configs
docs/             → design docs, specs, glossary (source of truth)
supabase/         → migrations, config
```

## Key Conventions

- Standalone components (no NgModules)
- Services use `providedIn: 'root'`
- All DB types from Supabase-generated types
- File naming: `kebab-case.component.ts`, `kebab-case.service.ts`
- Component naming: `PascalCaseComponent` (e.g., `MapShellComponent`)
- Never call Leaflet or Supabase APIs directly from components — use service abstractions
- RLS enforces security; frontend is untrusted (Invariant I5)
- Storage paths are relative (`{org_id}/{user_id}/{uuid}.jpg`); use signed URLs at runtime

## Before Implementing Any Feature

1. **Read `docs/element-specs/[element].md`** — this is the implementation contract
2. **Check `docs/glossary.md`** — use canonical UI element names
3. **Check `docs/architecture.md`** — respect the layer stack and adapter pattern
4. **Check `docs/design.md`** — follow design principles (field-first, map-primary, progressive disclosure, warmth, calm confidence)
5. **Check design patterns in relevant element specs** — sidebar/ghost buttons/quiet actions/layout rhythm should match existing specs
6. **Use Context7 MCP for external libraries before implementation** — consult current docs for Angular, Leaflet, Supabase, and Tailwind APIs; if Context7 conflicts with project docs, prefer project docs

## Design Tokens Reference

- Warm off-white bg: `--color-bg-base` (#F9F7F4 light / #0F0E0C dark)
- Surface: `--color-bg-surface`
- Primary accent: `--color-clay` (warm terracotta)
- Tap targets: ≥48px mobile, ≥44px desktop
- Body text min: 14px / 0.875rem
- Transitions: 120–250ms
- Debounce: 300ms default

## When Generating UI Code

- Match the component hierarchy in the element spec exactly
- Implement ALL listed actions — agents skip unlisted behaviors
- Use glossary names for components (e.g., "Search Bar", "Photo Marker", "Workspace Pane")
- Floating/overlay elements go in Map Zone, not outside Map Shell
- Ghost buttons for secondary actions, filled buttons for primary CTA only
- Hover-to-reveal for thumbnail card actions (Quiet Actions principle)
- Always provide empty states, loading states, and error states
