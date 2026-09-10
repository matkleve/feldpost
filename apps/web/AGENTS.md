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

Package-specific narrowing on top of root [`AGENTS.md`](../../AGENTS.md) and always-applied `.cursor/rules/*.mdc`:

- All DB types from Supabase-generated types — no `any`
- Floating/overlay elements go in Map Zone, not outside Map Shell (see [`docs/specs/component/map/map-zone.md`](../../docs/specs/component/map/map-zone.md))
- Match the component hierarchy in the element spec exactly

Pointers — normative bodies live at the linked addresses; do not restate them here:

- Angular conventions (standalone components, signals, `inject()`, adapter pattern, shared UI, dialogs, file-split protocol): root [`AGENTS.md`](../../AGENTS.md) § Code Conventions and § Universal Invariants
- Service-module symmetry: [`docs/agent-workflows/service-symmetry-standard.md`](../../docs/agent-workflows/service-symmetry-standard.md)
- Component spec coverage and registry: [`docs/specs/README.md`](../../docs/specs/README.md) § Component Spec Coverage; registry at `docs/specs/component/registry.md`
- Glossary names: [`docs/glossary.md`](../../docs/glossary.md)
- Typography on `h1`–`h6`: [`.cursor/rules/scss-ownership.mdc`](../../.cursor/rules/scss-ownership.mdc) § Typography ownership
- Visual Behavior Contract and ownership matrix: [`.cursor/rules/visual-behavior.mdc`](../../.cursor/rules/visual-behavior.mdc)
- Component styling gate: [`docs/agent-workflows/agent-communication.md`](../../docs/agent-workflows/agent-communication.md) § Component styling gate
- Stable State comments: [`.cursor/rules/ui-state-machine.mdc`](../../.cursor/rules/ui-state-machine.mdc) § Stable State Comments
- i18n pipeline: [`.cursor/rules/i18n-workflow.mdc`](../../.cursor/rules/i18n-workflow.mdc)

## Build & Test

- `npm run build` — production build
- `npm run test` — Vitest test suite
- `npm run lint` — ESLint

## Design System & i18n Gates

When a change touches design-system docs, panel SCSS, geometry behavior, or UI copy, see [`docs/agent-workflows/gates-and-commands.md`](../../docs/agent-workflows/gates-and-commands.md) (design-system and i18n gate commands, underlying scripts, and CI workflows).
