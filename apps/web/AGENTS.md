# Angular Web App — Package Guidelines

## Tech Stack

Angular 21 (standalone, signals) · TypeScript strict · Tailwind + SCSS · Leaflet via `MapAdapter` · Supabase (Auth, Storage, PostGIS) · Nominatim via `GeocodingAdapter` · Vitest + jsdom

## Project Structure

```
src/app/
  core/           → singleton services (auth, upload, search, supabase)
  features/       → route-level feature components
    map/map-shell/  → main map page (primary screen)
    nav/            → sidebar navigation
    upload/         → upload panel
    auth/           → login, register, reset-password
    media/          → media gallery page
    groups/         → groups management page
    settings/       → settings page
    account/        → account management page
  environments/   → environment configs
```

## Key Rules

- Standalone components only — no NgModules
- Never call Leaflet or Supabase directly — use service abstractions
- All DB types from Supabase-generated types — no `any`
- Match the component hierarchy in the element spec exactly
- Every production component must have its own dedicated spec in `docs/element-specs/` (parent specs can reference child specs, but not replace them)
- Use glossary names from `docs/glossary.md`
- Floating/overlay elements go in Map Zone, not outside Map Shell
- Prefer shared standardized UI components in `src/app/shared/` before implementing feature-local duplicates
- Prefer app dialogs/modals over browser-native `window.prompt` / `window.confirm` for product interactions
- When splitting large files or extracting inline templates/styles, always use a dedicated script that performs a strict 1:1 copy before removing the original block

## Visual Behavior Contract (Required for UI Components)

- Every component spec must define a behavior-to-CSS ownership matrix before implementation.
- Matrix columns are mandatory: behavior, visual geometry owner, stacking-context owner, interaction hit-area owner, selector(s), layer, test oracle.
- Stacking-context ownership and visual geometry ownership must be defined separately.
- No overlay/state implementation is allowed without explicit selector-level ownership mapping.
- Follow root governance in `AGENTS.md` section `Visual Behavior Contract (Mandatory per Component Spec)`.

## Build & Test

- `npm run build` — production build
- `npm run test` — Vitest test suite
- `npm run lint` — ESLint

## Design System Gates

When a change touches design-system docs, panel SCSS, or geometry behavior, run this from repository root before PR:

- `npm run design-system:check`

Command details:

- `node scripts/validate-design-system-registry.mjs`
- `node scripts/audit-panel-breakpoints.mjs`

Related references:

- `../../.github/workflows/design-system-check.yml`
- `../../.github/pull_request_template.md`
- `../../CONTRIBUTING.md`

## i18n Is Required

When implementing components or changing UI copy:

- Use deterministic key-based lookups (`t(key, fallback)`) for product UI text.
- Keep every `fallback` in `t(key, fallback)` in English as the canonical source text.
- Do not add new hardcoded user-facing literals in templates/component strings unless explicitly temporary migration fallback.
- Keep language switch labels in native form and never locale-translate them: `English`, `Deutsch`, `Italiano`.
- Register every user-visible string in `docs/i18n/translation-workbench.csv` with useful `context` for translators.
- Avoid direct untranslated literals in templates unless they are already mapped through the i18n pipeline.
- After text changes, regenerate SQL with `node scripts/import-i18n-csv-to-sql.mjs` and include `supabase/seed_i18n.sql` updates.

No feature is considered complete if translator-required data is missing from the DB seed pipeline.
