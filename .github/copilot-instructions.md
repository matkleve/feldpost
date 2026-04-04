# Copilot Instructions for Feldpost

## Project Overview

Feldpost is a geo-temporal image management system for construction companies. It is an Angular 21 SPA with a Leaflet map and a Supabase backend (Auth, PostgreSQL + PostGIS, Storage).

## Tech Stack

- **Frontend**: Angular 21 (standalone components), TypeScript, SCSS
- **Map**: Leaflet (via `MapAdapter` abstraction)
- **Backend**: Supabase (PostgreSQL + PostGIS, Auth, Edge Functions)
- **Build**: Angular CLI (`ng serve`, `ng build`)
- **Tests**: Vitest (`ng test`)

## Coding Style

- Use Angular **standalone components** — no NgModules
- Use Angular **signals** and new control flow syntax (`@if`, `@for`, `@switch`)
- Prefer **`inject()`** over constructor injection
- **SCSS** for component-scoped styles (complex layouts, animations, pseudo-elements)
- **Tailwind CSS** for utility classes in templates
- Use CSS custom properties for design tokens — never hardcode colors or spacing values
- Use Supabase client from `@supabase/supabase-js` — always through service abstractions, never directly in components
- Prefer reusable shared UI components from `apps/web/src/app/shared/` before creating new feature-local variants (especially for modal/dialog patterns)
- Avoid browser-native prompts/confirms for user-facing product flows when a shared modal/dialog component can be used

## File Naming Conventions

- Components: `feature-name.component.ts`, `feature-name.component.html`, `feature-name.component.scss`
- Services: `feature-name.service.ts`
- Tests co-located with source: `feature-name.component.spec.ts`

## Project Structure

```
apps/web/src/app/   → Angular components, services, routing
supabase/           → Migrations, RLS policies, edge functions
docs/               → Element specs, design tokens, glossary
```

## Service Symmetry Standard (Mandatory)

For every new service and service refactor, use mirrored doc/code structure:

- Docs: `docs/element-specs/[service-name]/`
- Code: `apps/web/src/app/core/[service-name]/`

Within each service module, use this required file layout:

- `[service-name].service.ts` (facade, single UI entrypoint)
- `[service-name].service.spec.ts` (co-located facade unit tests)
- `[service-name].types.ts` (all shared module interfaces/enums)
- `[service-name].helpers.ts` (pure helpers and mappers)
- `adapters/` (technical implementations only)
- `README.md` (module index and overview)

Do not create global flat adapter folders like `apps/web/src/app/core/adapters/`.
Adapters must stay local to their owning service module.

When replacing old code during symmetry refactors:

- Never hard-delete immediately.
- Move snapshots to `docs/archive/code-legacy/[YYYY-MM-DD]-[refactor-name]/`.
- Use `.legacy.ts` filenames to avoid import conflicts.

Scalable Symmetry rule:

- One module, one central `types.ts`.
- Keep facade slim; delegate heavy logic to local `adapters/`.
- Do not introduce deep sub-service folder hierarchies.

## i18n Delivery Requirement

For every UI text introduced or changed in components/templates:

- Always use deterministic key-based lookups (`t(key, fallback)`) for product UI text.
- Do not introduce new hardcoded user-facing literals in templates or component strings unless explicitly marked as temporary migration fallback.
- Add the text to `docs/i18n/translation-workbench.csv` with clear translator context.
- Ensure translation extraction includes inline templates as well as `.html` templates.
- Regenerate SQL via `node scripts/import-i18n-csv-to-sql.mjs` and include `supabase/seed_i18n.sql` in the same change.
- Treat `app_texts` / `app_text_translations` data as required feature output, not optional cleanup.

## Feedback-to-Spec Sync Requirement

When user feedback changes feature behavior or UX expectations:

- Update the relevant `docs/element-specs/*.md` spec entries first in the same session.
- Reflect the change in Actions, Wiring/Data sections, and Acceptance Criteria as needed.
- Keep implementation and spec synchronized; do not ship behavior changes without matching spec updates.

## Bulk Operation Quality Gates

**MANDATORY: Do not prioritize speed over correctness.**

1. **All multi-file changes require audit + isolation + verification phases** — no exceptions
2. **After every bulk replace**: Run `get_errors()` and `ng build` immediately
3. **Max 3-5 replacements per batch** — if more needed, split into sequential batches
4. **Comments must never be inserted above import statements** — this causes copy/paste errors
5. **Include 3-5 context lines** before and after every oldString in multi_replace
6. **Never combine unrelated changes** (e.g., rename + comment in one replace)
7. **Time cost of mistakes >> time saved by speed** — when in doubt, slow down
